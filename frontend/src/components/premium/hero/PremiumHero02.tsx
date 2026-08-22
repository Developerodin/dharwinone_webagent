import type { SectionComponentProps } from "../registry";
import { getPrimaryAsset, getString,
  renderStyledText, isBookingCtaLabel } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Premium hero variant — split editorial: copy left, full-height image right.
 */
export function PremiumHero02({ content, assets }: SectionComponentProps) {
  const headline = renderStyledText(content.headline, "Welcome");
  const subheading = getString(content, "subheading");
  const ctaLabel = getString(content, "ctaLabel", "Explore Menu");
  const imagePath = getPrimaryAsset(assets);
  const ctaTarget = isBookingCtaLabel(ctaLabel) ? "reservation" : "menu";

  return (
    <section
      aria-label="Hero"
      className={`relative overflow-hidden ${pm.section}`}
    >
      <div className="mx-auto grid min-h-[60svh] max-w-[var(--sec-measure,72rem)] @min-[768px]:min-h-[78vh] @min-[768px]:grid-cols-2">
        <div className="animate-section-enter flex flex-col justify-center px-4 py-14 @min-[640px]:px-6 @min-[640px]:py-20 @min-[768px]:px-10 @min-[768px]:py-24">
          <span
            aria-hidden="true"
            className={`mt-4 block origin-left transition-transform duration-500 @min-[640px]:mt-5 ${pm.accentRule}`}
          />
          <h2 className={`mt-5 max-w-xl @min-[640px]:mt-7 ${pm.heading} ${pm.headingHero}`}>
            {headline}
          </h2>
          {subheading ? (
            <p className={`mt-4 max-w-md text-base @min-[640px]:mt-5 @min-[640px]:text-lg ${pm.body}`}>
              {subheading}
            </p>
          ) : null}
          <div className="mt-8 @min-[640px]:mt-10">
            <button
              type="button"
              onClick={createScrollHandler(ctaTarget)}
              className={pm.primaryButton}
            >
              {ctaLabel}
            </button>
          </div>
        </div>

        <div className="relative min-h-[42svh] @min-[768px]:min-h-full">
          {imagePath ? (
            <SectionMedia
              src={imagePath}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[var(--theme-card)]"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-white to-transparent @min-[768px]:block"
          />
        </div>
      </div>
    </section>
  );
}
