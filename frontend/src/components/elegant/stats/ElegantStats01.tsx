import type { SectionComponentProps } from "../registry";
import { getStatItems, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Caverta-style stats section — centered counter strip.
 */
export function ElegantStats01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "By The Numbers");
  const items = getStatItems(content);

  return (
    <section aria-label="Stats" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto max-w-5xl min-w-0">
        <h2 className={`text-center ${eg.heading} ${eg.headingSection}`}>{headline}</h2>
        <ul
          className="mt-10 grid grid-cols-2 gap-8 @min-[640px]:mt-14 @min-[640px]:gap-10 @min-[768px]:grid-cols-4"
          role="list"
        >
          {items.length === 0 ? (
            <li className={`col-span-full py-6 text-center text-sm ${eg.body}`}>
              Stats will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li key={`${item.value}-${item.label}`} className="text-center">
                <p
                  className={`text-3xl tabular-nums text-[var(--eg-gold)] @min-[640px]:text-4xl @min-[768px]:text-5xl ${eg.heading}`}
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
