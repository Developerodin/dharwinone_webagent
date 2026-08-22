import type { SectionComponentProps } from "../registry";
import { getPrimaryAsset, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Premium about section with framed image and story copy.
 */
export function PremiumAbout01({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Story");
  const body = getString(content, "body");
  const imagePath = getPrimaryAsset(assets);

  return (
    <section aria-label="About" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto grid max-w-[var(--sec-measure,72rem)] gap-8 @min-[640px]:gap-12 @min-[768px]:grid-cols-2 @min-[768px]:items-center @min-[768px]:gap-16">
        <div className="relative order-2 min-w-0 pl-2 pt-2 @min-[640px]:pl-3 @min-[640px]:pt-3 @min-[768px]:order-1">
          {imagePath ? (
            <>
              <div
                aria-hidden="true"
                className="absolute left-0 top-0 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] rounded-xl border-2 border-[var(--theme-accent)]/30 @min-[640px]:h-[calc(100%-0.75rem)] @min-[640px]:w-[calc(100%-0.75rem)]"
              />
              <SectionMedia
                src={imagePath}
                className="relative aspect-[4/5] w-full rounded-xl object-cover shadow-lg"
              />
            </>
          ) : (
            <div
              aria-hidden="true"
              className="aspect-[4/5] w-full rounded-xl bg-[var(--theme-card)]"
            />
          )}
        </div>
        <div className="order-1 min-w-0 @min-[768px]:order-2">
          <span aria-hidden="true" className={`mt-3 block @min-[640px]:mt-4 ${pm.accentRule}`} />
          <h2 className={`mt-4 @min-[640px]:mt-6 ${pm.heading} ${pm.headingSection}`}>
            {headline}
          </h2>
          {body ? (
            <p className={`mt-4 text-sm @min-[640px]:mt-6 @min-[640px]:text-base @min-[768px]:text-lg ${pm.body}`}>
              {body}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
