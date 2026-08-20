import { mapsEmbedUrl, type MapPoint } from "@/lib/googleMapsLinks";

type LocationMapEmbedProps = {
  point: MapPoint;
  /** Accessible name for the iframe. */
  label?: string;
  className?: string;
};

/**
 * Key-free Google Maps embed used on published location sections.
 * Google's Directions / View on Maps chrome is clipped; those links stay
 * on the address via AddressActions.
 */
export function LocationMapEmbed({
  point,
  label = "Map",
  className = "",
}: LocationMapEmbedProps) {
  const src = mapsEmbedUrl(point);
  if (!src) {
    return (
      <div
        className={`flex min-h-[14rem] items-center justify-center border border-[var(--theme-line)] bg-[var(--theme-bg-alt)] text-sm text-[var(--theme-muted)] ${className}`}
      >
        Pick a location in chat to show the map.
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-[14rem] w-full overflow-hidden ${className}`}
      role="region"
      aria-label={label}
    >
      <iframe
        title={label}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute top-1/2 left-1/2 h-[calc(100%+7rem)] w-[calc(100%+4px)] max-w-none -translate-x-1/2 -translate-y-1/2 border-0"
      />
    </div>
  );
}
