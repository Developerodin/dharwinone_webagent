import { loadGoogleMaps } from "@/lib/loadGoogleMaps";
import { loadLeaflet } from "@/lib/loadLeaflet";

export type PickerMapHandle = {
  setPin: (lat: number, lng: number, zoom?: number) => void;
  destroy: () => void;
};

type MountPickerMapOptions = {
  element: HTMLElement;
  center: { lat: number; lng: number };
  zoom: number;
  googleKey: string;
  onPin: (lat: number, lng: number) => void;
};

/**
 * Tries Google Maps JS, then swaps to OSM if billing/key auth greys the map out.
 */
export async function mountPickerMap(
  options: MountPickerMapOptions,
): Promise<PickerMapHandle> {
  let inner: PickerMapHandle | null = null;
  let destroyed = false;
  let fallbackStarted = false;
  let stopWatch: (() => void) | null = null;
  let lastPin: { lat: number; lng: number; zoom?: number } | null = null;

  /**
   * Replaces a failed Google map with Leaflet so search + pin still work.
   */
  async function fallbackToLeaflet() {
    if (destroyed || fallbackStarted) return;
    fallbackStarted = true;
    stopWatch?.();
    inner?.destroy();
    inner = await mountLeafletPickerMap(options);
    if (lastPin) inner.setPin(lastPin.lat, lastPin.lng, lastPin.zoom);
  }

  const proxy: PickerMapHandle = {
    setPin(lat, lng, zoom) {
      lastPin = { lat, lng, zoom };
      inner?.setPin(lat, lng, zoom);
    },
    destroy() {
      destroyed = true;
      stopWatch?.();
      inner?.destroy();
      inner = null;
    },
  };

  try {
    inner = await mountGooglePickerMap(options);
    stopWatch = watchGoogleMapFailure(options.element, () => {
      void fallbackToLeaflet();
    });
  } catch {
    inner = await mountLeafletPickerMap(options);
  }

  return proxy;
}

/**
 * Listens for Maps JS auth failure overlay or the global gm_authFailure hook.
 */
function watchGoogleMapFailure(
  element: HTMLElement,
  onFail: () => void,
): () => void {
  let fired = false;

  /**
   * Invokes onFail once when Google Maps reports an auth/billing error.
   */
  function failOnce() {
    if (fired) return;
    fired = true;
    onFail();
  }

  if (element.querySelector(".gm-err-container")) {
    failOnce();
    return () => undefined;
  }

  const previous = window.gm_authFailure;
  /**
   * Forwards to any prior hook, then triggers the Leaflet fallback.
   */
  function onAuthFail() {
    previous?.();
    failOnce();
  }
  window.gm_authFailure = onAuthFail;

  const observer = new MutationObserver(() => {
    if (element.querySelector(".gm-err-container")) failOnce();
  });
  observer.observe(element, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    if (window.gm_authFailure === onAuthFail) {
      window.gm_authFailure = previous;
    }
  };
}

/**
 * Boots an interactive Google map with click + drag pin.
 */
async function mountGooglePickerMap(
  options: MountPickerMapOptions,
): Promise<PickerMapHandle> {
  const maps = await loadGoogleMaps(options.googleKey);
  const map = new maps.Map(options.element, {
    center: options.center,
    zoom: options.zoom,
    disableDefaultUI: true,
    zoomControl: true,
  });
  const marker = new maps.Marker({
    map,
    position: options.center,
    draggable: true,
  });

  maps.event.addListener(map, "click", ((event: {
    latLng?: { lat: () => number; lng: () => number };
  }) => {
    const point = event.latLng;
    if (!point) return;
    options.onPin(point.lat(), point.lng());
  }) as (...args: never[]) => void);

  maps.event.addListener(marker, "dragend", (() => {
    const position = marker.getPosition();
    if (!position) return;
    options.onPin(position.lat(), position.lng());
  }) as (...args: never[]) => void);

  return {
    setPin(lat, lng, zoom = 16) {
      const position = { lat, lng };
      marker.setPosition(position);
      map.panTo(position);
      map.setZoom(zoom);
    },
    destroy() {
      options.element.replaceChildren();
    },
  };
}

/**
 * OSM raster map so pin-drop still works when Maps JS is greyed out.
 */
async function mountLeafletPickerMap(
  options: MountPickerMapOptions,
): Promise<PickerMapHandle> {
  options.element.replaceChildren();
  const L = await loadLeaflet();
  const map = L.map(options.element, {
    center: [options.center.lat, options.center.lng],
    zoom: options.zoom,
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 19,
  }).addTo(map);

  const marker = L.marker([options.center.lat, options.center.lng], {
    draggable: true,
  }).addTo(map);

  map.on("click", (event) => {
    options.onPin(event.latlng.lat, event.latlng.lng);
  });
  marker.on("dragend", () => {
    const point = marker.getLatLng();
    options.onPin(point.lat, point.lng);
  });

  window.setTimeout(() => map.invalidateSize(), 50);

  return {
    setPin(lat, lng, zoom = 16) {
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], zoom);
    },
    destroy() {
      map.off();
      map.remove();
      options.element.replaceChildren();
    },
  };
}
