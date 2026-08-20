import type { SectionComponentProps } from "../registry";
import { getServiceItems, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium services 03 — manifesto: intro left, promises as a quiet list.
 */
export function PremiumServices03({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Restaurant Services");
  const introText = getString(content, "introText");
  const items = getServiceItems(content);

  return (
    <section aria-label="Services" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto grid max-w-6xl gap-10 @min-[768px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] @min-[768px]:gap-16">
        <header className="min-w-0 @min-[768px]:sticky @min-[768px]:top-28 @min-[768px]:self-start">
          <h2 className={`${pm.heading} ${pm.headingSection}`}>{headline}</h2>
          {introText ? (
            <p className={`mt-4 max-w-sm text-sm @min-[640px]:text-base ${pm.body}`}>{introText}</p>
          ) : null}
        </header>
        <ul className="min-w-0 divide-y divide-[var(--theme-line)]" role="list">
          {items.map((item) => (
            <li key={item.title} className="py-6 first:pt-0">
              <h3 className={`text-lg @min-[640px]:text-xl ${pm.heading}`}>{item.title}</h3>
              <p className={`mt-2 text-sm @min-[640px]:text-base ${pm.body}`}>{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
