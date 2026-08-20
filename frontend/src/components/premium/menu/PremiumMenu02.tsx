import type { SectionComponentProps } from "../registry";
import { formatPrice, getMenuItems, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium menu variant — sticky intro rail + dish list with accent prices.
 */
export function PremiumMenu02({ content }: SectionComponentProps) {
  const sectionTitle = getString(content, "sectionTitle", "Menu");
  const introText = getString(content, "introText");
  const items = getMenuItems(content);

  return (
    <section aria-label="Menu" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto grid max-w-6xl gap-10 @min-[768px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] @min-[768px]:gap-14 @min-[1024px]:gap-20">
        <header className="animate-section-enter min-w-0 @min-[768px]:sticky @min-[768px]:top-24 @min-[768px]:self-start">
          <h2 className={`mt-3 @min-[640px]:mt-4 ${pm.heading} ${pm.headingSection}`}>
            {sectionTitle}
          </h2>
          {introText ? (
            <p className={`mt-4 max-w-sm text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${pm.body}`}>
              {introText}
            </p>
          ) : null}
          <span
            aria-hidden="true"
            className={`mt-6 hidden @min-[768px]:block ${pm.accentRule}`}
          />
        </header>

        <ul className="min-w-0 space-y-0" role="list">
          {items.length === 0 ? (
            <li className={`py-4 text-sm ${pm.body}`}>
              Menu items will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li
                key={item.name}
                className="border-t border-[var(--theme-line)] py-5 first:border-t-0 @min-[640px]:py-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className={`break-words text-lg font-medium @min-[640px]:text-xl ${pm.heading}`}>
                    {item.name}
                  </h3>
                  <span className="shrink-0 text-base font-medium tabular-nums text-[var(--theme-accent)] @min-[640px]:text-lg">
                    {formatPrice(item.price)}
                  </span>
                </div>
                {item.description ? (
                  <p className={`mt-2 text-sm ${pm.body}`}>{item.description}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
