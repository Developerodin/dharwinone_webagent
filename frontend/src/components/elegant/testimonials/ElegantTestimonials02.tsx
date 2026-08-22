import type { SectionComponentProps } from "../registry";
import { getString, getTestimonials } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Caverta-style static 3-column testimonial quote grid.
 */
export function ElegantTestimonials02({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Clients Choose Us");
  const introText = getString(content, "introText");
  const items = getTestimonials(content);

  return (
    <section aria-label="Testimonials" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto max-w-[var(--sec-measure,72rem)] min-w-0">
        <span aria-hidden="true" className={`mx-auto mt-3 block @min-[640px]:mt-4 ${eg.goldRule}`} />
        <h2 className={`mt-4 text-center @min-[640px]:mt-6 ${eg.heading} ${eg.headingSection}`}>
          {headline}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-center text-sm @min-[640px]:text-base ${eg.body}`}>
            {introText}
          </p>
        ) : null}
        <ul className="mt-10 grid gap-8 @min-[640px]:mt-14 @min-[768px]:grid-cols-3" role="list">
          {items.length === 0 ? (
            <li className={`col-span-full py-6 text-center text-sm ${eg.body}`}>
              Testimonials will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li key={item.name} className="border-t border-[var(--eg-gold)]/25 pt-6">
                <blockquote className={`text-base leading-relaxed ${eg.body}`}>
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <p className={`mt-6 text-sm ${eg.heading}`}>{item.name}</p>
                <p className={`mt-1 text-sm ${eg.body}`}>
                  {item.role}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
