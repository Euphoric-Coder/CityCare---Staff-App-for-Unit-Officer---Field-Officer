import { haversineDistanceMeters } from './cityIssueAnalytics';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface IssueAddressParts {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  fallbackLocation?: string | null;
}

export const EARTH_RADIUS_KM = 6371;
export const CLOSE_PROXIMITY_METERS = 35;

/**
 * Parses a numeric or numeric-string coordinate value safely while treating
 * explicit 0 / "0" as valid and rejecting empty strings, booleans, nullish, and non-finite inputs.
 */
export function parseCoordinateValue(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Object.is(value, -0) ? 0 : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return Object.is(parsed, -0) ? 0 : parsed;
  }

  return null;
}

/**
 * Validates and normalizes latitude [-90, 90] and longitude [-180, 180].
 * Correctly accepts (0, 0) while rejecting missing or malformed values.
 */
export function parseCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  const lat = parseCoordinateValue(latitude);
  const lng = parseCoordinateValue(longitude);

  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { latitude: lat, longitude: lng };
}

export function isValidCoordinates(
  coords: { latitude?: unknown; longitude?: unknown } | null | undefined
): coords is Coordinates {
  if (!coords) return false;
  return parseCoordinates(coords.latitude, coords.longitude) !== null;
}

export function areCoordinatesEqual(
  a: Coordinates | null | undefined,
  b: Coordinates | null | undefined,
  epsilon = 1e-6
): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.latitude - b.latitude) <= epsilon && Math.abs(a.longitude - b.longitude) <= epsilon
  );
}

/**
 * Computes straight-line distance in metres using the shared Haversine implementation
 * (Earth radius 6,371 km) with strict validation against invalid coordinates or NaN/Infinity.
 */
export function calculateStraightLineDistanceMeters(
  origin: Coordinates | null | undefined,
  destination: Coordinates | null | undefined
): number | null {
  if (!origin || !destination) return null;

  const validOrigin = parseCoordinates(origin.latitude, origin.longitude);
  const validDestination = parseCoordinates(destination.latitude, destination.longitude);

  if (!validOrigin || !validDestination) return null;

  if (
    validOrigin.latitude === validDestination.latitude &&
    validOrigin.longitude === validDestination.longitude
  ) {
    return 0;
  }

  const rawMeters = Number(
    haversineDistanceMeters(
      validOrigin.latitude,
      validOrigin.longitude,
      validDestination.latitude,
      validDestination.longitude
    )
  );

  if (!Number.isFinite(rawMeters) || rawMeters < 0) return null;
  return rawMeters;
}

/**
 * Formats metres (< 1 km in m, >= 1 km in km rounded to 1 decimal place).
 */
export function formatDistance(distanceMeters: number | null | undefined): string | null {
  if (
    typeof distanceMeters !== 'number' ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  ) {
    return null;
  }

  if (distanceMeters < 1000) {
    const roundedMeters = Math.round(distanceMeters);
    if (roundedMeters < 1000) {
      return `${roundedMeters} m`;
    }
  }

  const kilometers = distanceMeters / 1000;
  return `${kilometers.toFixed(1)} km`;
}

/**
 * Computes an initial MapView region framing both points cleanly, or falling back
 * to a comfortable street-level zoom when only the destination is available.
 */
export function getInitialMapRegion(
  destination: Coordinates | null,
  origin?: Coordinates | null
): MapRegion | null {
  if (!destination) return null;

  if (!origin) {
    return {
      latitude: destination.latitude,
      longitude: destination.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    };
  }

  const midLat = (destination.latitude + origin.latitude) / 2;
  const midLng = (destination.longitude + origin.longitude) / 2;
  const latSpan = Math.abs(destination.latitude - origin.latitude);
  const lngSpan = Math.abs(destination.longitude - origin.longitude);

  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: Math.max(0.004, latSpan * 1.6),
    longitudeDelta: Math.max(0.004, lngSpan * 1.6),
  };
}

/**
 * Normalizes address pieces from a Convex / UI issue record without trailing separators.
 */
export function formatIssueAddress({
  address,
  city,
  state,
  postal,
  fallbackLocation,
}: IssueAddressParts): string {
  const cleanSegments = [address, city, state, postal]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(
      (part) =>
        part.length > 0 && part.toLowerCase() !== 'undefined' && part.toLowerCase() !== 'null'
    );

  if (cleanSegments.length > 0) {
    return cleanSegments.join(', ');
  }

  if (typeof fallbackLocation === 'string') {
    const cleanedFallback = fallbackLocation
      .split(',')
      .map((segment) => segment.trim())
      .filter(
        (segment) =>
          segment.length > 0 &&
          segment.toLowerCase() !== 'undefined' &&
          segment.toLowerCase() !== 'null'
      )
      .join(', ');
    if (cleanedFallback.length > 0) {
      return cleanedFallback;
    }
  }

  return 'Address not specified';
}
