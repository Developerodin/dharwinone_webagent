import type { SectionComponentProps } from "../registry";
import { getStatItems, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Caverta-style stats section — editorial split headline and counters.
 */
export function ElegantStats02({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Legacy");
  const items = getStatItems(content);

  return (
    <section aria-label="Stats" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto grid max-w-[var(--sec-measure,72rem)] min-w-0 gap-10 @min-[768px]:grid-cols-2 @min-[768px]:items-center @min-[768px]:gap-16">
        <div>
          <h2 className={`@min-[640px]:mt-6 ${eg.heading} ${eg.headingSection}`}>{headline}</h2>
        </div>
        <ul
          className="grid grid-cols-2 gap-8 @min-[640px]:gap-10 @min-[768px]:flex @min-[768px]:flex-wrap @min-[768px]:justify-end @min-[768px]:gap-x-12 @min-[768px]:gap-y-8 @min-[768px]:grid-cols-none"
          role="list"
        >
          {items.length === 0 ? (
            <li className={`text-sm ${eg.body}`}>
              Stats will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li key={`${item.value}-${item.label}`} className="min-w-[5.5rem]">
                <p
                  className={`text-3xl tabular-nums text-[var(--eg-gold)] @min-[640px]:text-4xl ${eg.heading}`}
                >
                  {item.value}
                </p>
                <p className={`mt-2 text-sm ${eg.body}`}>
                  {item.label}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
