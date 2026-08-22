import type { SectionComponentProps } from "../registry";
import { getPrimaryAsset, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Elegant about variant — copy left with gold quote mark, framed image right.
 */
export function ElegantAbout02({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Story");
  const body = getString(content, "body");
  const imagePath = getPrimaryAsset(assets);

  return (
    <section aria-label="About" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto grid max-w-[var(--sec-measure,72rem)] items-center gap-10 @min-[768px]:grid-cols-2 @min-[768px]:gap-16">
        <div className="animate-section-enter relative min-w-0 order-2 @min-[768px]:order-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-1 -top-6 font-[family-name:var(--eg-font-display)] text-7xl leading-none text-[var(--eg-gold)]/25 @min-[640px]:-top-8 @min-[640px]:text-8xl"
          >
            “
          </span>
          <h2 className={`mt-4 @min-[640px]:mt-5 ${eg.heading} ${eg.headingSection}`}>
            {headline}
          </h2>
          {body ? (
            <p
              className={`mt-5 text-sm leading-[1.85] @min-[640px]:mt-6 @min-[640px]:text-base @min-[640px]:leading-[1.9] @min-[768px]:text-lg ${eg.body}`}
            >
              {body}
            </p>
          ) : null}
          <span
            aria-hidden="true"
            className={`mt-8 block ${eg.goldRule}`}
          />
        </div>

        <div className="relative order-1 min-w-0 @min-[768px]:order-2">
          <div
            aria-hidden="true"
            className="absolute -right-2 -top-2 h-16 w-16 border-r border-t border-[var(--eg-gold)]/50 @min-[640px]:-right-3 @min-[640px]:-top-3 @min-[640px]:h-20 @min-[640px]:w-20"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-2 -left-2 h-16 w-16 border-b border-l border-[var(--eg-gold)]/50 @min-[640px]:-bottom-3 @min-[640px]:-left-3 @min-[640px]:h-20 @min-[640px]:w-20"
          />
          {imagePath ? (
            <SectionMedia
              src={imagePath}
              className="relative aspect-[4/5] w-full object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="aspect-[4/5] w-full bg-[var(--eg-bg)]"
            />
          )}
        </div>
      </div>
    </section>
  );
}
