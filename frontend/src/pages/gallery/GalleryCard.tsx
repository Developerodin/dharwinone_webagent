import { openGalleryPreview, type GalleryEntry } from "@/lib/galleryCatalog";
import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";

type GalleryCardProps = {
  entry: GalleryEntry;
};

/**
 * Catalog card for one registered section component.
 */
export function GalleryCard({ entry }: GalleryCardProps) {
  /**
   * Opens the isolated full-bleed preview in a new tab.
   */
  function handleView() {
    openGalleryPreview(entry.id);
  }

  return (
    <article className="flex flex-col rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)] p-4">
      <p className="text-[11px] font-medium tracking-wide text-[var(--lovable-text-faint)] uppercase">
        {getPageFamilyLabel(entry.family)}
      </p>
      <h3 className="mt-1.5 text-[15px] font-medium text-[var(--lovable-text)]">
        {entry.label}
      </h3>
      <p className="mt-1 font-mono text-[11px] text-[var(--lovable-text-faint)]">
        {entry.id}
      </p>
      <button
        type="button"
        onClick={handleView}
        className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-[var(--lovable-blue)] px-3 text-[13px] font-medium text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        aria-label={`View ${entry.label} in a new tab`}
      >
        View
      </button>
    </article>
  );
}
