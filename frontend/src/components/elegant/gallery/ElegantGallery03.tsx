import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Elegant gallery variant — one tall still with a stacked film strip beside it.
 */
export function ElegantGallery03({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Gallery");
  const caption = getString(content, "caption");
  const lead = assets[0];
  const rest = assets.slice(1, 4);

  return (
    <section aria-label="Gallery" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto max-w-[var(--sec-measure,72rem)] min-w-0">
        <div className="flex flex-col gap-3 @min-[640px]:flex-row @min-[640px]:items-end @min-[640px]:justify-between">
          <h2 className={`${eg.heading} ${eg.headingSection}`}>{headline}</h2>
          {caption ? (
            <p className={`max-w-sm text-sm @min-[640px]:text-right ${eg.body}`}>{caption}</p>
          ) : null}
        </div>

        {!lead ? (
          <p className={`mt-10 text-center text-sm ${eg.body}`}>
            No gallery images available for this build.
          </p>
        ) : (
          <ul
            className="mt-10 grid gap-3 @min-[768px]:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)] @min-[768px]:gap-4"
            role="list"
          >
            <li className="min-w-0 border border-[var(--eg-gold)]/25 p-1.5">
              <SectionMedia
                src={lead.imagePath}
                className="aspect-[4/5] h-full w-full object-cover @min-[768px]:aspect-auto @min-[768px]:min-h-[28rem]"
              />
            </li>
            {rest.length > 0 ? (
              <li className="grid min-w-0 gap-3 @min-[480px]:grid-cols-2 @min-[768px]:grid-cols-1">
                {rest.map((asset) => (
                  <div
                    key={asset.key}
                    className="min-w-0 border border-[var(--eg-gold)]/25 p-1.5"
                  >
                    <SectionMedia
                      src={asset.imagePath}
                      className="aspect-[16/10] h-full w-full object-cover"
                    />
                  </div>
                ))}
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </section>
  );
}
