import { LocationPickerModal } from "@/components/LocationPickerModal";
import { readCoord } from "@/lib/googleMapsLinks";
import type { PickedLocation } from "@/lib/mapsApi";
import type { Brief } from "@/types/intake";
import type { Page } from "@/types/page";

type BuilderLocationPickerProps = {
  open: boolean;
  prefill: string;
  page: Page | null;
  brief: Brief | null;
  onClose: () => void;
  onConfirm: (location: PickedLocation) => void;
};

/**
 * Chat-triggered map picker, seeded from the current page/brief location.
 */
export function BuilderLocationPicker({
  open,
  prefill,
  page,
  brief,
  onClose,
  onConfirm,
}: BuilderLocationPickerProps) {
  const locationSection = page?.sections.find(
    (section) => section.type === "location_map",
  );
  const locationAddress =
    brief?.address ||
    (typeof locationSection?.content.address === "string"
      ? locationSection.content.address
      : "");

  return (
    <LocationPickerModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      prefill={prefill}
      initialAddress={locationAddress}
      initialLat={readCoord(locationSection?.content.lat ?? brief?.lat)}
      initialLng={readCoord(locationSection?.content.lng ?? brief?.lng)}
      onConfirm={onConfirm}
    />
  );
}
