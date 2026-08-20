import type { SectionComponentProps } from "../registry";
import { getString, toTelHref } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Elegant reservation 03 — left thesis with gold CTA and phone.
 */
export function ElegantReservation03({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Reserve a Table");
  const body = getString(content, "body");
  const ctaLabel = getString(content, "ctaLabel", "Book Now");
  const phone = getString(content, "phone");

  return (
    <section aria-label="Reservation" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 border-t border-[var(--eg-gold)]/25 pt-10 @min-[768px]:flex-row @min-[768px]:items-end @min-[768px]:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h2 className={`${eg.heading} ${eg.headingSection}`}>{headline}</h2>
          {body ? (
            <p className={`mt-4 text-sm @min-[640px]:text-base ${eg.body}`}>{body}</p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <button type="button" onClick={createScrollHandler("contact")} className={eg.goldButton}>
            {ctaLabel}
          </button>
          {phone ? (
            <a href={toTelHref(phone)} className={eg.footerLink}>
              {phone}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
