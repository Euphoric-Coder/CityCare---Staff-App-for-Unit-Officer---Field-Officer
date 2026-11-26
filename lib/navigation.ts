import { Alert, Linking, Platform } from 'react-native';
import { Coordinates, parseCoordinates } from './location';

export interface NavigationUrls {
  primaryUrl: string;
  fallbackUrl: string;
}

/**
 * Builds native maps driving-directions URLs per platform with a Google Maps web fallback.
 */
export function buildExternalNavigationUrls(
  destination: Coordinates,
  platformOs: string = Platform.OS
): NavigationUrls {
  const lat = destination.latitude;
  const lng = destination.longitude;
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving&dir_action=navigate`;

  if (platformOs === 'ios') {
    return {
      primaryUrl: `maps://?daddr=${lat},${lng}&dirflg=d`,
      fallbackUrl,
    };
  }

  if (platformOs === 'android') {
    return {
      primaryUrl: `google.navigation:q=${lat},${lng}&mode=d`,
      fallbackUrl,
    };
  }

  return {
    primaryUrl: fallbackUrl,
    fallbackUrl,
  };
}

/**
 * Opens native driving directions in Apple Maps (iOS) or Google Maps (Android),
 * falling back to Google Maps web directions if the native scheme cannot be opened.
 */
export async function openExternalNavigation(
  destination: Coordinates | null | undefined
): Promise<boolean> {
  const validDestination = destination
    ? parseCoordinates(destination.latitude, destination.longitude)
    : null;

  if (!validDestination) {
    Alert.alert('Navigation Unavailable', 'Issue location coordinates are missing or invalid.');
    return false;
  }

  const { primaryUrl, fallbackUrl } = buildExternalNavigationUrls(validDestination);

  try {
    await Linking.openURL(primaryUrl);
    return true;
  } catch {
    if (primaryUrl !== fallbackUrl) {
      try {
        await Linking.openURL(fallbackUrl);
        return true;
      } catch {
        // Fall through to alert below
      }
    }

    Alert.alert(
      'Unable to Open Navigation',
      'No supported maps or browser application is available to open driving directions.'
    );
    return false;
  }
}
