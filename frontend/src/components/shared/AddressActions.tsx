import { Navigation, MapPinned } from "lucide-react";
import {
  directionsUrl,
  viewOnMapsUrl,
  type MapPoint,
} from "@/lib/googleMapsLinks";

type AddressActionsProps = {
  point: MapPoint;
  /** Dark location/contact cards invert the link color. */
  onDark?: boolean;
};

/**
 * Get Directions + View on Maps links for an address block.
 */
export function AddressActions({ point, onDark = false }: AddressActionsProps) {
  const directions = directionsUrl(point);
  const view = viewOnMapsUrl(point);
  if (!directions && !view) return null;

  const linkClass = onDark
    ? "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--theme-on-dark)]/90 underline-offset-4 transition hover:text-[var(--theme-accent)] hover:underline"
    : "inline-flex items-center gap-1.5 text-xs font-medium text-[var(--theme-accent)] underline-offset-4 transition hover:underline";

  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2" role="group" aria-label="Map actions">
      {directions ? (
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          <Navigation aria-hidden="true" className="size-3.5" />
          Get directions
        </a>
      ) : null}
      {view ? (
        <a
          href={view}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          <MapPinned aria-hidden="true" className="size-3.5" />
          View on Maps
        </a>
      ) : null}
    </div>
  );
}
