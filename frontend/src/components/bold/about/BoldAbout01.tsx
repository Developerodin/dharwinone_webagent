import type { SectionComponentProps } from "@/components/premium/registry";
import {
  getPrimaryAsset,
  getString,
  renderStyledText,
  textFieldToPlain,
} from "@/components/premium/contentHelpers";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { bd } from "../shared/boldTokens";

/**
 * Bold about — split story layout. Uses section assets only (no theme-locked food PNGs).
 */
export function BoldAbout01({ content, assets }: SectionComponentProps) {
  const headlinePlain =
    textFieldToPlain(content.headline) || "Built for flavor and good company";
  const headline = renderStyledText(content.headline, headlinePlain);
  const body = getString(
    content,
    "body",
    "We cook with honest ingredients, generous portions, and a welcome that feels local from the first visit.",
  );
  const quote = getString(
    content,
    "tagline",
    "Good food doesn't need a silver fork.",
  );
  const badgeTitle = getString(content, "badgeTitle", "House");
  const badgeScript = getString(content, "badgeScript", "Made");
  const imagePath = getPrimaryAsset(assets);

  return (
    <section aria-label="About" className={`${bd.sectionPad} bg-white text-[var(--theme-ink)]`}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 @min-[768px]:grid-cols-2 @min-[768px]:gap-16">
        <div className="relative min-w-0 overflow-hidden bg-[var(--theme-bg)]">
          {imagePath ? (
            <SectionMedia
              src={imagePath}
              alt={headlinePlain}
              className="aspect-[4/5] w-full object-cover animate-section-enter"
            />
          ) : (
            <div
              aria-hidden="true"
              className="aspect-[4/5] w-full bg-[linear-gradient(145deg,var(--bold-hero-red),var(--theme-accent))]"
            />
          )}
          <div className="absolute -bottom-3 -right-1 flex size-24 flex-col items-center justify-center rounded-full bg-[var(--bold-hero-red)] text-center shadow-[0_12px_30px_rgba(185,28,28,0.35)] @min-[640px]:-bottom-5 @min-[640px]:-right-3 @min-[640px]:size-28">
            <p className="font-[family-name:var(--theme-font-display)] text-xs font-bold uppercase tracking-[0.14em] text-white @min-[640px]:text-sm">
              {badgeTitle}
            </p>
            <p className="-mt-0.5 font-[family-name:var(--bold-font-script)] text-xl leading-none text-white @min-[640px]:text-2xl">
              {badgeScript}
            </p>
          </div>
        </div>

        <div className="min-w-0 animate-section-enter @min-[768px]:pl-2">
          <p className="font-[family-name:var(--bold-font-script)] text-2xl text-[var(--theme-accent)] @min-[640px]:text-3xl">
            Our Story
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase leading-[1.02] tracking-tight text-[var(--theme-ink)] @min-[640px]:text-[2.6rem] @min-[768px]:text-[3.1rem]">
            {headline}
          </h2>
          {body ? (
            <p className={`mt-5 max-w-lg text-base leading-relaxed @min-[640px]:mt-6 @min-[640px]:text-lg ${bd.body}`}>
              {body}
            </p>
          ) : null}
          {quote ? (
            <p className="mt-8 max-w-md font-[family-name:var(--bold-font-script)] text-2xl leading-snug text-[var(--theme-ink)] @min-[640px]:text-3xl">
              {quote}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
