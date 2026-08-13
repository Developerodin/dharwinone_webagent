import type { SectionComponentProps } from "@/components/premium/registry";
import {
  formatPrice,
  getMenuItems,
  getString,
} from "@/components/premium/contentHelpers";
import { bd } from "../shared/boldTokens";

/**
 * Bold menu — Demo9 “Our Menus” centered board with crimson prices.
 */
export function BoldMenu01({ content }: SectionComponentProps) {
  const sectionTitle = getString(content, "sectionTitle", "Our Menus");
  const introText = getString(content, "introText");
  const items = getMenuItems(content);

  return (
    <section aria-label="Menu" className={`${bd.sectionPad} ${bd.sectionAlt}`}>
      <div className="mx-auto max-w-5xl min-w-0">
        <div className="text-center">
          <p className="font-[family-name:var(--bold-font-script)] text-2xl text-[var(--bold-hero-red)] @min-[640px]:text-3xl">
            Have it your way
          </p>
          <h2 className="mt-3 font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase leading-[0.98] text-[var(--theme-ink)] @min-[640px]:text-[2.75rem] @min-[768px]:text-[3.5rem]">
            {sectionTitle}
          </h2>
          {introText ? (
            <p className={`mx-auto mt-4 max-w-2xl text-sm uppercase tracking-[0.04em] @min-[640px]:mt-5 @min-[640px]:text-base ${bd.body}`}>
              {introText}
            </p>
          ) : null}
        </div>

        <ul
          className="mt-12 grid gap-x-12 gap-y-8 @min-[640px]:mt-16 @min-[768px]:grid-cols-2"
          role="list"
        >
          {items.length === 0 ? (
            <li className={`col-span-full text-center text-sm ${bd.body}`}>
              Menu items will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li key={item.name} className="min-w-0 border-b border-[var(--theme-line)] pb-6">
                <div className="flex min-w-0 items-baseline gap-3">
                  <h3 className="min-w-0 flex-1 font-[family-name:var(--theme-font-display)] text-lg font-bold uppercase text-[var(--theme-ink)] @min-[640px]:text-xl">
                    {item.name}
                  </h3>
                  <span className="shrink-0 text-base font-bold tabular-nums text-[var(--bold-hero-red)] @min-[640px]:text-lg">
                    {formatPrice(item.price)}
                  </span>
                </div>
                {item.description ? (
                  <p className={`mt-2 text-sm leading-relaxed ${bd.body}`}>
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
