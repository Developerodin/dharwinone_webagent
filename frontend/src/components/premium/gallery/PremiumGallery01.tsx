import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Premium gallery grid with full-width layout.
 */
export function PremiumGallery01({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Gallery");
  const caption = getString(content, "caption");

  return (
    <section aria-label="Gallery" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <p className={`text-center ${pm.eyebrow}`}>Gallery</p>
        <h2 className={`mt-3 text-center @min-[640px]:mt-4 ${pm.heading} ${pm.headingSection}`}>
          {headline}
        </h2>
        {caption ? (
          <p className={`mx-auto mt-4 max-w-2xl text-center text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${pm.body}`}>
            {caption}
          </p>
        ) : null}
        {assets.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[var(--theme-muted)] @min-[640px]:mt-12">
            No gallery images available for this build.
          </p>
        ) : (
          <ul
            className={`mt-10 grid gap-2 @min-[640px]:mt-14 @min-[640px]:gap-3 ${
              assets.length <= 2
                ? "mx-auto max-w-3xl grid-cols-1 @min-[480px]:grid-cols-2"
                : "grid-cols-2 @min-[768px]:grid-cols-4"
            }`}
            role="list"
          >
            {assets.map((asset) => (
              <li key={asset.key} className="min-w-0 overflow-hidden">
                <SectionMedia
                  src={asset.imagePath}
                  className="aspect-[4/3] w-full object-cover transition duration-300 hover:scale-[1.03]"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
