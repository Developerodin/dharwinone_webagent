import type { SectionComponentProps } from "../registry";
import { getString, toTelHref } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { createScrollHandler } from "@/lib/scrollToSection";

/**
 * Premium reservation 03 — left thesis, phone as the second action.
 */
export function PremiumReservation03({ content }: SectionComponentProps) {
  const headline = getString(content, "headline", "Reserve a Table");
  const body = getString(content, "body");
  const ctaLabel = getString(content, "ctaLabel", "Book Now");
  const phone = getString(content, "phone");

  return (
    <section aria-label="Reservation" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 border-t border-[var(--theme-line)] pt-10 @min-[768px]:flex-row @min-[768px]:items-end @min-[768px]:justify-between @min-[768px]:gap-16">
        <div className="min-w-0 max-w-2xl">
          <h2 className={`${pm.heading} ${pm.headingSection}`}>{headline}</h2>
          {body ? (
            <p className={`mt-4 text-sm @min-[640px]:text-base ${pm.body}`}>{body}</p>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={createScrollHandler("contact")}
            className={pm.primaryButton}
          >
            {ctaLabel}
          </button>
          {phone ? (
            <a href={toTelHref(phone)} className={`text-sm ${pm.footerLink}`}>
              {phone}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
