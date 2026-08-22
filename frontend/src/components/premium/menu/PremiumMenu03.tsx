import type { SectionComponentProps } from "../registry";
import { formatPrice, getMenuItems, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium menu variant — first plate as thesis, remaining dishes as a quiet grid.
 */
export function PremiumMenu03({ content }: SectionComponentProps) {
  const sectionTitle = getString(content, "sectionTitle", "Menu");
  const introText = getString(content, "introText");
  const items = getMenuItems(content);
  const featured = items[0];
  const rest = items.slice(1);

  return (
    <section aria-label="Menu" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-[var(--sec-measure,72rem)] min-w-0">
        <header className="max-w-2xl">
          <h2 className={`${pm.heading} ${pm.headingSection}`}>{sectionTitle}</h2>
          {introText ? (
            <p className={`mt-4 text-sm @min-[640px]:text-base ${pm.body}`}>{introText}</p>
          ) : null}
        </header>

        {featured ? (
          <article className="mt-10 border-t border-[var(--theme-line)] pt-8 @min-[640px]:mt-14 @min-[640px]:pt-12">
            <h3 className={`${pm.heading} wrap-break-word text-[1.75rem] leading-[1.15] @min-[640px]:text-4xl @min-[768px]:text-5xl`}>
              {featured.name}
            </h3>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              {featured.description ? (
                <p className={`max-w-xl text-sm @min-[640px]:text-base ${pm.body}`}>
                  {featured.description}
                </p>
              ) : null}
              <span className="text-lg font-medium tabular-nums text-[var(--theme-accent)] @min-[640px]:text-xl">
                {formatPrice(featured.price)}
              </span>
            </div>
          </article>
        ) : (
          <p className={`mt-10 text-sm ${pm.body}`}>
            Menu items will appear when included in the brief.
          </p>
        )}

        {rest.length > 0 ? (
          <ul
            className="mt-10 grid gap-x-10 gap-y-6 border-t border-[var(--theme-line)] pt-8 @min-[768px]:grid-cols-2"
            role="list"
          >
            {rest.map((item) => (
              <li key={item.name} className="min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <h4 className={`text-lg font-medium ${pm.heading}`}>{item.name}</h4>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--theme-accent)]">
                    {formatPrice(item.price)}
                  </span>
                </div>
                {item.description ? (
                  <p className={`mt-2 text-sm ${pm.body}`}>{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
