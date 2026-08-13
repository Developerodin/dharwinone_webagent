import type { SectionComponentProps } from "@/components/premium/registry";
import {
  getAssetPaths,
  getServiceItems,
  getString,
} from "@/components/premium/contentHelpers";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { bd } from "../shared/boldTokens";

/**
 * Bold services — product/feature columns. Images from section assets only.
 */
export function BoldServices01({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "What We Serve");
  const introText = getString(
    content,
    "introText",
    "Signature plates made fresh — pick your favorites and make it yours.",
  );
  const items = getServiceItems(content);
  const images = getAssetPaths(assets);

  return (
    <section aria-label="Services" className={`${bd.sectionPad} ${bd.section}`}>
      <div className="mx-auto max-w-6xl min-w-0 text-center">
        <p className="font-[family-name:var(--bold-font-script)] text-2xl text-[var(--bold-hero-red)] @min-[640px]:text-3xl">
          Have it your way
        </p>
        <h2 className="mt-3 font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase leading-[0.98] text-[var(--theme-ink)] @min-[640px]:text-[2.75rem] @min-[768px]:text-[3.5rem]">
          {headline}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-sm uppercase tracking-[0.04em] @min-[640px]:mt-5 @min-[640px]:text-base ${bd.body}`}>
            {introText}
          </p>
        ) : null}

        <ul
          className="mt-12 grid gap-10 text-center @min-[640px]:mt-16 @min-[640px]:grid-cols-3 @min-[640px]:gap-8"
          role="list"
        >
          {items.length === 0 ? (
            <li className={`col-span-full py-6 text-sm ${bd.body}`}>
              Signature items will appear when included in the brief.
            </li>
          ) : (
            items.map((item, index) => {
              const src = images[index];
              return (
                <li key={item.title} className="min-w-0 animate-section-enter">
                  {src ? (
                    <SectionMedia
                      src={src}
                      alt=""
                      className="mx-auto aspect-square w-full max-w-[14rem] object-contain drop-shadow-[0_18px_30px_rgba(28,33,35,0.18)]"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="mx-auto aspect-square w-full max-w-[14rem] rounded-full bg-[linear-gradient(145deg,var(--bold-hero-red),var(--theme-accent))]"
                    />
                  )}
                  <h3 className="mt-6 font-[family-name:var(--theme-font-display)] text-2xl font-bold uppercase leading-none text-[var(--theme-ink)] @min-[640px]:text-3xl">
                    {item.title}
                  </h3>
                  <p className={`mx-auto mt-3 max-w-xs text-sm leading-relaxed ${bd.body}`}>
                    {item.description}
                  </p>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </section>
  );
}
