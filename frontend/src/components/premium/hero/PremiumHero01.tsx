import type { SectionComponentProps } from "../registry";
import {
  getPrimaryAsset,
  getString,
  isBookingCtaLabel,
  renderStyledText,
} from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Premium hero section with full-bleed background and centered copy.
 */
export function PremiumHero01({ content, assets }: SectionComponentProps) {
  const headline = renderStyledText(content.headline, "A table worth crossing town for.");
  const subheading = getString(content, "subheading");
  const ctaLabel = getString(content, "ctaLabel", "Explore Menu");
  const imagePath = getPrimaryAsset(assets);
  const ctaTarget = isBookingCtaLabel(ctaLabel) ? "reservation" : "menu";

  return (
    <section
      aria-label="Hero"
      className={`relative min-h-[60svh] overflow-hidden @min-[640px]:min-h-[70svh] @min-[768px]:min-h-[85vh] ${pm.sectionAlt}`}
    >
      {imagePath ? (
        <SectionMedia
          src={imagePath}
          ariaHidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-[var(--theme-bg-dark)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14]/70 via-[#070b14]/35 to-[#070b14]/10" />
      <div className="relative mx-auto flex min-h-[60svh] max-w-6xl flex-col justify-end px-4 py-16 @min-[640px]:min-h-[70svh] @min-[640px]:px-6 @min-[640px]:py-20 @min-[768px]:min-h-[85vh] @min-[768px]:px-10 @min-[768px]:py-24">
        <h2 className={`max-w-3xl text-white ${pm.heading} ${pm.headingHero}`}>
          {headline}
        </h2>
        {subheading ? (
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85 @min-[640px]:mt-6 @min-[640px]:text-lg @min-[768px]:text-xl">
            {subheading}
          </p>
        ) : null}
        <div className="mt-8 flex w-full @min-[640px]:mt-10">
          <button
            type="button"
            onClick={createScrollHandler(ctaTarget)}
            className={pm.primaryButton}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
