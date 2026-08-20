import type { SectionComponentProps } from "../registry";
import {
  getAssetPaths,
  getPrimaryAsset,
  getString,
  renderStyledText,
  isBookingCtaLabel,
} from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { useCarousel } from "@/hooks/useCarousel";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Caverta-style full-bleed hero with image slider and gold accents.
 */
export function ElegantHero03({ content, assets }: SectionComponentProps) {
  const headline = renderStyledText(content.headline, "Welcome");
  const subheading = getString(content, "subheading");
  const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
  const paths = getAssetPaths(assets);
  const primary = getPrimaryAsset(assets);
  const slides = paths.length > 0 ? paths : primary ? [primary] : [];
  const ctaTarget = isBookingCtaLabel(ctaLabel) ? "reservation" : "menu";
  const { index, next, prev, goTo } = useCarousel({
    length: slides.length,
    intervalMs: 5500,
  });

  return (
    <section
      aria-label="Hero"
      className={`relative min-h-[60svh] overflow-hidden @min-[640px]:min-h-[72svh] @min-[768px]:min-h-[88vh] ${eg.sectionAlt}`}
    >
      {slides.length === 0 ? (
        <div aria-hidden="true" className="absolute inset-0 bg-[var(--eg-bg-alt)]" />
      ) : (
        slides.map((src, i) => (
          <SectionMedia
            key={`${src}-${i}`}
            src={src}
            ariaHidden
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/70 via-[#0a0a0a]/40 to-[#0a0a0a]/15" />
      <div className="relative mx-auto flex min-h-[60svh] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center @min-[640px]:min-h-[72svh] @min-[640px]:px-6 @min-[640px]:py-20 @min-[768px]:min-h-[88vh] @min-[768px]:px-10 @min-[768px]:py-24">
        <div className="mx-auto mt-4 flex items-center gap-3 @min-[640px]:mt-6 @min-[640px]:gap-4">
          <span aria-hidden="true" className={`${eg.goldRule} w-8 @min-[640px]:w-12`} />
          <span
            aria-hidden="true"
            className="size-1.5 rotate-45 bg-[var(--eg-gold)]"
          />
          <span aria-hidden="true" className={`${eg.goldRule} w-8 @min-[640px]:w-12`} />
        </div>
        <h2 className={`mt-6 max-w-4xl @min-[640px]:mt-8 ${eg.heading} ${eg.headingHero}`}>
          {headline}
        </h2>
        {subheading ? (
          <p
            className={`mt-4 max-w-2xl text-base leading-relaxed @min-[640px]:mt-6 @min-[640px]:text-lg @min-[768px]:text-xl ${eg.body}`}
          >
            {subheading}
          </p>
        ) : null}
        <div className="mt-8 flex w-full justify-center @min-[640px]:mt-10">
          <button
            type="button"
            onClick={createScrollHandler(ctaTarget)}
            className={eg.goldButton}
          >
            {ctaLabel}
          </button>
        </div>
        {slides.length > 1 ? (
          <div className="mt-10 flex items-center gap-4 @min-[640px]:mt-12">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={prev}
              className="text-sm text-[var(--eg-cream)]/70 transition hover:text-[var(--eg-gold)]"
            >
              Prev
            </button>
            <div className="flex gap-2" role="tablist" aria-label="Hero slides">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={`h-1.5 w-1.5 rotate-45 transition ${
                    i === index ? "bg-[var(--eg-gold)]" : "bg-[var(--eg-cream)]/35"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next slide"
              onClick={next}
              className="text-sm text-[var(--eg-cream)]/70 transition hover:text-[var(--eg-gold)]"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
