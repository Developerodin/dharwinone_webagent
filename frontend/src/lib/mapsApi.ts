import { getAccessToken } from "@/lib/apiClient";

/**
 * Bearer header for the maps routes, authenticated now so the Google Maps key
 * cannot be spent by anonymous callers.
 */
function bearer(): Record<string, string> {
  return { Authorization: `Bearer ${getAccessToken() ?? ""}` };
}

export type PlacePrediction = {
  placeId: string;
  description: string;
};

export type PickedLocation = {
  address: string;
  lat: number;
  lng: number;
  placeId: string | null;
  mapsUrl: string | null;
};

type MapsOk<T> = { ok: true } & T;
type MapsErr = { ok: false; error: string };

/**
 * Reads a JSON Maps API response and throws the server error message.
 */
async function readMapsJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as MapsOk<T> | MapsErr;
  if (!response.ok || !data.ok) {
    throw new Error(data.ok ? "Maps request failed." : data.error);
  }
  return data;
}

/**
 * Fetches the browser Maps JavaScript API key from the backend.
 */
export async function fetchMapsConfig(): Promise<{ mapsKey: string }> {
  const response = await fetch("/api/maps/config", { headers: bearer() });
  return readMapsJson<{ mapsKey: string }>(response);
}

/**
 * Searches Places Autocomplete.
 */
export async function searchMapPlaces(query: string): Promise<PlacePrediction[]> {
  const response = await fetch("/api/maps/places", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer() },
    body: JSON.stringify({ query }),
  });
  const data = await readMapsJson<{ predictions: PlacePrediction[] }>(response);
  return data.predictions;
}

/**
 * Resolves a Place ID to a pin.
 */
export async function lookupMapPlace(placeId: string): Promise<PickedLocation> {
  const response = await fetch("/api/maps/place", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer() },
    body: JSON.stringify({ placeId }),
  });
  const data = await readMapsJson<{ location: PickedLocation }>(response);
  return data.location;
}

/**
 * Reverse-geocodes a map click.
 */
export async function reverseGeocodeMapPoint(
  lat: number,
  lng: number,
): Promise<PickedLocation> {
  const response = await fetch("/api/maps/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...bearer() },
    body: JSON.stringify({ lat, lng }),
  });
  const data = await readMapsJson<{ location: PickedLocation }>(response);
  return data.location;
}
