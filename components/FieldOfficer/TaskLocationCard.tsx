import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import MapView, {
  Details,
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  Polyline,
  Region,
} from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LocateFixed,
  MapPin,
  MapPinOff,
  Navigation,
  RefreshCw,
  Settings,
  TriangleAlert,
} from 'lucide-react-native';
import { LocationStatus, useCurrentLocation } from 'hooks/useCurrentLocation';
import {
  CLOSE_PROXIMITY_METERS,
  calculateStraightLineDistanceMeters,
  formatDistance,
  formatIssueAddress,
  getInitialMapRegion,
  parseCoordinates,
} from 'lib/location';
import { openExternalNavigation } from 'lib/navigation';

export interface TaskLocationCardProps {
  latitude: unknown;
  longitude: unknown;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  fallbackLocation?: string | null;
}

interface MapErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function getGpsStatusBadge(
  hasValidDestination: boolean,
  status: LocationStatus,
  isDark: boolean
): { dot: string; label: string; bg: string; text: string; border: string } {
  if (!hasValidDestination) {
    return {
      dot: '#EF4444',
      label: 'Target Unavailable',
      bg: isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2',
      text: isDark ? '#FCA5A5' : '#DC2626',
      border: isDark ? 'rgba(239,68,68,0.28)' : '#FECACA',
    };
  }

  switch (status) {
    case 'granted':
      return {
        dot: '#10B981',
        label: 'GPS Active',
        bg: isDark ? 'rgba(16,185,129,0.14)' : '#ECFDF5',
        text: isDark ? '#6EE7B7' : '#047857',
        border: isDark ? 'rgba(16,185,129,0.28)' : '#A7F3D0',
      };
    case 'acquiring':
      return {
        dot: '#0EA5A4',
        label: 'Acquiring GPS',
        bg: isDark ? 'rgba(14,165,164,0.16)' : '#F0FDFA',
        text: isDark ? '#5EEAD4' : '#0F766E',
        border: isDark ? 'rgba(14,165,164,0.32)' : '#99F6E4',
      };
    case 'permission_denied':
      return {
        dot: '#F59E0B',
        label: 'Permission Needed',
        bg: isDark ? 'rgba(245,158,11,0.14)' : '#FFFBEB',
        text: isDark ? '#FCD34D' : '#B45309',
        border: isDark ? 'rgba(245,158,11,0.28)' : '#FDE68A',
      };
    case 'services_disabled':
      return {
        dot: '#EF4444',
        label: 'GPS Disabled',
        bg: isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2',
        text: isDark ? '#FCA5A5' : '#DC2626',
        border: isDark ? 'rgba(239,68,68,0.28)' : '#FECACA',
      };
    default:
      return {
        dot: '#EF4444',
        label: 'GPS Unavailable',
        bg: isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2',
        text: isDark ? '#FCA5A5' : '#DC2626',
        border: isDark ? 'rgba(239,68,68,0.28)' : '#FECACA',
      };
  }
}

export default function TaskLocationCard({
  latitude,
  longitude,
  address,
  city,
  state,
  postal,
  fallbackLocation,
}: TaskLocationCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const destination = useMemo(() => parseCoordinates(latitude, longitude), [latitude, longitude]);
  const hasValidDestination = destination !== null;

  const displayAddress = useMemo(
    () => formatIssueAddress({ address, city, state, postal, fallbackLocation }),
    [address, city, state, postal, fallbackLocation]
  );

  const {
    location: officerLocation,
    status,
    canAskAgain,
    isRefreshing,
    refresh,
    enableLocation,
    openAppSettings,
  } = useCurrentLocation({
    enabled: hasValidDestination,
    distanceInterval: 25,
    timeInterval: 10000,
  });

  const distanceMeters = useMemo(
    () => calculateStraightLineDistanceMeters(officerLocation, destination),
    [officerLocation, destination]
  );
  const formattedDistance = useMemo(() => formatDistance(distanceMeters), [distanceMeters]);

  const initialRegion = useMemo(
    () => getInitialMapRegion(destination, officerLocation),
    // Computed cleanly for initial mount framing when destination is available
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destination?.latitude, destination?.longitude]
  );

  const mapRef = useRef<MapView | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);

  const hasAutoFittedPairRef = useRef(false);
  const isProgrammaticMoveRef = useRef(false);
  const hasMapTouchStartedRef = useRef(false);
  const programmaticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDestinationKeyRef = useRef<string | null>(null);

  const destinationKey = destination
    ? `${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`
    : null;

  useEffect(() => {
    if (lastDestinationKeyRef.current !== destinationKey) {
      lastDestinationKeyRef.current = destinationKey;
      hasAutoFittedPairRef.current = false;
      hasMapTouchStartedRef.current = false;
      setHasUserMovedMap(false);
      setIsMapReady(false);
    }
  }, [destinationKey]);

  useEffect(() => {
    return () => {
      if (programmaticTimerRef.current) {
        clearTimeout(programmaticTimerRef.current);
      }
    };
  }, []);

  const fitCameraToLocations = useCallback(
    (animated = true) => {
      if (!mapRef.current || !isMapReady || !destination) return;

      isProgrammaticMoveRef.current = true;
      hasMapTouchStartedRef.current = false;

      if (programmaticTimerRef.current) {
        clearTimeout(programmaticTimerRef.current);
      }
      programmaticTimerRef.current = setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 900);

      if (officerLocation) {
        const currentDistance = calculateStraightLineDistanceMeters(officerLocation, destination);
        if (currentDistance !== null && currentDistance < CLOSE_PROXIMITY_METERS) {
          const midLat = (officerLocation.latitude + destination.latitude) / 2;
          const midLng = (officerLocation.longitude + destination.longitude) / 2;
          mapRef.current.animateToRegion(
            {
              latitude: midLat,
              longitude: midLng,
              latitudeDelta: 0.004,
              longitudeDelta: 0.004,
            },
            animated ? 450 : 0
          );
          return;
        }

        mapRef.current.fitToCoordinates([officerLocation, destination], {
          edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
          animated,
        });
        return;
      }

      mapRef.current.animateToRegion(
        {
          latitude: destination.latitude,
          longitude: destination.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        animated ? 400 : 0
      );
    },
    [destination, isMapReady, officerLocation]
  );

  // Automatically frame both markers once map is ready and GPS becomes available
  useEffect(() => {
    if (!isMapReady || !destination || !officerLocation) return;
    if (hasUserMovedMap || hasAutoFittedPairRef.current) return;

    hasAutoFittedPairRef.current = true;
    fitCameraToLocations(true);
  }, [destination, officerLocation, isMapReady, hasUserMovedMap, fitCameraToLocations]);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
  }, []);

  const handleRegionChangeStart = useCallback(
    (_region: Region, details?: Details) => {
      if (!isMapReady || isProgrammaticMoveRef.current) return;
      if (details?.isGesture === false) return;
      if (details?.isGesture === true || hasMapTouchStartedRef.current) {
        setHasUserMovedMap(true);
      }
    },
    [isMapReady]
  );

  const handleRecenter = useCallback(() => {
    setHasUserMovedMap(false);
    hasMapTouchStartedRef.current = false;
    fitCameraToLocations(true);
  }, [fitCameraToLocations]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleNavigate = useCallback(() => {
    void openExternalNavigation(destination);
  }, [destination]);

  const statusMeta = getGpsStatusBadge(hasValidDestination, status, isDark);
  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
  const polylineColor = isDark ? '#2DD4BF' : '#0D9488';

  const renderMapFallback = (title: string, subtitle: string) => (
    <View
      style={[
        styles.mapFallbackBox,
        {
          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}>
      <View
        style={[
          styles.fallbackIconCircle,
          { backgroundColor: isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2' },
        ]}>
        <MapPinOff size={22} color="#EF4444" strokeWidth={2.2} />
      </View>
      <Text style={[styles.fallbackTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>{title}</Text>
      <Text style={[styles.fallbackSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
        {subtitle}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? 'rgba(14,165,164,0.28)' : 'rgba(14,165,164,0.16)',
          shadowColor: isDark ? '#000000' : '#0F172A',
        },
      ]}>
      {/* ── Section Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.headerIconBox,
              {
                backgroundColor: isDark ? 'rgba(14,165,164,0.16)' : '#F0FDFA',
                borderColor: isDark ? 'rgba(94,234,212,0.28)' : '#CCFBF1',
              },
            ]}>
            <MapPin size={18} color={isDark ? '#2DD4BF' : '#0D9488'} strokeWidth={2.5} />
          </View>
          <View style={styles.headerTextGroup}>
            <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Task Location
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusMeta.bg,
                  borderColor: statusMeta.border,
                },
              ]}>
              <View style={[styles.statusDot, { backgroundColor: statusMeta.dot }]} />
              <Text style={[styles.statusLabel, { color: statusMeta.text }]}>
                {statusMeta.label}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRefresh}
          disabled={!hasValidDestination || isRefreshing}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Refresh current GPS location"
          style={[
            styles.refreshBtn,
            {
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              borderColor: isDark ? '#334155' : '#E2E8F0',
              opacity: !hasValidDestination ? 0.45 : 1,
            },
          ]}>
          {isRefreshing ? (
            <ActivityIndicator size="small" color={isDark ? '#2DD4BF' : '#0D9488'} />
          ) : (
            <RefreshCw size={16} color={isDark ? '#2DD4BF' : '#0D9488'} strokeWidth={2.4} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Interactive Map Preview ── */}
      <View
        style={[
          styles.mapWrapper,
          {
            borderColor: isDark ? '#334155' : '#E2E8F0',
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
          },
        ]}>
        {!hasValidDestination || !initialRegion ? (
          renderMapFallback(
            'Issue location unavailable',
            'Valid latitude and longitude coordinates are missing for this issue.'
          )
        ) : (
          <MapErrorBoundary
            key={destinationKey ?? 'no-destination'}
            fallback={renderMapFallback(
              'Map preview unavailable',
              'Interactive map could not be displayed, but distance and external navigation remain ready.'
            )}>
            <View
              style={styles.mapTouchContainer}
              onTouchStart={() => {
                hasMapTouchStartedRef.current = true;
              }}>
              <MapView
                key={`task-location-map-${Platform.OS}-${isDark ? 'dark' : 'light'}`}
                ref={mapRef}
                provider={mapProvider}
                style={styles.map}
                initialRegion={initialRegion}
                userInterfaceStyle={isDark ? 'dark' : 'light'}
                loadingEnabled={true}
                loadingBackgroundColor={isDark ? '#0F172A' : '#F1F5F9'}
                loadingIndicatorColor="#0D9488"
                scrollEnabled={true}
                zoomEnabled={true}
                zoomControlEnabled={false}
                rotateEnabled={true}
                pitchEnabled={false}
                toolbarEnabled={false}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={true}
                mapPadding={{ top: 16, right: 16, bottom: 28, left: 16 }}
                onMapReady={handleMapReady}
                onRegionChangeStart={handleRegionChangeStart}
                onPanDrag={() => setHasUserMovedMap(true)}>
                <Marker
                  identifier="issue-destination"
                  coordinate={destination}
                  title="Issue Location"
                  description={displayAddress}
                  pinColor="#EF4444"
                />

                {officerLocation && (
                  <Marker
                    identifier="officer-location"
                    coordinate={officerLocation}
                    title="Your Location"
                    description="Current GPS position"
                    pinColor="#2563EB"
                  />
                )}

                {officerLocation && (
                  <Polyline
                    coordinates={[officerLocation, destination]}
                    strokeColor={polylineColor}
                    strokeWidth={3.5}
                    lineCap="butt"
                    lineDashPattern={[8, 6]}
                    geodesic={false}
                  />
                )}
              </MapView>

              {/* Floating GPS acquiring overlay */}
              {status === 'acquiring' && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.acquiringPill,
                    {
                      backgroundColor: isDark ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)',
                      borderColor: isDark ? 'rgba(94,234,212,0.3)' : '#CCFBF1',
                    },
                  ]}>
                  <ActivityIndicator size="small" color={isDark ? '#2DD4BF' : '#0D9488'} />
                  <Text style={[styles.acquiringText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
                    Acquiring your location...
                  </Text>
                </View>
              )}

              {/* Floating Recenter Control */}
              <TouchableOpacity
                onPress={handleRecenter}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Recenter map to fit locations"
                style={[
                  styles.recenterBtn,
                  {
                    backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.94)',
                    borderColor: hasUserMovedMap
                      ? '#0EA5A4'
                      : isDark
                        ? 'rgba(148,163,184,0.3)'
                        : 'rgba(148,163,184,0.35)',
                  },
                ]}>
                <LocateFixed
                  size={16}
                  color={hasUserMovedMap ? '#0EA5A4' : isDark ? '#E2E8F0' : '#334155'}
                  strokeWidth={2.4}
                />
              </TouchableOpacity>
            </View>
          </MapErrorBoundary>
        )}
      </View>

      {/* ── Distance Information ── */}
      {hasValidDestination && formattedDistance !== null && (
        <View
          style={[
            styles.distanceCard,
            {
              backgroundColor: isDark ? 'rgba(13,148,136,0.12)' : '#F0FDFA',
              borderColor: isDark ? 'rgba(45,212,191,0.28)' : '#CCFBF1',
            },
          ]}>
          <View style={styles.distanceLeft}>
            <View style={styles.dashedLegend}>
              <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
              <View style={[styles.legendDash, { backgroundColor: polylineColor }]} />
              <View style={[styles.legendDash, { backgroundColor: polylineColor }]} />
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            </View>
            <View>
              <Text style={[styles.distanceLabel, { color: isDark ? '#CCFBF1' : '#0F766E' }]}>
                Straight-line distance
              </Text>
              <Text style={[styles.distanceHint, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Direct distance • not a road route
              </Text>
            </View>
          </View>
          <Text style={[styles.distanceValue, { color: isDark ? '#5EEAD4' : '#0D9488' }]}>
            {formattedDistance}
          </Text>
        </View>
      )}

      {/* ── Permission / GPS Fallback States ── */}
      {hasValidDestination && status === 'permission_denied' && (
        <View
          style={[
            styles.alertBanner,
            {
              backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB',
              borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
            },
          ]}>
          <View style={styles.alertRow}>
            <TriangleAlert size={16} color={isDark ? '#FBBF24' : '#D97706'} strokeWidth={2.3} />
            <Text style={[styles.alertTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
              Location permission required for live distance
            </Text>
          </View>
          <Text style={[styles.alertDesc, { color: isDark ? '#CBD5E1' : '#78350F' }]}>
            Allow foreground location access to view your GPS marker and straight-line distance. You
            can still open road navigation directly.
          </Text>
          <View style={styles.alertActions}>
            <TouchableOpacity
              onPress={() => void enableLocation()}
              activeOpacity={0.8}
              style={[styles.alertPrimaryBtn, { backgroundColor: isDark ? '#D97706' : '#F59E0B' }]}>
              <Text style={styles.alertPrimaryBtnText}>
                {canAskAgain ? 'Enable Location' : 'Open Settings'}
              </Text>
            </TouchableOpacity>
            {canAskAgain && (
              <TouchableOpacity
                onPress={() => void openAppSettings()}
                activeOpacity={0.8}
                style={[
                  styles.alertSecondaryBtn,
                  { borderColor: isDark ? 'rgba(245,158,11,0.4)' : '#FCD34D' },
                ]}>
                <Settings size={13} color={isDark ? '#FDE68A' : '#92400E'} strokeWidth={2.2} />
                <Text
                  style={[styles.alertSecondaryBtnText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                  Open Settings
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {hasValidDestination && (status === 'services_disabled' || status === 'unavailable') && (
        <View
          style={[
            styles.alertBanner,
            {
              backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
              borderColor: isDark ? 'rgba(239,68,68,0.28)' : '#FECACA',
            },
          ]}>
          <View style={styles.alertRow}>
            <TriangleAlert size={16} color={isDark ? '#F87171' : '#DC2626'} strokeWidth={2.3} />
            <Text style={[styles.alertTitle, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              Current location unavailable
            </Text>
          </View>
          <Text style={[styles.alertDesc, { color: isDark ? '#CBD5E1' : '#7F1D1D' }]}>
            {status === 'services_disabled'
              ? 'Device location services (GPS) are disabled. Enable GPS and retry to compute your distance.'
              : 'Could not acquire a GPS fix right now. Ensure a clear signal and tap Retry.'}
          </Text>
          <View style={styles.alertActions}>
            <TouchableOpacity
              onPress={handleRefresh}
              activeOpacity={0.8}
              style={[styles.alertPrimaryBtn, { backgroundColor: isDark ? '#DC2626' : '#EF4444' }]}>
              <Text style={styles.alertPrimaryBtnText}>Retry</Text>
            </TouchableOpacity>
            {status === 'services_disabled' && (
              <TouchableOpacity
                onPress={() => void openAppSettings()}
                activeOpacity={0.8}
                style={[
                  styles.alertSecondaryBtn,
                  { borderColor: isDark ? 'rgba(239,68,68,0.4)' : '#FCA5A5' },
                ]}>
                <Settings size={13} color={isDark ? '#FCA5A5' : '#991B1B'} strokeWidth={2.2} />
                <Text
                  style={[styles.alertSecondaryBtnText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                  Open Settings
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Destination Address ── */}
      <View
        style={[
          styles.addressBox,
          {
            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}>
        <Text style={[styles.addressLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          Reported Address
        </Text>
        <Text style={[styles.addressValue, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
          {displayAddress}
        </Text>
      </View>

      {/* ── Prominent Navigate Button ── */}
      <TouchableOpacity
        onPress={handleNavigate}
        disabled={!hasValidDestination}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Navigate to issue location in native maps"
        accessibilityState={{ disabled: !hasValidDestination }}
        style={[styles.navigateBtnWrap, { opacity: hasValidDestination ? 1 : 0.55 }]}>
        {hasValidDestination ? (
          <LinearGradient
            colors={['#0D9488', '#0891B2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.navigateBtnGradient}>
            <Navigation size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.navigateBtnText}>Navigate</Text>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.navigateBtnGradient,
              { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
            ]}>
            <Navigation size={18} color={isDark ? '#94A3B8' : '#64748B'} strokeWidth={2.5} />
            <Text style={[styles.navigateBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Navigation Unavailable
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 20,
    borderRadius: 26,
    borderWidth: 1.5,
    padding: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrapper: {
    height: 210,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  mapTouchContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  acquiringPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  acquiringText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  recenterBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  mapFallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 6,
  },
  fallbackIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  fallbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  fallbackSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 17,
  },
  distanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  distanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dashedLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendDash: {
    width: 6,
    height: 2.5,
    borderRadius: 1.5,
  },
  distanceLabel: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  distanceHint: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  alertBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    flex: 1,
  },
  alertDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  alertPrimaryBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  alertPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  alertSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  alertSecondaryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  addressBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 3,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addressValue: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 19,
  },
  navigateBtnWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 2,
  },
  navigateBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
