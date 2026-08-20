import type { SectionComponentProps } from "../registry";
import { getStatItems, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium stats 03 — values run in one hairline row, labels in sentence case.
 */
export function PremiumStats03({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Loved By Our Guests");
  const items = getStatItems(content);

  return (
    <section aria-label="Stats" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto max-w-6xl">
        <h2 className={`${pm.heading} ${pm.headingSection}`}>{headline}</h2>
        <ul
          className="mt-10 flex flex-col gap-8 border-t border-[var(--theme-line)] pt-8 @min-[640px]:mt-12 @min-[640px]:flex-row @min-[640px]:flex-wrap @min-[640px]:gap-x-12 @min-[640px]:gap-y-8"
          role="list"
        >
          {items.map((item) => (
            <li key={item.label} className="min-w-0">
              <p className={`text-3xl tabular-nums leading-none @min-[640px]:text-4xl ${pm.heading}`}>
                {item.value}
              </p>
              <p className={`mt-2 text-sm ${pm.body}`}>{item.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
