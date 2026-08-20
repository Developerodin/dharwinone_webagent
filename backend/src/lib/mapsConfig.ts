/**
 * Resolves the Google Maps server key from env.
 * Canonical `GOOGLE_MAPS_API_KEY`, with fallback to the existing `googel_api` typo.
 * Search/details use Places API (New); Maps JS is browser-only and needs billing.
 */
export function getGoogleMapsApiKey(): string | null {
  const canonical = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (canonical) return canonical;
  const legacy = process.env.googel_api?.trim();
  return legacy || null;
}
