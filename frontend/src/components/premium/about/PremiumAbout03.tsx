import type { SectionComponentProps } from "../registry";
import { getPrimaryAsset, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Premium about variant — story slab overlapping a wide photograph.
 */
export function PremiumAbout03({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Story");
  const body = getString(content, "body");
  const imagePath = getPrimaryAsset(assets);

  return (
    <section aria-label="About" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="relative mx-auto max-w-[var(--sec-measure,72rem)] min-w-0">
        <figure className="min-w-0 overflow-hidden">
          {imagePath ? (
            <SectionMedia
              src={imagePath}
              className="aspect-[5/4] w-full object-cover @min-[768px]:aspect-[16/9]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="aspect-[5/4] w-full bg-[var(--theme-card)] @min-[768px]:aspect-[16/9]"
            />
          )}
        </figure>
        <div className="relative mx-0 mt-0 max-w-xl bg-[var(--theme-bg)] px-0 py-8 @min-[768px]:absolute @min-[768px]:bottom-8 @min-[768px]:left-8 @min-[768px]:max-w-md @min-[768px]:px-8 @min-[768px]:py-8">
          <span aria-hidden="true" className={`block ${pm.accentRule}`} />
          <h2 className={`mt-5 ${pm.heading} ${pm.headingSection}`}>{headline}</h2>
          {body ? (
            <p className={`mt-4 text-sm @min-[640px]:text-base ${pm.body}`}>{body}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
