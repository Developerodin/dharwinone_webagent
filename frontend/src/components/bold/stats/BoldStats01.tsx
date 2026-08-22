import type { SectionComponentProps } from "@/components/premium/registry";
import { getStatItems, getString } from "@/components/premium/contentHelpers";
import { bd } from "../shared/boldTokens";

/**
 * Bold stats — Demo9 crimson counter strip.
 */
export function BoldStats01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "By The Numbers");
  const items = getStatItems(content);

  return (
    <section aria-label="Stats" className="bg-[var(--bold-hero-red)] text-white">
      <div className={`mx-auto max-w-[var(--sec-measure,72rem)] ${bd.sectionPad}`}>
        <p className="text-center font-[family-name:var(--bold-font-script)] text-2xl text-white/90 @min-[640px]:text-3xl">
          {headline}
        </p>
        <ul
          className="mt-10 grid gap-8 text-center @min-[640px]:mt-12 @min-[640px]:grid-cols-3"
          role="list"
        >
          {(items.length > 0
            ? items
            : [
                { value: "100%", label: "Handmade" },
                { value: "15+", label: "Burgers" },
                { value: "7", label: "Days Open" },
              ]
          ).map((item) => (
            <li key={`${item.value}-${item.label}`}>
              <p className="font-[family-name:var(--theme-font-display)] text-4xl font-bold uppercase @min-[640px]:text-5xl">
                {item.value}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                {item.label}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
