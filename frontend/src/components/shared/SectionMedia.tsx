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
 */
export function SectionMedia({
  src,
  className = "",
  alt = "",
  ariaHidden = false,
}: SectionMediaProps) {
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
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={ariaHidden || undefined}
      className={className}
    />
  );
}
