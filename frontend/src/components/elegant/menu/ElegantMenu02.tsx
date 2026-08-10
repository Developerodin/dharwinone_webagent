import type { SectionComponentProps } from "../registry";
import {
  formatPrice,
  getMenuItems,
  getString,
} from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Elegant menu variant — single-column tasting list with gold price marks.
 */
export function ElegantMenu02({ content }: SectionComponentProps) {
  const sectionTitle = getString(content, "sectionTitle", "Our Menu");
  const introText = getString(content, "introText");
  const items = getMenuItems(content);

  return (
    <section aria-label="Menu" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto max-w-2xl min-w-0">
        <div className="animate-section-enter text-center">
          <p className={eg.eyebrow}>Tasting Menu</p>
          <h2 className={`mt-4 @min-[640px]:mt-5 ${eg.heading} ${eg.headingSection}`}>
            {sectionTitle}
          </h2>
          <div className="mx-auto mt-4 flex items-center justify-center gap-3 @min-[640px]:mt-5">
            <span aria-hidden="true" className={`${eg.goldRule} w-8`} />
            <span
              aria-hidden="true"
              className="size-1.5 rotate-45 bg-[var(--eg-gold)]"
            />
            <span aria-hidden="true" className={`${eg.goldRule} w-8`} />
          </div>
          {introText ? (
            <p
              className={`mx-auto mt-5 max-w-md text-sm leading-relaxed @min-[640px]:mt-6 @min-[640px]:text-base ${eg.body}`}
            >
              {introText}
            </p>
          ) : null}
        </div>

        <ul className="mt-10 space-y-8 @min-[640px]:mt-14 @min-[640px]:space-y-10" role="list">
          {items.length === 0 ? (
            <li className={`text-center text-sm ${eg.body}`}>
              Menu items will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li key={item.name} className="min-w-0 text-center">
                <h3 className={`text-xl @min-[640px]:text-2xl ${eg.heading}`}>{item.name}</h3>
                {item.description ? (
                  <p className={`mx-auto mt-2 max-w-sm text-sm leading-relaxed ${eg.body}`}>
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-3 text-sm tracking-[0.15em] text-[var(--eg-gold)] @min-[640px]:text-base">
                  {formatPrice(item.price)}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
