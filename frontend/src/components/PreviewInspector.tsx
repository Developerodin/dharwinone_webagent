import { useRef, useState } from "react";
import type { Page, PageAsset, PageSection } from "@/types/page";
import type { PageFamily } from "@/lib/pageFamily";
import { loadProject, saveProject } from "@/lib/projectStorage";
import { newIntentKey, saveServerVersion } from "@/lib/projectApi";
import { savePreviewPayload } from "@/lib/previewStorage";
import { uploadSectionImage } from "@/lib/uploadSectionImage";
import {
  isVideoMediaPath,
  SectionMedia,
} from "@/components/shared/SectionMedia";

type PreviewInspectorProps = {
  page: Page;
  pageFamily: PageFamily;
  businessName?: string;
  projectId?: string;
  open: boolean;
  onToggle: () => void;
  onPageChange: (page: Page) => void;
};

/**
 * Dev-facing inspector with section ids + drag/drop image replace.
 */
export function PreviewInspector({
  page,
  pageFamily,
  businessName,
  projectId,
  open,
  onToggle,
  onPageChange,
}: PreviewInspectorProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /**
   * Persists an updated page to the server, then to the local cache.
   *
   * Direct manipulation has no instruction to re-run, so the page itself is the
   * intent and has to be committed as a version explicitly. Writing only to the
   * cache would lose the change on the next reload, when the server's copy of
   * the page is fetched back over it.
   */
  async function persistPage(next: Page) {
    onPageChange(next);
    savePreviewPayload({
      page: next,
      pageFamily,
      businessName,
      projectId,
    });

    if (!projectId) return;

    const existing = loadProject(projectId);
    if (!existing) return;

    try {
      const saved = await saveServerVersion({
        projectId,
        page: next,
        brief: existing.brief,
        direction: existing.direction,
        pageFamily,
        summary: "Edited in inspector",
        expectedVersion: existing.serverVersion ?? 0,
        idempotencyKey: newIntentKey(),
      });

      // Cache only what the server accepted. Writing the page here on failure
      // would leave the cache claiming a change the server never stored.
      const current = loadProject(projectId) ?? existing;
      saveProject({
        ...current,
        page: next,
        updatedAt: Date.now(),
        serverVersion: saved.version,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `Couldn't save: ${saveError.message}`
          : "Couldn't save that change.",
      );
    }
  }

  /**
   * Handles a dropped/selected file for one asset slot.
   */
  async function handleFile(
    section: PageSection,
    asset: PageAsset,
    file: File | undefined,
  ) {
    if (!file) {
      setError("Please choose an image (jpg, png, webp) or video (mp4, webm, mov).");
      return;
    }
    const key = `${section.type}:${asset.key}`;
    setBusyKey(key);
    setError(null);
    try {
      const uploadable = new Set([
        "hero",
        "about",
        "gallery",
        "team",
        "reservation",
        "location_map",
      ]);
      if (!uploadable.has(section.type)) {
        throw new Error("This section does not support media uploads.");
      }
      const result = await uploadSectionImage({
        file,
        page,
        target: {
          section: section.type as
            | "hero"
            | "about"
            | "gallery"
            | "team"
            | "reservation"
            | "location_map",
          assetKey: asset.key,
        },
      });
      await persistPage(result.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(100%-2rem,24rem)]">
      <button
        type="button"
        onClick={onToggle}
        className="mb-2 inline-flex min-h-9 items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--ink)] shadow-sm transition hover:border-[var(--accent)]"
        aria-expanded={open}
        aria-controls="preview-inspector-panel"
      >
        {open ? "Hide inspector" : "Inspect sections"}
      </button>

      {open ? (
        <div
          id="preview-inspector-panel"
          role="region"
          aria-label="Section inspector"
          className="max-h-[55vh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]/95 p-3 text-xs shadow-[0_12px_40px_rgba(10,14,23,0.12)] backdrop-blur animate-shell-in"
        >
          <p className="mb-1 text-sm font-semibold text-[var(--ink)]">
            {page.sections.length} sections
          </p>
          <p className="mb-3 text-[11px] leading-relaxed text-[var(--muted)]">
            Drag & drop an image or video onto any asset, or tap Replace.
          </p>
          {error ? (
            <p className="mb-2 rounded-lg bg-red-50 px-2 py-1.5 text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <ul className="space-y-2.5" role="list">
            {page.sections.map((section, index) => (
              <li
                key={`${section.componentId}-${index}`}
                className="rounded-xl border border-[var(--line)] bg-[var(--paper)]/60 p-2.5"
              >
                <p className="font-medium text-[var(--ink)]">
                  {index + 1}. {section.type}
                </p>
                <p className="mt-0.5 text-[var(--muted)]">{section.componentId}</p>
                {section.assets.length === 0 ? (
                  <p className="mt-1 text-amber-700">No assets</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {section.assets.map((asset) => {
                      const key = `${section.type}:${asset.key}`;
                      const busy = busyKey === key;
                      return (
                        <li key={asset.key}>
                          <div
                            className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface)] p-2 transition hover:border-[var(--accent)]"
                            onDragOver={(event) => {
                              event.preventDefault();
                              event.dataTransfer.dropEffect = "copy";
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              void handleFile(
                                section,
                                asset,
                                event.dataTransfer.files?.[0],
                              );
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <SectionMedia
                                src={asset.imagePath}
                                className="h-12 w-10 shrink-0 rounded object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-[var(--ink)]">
                                  {asset.key}
                                  {isVideoMediaPath(asset.imagePath)
                                    ? " · video"
                                    : ""}
                                </p>
                                <p className="truncate text-[10px] text-[var(--muted)]">
                                  {asset.imagePath}
                                </p>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-[var(--ink)] transition hover:border-[var(--accent)] disabled:opacity-50"
                                    onClick={() =>
                                      inputRefs.current[key]?.click()
                                    }
                                    aria-label={`Replace ${section.type} ${asset.key} media`}
                                  >
                                    {busy ? "Uploading…" : "Replace"}
                                  </button>
                                  <input
                                    ref={(el) => {
                                      inputRefs.current[key] = el;
                                    }}
                                    type="file"
                                    accept="image/*,video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.ogg"
                                    className="sr-only"
                                    aria-hidden
                                    onChange={(event) => {
                                      void handleFile(
                                        section,
                                        asset,
                                        event.target.files?.[0],
                                      );
                                      event.target.value = "";
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
