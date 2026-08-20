import { getGoogleMapsApiKey } from "./mapsConfig.js";

export type PlacePrediction = {
  placeId: string;
  description: string;
};

export type ResolvedPlace = {
  address: string;
  lat: number;
  lng: number;
  placeId: string | null;
  mapsUrl: string | null;
};

type PlacesErrorBody = {
  error?: {
    message?: string;
    status?: string;
  };
};

type AutocompleteResponse = PlacesErrorBody & {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      place?: string;
      text?: unknown;
    };
  }>;
};

type PlaceDetailsResponse = PlacesErrorBody & {
  id?: string;
  formattedAddress?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
};

type NearbySearchResponse = PlacesErrorBody & {
  places?: PlaceDetailsResponse[];
};

export class MapsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapsConfigError";
  }
}

export class MapsLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapsLookupError";
  }
}

/**
 * Throws a safe client-facing error when the Maps key is missing.
 */
function requireMapsKey(): string {
  const key = getGoogleMapsApiKey();
  if (!key) {
    throw new MapsConfigError("Google Maps is not configured.");
  }
  return key;
}

/**
 * Strips the `places/` resource prefix from a Places API (New) id.
 */
export function normalizePlaceId(id: string): string {
  return id.trim().replace(/^places\//, "");
}

/**
 * Reads autocomplete suggestion copy from either a string or `{ text }`.
 */
export function readSuggestionText(text: unknown): string {
  if (typeof text === "string") return text.trim();
  if (text && typeof text === "object" && "text" in text) {
    const value = (text as { text?: unknown }).text;
    if (typeof value === "string") return value.trim();
  }
  return "";
}

/**
 * Maps a Places API (New) error into a short UI message.
 */
export function placesErrorMessage(
  error: unknown,
  httpStatus: number,
): string {
  const body =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const lower = body.toLowerCase();
  if (lower.includes("billing")) {
    return "Google Cloud billing is not enabled for this Maps key.";
  }
  if (httpStatus === 403 || lower.includes("permission") || lower.includes("denied")) {
    return "Places API (New) is not allowed for this key. Enable it in Google Cloud.";
  }
  return "Could not search places right now.";
}

/**
 * Builds a Google Maps search URL for a coordinate pair.
 */
function buildMapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Coordinate-only pin when nearby lookup finds nothing.
 */
function coordPlace(lat: number, lng: number): ResolvedPlace {
  return {
    address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    lat,
    lng,
    placeId: null,
    mapsUrl: buildMapsSearchUrl(lat, lng),
  };
}

/**
 * Reads a Places API (New) JSON body and throws on Google error payloads.
 */
async function readPlacesJson<T extends PlacesErrorBody>(
  response: Response,
): Promise<T> {
  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    throw new MapsLookupError("Maps lookup failed. Try again in a moment.");
  }
  if (!response.ok || data.error) {
    throw new MapsLookupError(placesErrorMessage(data.error, response.status));
  }
  return data;
}

/**
 * POSTs to Places API (New) with a field mask.
 */
async function placesPost<T extends PlacesErrorBody>(
  path: string,
  body: unknown,
  fieldMask: string,
): Promise<T> {
  const key = requireMapsKey();
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });
  return readPlacesJson<T>(response);
}

/**
 * GETs a Places API (New) resource with a field mask.
 */
async function placesGet<T extends PlacesErrorBody>(
  path: string,
  fieldMask: string,
): Promise<T> {
  const key = requireMapsKey();
  const response = await fetch(`https://places.googleapis.com/v1/${path}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
    },
  });
  return readPlacesJson<T>(response);
}

/**
 * Searches Places API (New) autocomplete for a query string.
 */
export async function searchPlaces(query: string): Promise<PlacePrediction[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const data = await placesPost<AutocompleteResponse>(
    "places:autocomplete",
    { input: trimmed },
    "suggestions.placePrediction.placeId,suggestions.placePrediction.place,suggestions.placePrediction.text",
  );

  return (data.suggestions ?? [])
    .map((suggestion) => {
      const prediction = suggestion.placePrediction;
      const placeId = normalizePlaceId(
        prediction?.placeId || prediction?.place || "",
      );
      return {
        placeId,
        description: readSuggestionText(prediction?.text),
      };
    })
    .filter((prediction) => prediction.placeId && prediction.description)
    .slice(0, 8);
}

/**
 * Loads formatted address + coordinates for a Place ID via Places API (New).
 */
export async function lookupPlace(placeId: string): Promise<ResolvedPlace> {
  const id = normalizePlaceId(placeId);
  if (!id) {
    throw new MapsLookupError("Pick a place from the search results.");
  }

  const data = await placesGet<PlaceDetailsResponse>(
    `places/${encodeURIComponent(id)}`,
    "id,formattedAddress,location,googleMapsUri,displayName",
  );

  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new MapsLookupError("That place has no map coordinates.");
  }

  const address =
    data.formattedAddress?.trim() || data.displayName?.text?.trim() || "";
  if (!address) {
    throw new MapsLookupError("That place has no address.");
  }

  return {
    address,
    lat,
    lng,
    placeId: normalizePlaceId(data.id || id),
    mapsUrl: data.googleMapsUri ?? buildMapsSearchUrl(lat, lng),
  };
}

/**
 * Resolves a map click via Places API (New) nearby search (no Geocoding API).
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ResolvedPlace> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new MapsLookupError("Invalid map coordinates.");
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new MapsLookupError("Coordinates are out of range.");
  }

  try {
    const data = await placesPost<NearbySearchResponse>(
      "places:searchNearby",
      {
        maxResultCount: 1,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 150,
          },
        },
      },
      "places.formattedAddress,places.location,places.id,places.displayName,places.googleMapsUri",
    );

    const first = data.places?.[0];
    const address =
      first?.formattedAddress?.trim() ||
      first?.displayName?.text?.trim() ||
      "";
    if (!address) return coordPlace(lat, lng);

    return {
      address,
      lat,
      lng,
      placeId: first?.id ? normalizePlaceId(first.id) : null,
      mapsUrl: first?.googleMapsUri ?? buildMapsSearchUrl(lat, lng),
    };
  } catch (error) {
    if (error instanceof MapsConfigError) throw error;
    return coordPlace(lat, lng);
  }
}
