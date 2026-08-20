import type { SectionComponentProps } from "../registry";
import { formatPrice, getMenuItems, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium menu section listing dishes from the brief.
 */
export function PremiumMenu01({ content }: SectionComponentProps) {
  const sectionTitle = getString(content, "sectionTitle", "Menu");
  const introText = getString(content, "introText");
  const items = getMenuItems(content);

  return (
    <section aria-label="Menu" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-4xl min-w-0">
        <h2 className={`mt-3 text-center @min-[640px]:mt-4 ${pm.heading} ${pm.headingSection}`}>
          {sectionTitle}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-center text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${pm.body}`}>
            {introText}
          </p>
        ) : null}
        <ul className="mt-10 space-y-0 @min-[640px]:mt-14" role="list">
          {items.length === 0 ? (
            <li className={`py-6 text-center text-sm ${pm.body}`}>
              Menu items will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li
                key={item.name}
                className="flex flex-col gap-2 border-t border-[var(--theme-line)] py-5 first:border-t-0 @min-[640px]:flex-row @min-[640px]:items-start @min-[640px]:justify-between @min-[640px]:gap-4 @min-[640px]:py-7"
              >
                <div className="min-w-0 max-w-xl">
                  <h3 className={`break-words text-lg font-medium @min-[640px]:text-xl ${pm.heading}`}>
                    {item.name}
                  </h3>
                  {item.description ? (
                    <p className={`mt-2 text-sm ${pm.body}`}>{item.description}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-base font-medium tabular-nums text-[var(--theme-accent)] @min-[640px]:text-lg">
                  {formatPrice(item.price)}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
