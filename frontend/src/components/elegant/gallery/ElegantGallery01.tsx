import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Elegant gallery grid — even columns, no masonry holes in the center.
 */
export function ElegantGallery01({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Gallery");
  const caption = getString(content, "caption");

  const gridClass =
    assets.length <= 2
      ? "grid-cols-1 @min-[480px]:grid-cols-2 max-w-3xl mx-auto"
      : assets.length === 3
        ? "grid-cols-1 @min-[640px]:grid-cols-3"
        : "grid-cols-2 @min-[768px]:grid-cols-4";

  return (
    <section aria-label="Gallery" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <div className="text-center">
          <p className={eg.eyebrow}>Moments</p>
          <h2 className={`mt-3 @min-[640px]:mt-4 ${eg.heading} ${eg.headingSection}`}>
            {headline}
          </h2>
          {caption ? (
            <p className={`mx-auto mt-3 max-w-xl text-sm @min-[640px]:mt-4 @min-[640px]:text-base ${eg.body}`}>
              {caption}
            </p>
          ) : null}
        </div>

        {assets.length === 0 ? (
          <p className={`mt-8 text-center text-sm @min-[640px]:mt-10 ${eg.body}`}>
            No gallery images available for this build.
          </p>
        ) : (
          <ul
            className={`mt-8 grid gap-2 @min-[640px]:mt-12 @min-[640px]:gap-3 @min-[768px]:gap-4 ${gridClass}`}
            role="list"
          >
            {assets.map((asset) => (
              <li key={asset.key} className="min-w-0 overflow-hidden">
                <SectionMedia
                  src={asset.imagePath}
                  className="aspect-[4/3] h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
