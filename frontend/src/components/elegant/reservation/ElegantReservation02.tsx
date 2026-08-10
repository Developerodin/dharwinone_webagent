import type { SectionComponentProps } from "../registry";
import { getPrimaryAsset, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Caverta-style full-bleed image reservation CTA with gold button.
 */
export function ElegantReservation02({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Reserve a Table");
  const body = getString(content, "body");
  const ctaLabel = getString(content, "ctaLabel", "Book Now");
  const imagePath = getPrimaryAsset(assets);

  return (
    <section
      aria-label="Reservation"
      className={`relative min-h-[48svh] overflow-hidden @min-[640px]:min-h-[56svh] ${eg.sectionAlt}`}
    >
      {imagePath ? (
        <SectionMedia
          src={imagePath}
          ariaHidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-[var(--eg-bg-alt)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/95 via-[#0a0a0a]/65 to-[#0a0a0a]/35" />
      <div className="relative mx-auto flex min-h-[48svh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center @min-[640px]:min-h-[56svh] @min-[640px]:px-6 @min-[640px]:py-20 @min-[768px]:px-10">
        <p className={eg.eyebrow}>Reservations</p>
        <span aria-hidden="true" className={`mx-auto mt-4 block @min-[640px]:mt-5 ${eg.goldRule}`} />
        <h2 className={`mt-6 max-w-3xl @min-[640px]:mt-8 ${eg.heading} ${eg.headingSection}`}>
          {headline}
        </h2>
        {body ? (
          <p className={`mt-4 max-w-xl text-sm leading-relaxed @min-[640px]:mt-5 @min-[640px]:text-base @min-[768px]:text-lg ${eg.body}`}>
            {body}
          </p>
        ) : null}
        <div className="mt-8 flex w-full justify-center @min-[640px]:mt-10">
          <button
            type="button"
            onClick={createScrollHandler("contact")}
            className={eg.goldButton}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
