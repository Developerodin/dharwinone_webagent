import { useCallback, useEffect, useRef, useState } from "react";
import { ImageOff, Trash2, Upload } from "lucide-react";
import { ApiError } from "@/auth/types";
import { assetsEnabled, assetUsage, unlinkAsset } from "@/lib/assetApi";
import {
  listLibraryMedia,
  uploadToMediaLibrary,
  type LibraryMediaItem,
} from "@/lib/mediaLibrary";
import {
  formatUploadTargetLabel,
  listImageUploadTargets,
  type ImageUploadTarget,
} from "@/lib/uploadSectionImage";
import type { Page } from "@/types/page";
import { cn } from "@/lib/utils";

export type AssetsPanelProps = {
  page: Page | null;
  /** Places a library item into a section slot. */
  onApplyToSection?: (
    item: { imagePath: string; assetId?: string },
    target: ImageUploadTarget,
  ) => void;
  busy?: boolean;
};

/**
 * Formats a byte count for a storage meter.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * The project's media library.
 *
 * Every file here is one stored object shared across projects — uploading the
 * same photo twice stores it once — so removing an item only detaches it from
 * pages; the bytes go when nothing references them.
 */
export function AssetsPanel({
  page,
  onApplyToSection,
  busy = false,
}: AssetsPanelProps) {
  const [items, setItems] = useState<LibraryMediaItem[]>([]);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targets = page ? listImageUploadTargets(page) : [];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const media = await listLibraryMedia();
      setItems(media);

      // Usage only exists where object storage does; the legacy disk library
      // has no quota to report.
      if (await assetsEnabled()) {
        setUsage(await assetUsage());
      }
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : "Could not load your media.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Uploads a file into the library without placing it on the page.
   */
  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploadProgress(0);

    try {
      await uploadToMediaLibrary(file, setUploadProgress);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /**
   * Detaches an asset from every project.
   */
  async function handleRemove(item: LibraryMediaItem) {
    if (!item.assetId) return;
    setError(null);

    try {
      await unlinkAsset(item.assetId);
      setItems((current) =>
        current.filter((entry) => entry.assetId !== item.assetId),
      );
      if (selectedId === item.assetId) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that.");
    }
  }

  const usedFraction =
    usage && usage.limit > 0 ? Math.min(1, usage.used / usage.limit) : 0;

  return (
    <section
      className="chat-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--lovable-bg)] px-4 py-4"
      aria-label="Media library"
    >
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-[13px] font-medium text-[var(--lovable-text)]">
          Media
        </h2>

        {usage ? (
          <div className="flex min-w-40 flex-1 items-center gap-2">
            <div
              className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--lovable-border)]"
              role="progressbar"
              aria-valuenow={Math.round(usedFraction * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Storage used"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  usedFraction > 0.9 ? "bg-red-400" : "bg-white/40",
                )}
                style={{ width: `${Math.max(2, usedFraction * 100)}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] text-[var(--lovable-text-faint)] tabular-nums">
              {formatBytes(usage.used)} / {formatBytes(usage.limit)}
            </span>
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(event) => void handleUpload(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadProgress !== null || busy}
          className="inline-flex min-h-7 items-center gap-1.5 rounded-lg border border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-2.5 text-[12px] text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] disabled:opacity-40"
        >
          <Upload className="size-3.5" aria-hidden="true" />
          {uploadProgress !== null
            ? `Uploading ${Math.round(uploadProgress * 100)}%`
            : "Upload"}
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-[12px] text-[var(--lovable-text-faint)]">
          Loading media…
        </p>
      ) : items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <ImageOff
            className="size-6 text-[var(--lovable-text-faint)]"
            aria-hidden="true"
          />
          <p className="text-[12px] text-[var(--lovable-text-faint)]">
            No media yet. Upload a photo or video to reuse it across projects.
          </p>
        </div>
      ) : (
        <ul
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          role="list"
        >
          {items.map((item) => {
            const id = item.assetId ?? item.imagePath;
            const isSelected = selectedId === id;

            return (
              <li
                key={id}
                className="overflow-hidden rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)]"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : id)}
                  className={cn(
                    "block aspect-4/3 w-full overflow-hidden transition",
                    isSelected && "ring-2 ring-white/50",
                  )}
                  aria-pressed={isSelected}
                  aria-label={`Select ${item.filename}`}
                >
                  {item.mediaKind === "video" ? (
                    <video
                      src={item.imagePath}
                      muted
                      playsInline
                      preload="metadata"
                      className="size-full object-cover"
                    />
                  ) : (
                    <img
                      src={item.imagePath}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </button>

                <div className="flex items-center gap-1 px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--lovable-text-faint)]">
                    {formatBytes(item.bytes)}
                  </span>
                  {item.assetId ? (
                    <button
                      type="button"
                      onClick={() => void handleRemove(item)}
                      className="inline-flex size-6 items-center justify-center rounded-md text-[var(--lovable-text-faint)] transition hover:bg-red-500/10 hover:text-red-300"
                      aria-label={`Remove ${item.filename} from your library`}
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>

                {isSelected && onApplyToSection && targets.length > 0 ? (
                  <div className="border-t border-[var(--lovable-border)] p-2">
                    <label className="sr-only" htmlFor={`place-${id}`}>
                      Place {item.filename} into a section
                    </label>
                    <select
                      id={`place-${id}`}
                      defaultValue=""
                      disabled={busy}
                      onChange={(event) => {
                        const index = Number(event.target.value);
                        const target = targets[index];
                        if (!target) return;
                        onApplyToSection(
                          {
                            imagePath: item.imagePath,
                            assetId: item.assetId,
                          },
                          target,
                        );
                        event.target.value = "";
                        setSelectedId(null);
                      }}
                      className="w-full rounded-md border border-[var(--lovable-border)] bg-[var(--lovable-bg)] px-1.5 py-1 text-[11px] text-[var(--lovable-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                    >
                      <option value="">Place in…</option>
                      {targets.map((target, index) => (
                        <option key={target.assetKey} value={index}>
                          {formatUploadTargetLabel(target)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
