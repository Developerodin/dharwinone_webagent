import type { SectionComponentProps } from "../registry";
import {
  getPrimaryAsset,
  getString,
  renderStyledText,
  isBookingCtaLabel,
} from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Caverta-style full-bleed hero with dark overlay and gold accents.
 */
export function ElegantHero01({ content, assets }: SectionComponentProps) {
  const headline = renderStyledText(content.headline, "Candlelight, a long table, one room.");
  const subheading = getString(content, "subheading");
  const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
  const imagePath = getPrimaryAsset(assets);
  const ctaTarget = isBookingCtaLabel(ctaLabel) ? "reservation" : "menu";

  return (
    <section
      aria-label="Hero"
      className={`relative min-h-[60svh] overflow-hidden @min-[640px]:min-h-[72svh] @min-[768px]:min-h-[88vh] ${eg.sectionAlt}`}
    >
      {imagePath ? (
        <SectionMedia
          src={imagePath}
          ariaHidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[var(--eg-bg-alt)]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/70 via-[#0a0a0a]/40 to-[#0a0a0a]/15" />
      <div className="relative mx-auto flex min-h-[60svh] max-w-[var(--sec-measure,72rem)] flex-col justify-end px-4 py-16 @min-[640px]:min-h-[72svh] @min-[640px]:px-6 @min-[640px]:py-20 @min-[768px]:min-h-[88vh] @min-[768px]:px-10 @min-[768px]:py-24">
        <h2 className={`max-w-3xl ${eg.heading} ${eg.headingHero}`}>
          {headline}
        </h2>
        {subheading ? (
          <p
            className={`mt-4 max-w-xl text-base leading-relaxed @min-[640px]:mt-6 @min-[640px]:text-lg @min-[768px]:text-xl ${eg.body}`}
          >
            {subheading}
          </p>
        ) : null}
        <div className="mt-8 flex w-full @min-[640px]:mt-10">
          <button
            type="button"
            onClick={createScrollHandler(ctaTarget)}
            className={eg.goldButton}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
