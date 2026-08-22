import type { SectionComponentProps } from "../registry";
import {
  getAssetPaths,
  getPrimaryAsset,
  getString,
  renderStyledText,
  isBookingCtaLabel,
} from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { useCarousel } from "@/hooks/useCarousel";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Premium hero with auto-advancing full-bleed image slider.
 */
export function PremiumHero03({ content, assets }: SectionComponentProps) {
  const headline = renderStyledText(content.headline, "Welcome");
  const subheading = getString(content, "subheading");
  const ctaLabel = getString(content, "ctaLabel", "Explore Menu");
  const primary = getPrimaryAsset(assets);
  const slides = getAssetPaths(assets);
  const paths = slides.length > 0 ? slides : primary ? [primary] : [];
  const ctaTarget = isBookingCtaLabel(ctaLabel) ? "reservation" : "menu";
  const { index, next, prev, goTo } = useCarousel({
    length: paths.length,
    intervalMs: 5500,
  });

  return (
    <section
      aria-label="Hero"
      className={`relative min-h-[60svh] overflow-hidden @min-[640px]:min-h-[70svh] @min-[768px]:min-h-[85vh] ${pm.sectionAlt}`}
    >
      {paths.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          <SectionMedia src={src} ariaHidden className="h-full w-full object-cover" />
        </div>
      ))}
      {paths.length === 0 ? (
        <div aria-hidden="true" className="absolute inset-0 bg-[var(--theme-bg-dark)]" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14]/70 via-[#070b14]/35 to-[#070b14]/10" />
      <div className="relative mx-auto flex min-h-[60svh] max-w-[var(--sec-measure,72rem)] flex-col items-center justify-center px-4 py-16 text-center @min-[640px]:min-h-[70svh] @min-[640px]:px-6 @min-[768px]:min-h-[85vh] @min-[768px]:px-10">
        <span aria-hidden="true" className={`mx-auto mt-4 block ${pm.accentRule}`} />
        <h2 className={`mt-6 max-w-4xl text-white ${pm.heading} ${pm.headingHero}`}>
          {headline}
        </h2>
        {subheading ? (
          <p className="mt-4 max-w-2xl text-base text-white/85 @min-[640px]:text-lg @min-[768px]:text-xl">
            {subheading}
          </p>
        ) : null}
        <button
          type="button"
          onClick={createScrollHandler(ctaTarget)}
          className={`mt-8 ${pm.primaryButton}`}
        >
          {ctaLabel}
        </button>
        {paths.length > 1 ? (
          <div className="mt-10 flex items-center gap-4">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white"
            >
              Prev
            </button>
            <div className="flex gap-2" role="tablist" aria-label="Hero slides">
              {paths.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={`h-1.5 w-6 transition-colors ${
                    i === index ? "bg-white" : "bg-white/35"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
