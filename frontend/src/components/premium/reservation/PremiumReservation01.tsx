import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Premium reservation CTA banner with contact facts.
 */
export function PremiumReservation01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Reserve a Table");
  const body = getString(content, "body");
  const ctaLabel = getString(content, "ctaLabel", "Book Now");
  const phone = getString(content, "phone");
  const address = getString(content, "address");

  return (
    <section aria-label="Reservation" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <h2 className={`${pm.heading} ${pm.headingSection}`}>{headline}</h2>
        {body ? (
          <p className={`mt-4 max-w-2xl text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${pm.body}`}>
            {body}
          </p>
        ) : null}
        {(phone || address) && (
          <ul className="mt-6 space-y-1 text-sm text-[var(--theme-ink)] @min-[640px]:mt-8" role="list">
            {phone ? <li>{phone}</li> : null}
            {address ? <li className={pm.body}>{address}</li> : null}
          </ul>
        )}
        <div className="mt-8 flex w-full @min-[640px]:mt-10">
          <button
            type="button"
            onClick={createScrollHandler("contact")}
            className={pm.primaryButton}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
