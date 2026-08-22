import type { SectionComponentProps } from "@/components/premium/registry";
import { getString, getTestimonials } from "@/components/premium/contentHelpers";
import { bd } from "../shared/boldTokens";

/**
 * Bold testimonials — Demo9 quote cards on light field.
 */
export function BoldTestimonials01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Guest Love");
  const introText = getString(content, "introText");
  const items = getTestimonials(content);

  return (
    <section aria-label="Testimonials" className={`${bd.sectionPad} ${bd.sectionAlt}`}>
      <div className="mx-auto max-w-[var(--sec-measure,72rem)] text-center">
        <p className="font-[family-name:var(--bold-font-script)] text-2xl text-[var(--bold-hero-red)] @min-[640px]:text-3xl">
          Word of mouth
        </p>
        <h2 className="mt-3 font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase text-[var(--theme-ink)] @min-[640px]:text-[2.75rem]">
          {headline}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-sm uppercase tracking-[0.04em] ${bd.body}`}>
            {introText}
          </p>
        ) : null}
        <ul
          className="mt-12 grid gap-6 text-left @min-[768px]:grid-cols-3"
          role="list"
        >
          {(items.length > 0
            ? items
            : [
                {
                  quote: "Came for one plate, stayed for the room. We'll be back next week.",
                  name: "Alex",
                  role: "Regular",
                },
                {
                  quote: "Fast, friendly, and the kind of flavor you remember on the way home.",
                  name: "Jordan",
                  role: "Guest",
                },
                {
                  quote: "Perfect for a quick bite or a loud table — always hits.",
                  name: "Sam",
                  role: "Neighborhood",
                },
              ]
          ).map((item) => (
            <li
              key={`${item.name}-${item.quote.slice(0, 12)}`}
              className="border border-[var(--theme-line)] bg-[var(--theme-card)] p-6"
            >
              <p className="font-[family-name:var(--bold-font-script)] text-xl leading-snug text-[var(--theme-ink)]">
                “{item.quote}”
              </p>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--bold-hero-red)]">
                {item.name}
                {item.role ? ` · ${item.role}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
