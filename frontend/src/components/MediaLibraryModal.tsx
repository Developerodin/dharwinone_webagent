import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, LoaderCircle, Video, X } from "lucide-react";
import {
  listLibraryMedia,
  uploadToMediaLibrary,
  type LibraryMediaItem,
} from "@/lib/mediaLibrary";
import { isMediaFile } from "@/lib/uploadSectionImage";
import { MediaUploadDropzone } from "@/components/MediaUploadDropzone";

type MediaTab = "images" | "videos" | "upload";

type MediaLibraryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user picks an existing library item to attach. */
  onSelect: (item: LibraryMediaItem) => void;
};

/**
 * Media picker modal: Images / Videos library tabs + Upload dropzone.
 */
export function MediaLibraryModal({
  open,
  onOpenChange,
  onSelect,
}: MediaLibraryModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<MediaTab>("images");
  const [items, setItems] = useState<LibraryMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Reloads library items from the API.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await listLibraryMedia();
      setItems(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load media.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setTab("images");
    void refresh();
    closeRef.current?.focus();

    /**
     * Closes the modal on Escape.
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange, refresh]);

  /**
   * Uploads a file into the library, then selects it into the composer.
   */
  async function handleUpload(file: File) {
    if (!isMediaFile(file) || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const saved = await uploadToMediaLibrary(file);
      setItems((current) => [
        saved,
        ...current.filter((item) => item.imagePath !== saved.imagePath),
      ]);
      handleSelect(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  /**
   * Selects a library item and closes the modal.
   */
  function handleSelect(item: LibraryMediaItem) {
    onSelect(item);
    onOpenChange(false);
  }

  if (!open || typeof document === "undefined") return null;

  const images = items.filter((item) => item.mediaKind === "image");
  const videos = items.filter((item) => item.mediaKind === "video");
  const visible = tab === "videos" ? videos : images;

  return createPortal(
    <div className="fixed inset-0 z-[110] animate-shell-in" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close media library"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute top-1/2 left-1/2 flex max-h-[min(88vh,720px)] w-[min(100vw-1.5rem,560px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[var(--lovable-border)] bg-[var(--lovable-panel)] shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--lovable-border)] px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-sm font-semibold text-[var(--lovable-text)]"
            >
              Media
            </h2>
            <p className="text-[11px] text-[var(--lovable-text-muted)]">
              Pick from library or upload a new file
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]"
            aria-label="Close media modal"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div
          className="flex shrink-0 gap-1 border-b border-[var(--lovable-border)] px-3 pt-2"
          role="tablist"
          aria-label="Media sections"
        >
          {(
            [
              { id: "images", label: "Images", count: images.length },
              { id: "videos", label: "Videos", count: videos.length },
              { id: "upload", label: "Upload" },
            ] as const
          ).map((entry) => {
            const selected = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={selected}
                id={`media-tab-${entry.id}`}
                aria-controls={`media-panel-${entry.id}`}
                onClick={() => setTab(entry.id)}
                className={`relative -mb-px inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition ${
                  selected
                    ? "border-b-2 border-[var(--lovable-blue)] text-[var(--lovable-text)]"
                    : "text-[var(--lovable-text-muted)] hover:text-[var(--lovable-text)]"
                }`}
              >
                {entry.label}
                {"count" in entry ? (
                  <span className="rounded-md bg-[var(--lovable-hover)] px-1.5 py-0.5 text-[10px] tabular-nums">
                    {entry.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          {error ? (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            >
              {error}
            </p>
          ) : null}

          {tab === "upload" ? (
            <div
              id="media-panel-upload"
              role="tabpanel"
              aria-labelledby="media-tab-upload"
            >
              <MediaUploadDropzone
                disabled={uploading}
                busy={uploading}
                onFile={handleUpload}
              />
            </div>
          ) : (
            <div
              id={`media-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`media-tab-${tab}`}
            >
              {loading ? (
                <div
                  className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-[var(--lovable-text-muted)]"
                  aria-busy="true"
                >
                  <LoaderCircle
                    className="size-5 animate-spin"
                    aria-hidden="true"
                  />
                  <p className="text-xs">Loading media…</p>
                </div>
              ) : visible.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-[var(--lovable-text-muted)]">
                  {tab === "videos" ? (
                    <Video className="size-8 opacity-50" aria-hidden="true" />
                  ) : (
                    <ImageIcon className="size-8 opacity-50" aria-hidden="true" />
                  )}
                  <p className="text-sm font-medium text-[var(--lovable-text)]">
                    No {tab} yet
                  </p>
                  <p className="max-w-xs text-xs">
                    Upload from the Upload tab — they show up here for reuse.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("upload")}
                    className="mt-1 rounded-full bg-[var(--lovable-blue)] px-4 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                  >
                    Go to Upload
                  </button>
                </div>
              ) : (
                <ul
                  className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
                  aria-label={`Uploaded ${tab}`}
                >
                  {visible.map((item) => (
                    <li key={item.imagePath}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        className="group relative aspect-square w-full overflow-hidden rounded-xl border border-[var(--lovable-border)] bg-[var(--lovable-bg)] transition hover:border-[var(--lovable-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lovable-blue)]"
                        aria-label={`Select ${item.mediaKind} ${item.filename}`}
                      >
                        {item.mediaKind === "video" ? (
                          <video
                            src={item.imagePath}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                            aria-hidden="true"
                          />
                        ) : (
                          <img
                            src={item.imagePath}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-left text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                          <span className="line-clamp-1">{item.filename}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
