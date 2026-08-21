import type { SectionComponentProps } from "../registry";
import { getStatItems, getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";

/**
 * Column classes so 1–4 stats stay visually centered (no leftover empty column).
 */
function statsTrackClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-1 @min-[540px]:grid-cols-3";
  return "grid-cols-2 @min-[768px]:grid-cols-4";
}

/**
 * Caverta-style stats section — centered counter strip.
 */
export function ElegantStats01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "By The Numbers");
  const items = getStatItems(content);

  return (
    <section
      aria-label="Stats"
      className={`${eg.sectionPad} ${eg.sectionAlt} text-center`}
    >
      <div className="mx-auto flex max-w-5xl min-w-0 flex-col items-center">
        <h2
          className={`mx-auto max-w-3xl text-balance ${eg.heading} ${eg.headingSection}`}
        >
          {headline}
        </h2>
        <ul
          className={`mt-10 grid w-full justify-items-center gap-8 @min-[640px]:mt-14 @min-[640px]:gap-10 ${statsTrackClass(items.length)}`}
          role="list"
        >
          {items.length === 0 ? (
            <li className={`col-span-full py-6 text-sm ${eg.body}`}>
              Stats will appear when included in the brief.
            </li>
          ) : (
            items.map((item) => (
              <li
                key={`${item.value}-${item.label}`}
                className="w-full max-w-[14rem] text-center"
              >
                <p
                  className={`text-3xl tabular-nums text-[var(--eg-gold)] @min-[640px]:text-4xl @min-[768px]:text-5xl ${eg.heading}`}
                >
                  {item.value}
                </p>
                <p className={`mt-2 text-sm ${eg.body}`}>{item.label}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
