export type GoogleMapsNamespace = {
  Map: new (
    element: HTMLElement,
    options: {
      center: { lat: number; lng: number };
      zoom: number;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
    },
  ) => GoogleMapHandle;
  Marker: new (options: {
    map: GoogleMapHandle;
    position: { lat: number; lng: number };
    draggable?: boolean;
  }) => GoogleMarkerHandle;
  event: {
    addListener: (
      instance: object,
      eventName: string,
      handler: (...args: never[]) => void,
    ) => void;
  };
};

type GoogleMapHandle = {
  setCenter: (position: { lat: number; lng: number }) => void;
  panTo: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};

type GoogleMarkerHandle = {
  setPosition: (position: { lat: number; lng: number }) => void;
  getPosition: () => { lat: () => number; lng: () => number } | null;
};

// `window.google` is declared in src/types/google.d.ts — Maps and Identity
// Services share the global, so the declaration cannot live in either loader.

let mapsLoader: Promise<GoogleMapsNamespace> | null = null;

/**
 * Loads the Google Maps JavaScript API once per session.
 */
export async function loadGoogleMaps(
  apiKey: string,
): Promise<GoogleMapsNamespace> {
  if (window.google?.maps?.Map) return window.google.maps;
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-maps-js");
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.google?.maps?.Map) resolve(window.google.maps);
        else reject(new Error("Could not load Google Maps."));
      });
      existing.addEventListener("error", () => {
        mapsLoader = null;
        reject(new Error("Could not load Google Maps."));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.onload = () => {
      if (window.google?.maps?.Map) resolve(window.google.maps);
      else {
        mapsLoader = null;
        reject(new Error("Could not load Google Maps."));
      }
    };
    script.onerror = () => {
      mapsLoader = null;
      reject(new Error("Could not load Google Maps."));
    };
    document.head.appendChild(script);
  });

  return mapsLoader;
}
