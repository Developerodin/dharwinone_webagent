import type { SectionComponentProps } from "../registry";
import { getString, getTestimonials } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { useCarousel } from "@/hooks/useCarousel";

/**
 * Premium testimonial / comments slider.
 */
export function PremiumTestimonials01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Clients Choose Us");
  const introText = getString(content, "introText");
  const items = getTestimonials(content);
  const { index, next, prev, goTo } = useCarousel({
    length: items.length,
    intervalMs: 6000,
  });
  const active = items[index];

  return (
    <section aria-label="Testimonials" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-3xl min-w-0 text-center">
        <h2 className={`mt-3 ${pm.heading} ${pm.headingSection}`}>{headline}</h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-sm @min-[640px]:text-base ${pm.body}`}>
            {introText}
          </p>
        ) : null}
        {active ? (
          <figure className="mt-10 @min-[640px]:mt-14">
            <blockquote
              className={`text-xl leading-relaxed @min-[640px]:text-2xl @min-[768px]:text-3xl ${pm.heading}`}
            >
              “{active.quote}”
            </blockquote>
            <figcaption className="mt-8">
              <p className={`text-sm font-medium ${pm.heading}`}>{active.name}</p>
              <p className={`mt-1 text-sm ${pm.body}`}>
                {active.role}
              </p>
            </figcaption>
          </figure>
        ) : null}
        {items.length > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous testimonial"
              className="text-xs uppercase tracking-[0.2em] text-[var(--theme-muted)] transition hover:text-[var(--theme-ink)]"
            >
              Prev
            </button>
            <div className="flex gap-2" role="tablist" aria-label="Testimonials">
              {items.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Testimonial ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={`h-1.5 w-6 transition-colors ${
                    i === index
                      ? "bg-[var(--theme-accent)]"
                      : "bg-[var(--theme-line)]"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="Next testimonial"
              className="text-xs uppercase tracking-[0.2em] text-[var(--theme-muted)] transition hover:text-[var(--theme-ink)]"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
