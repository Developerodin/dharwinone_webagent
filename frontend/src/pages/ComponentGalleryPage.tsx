import { useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { PAGE_FAMILIES, type PageFamily } from "@/lib/pageFamily";
import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";
import {
  filterGalleryEntries,
  GALLERY_SECTION_LABELS,
  GALLERY_SECTION_ORDER,
  groupGalleryEntries,
  listGalleryEntries,
} from "@/lib/galleryCatalog";
import { GalleryCard } from "@/pages/gallery/GalleryCard";
import type { SectionType } from "@/types/page";
import { cn } from "@/lib/utils";

type ComponentGalleryPageProps = {
  /** Opens the mobile workspace drawer (< md). */
  onOpenMenu?: () => void;
};

type FamilyFilter = PageFamily | "all";
type SectionFilter = SectionType | "all";

/**
 * Catalog of every registered section component, grouped by section type.
 */
export function ComponentGalleryPage({ onOpenMenu }: ComponentGalleryPageProps) {
  const [family, setFamily] = useState<FamilyFilter>("all");
  const [sectionType, setSectionType] = useState<SectionFilter>("all");
  const allEntries = useMemo(() => listGalleryEntries(), []);

  const groups = useMemo(() => {
    const filtered = filterGalleryEntries(allEntries, { family, sectionType });
    return groupGalleryEntries(filtered);
  }, [allEntries, family, sectionType]);

  const visibleCount = groups.reduce(
    (sum, group) => sum + group.entries.length,
    0,
  );

  return (
    <main
      className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[var(--lovable-bg)]"
      aria-label="Component gallery"
    >
      <header className="sticky top-0 z-10 border-b border-[var(--lovable-border)] bg-[var(--lovable-bg)]/95 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="flex items-start gap-3">
          {onOpenMenu ? (
            <button
              type="button"
              onClick={onOpenMenu}
              className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)] text-[var(--lovable-text)] transition hover:bg-[var(--lovable-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:hidden"
              aria-label="Open workspace navigation"
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--lovable-text)] sm:text-2xl">
              Components
            </h1>
            <p className="mt-1 text-[13px] text-[var(--lovable-text-muted)]">
              {visibleCount} of {allEntries.length} registered. View opens a
              full-bleed preview with sample copy and images.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <FilterRow
            legend="Theme"
            options={[
              { id: "all", label: "All themes" },
              ...PAGE_FAMILIES.map((id) => ({
                id,
                label: getPageFamilyLabel(id),
              })),
            ]}
            value={family}
            onChange={(next) => setFamily(next as FamilyFilter)}
          />
          <FilterRow
            legend="Section"
            options={[
              { id: "all", label: "All sections" },
              ...GALLERY_SECTION_ORDER.map((id) => ({
                id,
                label: GALLERY_SECTION_LABELS[id],
              })),
            ]}
            value={sectionType}
            onChange={(next) => setSectionType(next as SectionFilter)}
          />
        </div>
      </header>

      <div className="flex flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
        {groups.length === 0 ? (
          <p
            className="rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-4 py-8 text-center text-sm text-[var(--lovable-text-muted)]"
            role="status"
          >
            No components match these filters.
          </p>
        ) : (
          groups.map((group) => (
            <section
              key={group.sectionType}
              aria-labelledby={`gallery-${group.sectionType}`}
            >
              <div className="mb-4 flex items-baseline gap-2">
                <h2
                  id={`gallery-${group.sectionType}`}
                  className="text-sm font-semibold tracking-wide text-[var(--lovable-text)] uppercase"
                >
                  {group.label}
                </h2>
                <span className="text-[12px] text-[var(--lovable-text-faint)] tabular-nums">
                  {group.entries.length}
                </span>
              </div>
              <ul
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                role="list"
              >
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <GalleryCard entry={entry} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

type FilterOption = { id: string; label: string };

type FilterRowProps = {
  legend: string;
  options: FilterOption[];
  value: string;
  onChange: (next: string) => void;
};

/**
 * Horizontal chip row for gallery family/section filters.
 */
function FilterRow({ legend, options, value, onChange }: FilterRowProps) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
          <div
            className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[12px] transition",
                selected
                  ? "border-white/20 bg-[var(--lovable-active)] font-medium text-[var(--lovable-text)]"
                  : "border-[var(--lovable-border)] text-[var(--lovable-text-muted)] hover:border-white/15 hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
