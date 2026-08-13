import type { SectionComponentProps } from "@/components/premium/registry";
import {
  getAssetPaths,
  getString,
} from "@/components/premium/contentHelpers";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { bd } from "../shared/boldTokens";

/**
 * Bold gallery — Demo9 “Always Fresh / Present Tomato” stills band.
 */
export function BoldGallery01({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Always Fresh");
  const caption = getString(content, "caption", "Present tomato · Original salad");
  const paths = getAssetPaths(assets).slice(0, 6);

  return (
    <section aria-label="Gallery" className={`${bd.sectionPad} ${bd.section}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <div className="text-center">
          <p className="font-[family-name:var(--bold-font-script)] text-2xl text-[var(--bold-hero-red)] @min-[640px]:text-3xl">
            Present
          </p>
          <h2 className="mt-3 font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase leading-[0.98] text-[var(--theme-ink)] @min-[640px]:text-[2.75rem] @min-[768px]:text-[3.5rem]">
            {headline}
          </h2>
          {caption ? (
            <p className={`mx-auto mt-4 max-w-xl text-sm uppercase tracking-[0.04em] @min-[640px]:text-base ${bd.body}`}>
              {caption}
            </p>
          ) : null}
        </div>

        <ul
          className="mt-12 grid grid-cols-2 gap-3 @min-[640px]:mt-16 @min-[640px]:gap-4 @min-[768px]:grid-cols-3"
          role="list"
        >
          {paths.length === 0
            ? Array.from({ length: 3 }).map((_, index) => (
                <li
                  key={`placeholder-${index}`}
                  aria-hidden="true"
                  className="aspect-square bg-[linear-gradient(145deg,var(--bold-hero-red),var(--theme-accent))]"
                />
              ))
            : paths.map((src) => (
                <li key={src} className="overflow-hidden">
                  <SectionMedia
                    src={src}
                    className="aspect-square h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}
