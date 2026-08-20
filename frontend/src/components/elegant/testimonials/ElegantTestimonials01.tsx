import type { SectionComponentProps } from "../registry";
import { getString, getTestimonials } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { useCarousel } from "@/hooks/useCarousel";

/**
 * Caverta-style testimonials — single-quote slider with gold accents.
 */
export function ElegantTestimonials01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "What Guests Say");
  const introText = getString(content, "introText");
  const items = getTestimonials(content);
  const { index, next, prev, goTo } = useCarousel({
    length: items.length,
    intervalMs: 6000,
  });
  const current = items[index];

  return (
    <section aria-label="Testimonials" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto max-w-3xl min-w-0 text-center">
        <span aria-hidden="true" className={`mx-auto mt-3 block @min-[640px]:mt-4 ${eg.goldRule}`} />
        <h2 className={`mt-4 @min-[640px]:mt-6 ${eg.heading} ${eg.headingSection}`}>{headline}</h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${eg.body}`}>
            {introText}
          </p>
        ) : null}
        {!current ? (
          <p className={`mt-10 text-sm @min-[640px]:mt-12 ${eg.body}`}>
            Testimonials will appear when included in the brief.
          </p>
        ) : (
          <figure className="mt-10 @min-[640px]:mt-14" aria-live="polite">
            <blockquote
              className={`text-2xl leading-snug @min-[640px]:text-3xl @min-[768px]:text-4xl ${eg.heading}`}
            >
              &ldquo;{current.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-8">
              <p className={`text-sm @min-[640px]:text-base ${eg.heading}`}>{current.name}</p>
              <p className={`mt-1 text-sm ${eg.body}`}>
                {current.role}
              </p>
            </figcaption>
            {items.length > 1 ? (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label="Previous slide"
                  onClick={prev}
                  className="text-sm text-[var(--eg-cream)]/70 transition hover:text-[var(--eg-gold)]"
                >
                  Prev
                </button>
                <div className="flex gap-2" role="tablist" aria-label="Testimonials">
                  {items.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={`Go to testimonial ${i + 1}`}
                      onClick={() => goTo(i)}
                      className={`h-1.5 w-1.5 rotate-45 transition ${
                        i === index ? "bg-[var(--eg-gold)]" : "bg-[var(--eg-cream)]/30"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={next}
                  className="text-sm text-[var(--eg-cream)]/70 transition hover:text-[var(--eg-gold)]"
                >
                  Next
                </button>
              </div>
            ) : null}
          </figure>
        )}
      </div>
    </section>
  );
}
