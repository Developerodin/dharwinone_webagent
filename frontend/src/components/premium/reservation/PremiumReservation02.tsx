import type { SectionComponentProps } from "../registry";
import { getPrimaryAsset, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Premium reservation CTA over a full-bleed background image.
 */
export function PremiumReservation02({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Reserve a Table");
  const body = getString(content, "body");
  const ctaLabel = getString(content, "ctaLabel", "Book Now");
  const imagePath = getPrimaryAsset(assets);

  return (
    <section
      aria-label="Reservation"
      className="relative min-h-[48svh] overflow-hidden @min-[640px]:min-h-[56svh]"
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
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14]/95 via-[#070b14]/60 to-[#070b14]/35" />
      <div className="relative mx-auto flex min-h-[48svh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center @min-[640px]:min-h-[56svh] @min-[640px]:px-6 @min-[640px]:py-20 @min-[768px]:px-10">
        <p className={pm.eyebrow}>Reservations</p>
        <span aria-hidden="true" className={`mx-auto mt-4 block @min-[640px]:mt-5 ${pm.accentRule}`} />
        <h2 className={`mt-6 max-w-3xl text-white @min-[640px]:mt-8 ${pm.heading} ${pm.headingSection}`}>
          {headline}
        </h2>
        {body ? (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 @min-[640px]:mt-5 @min-[640px]:text-base @min-[768px]:text-lg">
            {body}
          </p>
        ) : null}
        <div className="mt-8 flex w-full justify-center @min-[640px]:mt-10">
          <button
            type="button"
            onClick={createScrollHandler("contact")}
            className={pm.primaryButton}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
