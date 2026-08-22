import type { SectionComponentProps } from "../registry";
import { getStatItems, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Elegant stats 03 — running numbers with gold hairline.
 */
export function ElegantStats03({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "The room, in numbers");
  const items = getStatItems(content);

  return (
    <section aria-label="Stats" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto max-w-[var(--sec-measure,72rem)]">
        <h2 className={`${eg.heading} ${eg.headingSection}`}>{headline}</h2>
        <ul
          className="mt-10 flex flex-col gap-8 border-t border-[var(--eg-gold)]/25 pt-8 @min-[640px]:flex-row @min-[640px]:flex-wrap @min-[640px]:gap-x-12"
          role="list"
        >
          {items.map((item) => (
            <li key={item.label} className="min-w-0">
              <p className={`text-3xl tabular-nums leading-none text-[var(--eg-gold)] @min-[640px]:text-4xl ${eg.heading}`}>
                {item.value}
              </p>
              <p className={`mt-2 text-sm ${eg.body}`}>{item.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
