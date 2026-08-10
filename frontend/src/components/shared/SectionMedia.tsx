import { useState } from "react";

/**
 * True when a stored asset path points at a video file.
 */
export function isVideoMediaPath(path: string): boolean {
  return /\.(mp4|webm|mov|ogg)(?:\?|#|$)/i.test(path);
}

type SectionMediaProps = {
  src: string;
  className?: string;
  alt?: string;
  /** Hide from assistive tech (decorative backgrounds). */
  ariaHidden?: boolean;
};

/**
 * Renders an image or muted looping video for a section asset slot.
 * Falls back to a muted panel when the media URL fails to load.
 */
export function SectionMedia({
  src,
  className = "",
  alt = "",
  ariaHidden = false,
}: SectionMediaProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`bg-[color:color-mix(in_srgb,var(--muted,#9ca3af)_18%,transparent)] ${className}`}
        role="img"
        aria-label={ariaHidden ? undefined : alt || "Media unavailable"}
        aria-hidden={ariaHidden || undefined}
      />
    );
  }

  if (isVideoMediaPath(src)) {
    return (
      <video
        src={src}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden={ariaHidden || undefined}
        aria-label={ariaHidden ? undefined : alt || "Section video"}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={ariaHidden || undefined}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
