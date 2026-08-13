import type { SectionComponentProps } from "@/components/premium/registry";
import {
  getAssetPaths,
  getPrimaryAsset,
  getString,
  isBookingCtaLabel,
  renderStyledText,
  textFieldToPlain,
} from "@/components/premium/contentHelpers";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Bold hero — crimson sunburst layout. Images come only from section assets
 * (pipeline / uploads), so the theme works for any restaurant — not just burgers.
 */
export function BoldHero01({ content, assets }: SectionComponentProps) {
  const headline = renderStyledText(content.headline, "Taste The Difference");
  const headlinePlain =
    textFieldToPlain(content.headline) || "Taste The Difference";
  const subheading = getString(
    content,
    "subheading",
    "Fresh ingredients, big flavor, and a room built for sharing.",
  );
  const ctaLabel = getString(content, "ctaLabel", "View Menu");
  const productTitle = getString(content, "eyebrow", "Our Signature");
  const badgeTitle = getString(content, "badgeTitle", "House");
  const badgeScript = getString(content, "badgeScript", "Special");
  const imagePath = getPrimaryAsset(assets);
  const extras = getAssetPaths(assets).slice(1, 4);
  const ctaTarget = isBookingCtaLabel(ctaLabel) ? "reservation" : "menu";

  return (
    <section
      aria-label="Hero"
      className="bold-hero relative min-h-[82svh] overflow-hidden bg-[var(--bold-hero-red)] text-white @min-[640px]:min-h-[92svh]"
    >
      <div
        aria-hidden="true"
        className="bold-hero-sunburst pointer-events-none absolute inset-[-20%] opacity-95"
      />
      <div
        aria-hidden="true"
        className="bold-hero-grain pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
      />

      <div className="relative mx-auto flex min-h-[82svh] max-w-6xl flex-col px-4 pb-10 pt-6 @min-[640px]:min-h-[92svh] @min-[640px]:px-6 @min-[640px]:pb-14 @min-[640px]:pt-8 @min-[768px]:px-10">
        <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center text-center">
          <h2 className="bold-hero-title relative z-[1] max-w-5xl font-[family-name:var(--theme-font-display)] text-[2.75rem] font-bold uppercase leading-[0.9] tracking-tight text-white @min-[640px]:text-[4.5rem] @min-[768px]:text-[5.75rem] @min-[1024px]:text-[6.5rem]">
            {headline}
          </h2>

          <div className="relative z-[2] -mt-4 w-full max-w-[20rem] @min-[640px]:-mt-8 @min-[640px]:max-w-[26rem] @min-[768px]:-mt-12 @min-[768px]:max-w-[32rem]">
            {imagePath ? (
              <SectionMedia
                src={imagePath}
                alt={headlinePlain}
                className="bold-hero-burger mx-auto w-full object-contain drop-shadow-[0_28px_50px_rgba(0,0,0,0.45)]"
              />
            ) : (
              <div
                aria-hidden="true"
                className="bold-hero-burger mx-auto aspect-square w-full max-w-md rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.28),transparent_55%),radial-gradient(circle_at_50%_60%,#d42a3a,transparent_70%)]"
              />
            )}

            {/* Optional float props from extra assets — never hardcoded food PNGs */}
            {extras[0] ? (
              <SectionMedia
                src={extras[0]}
                ariaHidden
                className="bold-hero-float-a pointer-events-none absolute -bottom-4 -left-[18%] hidden w-[36%] max-w-[10rem] object-contain @min-[640px]:block"
              />
            ) : (
              <span
                aria-hidden="true"
                className="bold-hero-float-a pointer-events-none absolute -bottom-2 -left-[8%] hidden size-16 rounded-full bg-white/15 @min-[640px]:block"
              />
            )}
            {extras[1] ? (
              <SectionMedia
                src={extras[1]}
                ariaHidden
                className="bold-hero-float-c pointer-events-none absolute -right-[10%] top-[10%] hidden w-[28%] max-w-[8rem] object-contain @min-[640px]:block"
              />
            ) : (
              <span
                aria-hidden="true"
                className="bold-hero-float-c pointer-events-none absolute -right-[4%] top-[14%] hidden size-12 rounded-full bg-white/12 @min-[640px]:block"
              />
            )}
            {extras[2] ? (
              <SectionMedia
                src={extras[2]}
                ariaHidden
                className="bold-hero-float-b pointer-events-none absolute -bottom-1 right-[8%] hidden w-[20%] max-w-[6rem] object-contain @min-[640px]:block"
              />
            ) : null}
          </div>
        </div>

        <div className="bold-hero-footer relative z-[3] mt-8 grid items-end gap-6 @min-[768px]:mt-4 @min-[768px]:grid-cols-[1fr_auto] @min-[768px]:gap-10">
          <div className="min-w-0 text-left">
            <h3 className="font-[family-name:var(--theme-font-display)] text-xl font-bold uppercase tracking-wide text-white @min-[640px]:text-2xl @min-[768px]:text-3xl">
              {productTitle}
            </h3>
            {subheading ? (
              <p className="mt-2 max-w-xl text-[11px] font-medium uppercase leading-relaxed tracking-[0.06em] text-white/85 @min-[640px]:text-xs @min-[768px]:text-sm">
                {subheading}
              </p>
            ) : null}
            <button
              type="button"
              onClick={createScrollHandler(ctaTarget)}
              className="mt-5 inline-flex min-h-11 items-center justify-center border border-white px-6 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-white hover:text-[var(--bold-hero-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {ctaLabel}
            </button>
          </div>

          <div className="justify-self-end text-right">
            <p className="font-[family-name:var(--theme-font-display)] text-2xl font-bold uppercase leading-none text-white @min-[640px]:text-3xl">
              {badgeTitle}
            </p>
            <p className="-mt-1 font-[family-name:var(--bold-font-script)] text-2xl text-white @min-[640px]:text-3xl">
              {badgeScript}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
