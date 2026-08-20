import type { SectionComponentProps } from "../registry";
import { getString, getTestimonials } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium testimonials 03 — one oversized quote; remaining names stay quiet.
 */
export function PremiumTestimonials03({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "What guests remember");
  const introText = getString(content, "introText");
  const items = getTestimonials(content);
  const featured = items[0];
  const rest = items.slice(1, 4);

  return (
    <section aria-label="Testimonials" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-5xl">
        {headline ? (
          <p className={`text-sm ${pm.body}`}>{headline}</p>
        ) : null}
        {featured ? (
          <figure className="mt-6">
            <blockquote className={`${pm.heading} wrap-break-word text-[1.75rem] leading-[1.2] @min-[640px]:text-4xl @min-[768px]:text-5xl`}>
              {featured.quote}
            </blockquote>
            <figcaption className="mt-8 text-sm text-[var(--theme-ink)]">
              {featured.name}
              {featured.role ? (
                <span className={`ml-2 ${pm.body}`}>{featured.role}</span>
              ) : null}
            </figcaption>
          </figure>
        ) : (
          <p className={`mt-6 text-sm ${pm.body}`}>{introText}</p>
        )}
        {rest.length > 0 ? (
          <ul className="mt-12 grid gap-6 border-t border-[var(--theme-line)] pt-8 @min-[768px]:grid-cols-3" role="list">
            {rest.map((item) => (
              <li key={item.name} className="min-w-0">
                <p className={`text-sm leading-7 ${pm.body}`}>{item.quote}</p>
                <p className="mt-3 text-sm text-[var(--theme-ink)]">{item.name}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
