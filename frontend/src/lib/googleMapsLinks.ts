export type MapPoint = {
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
};

/**
 * Reads a numeric lat/lng field from section content.
 */
export function readCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Builds a Google Maps directions URL from coords or a fallback address.
 */
export function directionsUrl(point: MapPoint): string | null {
  const lat = readCoord(point.lat);
  const lng = readCoord(point.lng);
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  const address = point.address?.trim();
  if (!address) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/**
 * Builds a Google Maps place/search URL.
 */
export function viewOnMapsUrl(point: MapPoint): string | null {
  const lat = readCoord(point.lat);
  const lng = readCoord(point.lng);
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const address = point.address?.trim();
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/**
 * Builds a key-free embed URL for location sections.
 * `iwloc=` hides Google's in-map Directions / View larger map card —
 * those actions live next to the address instead.
 */
export function mapsEmbedUrl(point: MapPoint): string | null {
  const lat = readCoord(point.lat);
  const lng = readCoord(point.lng);
  const query =
    lat !== null && lng !== null
      ? `${lat},${lng}`
      : point.address?.trim()
        ? encodeURIComponent(point.address.trim())
        : null;
  if (!query) return null;
  return `https://maps.google.com/maps?q=${query}&hl=en&z=15&ie=UTF8&output=embed&iwloc=`;
}
