import type { SectionComponentProps } from "../registry";
import {
  getString,
  getStringArray,
  toMailHref,
  toTelHref,
} from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import { scrollToSection } from "@/lib/scrollToSection";

/**
 * Elegant footer variant with reservation-led closing panel and quick links.
 */
export function ElegantFooter02({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", getString(content, "headline", "Caverta House"));
  const headline = getString(
    content,
    "subheading",
    "Reserve an evening shaped by precision, warmth, and slow service.",
  );
  const phone = getString(content, "phone", "+91 98111 22334");
  const email = getString(content, "email", "concierge@cavertahouse.com");
  const hours = getStringArray(content, "hours", []);
  const navItems = getNavItems(content);

  return (
    <footer className="bg-[#111111]" aria-label="Footer">
      <div className="mx-auto max-w-7xl px-4 py-12 @min-[640px]:px-6 @min-[768px]:px-10 @min-[768px]:py-16">
        <div className="rounded-[2rem] border border-[var(--eg-gold)]/18 bg-[linear-gradient(135deg,rgba(201,169,98,0.12),rgba(255,255,255,0.02),rgba(201,169,98,0.06))] p-6 @min-[640px]:p-8 @min-[768px]:p-10">
          <div className="grid gap-8 @min-[1024px]:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className={eg.eyebrow}>Final Course</p>
              <h2 className={`mt-4 max-w-xl ${eg.heading} ${eg.headingSection}`}>{brandName}</h2>
              <p className={`mt-4 max-w-xl text-sm @min-[640px]:text-base ${eg.body}`}>{headline}</p>
              <div className="mt-6 flex flex-col gap-3 @min-[640px]:flex-row">
                <button
                  type="button"
                  onClick={() => scrollToSection("reservation")}
                  className={eg.goldButton}
                >
                  Reserve Now
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("contact")}
                  className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full border border-[var(--eg-gold)]/35 px-6 py-3 text-xs uppercase tracking-[0.2em] text-[var(--eg-cream)] transition duration-200 hover:border-[var(--eg-gold)] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)] @min-[640px]:w-auto @min-[640px]:px-8 @min-[640px]:text-sm"
                >
                  Contact Concierge
                </button>
              </div>
            </div>

            <div className="grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--eg-gold)]/15 bg-[var(--eg-gold)]/15 @min-[640px]:grid-cols-2">
              <div className="bg-[#121212] px-5 py-5">
                <p className={eg.inputLabel}>Phone</p>
                <a href={toTelHref(phone)} className="mt-3 block text-sm text-[var(--eg-cream)] transition hover:text-[var(--eg-gold)]">
                  {phone}
                </a>
              </div>
              <div className="bg-[#121212] px-5 py-5">
                <p className={eg.inputLabel}>Email</p>
                <a href={toMailHref(email)} className="mt-3 block break-all text-sm text-[var(--eg-cream)] transition hover:text-[var(--eg-gold)]">
                  {email}
                </a>
              </div>
              {hours.length > 0 ? (
                <div className="bg-[#121212] px-5 py-5 @min-[640px]:col-span-2">
                  <p className={eg.inputLabel}>Hours</p>
                  <div className="mt-3 flex flex-col gap-1 text-sm text-[var(--eg-cream)] @min-[640px]:flex-row @min-[640px]:gap-4">
                    {hours.map((entry) => (
                      <p key={entry}>{entry}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-[var(--eg-gold)]/15 pt-6">
            {navItems.map((item) => (
              <button
                key={`${item.target}-${item.label}`}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={eg.navLink}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
