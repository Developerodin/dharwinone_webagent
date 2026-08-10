import type { SectionComponentProps } from "../registry";
import { getServiceItems, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Caverta-style services section — 4-up feature grid with gold rules.
 */
export function ElegantServices01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "What We Offer");
  const introText = getString(content, "introText");
  const items = getServiceItems(content);

  return (
    <section aria-label="Services" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <p className={`text-center ${eg.eyebrow}`}>Our Service</p>
        <span aria-hidden="true" className={`mx-auto mt-3 block @min-[640px]:mt-4 ${eg.goldRule}`} />
        <h2 className={`mt-4 text-center @min-[640px]:mt-6 ${eg.heading} ${eg.headingSection}`}>
          {headline}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-center text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${eg.body}`}>
            {introText}
          </p>
        ) : null}
        <ul
          className="mt-10 grid gap-6 @min-[640px]:mt-14 @min-[640px]:grid-cols-2 @min-[640px]:gap-8 @min-[1024px]:grid-cols-4"
          role="list"
        >
          {items.length === 0 ? (
            <li className={`col-span-full py-6 text-center text-sm ${eg.body}`}>
              Services will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li
                key={item.title}
                className="border-t border-[var(--eg-gold)]/25 pt-5 @min-[640px]:border @min-[640px]:border-[var(--eg-gold)]/25 @min-[640px]:p-6 @min-[640px]:pt-6"
              >
                <h3 className={`text-lg @min-[640px]:text-xl ${eg.heading}`}>{item.title}</h3>
                <p className={`mt-3 text-sm @min-[640px]:text-base ${eg.body}`}>{item.description}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
