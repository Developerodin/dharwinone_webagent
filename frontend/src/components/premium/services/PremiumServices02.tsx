import type { SectionComponentProps } from "../registry";
import { getServiceItems, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium services as a linear editorial list.
 */
export function PremiumServices02({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Restaurant Services");
  const introText = getString(content, "introText");
  const items = getServiceItems(content);

  return (
    <section aria-label="Services" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto grid max-w-[var(--sec-measure,72rem)] gap-10 @min-[768px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @min-[768px]:gap-16">
        <div className="min-w-0">
          <span aria-hidden="true" className={`mt-3 block ${pm.accentRule}`} />
          <h2 className={`mt-4 ${pm.heading} ${pm.headingSection}`}>{headline}</h2>
          {introText ? (
            <p className={`mt-4 text-sm @min-[640px]:text-base ${pm.body}`}>{introText}</p>
          ) : null}
        </div>
        <ul className="min-w-0 space-y-6" role="list">
          {items.map((item) => (
            <li
              key={item.title}
              className="border-b border-[var(--theme-line)] pb-6 last:border-b-0"
            >
              <h3 className="text-lg font-medium text-[var(--theme-ink)]">{item.title}</h3>
              <p className={`mt-2 text-sm ${pm.body}`}>{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
