import type { SectionComponentProps } from "../registry";
import {
  formatPrice,
  getMenuItems,
  getString,
} from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Elegant menu variant — first plate as the thesis, remaining dishes in two quiet columns.
 */
export function ElegantMenu03({ content }: SectionComponentProps) {
  const sectionTitle = getString(content, "sectionTitle", "Our Menu");
  const introText = getString(content, "introText");
  const items = getMenuItems(content);
  const featured = items[0];
  const rest = items.slice(1);

  return (
    <section aria-label="Menu" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto max-w-[var(--sec-measure,72rem)] min-w-0">
        <header className="max-w-2xl">
          <h2 className={`${eg.heading} ${eg.headingSection}`}>{sectionTitle}</h2>
          {introText ? (
            <p className={`mt-4 text-sm leading-relaxed @min-[640px]:text-base ${eg.body}`}>
              {introText}
            </p>
          ) : null}
        </header>

        {featured ? (
          <article className="mt-10 border-t border-[var(--eg-gold)]/25 pt-10 @min-[640px]:mt-14">
            <h3 className={`${eg.heading} wrap-break-word text-[1.75rem] leading-[1.15] @min-[640px]:text-4xl @min-[768px]:text-5xl`}>
              {featured.name}
            </h3>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              {featured.description ? (
                <p className={`max-w-xl text-sm leading-relaxed @min-[640px]:text-base ${eg.body}`}>
                  {featured.description}
                </p>
              ) : null}
              <span className="text-base tracking-[0.12em] text-[var(--eg-gold)] @min-[640px]:text-lg">
                {formatPrice(featured.price)}
              </span>
            </div>
          </article>
        ) : (
          <p className={`mt-10 text-sm ${eg.body}`}>
            Menu items will appear when included in the brief.
          </p>
        )}

        {rest.length > 0 ? (
          <ul
            className="mt-10 grid gap-x-12 gap-y-8 border-t border-[var(--eg-gold)]/25 pt-8 @min-[768px]:grid-cols-2"
            role="list"
          >
            {rest.map((item) => (
              <li key={item.name} className="min-w-0">
                <div className="flex items-baseline gap-3">
                  <h4 className={`min-w-0 flex-1 text-lg ${eg.heading}`}>{item.name}</h4>
                  <span
                    aria-hidden="true"
                    className="mb-1 hidden min-w-4 flex-1 border-b border-dotted border-[var(--eg-gold)]/35 @min-[640px]:block"
                  />
                  <span className="shrink-0 text-sm tabular-nums text-[var(--eg-gold)]">
                    {formatPrice(item.price)}
                  </span>
                </div>
                {item.description ? (
                  <p className={`mt-2 text-sm ${eg.body}`}>{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
