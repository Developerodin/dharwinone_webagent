type HeaderBrandMarkProps = {
  brandName: string;
  tagline?: string;
  onClick: () => void;
  /** Left wordmark vs centered masthead. */
  align?: "left" | "center";
  nameClassName: string;
  taglineClassName: string;
  focusRingClassName: string;
};

/**
 * Header wordmark that keeps nav/CTA on the name baseline.
 * Tagline hangs underneath on desktop so it cannot shove labels up.
 */
export function HeaderBrandMark({
  brandName,
  tagline,
  onClick,
  align = "left",
  nameClassName,
  taglineClassName,
  focusRingClassName,
}: HeaderBrandMarkProps) {
  const centered = align === "center";
  const hang = centered
    ? "hidden @min-[1024px]/page:block @min-[1024px]/page:absolute @min-[1024px]/page:left-1/2 @min-[1024px]/page:top-full @min-[1024px]/page:mt-1.5 @min-[1024px]/page:w-[max-content] @min-[1024px]/page:max-w-[18rem] @min-[1024px]/page:-translate-x-1/2"
    : "hidden @min-[1280px]/page:block @min-[1280px]/page:absolute @min-[1280px]/page:left-0 @min-[1280px]/page:top-full @min-[1280px]/page:mt-1.5 @min-[1280px]/page:w-[max-content] @min-[1280px]/page:max-w-[18rem]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-w-0 shrink-0 ${
        centered
          ? "justify-self-center text-center"
          : "text-left"
      } ${focusRingClassName}`}
      aria-label="Scroll to hero section"
    >
      <span className={`block truncate leading-none ${nameClassName}`}>
        {brandName}
      </span>
      {tagline ? (
        <span className={`truncate ${hang} ${taglineClassName}`}>{tagline}</span>
      ) : null}
    </button>
  );
}

/** Split masthead row: left nav | brand | right nav | CTA. */
export const HEADER_SPLIT_ROW =
  "mx-auto flex w-full min-w-0 max-w-7xl items-center gap-3 px-4 py-3 @min-[640px]/page:px-6 @min-[768px]/page:px-10 @min-[1024px]/page:grid @min-[1024px]/page:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] @min-[1024px]/page:items-center @min-[1024px]/page:gap-x-4 @min-[1024px]/page:py-3.5";

/** Extra bottom padding so a hanging desktop tagline is not clipped. */
export const HEADER_SPLIT_ROW_TAGLINE = `${HEADER_SPLIT_ROW} @min-[1024px]/page:pb-8`;
