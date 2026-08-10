import type { SectionComponentProps } from "../registry";
import {
  getPrimaryAsset,
  getString,
  isBookingCtaLabel,
} from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Caverta-style full-bleed hero with dark overlay and gold accents.
 */
export function ElegantHero01({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Welcome");
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
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/95 via-[#0a0a0a]/60 to-[#0a0a0a]/30" />
      <div className="relative mx-auto flex min-h-[60svh] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center @min-[640px]:min-h-[72svh] @min-[640px]:px-6 @min-[640px]:py-20 @min-[768px]:min-h-[88vh] @min-[768px]:px-10 @min-[768px]:py-24">
        <p className={eg.eyebrow}>Elegant Dining Experience</p>
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
      </div>
    </section>
  );
}
