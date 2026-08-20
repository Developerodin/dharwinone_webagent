import { Router } from "express";
import {
  lookupPlace,
  MapsConfigError,
  MapsLookupError,
  reverseGeocode,
  searchPlaces,
} from "../lib/googlePlaces.js";
import { getGoogleMapsApiKey } from "../lib/mapsConfig.js";

export const mapsRouter = Router();

/**
 * Maps a lookup failure to an HTTP status without leaking Google payloads.
 */
function mapsErrorStatus(error: unknown): { status: number; message: string } {
  if (error instanceof MapsConfigError) {
    return { status: 503, message: error.message };
  }
  if (error instanceof MapsLookupError) {
    return { status: 400, message: error.message };
  }
  return {
    status: 502,
    message: "Maps lookup failed. Try again in a moment.",
  };
}

/**
 * Returns the browser Maps JS key. SMTP credentials are never included.
 */
mapsRouter.get("/config", (_req, res) => {
  const mapsKey = getGoogleMapsApiKey();
  if (!mapsKey) {
    res.status(503).json({
      ok: false,
      error: "Google Maps is not configured.",
    });
    return;
  }
  res.json({ ok: true, mapsKey });
});

/**
 * Place autocomplete for the location picker search box.
 */
mapsRouter.post("/places", async (req, res) => {
  const query = typeof req.body?.query === "string" ? req.body.query : "";
  try {
    const predictions = await searchPlaces(query);
    res.json({ ok: true, predictions });
  } catch (error) {
    const mapped = mapsErrorStatus(error);
    res.status(mapped.status).json({ ok: false, error: mapped.message });
  }
});

/**
 * Resolves a Place ID to address + coordinates.
 */
mapsRouter.post("/place", async (req, res) => {
  const placeId =
    typeof req.body?.placeId === "string" ? req.body.placeId : "";
  try {
    const location = await lookupPlace(placeId);
    res.json({ ok: true, location });
  } catch (error) {
    const mapped = mapsErrorStatus(error);
    res.status(mapped.status).json({ ok: false, error: mapped.message });
  }
});

/**
 * Reverse-geocodes a map click via Places API (New) nearby search.
 */
mapsRouter.post("/geocode", async (req, res) => {
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  try {
    const location = await reverseGeocode(lat, lng);
    res.json({ ok: true, location });
  } catch (error) {
    const mapped = mapsErrorStatus(error);
    res.status(mapped.status).json({ ok: false, error: mapped.message });
  }
});
