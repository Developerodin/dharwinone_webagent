import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, MapPin, Search, X } from "lucide-react";
import { mountPickerMap, type PickerMapHandle } from "@/lib/mountPickerMap";
import {
  fetchMapsConfig,
  lookupMapPlace,
  reverseGeocodeMapPoint,
  searchMapPlaces,
  type PickedLocation,
  type PlacePrediction,
} from "@/lib/mapsApi";
import { readCoord } from "@/lib/googleMapsLinks";

type LocationPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: string;
  initialAddress?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirm: (location: PickedLocation) => void;
};

const DEFAULT_CENTER = { lat: 26.9124, lng: 75.7873 };

/**
 * Chat-triggered search + map pin picker for restaurant location.
 */
export function LocationPickerModal({
  open,
  onOpenChange,
  prefill = "",
  initialAddress = "",
  initialLat,
  initialLng,
  onConfirm,
}: LocationPickerModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const handlesRef = useRef<PickerMapHandle | null>(null);
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PickedLocation | null>(null);

  /**
   * Places the marker and stores the selected pin.
   */
  const applyLocation = useCallback((location: PickedLocation) => {
    setSelected(location);
    setError(null);
    handlesRef.current?.setPin(location.lat, location.lng, 16);
  }, []);

  useEffect(() => {
    if (!open) return;
    const startQuery = prefill || initialAddress;
    setQuery(startQuery);
    setPredictions([]);
    setError(null);
    const lat = readCoord(initialLat);
    const lng = readCoord(initialLng);
    setSelected(
      lat !== null && lng !== null
        ? {
            address: initialAddress || `${lat}, ${lng}`,
            lat,
            lng,
            placeId: null,
            mapsUrl: null,
          }
        : null,
    );
    closeRef.current?.focus();

    /**
     * Closes the picker on Escape without applying.
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange, prefill, initialAddress, initialLat, initialLng]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    /**
     * Boots the picker map and wires click-to-pin (Google, OSM fallback).
     */
    async function bootMap() {
      if (!mapNodeRef.current) return;
      setLoadingMap(true);
      setError(null);
      try {
        const { mapsKey } = await fetchMapsConfig();
        if (cancelled || !mapNodeRef.current) return;

        const lat = readCoord(initialLat) ?? DEFAULT_CENTER.lat;
        const lng = readCoord(initialLng) ?? DEFAULT_CENTER.lng;

        /**
         * Reverse-geocodes a dropped pin without blocking confirm on Geocoding API.
         */
        function onPin(pinLat: number, pinLng: number) {
          void reverseGeocodeMapPoint(pinLat, pinLng)
            .then((location) => {
              if (!cancelled) applyLocation(location);
            })
            .catch((err: unknown) => {
              if (!cancelled) {
                setError(err instanceof Error ? err.message : "Could not read that pin.");
              }
            });
        }

        const handle = await mountPickerMap({
          element: mapNodeRef.current,
          center: { lat, lng },
          zoom: readCoord(initialLat) !== null ? 15 : 12,
          googleKey: mapsKey,
          onPin,
        });
        if (cancelled) {
          handle.destroy();
          return;
        }
        handlesRef.current = handle;

        if (prefill.trim()) {
          const results = await searchMapPlaces(prefill.trim());
          if (!cancelled && results[0]) {
            const location = await lookupMapPlace(results[0].placeId);
            if (!cancelled) applyLocation(location);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load the map.");
        }
      } finally {
        if (!cancelled) setLoadingMap(false);
      }
    }

    void bootMap();
    return () => {
      cancelled = true;
      handlesRef.current?.destroy();
      handlesRef.current = null;
    };
  }, [open, applyLocation, initialLat, initialLng, prefill]);

  /**
   * Runs Places autocomplete for the current query.
   */
  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setPredictions([]);
      setError("Type at least 2 characters to search.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const next = await searchMapPlaces(trimmed);
      setPredictions(next);
      if (next.length === 0) setError("No places matched that search.");
    } catch (err) {
      setPredictions([]);
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  /**
   * Resolves a prediction into a map pin.
   */
  async function handlePickPrediction(prediction: PlacePrediction) {
    setSearching(true);
    setError(null);
    try {
      const location = await lookupMapPlace(prediction.placeId);
      applyLocation(location);
      setQuery(location.address);
      setPredictions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load that place.");
    } finally {
      setSearching(false);
    }
  }

  /**
   * Confirms the current pin when coordinates are valid.
   */
  function handleConfirm() {
    if (!selected) {
      setError("Search or click the map to drop a pin first.");
      return;
    }
    onConfirm(selected);
    onOpenChange(false);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] animate-shell-in" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close location picker"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute top-1/2 left-1/2 flex max-h-[min(92vh,760px)] w-[min(100vw-1.5rem,720px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)] shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--lovable-border)] px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-[var(--lovable-text)]">
              Select location
            </h2>
            <p className="text-[11px] text-[var(--lovable-text-muted)]">
              Search a place or drop a pin on the map
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]"
            aria-label="Close location picker"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <form className="shrink-0 border-b border-[var(--lovable-border)] p-3" onSubmit={(event) => void handleSearch(event)}>
          <label htmlFor={`${titleId}-search`} className="sr-only">
            Search for a place
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--lovable-text-muted)]"
              />
              <input
                id={`${titleId}-search`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cafe name, street, or neighbourhood"
                className="h-10 w-full rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-bg)] pr-3 pl-9 text-sm text-[var(--lovable-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--lovable-accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="inline-flex h-10 items-center rounded-xl bg-[var(--lovable-accent)] px-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        {predictions.length > 0 ? (
          <ul
            className="max-h-36 shrink-0 overflow-y-auto border-b border-[var(--lovable-border)]"
            role="listbox"
            aria-label="Place suggestions"
          >
            {predictions.map((prediction) => (
              <li key={prediction.placeId}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm text-[var(--lovable-text)] transition hover:bg-[var(--lovable-hover)]"
                  onClick={() => void handlePickPrediction(prediction)}
                >
                  <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--lovable-text-muted)]" />
                  {prediction.description}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="relative min-h-[240px] flex-1 bg-[var(--lovable-bg)]">
          <div ref={mapNodeRef} className="absolute inset-0" aria-label="Location map" />
          {loadingMap ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--lovable-panel)]/70">
              <LoaderCircle className="size-6 animate-spin text-[var(--lovable-text-muted)]" aria-hidden="true" />
              <span className="sr-only">Loading map</span>
            </div>
          ) : null}
        </div>

        <footer className="space-y-3 border-t border-[var(--lovable-border)] px-4 py-3">
          {error ? (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          {selected ? (
            <p className="text-sm text-[var(--lovable-text)]">
              <span className="font-medium">{selected.address}</span>
              <span className="mt-0.5 block text-[11px] text-[var(--lovable-text-muted)]">
                {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-[var(--lovable-text-muted)]">
              No pin yet — search or click the map.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="h-10 rounded-xl px-3 text-sm text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-10 rounded-xl bg-[var(--lovable-accent)] px-4 text-sm font-medium text-white disabled:opacity-50"
              disabled={!selected}
              onClick={handleConfirm}
            >
              Use this location
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
