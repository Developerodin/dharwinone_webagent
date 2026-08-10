import type { SectionComponentProps } from "../registry";
import {
  galleryEvenGridClass,
  getString,
} from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Elegant gallery variant — gold-framed tiles in an even grid for 2–4 images.
 */
export function ElegantGallery02({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Gallery");
  const caption = getString(content, "caption");
  const count = assets.length;

  return (
    <section aria-label="Gallery" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <div className="animate-section-enter text-center">
          <p className={eg.eyebrow}>Atmosphere</p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-3 @min-[640px]:mt-5">
            <span aria-hidden="true" className={`${eg.goldRule} w-6 @min-[640px]:w-10`} />
            <h2 className={`min-w-0 ${eg.heading} ${eg.headingSection}`}>
              {headline}
            </h2>
            <span aria-hidden="true" className={`${eg.goldRule} w-6 @min-[640px]:w-10`} />
          </div>
          {caption ? (
            <p className={`mx-auto mt-4 max-w-xl text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${eg.body}`}>
              {caption}
            </p>
          ) : null}
        </div>

        {count === 0 ? (
          <p className={`mt-8 text-center text-sm @min-[640px]:mt-10 ${eg.body}`}>
            No gallery images available for this build.
          </p>
        ) : (
          <ul
            className={`mt-8 grid gap-3 @min-[640px]:mt-12 @min-[640px]:gap-4 @min-[768px]:gap-5 ${galleryEvenGridClass(count)}`}
            role="list"
          >
            {assets.map((asset) => (
              <li
                key={asset.key}
                className="min-w-0 border border-[var(--eg-gold)]/30 p-1.5 @min-[640px]:p-2"
              >
                <div className="overflow-hidden">
                  <SectionMedia
                    src={asset.imagePath}
                    className="aspect-[3/4] h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
