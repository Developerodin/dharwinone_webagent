import type { SectionComponentProps } from "../registry";
import { getStatItems, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium stats counter strip.
 */
export function PremiumStats01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Loved By Our Guests");
  const items = getStatItems(content);

  return (
    <section aria-label="Stats" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <h2 className={`mt-3 text-center ${pm.heading} ${pm.headingSection}`}>
          {headline}
        </h2>
        <ul
          className="mt-10 grid grid-cols-2 gap-8 @min-[640px]:mt-14 @min-[768px]:grid-cols-4"
          role="list"
        >
          {items.map((item) => (
            <li key={item.label} className="text-center">
              <p className={`text-3xl @min-[640px]:text-4xl @min-[768px]:text-5xl ${pm.heading}`}>
                {item.value}
              </p>
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
