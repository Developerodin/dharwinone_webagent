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
 * Elegant hero variant — left-aligned editorial over full-bleed image.
 */
export function ElegantHero02({ content, assets }: SectionComponentProps) {
  const headline = renderStyledText(content.headline, "Welcome");
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
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/75 via-[#0a0a0a]/45 to-[#0a0a0a]/15" />

      <div className="relative mx-auto flex min-h-[60svh] max-w-6xl items-center px-4 py-16 @min-[640px]:min-h-[72svh] @min-[640px]:px-6 @min-[640px]:py-20 @min-[768px]:min-h-[88vh] @min-[768px]:px-10 @min-[768px]:py-24">
        <div className="animate-section-enter flex max-w-2xl gap-5 @min-[640px]:gap-7">
          <span
            aria-hidden="true"
            className="mt-2 hidden w-px shrink-0 bg-[var(--eg-gold)] @min-[640px]:block @min-[640px]:self-stretch"
          />
          <div className="min-w-0">
            <p className={eg.eyebrow}>Fine Dining</p>
            <h2 className={`mt-5 @min-[640px]:mt-7 ${eg.heading} ${eg.headingHero}`}>
              {headline}
            </h2>
            {subheading ? (
              <p
                className={`mt-4 max-w-lg text-base leading-relaxed @min-[640px]:mt-6 @min-[640px]:text-lg ${eg.body}`}
              >
                {subheading}
              </p>
            ) : null}
            <div className="mt-8 @min-[640px]:mt-10">
              <button
                type="button"
                onClick={createScrollHandler(ctaTarget)}
                className={eg.goldButton}
              >
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
