import type { SectionComponentProps } from "../registry";
import { getPrimaryAsset, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Elegant about variant — dark copy slab overlapping a wide photograph.
 */
export function ElegantAbout03({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Story");
  const body = getString(content, "body");
  const imagePath = getPrimaryAsset(assets);

  return (
    <section aria-label="About" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="relative mx-auto max-w-[var(--sec-measure,72rem)] min-w-0">
        <figure className="min-w-0">
          {imagePath ? (
            <SectionMedia
              src={imagePath}
              className="aspect-[5/4] w-full object-cover @min-[768px]:aspect-[16/9]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="aspect-[5/4] w-full bg-[var(--eg-bg-alt)] @min-[768px]:aspect-[16/9]"
            />
          )}
        </figure>
        <div className="relative bg-[var(--eg-bg)] py-8 @min-[768px]:absolute @min-[768px]:bottom-8 @min-[768px]:left-8 @min-[768px]:max-w-md @min-[768px]:px-8">
          <span aria-hidden="true" className={`block ${eg.goldRule}`} />
          <h2 className={`mt-5 ${eg.heading} ${eg.headingSection}`}>{headline}</h2>
          {body ? (
            <p className={`mt-4 text-sm leading-[1.85] @min-[640px]:text-base ${eg.body}`}>
              {body}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
