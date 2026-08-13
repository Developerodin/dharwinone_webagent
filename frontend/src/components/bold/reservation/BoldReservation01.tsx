import type { SectionComponentProps } from "@/components/premium/registry";
import {
  getPrimaryAsset,
  getString,
  renderStyledText,
} from "@/components/premium/contentHelpers";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { createScrollHandler } from "@/lib/scrollToSection";
import { bd } from "../shared/boldTokens";

/**
 * Bold reservation — Demo9 “Order Delivery” dark CTA band with food photography.
 */
export function BoldReservation01({ content, assets }: SectionComponentProps) {
  const headline = renderStyledText(content.headline, "Order Delivery");
  const body = getString(
    content,
    "body",
    "Hot off the grill and at your door — same bold flavors, zero silverware required.",
  );
  const ctaLabel = getString(content, "ctaLabel", "Launch");
  const imagePath = getPrimaryAsset(assets);

  return (
    <section
      aria-label="Reservation"
      className={`relative overflow-hidden bg-[var(--bold-hero-red)] text-white`}
    >
      {imagePath ? (
        <SectionMedia
          src={imagePath}
          ariaHidden
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bold-hero-red)] via-[var(--bold-hero-red)]/90 to-[#7a1018]/70" />
      <div
        className={`relative mx-auto grid max-w-6xl items-center gap-8 ${bd.sectionPad} @min-[768px]:grid-cols-[1.1fr_0.9fr]`}
      >
        <div className="min-w-0">
          <p className="font-[family-name:var(--bold-font-script)] text-2xl text-white/90 @min-[640px]:text-3xl">
            Always fresh
          </p>
          <h2
            className={`mt-3 font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase leading-[0.98] text-white @min-[640px]:text-[2.75rem] @min-[768px]:text-[3.5rem]`}
          >
            {headline}
          </h2>
          {body ? (
            <p className="mt-5 max-w-xl text-base uppercase tracking-[0.04em] text-white/85 @min-[640px]:mt-6 @min-[640px]:text-lg">
              {body}
            </p>
          ) : null}
          <div className="mt-8 @min-[640px]:mt-10">
            <button
              type="button"
              onClick={createScrollHandler("contact")}
              className="inline-flex min-h-11 items-center border border-white px-7 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-[var(--bold-hero-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
        <div className="hidden min-w-0 @min-[768px]:block">
          <div className="border border-white/25 bg-white/5 p-6 backdrop-blur-sm">
            <p className="font-[family-name:var(--theme-font-display)] text-2xl font-bold uppercase text-white">
              The Super Sunday
            </p>
            <p className="mt-3 font-[family-name:var(--bold-font-script)] text-2xl text-white/90">
              Weekend specials
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
