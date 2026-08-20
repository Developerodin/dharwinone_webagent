import type { SectionComponentProps } from "../registry";
import { getPrimaryAsset, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Premium about variant — story-first stack with full-bleed landscape image.
 */
export function PremiumAbout02({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Story");
  const body = getString(content, "body");
  const imagePath = getPrimaryAsset(assets);

  return (
    <section aria-label="About" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <div className="animate-section-enter mx-auto max-w-3xl text-center">
          <span
            aria-hidden="true"
            className={`mx-auto mt-4 block @min-[640px]:mt-5 ${pm.accentRule}`}
          />
          <h2 className={`mt-5 @min-[640px]:mt-7 ${pm.heading} ${pm.headingSection}`}>
            {headline}
          </h2>
          {body ? (
            <p className={`mx-auto mt-5 max-w-2xl text-sm @min-[640px]:mt-6 @min-[640px]:text-base @min-[768px]:text-lg ${pm.body}`}>
              {body}
            </p>
          ) : null}
        </div>

        <div className="relative mt-10 overflow-hidden @min-[640px]:mt-14">
          {imagePath ? (
            <SectionMedia
              src={imagePath}
              className="aspect-[16/10] w-full object-cover @min-[768px]:aspect-[21/9]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="aspect-[16/10] w-full bg-[var(--theme-line)]/40 @min-[768px]:aspect-[21/9]"
            />
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--theme-card)]/80 to-transparent"
          />
        </div>
      </div>
    </section>
  );
}
