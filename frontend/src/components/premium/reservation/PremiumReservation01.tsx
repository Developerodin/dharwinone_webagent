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
      <div className="mx-auto max-w-3xl min-w-0 text-center">
        <p className={pm.eyebrow}>Reservations</p>
        <span aria-hidden="true" className={`mx-auto mt-3 block @min-[640px]:mt-4 ${pm.accentRule}`} />
        <h2 className={`mt-4 @min-[640px]:mt-6 ${pm.heading} ${pm.headingSection}`}>{headline}</h2>
        {body ? (
          <p className={`mx-auto mt-4 max-w-2xl text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${pm.body}`}>
            {body}
          </p>
        ) : null}
        {(phone || address) && (
          <ul className="mt-6 space-y-1 text-sm text-[var(--ink)] @min-[640px]:mt-8" role="list">
            {phone ? <li>{phone}</li> : null}
            {address ? <li className={pm.body}>{address}</li> : null}
          </ul>
        )}
        <div className="mt-8 flex w-full justify-center @min-[640px]:mt-10">
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
