// src/utils/haversine.ts
// Haversine formula: calculates distance in km between two lat/lng points.
// Used to filter offers by distance when lat/lng/radius are provided.

const EARTH_RADIUS_KM = 6371;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Returns a raw SQL fragment (for Prisma $queryRaw) that computes
 * Haversine distance in km between a shop's lat/lng and a given point.
 * Alias: "distance_km"
 */
export function haversineSQL(lat: number, lng: number): string {
  return `
    (6371 * acos(
      LEAST(1.0, cos(radians(${lat}))
        * cos(radians(s.latitude))
        * cos(radians(s.longitude) - radians(${lng}))
        + sin(radians(${lat}))
        * sin(radians(s.latitude))
    ))
  `.trim();
}
