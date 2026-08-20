import type { SectionComponentProps } from "../registry";
import { getStatItems, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium editorial split stats layout.
 */
export function PremiumStats02({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Loved By Our Guests");
  const items = getStatItems(content);

  return (
    <section aria-label="Stats" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto grid max-w-6xl gap-10 @min-[768px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] @min-[768px]:items-end @min-[768px]:gap-16">
        <div className="min-w-0">
          <span aria-hidden="true" className={`mt-3 block ${pm.accentRule}`} />
          <h2 className={`mt-4 ${pm.heading} ${pm.headingSection}`}>{headline}</h2>
        </div>
        <ul
          className="grid grid-cols-2 gap-x-6 gap-y-8 @min-[640px]:grid-cols-4"
          role="list"
        >
          {items.map((item) => (
            <li key={item.label} className="min-w-0 border-l border-[var(--theme-line)] pl-4">
              <p className={`text-2xl @min-[640px]:text-3xl ${pm.heading}`}>{item.value}</p>
              <p className={`mt-2 text-sm ${pm.body}`}>
                {item.label}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
