type LeafletMap = {
  setView: (latlng: [number, number], zoom?: number) => void;
  panTo: (latlng: [number, number]) => void;
  on: (
    event: string,
    handler: (event: { latlng: { lat: number; lng: number } }) => void,
  ) => void;
  off: (event?: string) => void;
  remove: () => void;
  invalidateSize: () => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  setLatLng: (latlng: [number, number]) => void;
  getLatLng: () => { lat: number; lng: number };
  on: (event: string, handler: () => void) => void;
};

export type LeafletNamespace = {
  map: (
    element: HTMLElement,
    options: { center: [number, number]; zoom: number },
  ) => LeafletMap;
  tileLayer: (
    url: string,
    options: { attribution: string; maxZoom: number },
  ) => { addTo: (map: LeafletMap) => void };
  marker: (
    latlng: [number, number],
    options?: { draggable?: boolean },
  ) => LeafletMarker;
  Icon: {
    Default: {
      mergeOptions: (options: {
        iconRetinaUrl: string;
        iconUrl: string;
        shadowUrl: string;
      }) => void;
    };
  };
};

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

let leafletLoader: Promise<LeafletNamespace> | null = null;

/**
 * Loads Leaflet CSS + JS from the unpkg CDN once per session (no npm package).
 */
export async function loadLeaflet(): Promise<LeafletNamespace> {
  if (window.L) return window.L;
  if (leafletLoader) return leafletLoader;

  leafletLoader = (async () => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    await loadExternalScript(
      "leaflet-js",
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    );

    if (!window.L) {
      leafletLoader = null;
      throw new Error("Could not load the fallback map.");
    }
    const iconBase = "https://unpkg.com/leaflet@1.9.4/dist/images/";
    window.L.Icon.Default.mergeOptions({
      iconRetinaUrl: `${iconBase}marker-icon-2x.png`,
      iconUrl: `${iconBase}marker-icon.png`,
      shadowUrl: `${iconBase}marker-shadow.png`,
    });
    return window.L;
  })();

  return leafletLoader;
}

/**
 * Injects a script tag and waits for load or error.
 */
function loadExternalScript(id: string, src: string): Promise<void> {
  const existing = document.getElementById(id);
  if (existing) {
    if (window.L) return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load the fallback map.")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => {
      leafletLoader = null;
      reject(new Error("Could not load the fallback map."));
    };
    document.head.appendChild(script);
  });
}
