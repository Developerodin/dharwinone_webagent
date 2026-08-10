import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MediaLibraryModal } from "@/components/MediaLibraryModal";
import type { LibraryMediaItem } from "@/lib/mediaLibrary";
import type { Page } from "@/types/page";
import {
  formatUploadTargetLabel,
  isMediaFile,
  isVideoFile,
  listImageUploadTargets,
  type ImageUploadTarget,
} from "@/lib/uploadSectionImage";

type PendingMedia =
  | { source: "file"; file: File }
  | {
      source: "library";
      imagePath: string;
      mediaKind: "image" | "video";
      filename: string;
    };

type ChatInputProps = {
  onSubmit: (text: string) => void;
  /** When set, shows attach/drop UI for replacing section images/videos. */
  onUploadImage?: (file: File, target: ImageUploadTarget) => void;
  /** Applies an existing library path to a section slot. */
  onApplyLibraryMedia?: (
    imagePath: string,
    target: ImageUploadTarget,
  ) => void;
  page?: Page | null;
  allowImageUpload?: boolean;
  disabled: boolean;
  placeholder?: string;
  /** Editor = dark Lovable chrome; default keeps builder-composer tokens. */
  variant?: "default" | "editor";
};

/**
 * Conversational input with optional image/video attach for section replacements.
 */
export function ChatInput({
  onSubmit,
  onUploadImage,
  onApplyLibraryMedia,
  page = null,
  allowImageUpload = false,
  disabled,
  placeholder = "Describe your restaurant…",
  variant = "default",
}: ChatInputProps) {
  const isEditor = variant === "editor";
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<PendingMedia | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetKey, setTargetKey] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const targets = useMemo(
    () => (page && allowImageUpload ? listImageUploadTargets(page) : []),
    [page, allowImageUpload],
  );
  const selectedTarget =
    targets.find((target) => `${target.section}:${target.assetKey}` === targetKey) ??
    targets[0] ??
    null;
  const pendingIsVideo =
    pending?.source === "file"
      ? isVideoFile(pending.file)
      : pending?.mediaKind === "video";

  useEffect(() => {
    if (targets.length === 0) {
      setTargetKey("");
      return;
    }
    const stillValid = targets.some(
      (target) => `${target.section}:${target.assetKey}` === targetKey,
    );
    if (!stillValid) {
      const first = targets[0];
      if (first) {
        setTargetKey(`${first.section}:${first.assetKey}`);
      }
    }
  }, [targets, targetKey]);

  useEffect(() => {
    if (!pending) {
      setPreviewUrl(null);
      return;
    }
    if (pending.source === "library") {
      setPreviewUrl(pending.imagePath);
      return;
    }
    const url = URL.createObjectURL(pending.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  /**
   * Sends text and/or queued media upload.
   */
  function handleSubmit() {
    if (disabled) return;

    if (pending && selectedTarget) {
      if (pending.source === "file" && onUploadImage) {
        onUploadImage(pending.file, selectedTarget);
        setPending(null);
        setValue("");
        return;
      }
      if (pending.source === "library" && onApplyLibraryMedia) {
        onApplyLibraryMedia(pending.imagePath, selectedTarget);
        setPending(null);
        setValue("");
        return;
      }
    }

    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  /**
   * Queues an image or video file for upload on send.
   */
  function queueFile(file: File | undefined) {
    if (!file || !isMediaFile(file)) return;
    setPending({ source: "file", file });
  }

  /**
   * Queues a library media item for apply-on-send.
   */
  function queueLibraryItem(item: LibraryMediaItem) {
    setPending({
      source: "library",
      imagePath: item.imagePath,
      mediaKind: item.mediaKind,
      filename: item.filename,
    });
  }

  const showImageControls = typeof onUploadImage === "function";
  const pendingLabel =
    pending?.source === "file" ? pending.file.name : pending?.filename;

  const canSend =
    Boolean(value.trim()) ||
    Boolean(
      pending &&
        selectedTarget &&
        allowImageUpload &&
        (pending.source === "file"
          ? Boolean(onUploadImage)
          : Boolean(onApplyLibraryMedia)),
    );

  return (
    <>
      <form
        className={`builder-composer chat-scrollbar flex max-h-[40vh] flex-col gap-2 overflow-y-auto rounded-2xl p-2.5 sm:p-3 ${
          dragOver
            ? isEditor
              ? "border-[var(--lovable-blue)]"
              : "border-[var(--accent)]"
            : ""
        } ${!disabled && !value.trim() && !pending ? "animate-composer-hint" : ""}`}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
        onDragOver={(event) => {
          if (!allowImageUpload || disabled) return;
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (!allowImageUpload || disabled) return;
          event.preventDefault();
          setDragOver(false);
          queueFile(event.dataTransfer.files?.[0]);
        }}
        aria-label="Message input"
      >
        <label htmlFor="chat-message" className="sr-only">
          Your message
        </label>
        <Textarea
          id="chat-message"
          name="message"
          rows={2}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={
            allowImageUpload
              ? `${placeholder} Or drop media here.`
              : placeholder
          }
          disabled={disabled}
          aria-describedby="chat-input-hint"
          className={`min-h-[56px] max-h-[120px] resize-none border-0 bg-transparent px-2 py-1.5 text-base leading-relaxed shadow-none focus-visible:ring-0 ${
            isEditor
              ? "text-[var(--lovable-text)] placeholder:text-[var(--lovable-text-faint)]"
              : ""
          }`}
        />

        {showImageControls && pending ? (
          <div
            className={`mx-1 flex items-center gap-3 rounded-xl border p-2 ${
              isEditor
                ? "border-[var(--lovable-border)] bg-[var(--lovable-bg)]"
                : "border-[var(--line)] bg-[var(--paper)]"
            }`}
            role="status"
            aria-label={`${pendingIsVideo ? "Video" : "Image"} ready to upload`}
          >
            {previewUrl ? (
              pendingIsVideo ? (
                <video
                  src={previewUrl}
                  muted
                  playsInline
                  className="h-12 w-10 rounded-md object-cover"
                  aria-hidden="true"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt=""
                  className="h-12 w-10 rounded-md object-cover"
                />
              )
            ) : null}
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-xs font-medium ${
                  isEditor
                    ? "text-[var(--lovable-text)]"
                    : "text-[var(--ink)]"
                }`}
              >
                {pendingLabel}
              </p>
              {targets.length > 0 ? (
                <label
                  className={`mt-1 flex flex-col gap-1 text-[11px] ${
                    isEditor
                      ? "text-[var(--lovable-text-muted)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  Replace in
                  <select
                    value={targetKey}
                    onChange={(event) => setTargetKey(event.target.value)}
                    disabled={disabled}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      isEditor
                        ? "border-[var(--lovable-border)] bg-[var(--lovable-panel)] text-[var(--lovable-text)]"
                        : "border-[var(--line)] bg-white text-[var(--ink)]"
                    }`}
                    aria-label="Section media to replace"
                  >
                    {targets.map((target) => {
                      const key = `${target.section}:${target.assetKey}`;
                      return (
                        <option key={key} value={key}>
                          {formatUploadTargetLabel(target)}
                        </option>
                      );
                    })}
                  </select>
                </label>
              ) : (
                <p
                  className={`mt-1 text-[11px] ${
                    isEditor ? "text-amber-300" : "text-amber-700"
                  }`}
                >
                  Build a page first, then choose a section.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPending(null)}
              className={`rounded-md p-1.5 transition ${
                isEditor
                  ? "text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]"
                  : "text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"
              }`}
              aria-label="Remove attached media"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {showImageControls ? (
              <>
                <button
                  type="button"
                  disabled={disabled || !allowImageUpload}
                  onClick={() => setMediaOpen(true)}
                  title={
                    allowImageUpload
                      ? "Replace a section image or video"
                      : "Build a page first to upload media"
                  }
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    isEditor
                      ? "text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]"
                      : "text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                  }`}
                  aria-label="Attach image or video to replace a section media slot"
                  aria-haspopup="dialog"
                  aria-expanded={mediaOpen}
                >
                  <ImagePlus className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Media</span>
                </button>
              </>
            ) : null}
            <p
              id="chat-input-hint"
              className={`truncate text-[11px] ${
                isEditor
                  ? "text-[var(--lovable-text-faint)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {allowImageUpload
                ? "Enter to send · Media opens library"
                : showImageControls
                  ? "Media unlocks after build"
                  : "Enter to send · Shift+Enter for new line"}
            </p>
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !canSend}
            aria-busy={disabled}
            aria-label={
              pending && allowImageUpload ? "Upload media" : "Send message"
            }
            className={`size-9 rounded-xl text-white ${
              isEditor
                ? "bg-[var(--lovable-blue)] hover:opacity-90"
                : "bg-[var(--ink)] hover:bg-[var(--accent)]"
            }`}
          >
            <Send className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </form>

      <MediaLibraryModal
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onSelect={queueLibraryItem}
      />
    </>
  );
}
