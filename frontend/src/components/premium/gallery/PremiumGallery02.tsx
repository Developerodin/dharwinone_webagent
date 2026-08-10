import type { SectionComponentProps } from "../registry";
import {
  galleryBentoGridClass,
  galleryBentoItemClass,
  getString,
} from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Premium gallery variant — bento layout tuned for 2–4 images without gaps.
 */
export function PremiumGallery02({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Gallery");
  const caption = getString(content, "caption");
  const count = assets.length;

  return (
    <section aria-label="Gallery" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <div className="flex flex-col gap-4 @min-[640px]:flex-row @min-[640px]:items-end @min-[640px]:justify-between @min-[640px]:gap-8">
          <div className="min-w-0 animate-section-enter">
            <p className={pm.eyebrow}>Inside the Cafe</p>
            <h2 className={`mt-3 @min-[640px]:mt-4 ${pm.heading} ${pm.headingSection}`}>
              {headline}
            </h2>
          </div>
          {caption ? (
            <p className={`max-w-sm text-sm @min-[640px]:text-right @min-[640px]:text-base ${pm.body}`}>
              {caption}
            </p>
          ) : null}
        </div>

        {count === 0 ? (
          <p className="mt-10 text-center text-sm text-[var(--theme-muted)] @min-[640px]:mt-12">
            No gallery images available for this build.
          </p>
        ) : (
          <ul
            className={`mt-8 grid gap-2 @min-[640px]:mt-12 @min-[640px]:gap-3 ${galleryBentoGridClass(count)}`}
            role="list"
          >
            {assets.map((asset, index) => (
              <li
                key={asset.key}
                className={`min-w-0 overflow-hidden ${galleryBentoItemClass(count, index)}`}
              >
                <SectionMedia
                  src={asset.imagePath}
                  className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
