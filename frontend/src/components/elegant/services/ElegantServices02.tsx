import type { SectionComponentProps } from "../registry";
import { getServiceItems, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Caverta-style services section — numbered editorial list.
 */
export function ElegantServices02({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Why Choose Us");
  const introText = getString(content, "introText");
  const items = getServiceItems(content);

  return (
    <section aria-label="Services" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto max-w-4xl min-w-0">
        <p className={eg.eyebrow}>Our Service</p>
        <span aria-hidden="true" className={`mt-3 block @min-[640px]:mt-4 ${eg.goldRule}`} />
        <h2 className={`mt-4 @min-[640px]:mt-6 ${eg.heading} ${eg.headingSection}`}>{headline}</h2>
        {introText ? (
          <p className={`mt-4 max-w-2xl text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${eg.body}`}>
            {introText}
          </p>
        ) : null}
        <ol className="mt-10 space-y-0 @min-[640px]:mt-14" role="list">
          {items.length === 0 ? (
            <li className={`py-6 text-sm ${eg.body}`}>
              Services will appear when included in the brief.
            </li>
          ) : (
            items.map((item, i) => (
              <li
                key={item.title}
                className="flex gap-5 border-t border-[var(--eg-gold)]/20 py-6 first:border-t-0 @min-[640px]:gap-8 @min-[640px]:py-8"
              >
                <span
                  aria-hidden="true"
                  className="shrink-0 font-[family-name:var(--eg-font-display)] text-2xl tabular-nums text-[var(--eg-gold)] @min-[640px]:text-3xl"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className={`text-lg @min-[640px]:text-xl ${eg.heading}`}>{item.title}</h3>
                  <p className={`mt-2 text-sm @min-[640px]:text-base ${eg.body}`}>{item.description}</p>
                </div>
              </li>
            ))
          )}
        </ol>
      </div>
    </section>
  );
}
