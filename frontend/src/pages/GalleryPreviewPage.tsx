import { useEffect, useMemo } from "react";
import { BrandMark } from "@/components/BrandMark";
import { pageComponentRegistry } from "@/components/pageRegistry";
import { parseGalleryComponentId } from "@/lib/galleryCatalog";
import { buildGalleryPage } from "@/lib/galleryFixtures";
import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";
import { PageRenderer } from "@/render/PageRenderer";

/**
 * Reads the component id from `?id=` on the gallery preview entry.
 */
function readGalleryComponentId(): string | null {
  if (typeof window === "undefined") return null;
  const id = new URLSearchParams(window.location.search).get("id");
  return id?.trim() ? id.trim() : null;
}

/**
 * Full-bleed isolated preview of one registered section component.
 */
export function GalleryPreviewPage() {
  const componentId = useMemo(() => readGalleryComponentId(), []);
  const parsed = componentId ? parseGalleryComponentId(componentId) : null;
  const registered = Boolean(
    componentId && pageComponentRegistry[componentId],
  );
  const page = componentId ? buildGalleryPage(componentId) : null;

  useEffect(() => {
    const previous = document.title;
    document.title = parsed
      ? `${parsed.label} · Gallery`
      : "Component not found · Gallery";
    return () => {
      document.title = previous;
    };
  }, [parsed]);

  if (!componentId || !parsed || !registered || !page) {
    return (
      <div className="builder-shell flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <BrandMark className="size-12" labelled />
        <h1
          className="text-3xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Component not found
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
          {componentId
            ? `No registered component named ${componentId}.`
            : "Open a component from the gallery with View."}
        </p>
        <a
          href="/#gallery"
          className="inline-flex min-h-10 items-center rounded-lg bg-[var(--ink)] px-4 text-sm font-medium text-white transition hover:bg-[var(--accent)]"
        >
          Back to gallery
        </a>
      </div>
    );
  }

  const familyLabel = getPageFamilyLabel(parsed.family);

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <a
        href="#gallery-preview"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to component preview
      </a>
      <div
        className="builder-header fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-4 text-xs"
        role="banner"
      >
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark className="size-6" />
          <span className="truncate text-[var(--muted)]">
            Gallery · {familyLabel} · {parsed.label}
          </span>
        </div>
        <a
          href="/#gallery"
          className="inline-flex min-h-8 shrink-0 items-center rounded-lg bg-[var(--accent)] px-3 font-medium text-white transition hover:opacity-90"
        >
          Back to gallery
        </a>
      </div>
      <div id="gallery-preview" className="pt-[var(--shell-header-h)]">
        <PageRenderer page={page} />
      </div>
    </div>
  );
}
