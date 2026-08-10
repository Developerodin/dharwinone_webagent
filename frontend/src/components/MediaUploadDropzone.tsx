import { useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { isMediaFile } from "@/lib/uploadSectionImage";

type MediaUploadDropzoneProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
  busy?: boolean;
};

/**
 * Drive-style dashed dropzone with Browse CTA for image/video upload.
 */
export function MediaUploadDropzone({
  onFile,
  disabled = false,
  busy = false,
}: MediaUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /**
   * Accepts the first valid media file from a FileList.
   */
  function acceptFiles(files: FileList | null | undefined) {
    if (disabled || busy) return;
    const file = files?.[0];
    if (!file || !isMediaFile(file)) return;
    onFile(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload media dropzone. Browse or drag a file here."
      aria-disabled={disabled || busy}
      onClick={() => {
        if (disabled || busy) return;
        inputRef.current?.click();
      }}
      onKeyDown={(event) => {
        if (disabled || busy) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        if (disabled || busy) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        if (disabled || busy) return;
        event.preventDefault();
        setDragOver(false);
        acceptFiles(event.dataTransfer.files);
      }}
      className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
        dragOver
          ? "border-[var(--lovable-blue)] bg-[color-mix(in_srgb,var(--lovable-blue)_14%,transparent)]"
          : "border-[var(--lovable-border)] bg-[var(--lovable-bg)]"
      } ${disabled || busy ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <div
        className="relative flex size-16 items-center justify-center"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 64 48"
          className="size-16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              id="media-cloud-fill"
              x1="4"
              y1="24"
              x2="60"
              y2="24"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#34c759" />
              <stop offset="1" stopColor="#7ec8e3" />
            </linearGradient>
          </defs>
          <path
            d="M46.5 40H20.2c-7 0-12.7-5.4-12.7-12.1 0-5.8 4.1-10.7 9.7-11.8C18.8 9.4 24.9 4.5 32.2 4.5c8.2 0 15 5.8 16.2 13.5 5.4.7 9.6 5.3 9.6 10.8C58 35.1 52.9 40 46.5 40Z"
            fill="url(#media-cloud-fill)"
          />
          <path
            d="M32 18v14M26 24l6-6 6 6"
            stroke="#111827"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <button
        type="button"
        disabled={disabled || busy}
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
        className="inline-flex min-h-9 items-center justify-center rounded-full bg-[#1a73e8] px-6 text-sm font-medium text-white shadow-sm transition hover:bg-[#1558b0] disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Browse files to upload"
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Uploading…
          </span>
        ) : (
          "Browse"
        )}
      </button>

      <p className="max-w-xs text-[13px] text-[var(--lovable-text-muted)]">
        or drag a file to upload to{" "}
        <span className="font-semibold text-[var(--lovable-text)]">My Drive</span>{" "}
        and select
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.ogg"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        disabled={disabled || busy}
        onChange={(event) => {
          acceptFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
