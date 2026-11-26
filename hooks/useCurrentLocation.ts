import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Coordinates, parseCoordinates } from 'lib/location';

export type LocationStatus =
  'acquiring' | 'granted' | 'permission_denied' | 'services_disabled' | 'unavailable';

export interface UseCurrentLocationOptions {
  enabled?: boolean;
  distanceInterval?: number;
  timeInterval?: number;
}

export interface UseCurrentLocationResult {
  location: Coordinates | null;
  status: LocationStatus;
  canAskAgain: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  lastUpdatedAt: number | null;
  refresh: () => Promise<void>;
  enableLocation: () => Promise<void>;
  openAppSettings: () => Promise<void>;
}

const DEFAULT_DISTANCE_INTERVAL_METERS = 25;
const DEFAULT_TIME_INTERVAL_MS = 10000;
const POSITION_TIMEOUT_MS = 12000;

function extractValidCoordinates(
  position: Location.LocationObject | null | undefined
): Coordinates | null {
  if (!position?.coords) return null;
  return parseCoordinates(position.coords.latitude, position.coords.longitude);
}

async function getCurrentPositionWithTimeout(
  accuracy: Location.LocationAccuracy,
  timeoutMs: number
): Promise<Location.LocationObject> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Location request timed out'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

function toAppStateStatus(value: string | null | undefined): AppStateStatus {
  if (
    value === 'active' ||
    value === 'background' ||
    value === 'inactive' ||
    value === 'extension' ||
    value === 'unknown'
  ) {
    return value;
  }
  return 'active';
}

export function useCurrentLocation(
  options: UseCurrentLocationOptions = {}
): UseCurrentLocationResult {
  const {
    enabled = true,
    distanceInterval = DEFAULT_DISTANCE_INTERVAL_METERS,
    timeInterval = DEFAULT_TIME_INTERVAL_MS,
  } = options;

  const isFocused = useIsFocused();

  const [location, setLocation] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>('acquiring');
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(() =>
    toAppStateStatus(AppState.currentState)
  );

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const sessionTokenRef = useRef<number>(0);
  const locationRef = useRef<Coordinates | null>(null);
  const hasPromptedOnceRef = useRef<boolean>(false);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  }, []);

  const isTrackingActive = enabled && isFocused && appState === 'active';
  const isTrackingActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const acquireAndWatch = useCallback(
    async (allowPermissionPrompt: boolean, manualRefresh: boolean) => {
      if (!isTrackingActiveRef.current) return;

      const token = ++sessionTokenRef.current;
      cleanupSubscription();

      if (manualRefresh || !locationRef.current) {
        if (!locationRef.current) {
          setStatus('acquiring');
        }
        setIsRefreshing(true);
      }
      setErrorMessage(null);

      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) return;

        if (permission.status !== 'granted' && allowPermissionPrompt && permission.canAskAgain) {
          hasPromptedOnceRef.current = true;
          permission = await Location.requestForegroundPermissionsAsync();
          if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) return;
        }

        setCanAskAgain(permission.canAskAgain);

        if (permission.status !== 'granted') {
          setLocation(null);
          setStatus('permission_denied');
          setErrorMessage('Foreground location access is needed to show your current position.');
          setIsRefreshing(false);
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) return;

        if (!servicesEnabled) {
          setLocation(null);
          setStatus('services_disabled');
          setErrorMessage('Current location unavailable');
          setIsRefreshing(false);
          return;
        }

        // Start foreground subscription only while screen & app are active
        const watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval,
            timeInterval,
          },
          (position) => {
            if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) return;
            const parsed = extractValidCoordinates(position);
            if (!parsed) return;
            setLocation(parsed);
            setStatus('granted');
            setErrorMessage(null);
            setLastUpdatedAt(Date.now());
            setIsRefreshing(false);
          }
        );

        if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) {
          watcher.remove();
          return;
        }
        subscriptionRef.current = watcher;

        // Fetch an immediate GPS fix for responsive initial load / manual refresh
        try {
          const currentPosition = await getCurrentPositionWithTimeout(
            Location.Accuracy.High,
            POSITION_TIMEOUT_MS
          );
          if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) return;

          const parsed = extractValidCoordinates(currentPosition);
          if (parsed) {
            setLocation(parsed);
            setStatus('granted');
            setErrorMessage(null);
            setLastUpdatedAt(Date.now());
            setIsRefreshing(false);
            return;
          }
        } catch {
          if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) return;

          const stillEnabled = await Location.hasServicesEnabledAsync();
          if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) return;

          if (!stillEnabled) {
            cleanupSubscription();
            setLocation(null);
            setStatus('services_disabled');
            setErrorMessage('Current location unavailable');
            setIsRefreshing(false);
            return;
          }

          // Fallback to recent cached GPS fix (< 60s old) only if no live fix arrived yet
          if (!locationRef.current) {
            try {
              const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
              if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) return;
              const parsedFallback = extractValidCoordinates(lastKnown);
              if (parsedFallback) {
                setLocation(parsedFallback);
                setStatus('granted');
                setErrorMessage(null);
                setLastUpdatedAt(Date.now());
                setIsRefreshing(false);
                return;
              }
            } catch {
              // Ignore fallback error and transition cleanly to unavailable below
            }
          }
        }

        if (!locationRef.current) {
          setStatus('unavailable');
          setErrorMessage('Current location unavailable');
        }
        setIsRefreshing(false);
      } catch {
        if (token !== sessionTokenRef.current || !isTrackingActiveRef.current) return;
        cleanupSubscription();
        if (!locationRef.current) {
          setStatus('unavailable');
          setErrorMessage('Current location unavailable');
        }
        setIsRefreshing(false);
      }
    },
    [cleanupSubscription, distanceInterval, timeInterval]
  );

  useEffect(() => {
    isTrackingActiveRef.current = isTrackingActive;
    if (!isTrackingActive) {
      sessionTokenRef.current += 1;
      cleanupSubscription();
      return;
    }

    const shouldPrompt = !hasPromptedOnceRef.current;
    void acquireAndWatch(shouldPrompt, false);

    return () => {
      isTrackingActiveRef.current = false;
      sessionTokenRef.current += 1;
      cleanupSubscription();
    };
  }, [isTrackingActive, acquireAndWatch, cleanupSubscription]);

  const refresh = useCallback(async () => {
    if (!isTrackingActiveRef.current) return;
    await acquireAndWatch(true, true);
  }, [acquireAndWatch]);

  const openAppSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      // Ignore if device settings cannot be opened
    }
  }, []);

  const enableLocation = useCallback(async () => {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      setCanAskAgain(current.canAskAgain);

      if (current.status === 'granted') {
        await acquireAndWatch(false, true);
        return;
      }

      if (current.canAskAgain) {
        const requested = await Location.requestForegroundPermissionsAsync();
        setCanAskAgain(requested.canAskAgain);
        if (requested.status === 'granted') {
          await acquireAndWatch(false, true);
          return;
        }
        setStatus('permission_denied');
        if (!requested.canAskAgain) {
          await openAppSettings();
        }
        return;
      }

      await openAppSettings();
    } catch {
      await openAppSettings();
    }
  }, [acquireAndWatch, openAppSettings]);

  return {
    location,
    status,
    canAskAgain,
    isRefreshing: isTrackingActive ? isRefreshing : false,
    errorMessage,
    lastUpdatedAt,
    refresh,
    enableLocation,
    openAppSettings,
  };
}
