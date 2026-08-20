import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Caverta-style reservation CTA with phone and address.
 */
export function ElegantReservation01({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Reserve a Table");
  const body = getString(content, "body");
  const ctaLabel = getString(content, "ctaLabel", "Book Now");
  const phone = getString(content, "phone");
  const address = getString(content, "address");

  return (
    <section aria-label="Reservation" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto max-w-3xl min-w-0 text-center">
        <span aria-hidden="true" className={`mx-auto mt-3 block @min-[640px]:mt-4 ${eg.goldRule}`} />
        <h2 className={`mt-4 @min-[640px]:mt-6 ${eg.heading} ${eg.headingSection}`}>{headline}</h2>
        {body ? (
          <p className={`mx-auto mt-4 max-w-2xl text-sm @min-[640px]:mt-5 @min-[640px]:text-base ${eg.body}`}>
            {body}
          </p>
        ) : null}
        {phone || address ? (
          <ul className="mt-6 space-y-2 text-sm @min-[640px]:mt-8" role="list">
            {phone ? (
              <li>
                <a
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  className="text-[var(--eg-cream)] transition hover:text-[var(--eg-gold)]"
                >
                  {phone}
                </a>
              </li>
            ) : null}
            {address ? <li className={eg.body}>{address}</li> : null}
          </ul>
        ) : null}
        <div className="mt-8 flex w-full justify-center @min-[640px]:mt-10">
          <button
            type="button"
            onClick={createScrollHandler("contact")}
            className={eg.goldButton}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
