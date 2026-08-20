import type { SectionComponentProps } from "../registry";
import { formatPrice, getMenuItems, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Caverta-style menu grid with gold price accents and dotted leaders.
 */
export function ElegantMenu01({ content }: SectionComponentProps) {
  const sectionTitle = getString(content, "sectionTitle", "Our Menu");
  const introText = getString(content, "introText");
  const items = getMenuItems(content);

  return (
    <section aria-label="Menu" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto max-w-5xl min-w-0">
        <div className="text-center">
          <div className="mx-auto mt-4 flex items-center justify-center gap-3 @min-[640px]:mt-6 @min-[640px]:gap-4">
            <span
              aria-hidden="true"
              className={`hidden @min-[640px]:block ${eg.goldRule} w-8 @min-[768px]:w-10`}
            />
            <h2 className={`min-w-0 ${eg.heading} ${eg.headingSection}`}>
              {sectionTitle}
            </h2>
            <span
              aria-hidden="true"
              className={`hidden @min-[640px]:block ${eg.goldRule} w-8 @min-[768px]:w-10`}
            />
          </div>
          {introText ? (
            <p
              className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed @min-[640px]:mt-5 @min-[640px]:text-base ${eg.body}`}
            >
              {introText}
            </p>
          ) : null}
        </div>

        <ul
          className="mt-10 grid gap-x-8 gap-y-6 @min-[640px]:mt-14 @min-[640px]:gap-y-8 @min-[768px]:grid-cols-2 @min-[768px]:gap-x-12"
          role="list"
        >
          {items.length === 0 ? (
            <li className={`col-span-full text-center text-sm ${eg.body}`}>
              Menu items will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li key={item.name} className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-2 @min-[640px]:gap-3">
                  <h3
                    className={`min-w-0 flex-1 text-base @min-[640px]:text-lg @min-[768px]:text-xl ${eg.heading}`}
                  >
                    {item.name}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="mb-1 min-w-4 flex-1 border-b border-dotted border-[var(--eg-gold)]/35"
                  />
                  <span className="shrink-0 text-sm tabular-nums text-[var(--eg-gold)] @min-[640px]:text-base @min-[768px]:text-lg">
                    {formatPrice(item.price)}
                  </span>
                </div>
                {item.description ? (
                  <p className={`mt-2 text-sm leading-relaxed ${eg.body}`}>
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
