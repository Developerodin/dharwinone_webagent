import type { SectionComponentProps } from "../registry";
import { getString, getTestimonials } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";

/**
 * Premium static testimonial grid.
 */
export function PremiumTestimonials02({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Clients Choose Us");
  const introText = getString(content, "introText");
  const items = getTestimonials(content);

  return (
    <section aria-label="Testimonials" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <p className={`text-center ${pm.eyebrow}`}>Testimonials</p>
        <h2 className={`mt-3 text-center ${pm.heading} ${pm.headingSection}`}>
          {headline}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-center text-sm @min-[640px]:text-base ${pm.body}`}>
            {introText}
          </p>
        ) : null}
        <ul
          className="mt-10 grid gap-8 @min-[640px]:mt-14 @min-[768px]:grid-cols-3"
          role="list"
        >
          {items.map((item) => (
            <li key={item.name} className="border-t border-[var(--theme-line)] pt-6">
              <blockquote className={`text-base leading-relaxed ${pm.body}`}>
                “{item.quote}”
              </blockquote>
              <p className={`mt-6 text-sm font-medium ${pm.heading}`}>{item.name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--theme-accent)]">
                {item.role}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
