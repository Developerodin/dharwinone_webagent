import type { SectionComponentProps } from "../registry";
import { getServiceItems, getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium services grid — Cafeu-style feature blocks.
 */
export function PremiumServices01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Restaurant Services");
  const introText = getString(content, "introText");
  const items = getServiceItems(content);

  return (
    <section aria-label="Services" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <h2 className={`mt-3 text-center ${pm.heading} ${pm.headingSection}`}>
          {headline}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-center text-sm @min-[640px]:text-base ${pm.body}`}>
            {introText}
          </p>
        ) : null}
        <ul
          className="mt-10 grid gap-6 @min-[640px]:mt-14 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-4"
          role="list"
        >
          {items.map((item) => (
            <li
              key={item.title}
              className="border-t border-[var(--theme-line)] pt-5"
            >
              <h3 className="text-lg font-medium text-[var(--theme-ink)]">{item.title}</h3>
              <p className={`mt-3 text-sm ${pm.body}`}>{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
