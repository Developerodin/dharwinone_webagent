import type { SectionComponentProps } from "../registry";
import { getServiceItems, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Elegant services 03 — manifesto list with gold hairlines.
 */
export function ElegantServices03({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Why Choose Us");
  const introText = getString(content, "introText");
  const items = getServiceItems(content);

  return (
    <section aria-label="Services" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto grid max-w-6xl gap-10 @min-[768px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] @min-[768px]:gap-16">
        <header className="min-w-0">
          <h2 className={`${eg.heading} ${eg.headingSection}`}>{headline}</h2>
          {introText ? (
            <p className={`mt-4 max-w-sm text-sm @min-[640px]:text-base ${eg.body}`}>{introText}</p>
          ) : null}
        </header>
        <ul className="min-w-0 divide-y divide-[var(--eg-gold)]/20" role="list">
          {items.map((item) => (
            <li key={item.title} className="py-6 first:pt-0">
              <h3 className={`text-lg @min-[640px]:text-xl ${eg.heading}`}>{item.title}</h3>
              <p className={`mt-2 text-sm @min-[640px]:text-base ${eg.body}`}>{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
