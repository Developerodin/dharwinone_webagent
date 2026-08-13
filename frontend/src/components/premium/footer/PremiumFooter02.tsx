import type { SectionComponentProps } from "../registry";
import {
  getString,
  getStringArray,
  toMailHref,
  toTelHref,
} from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import { scrollToSection } from "@/lib/scrollToSection";

/**
 * Premium footer variant with reservation-led closing banner and quick links.
 */
export function PremiumFooter02({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", getString(content, "headline", "Maison Copper"));
  const headline = getString(content, "subheading", "Close the night with a beautifully timed table.");
  const phone = getString(content, "phone", "+91 98765 43210");
  const email = getString(content, "email", "concierge@maisoncopper.com");
  const hours = getStringArray(content, "hours", []);
  const navItems = getNavItems(content);

  return (
    <footer className="bg-[var(--theme-bg-dark)]" aria-label="Footer">
      <div className="mx-auto max-w-7xl px-4 py-12 @min-[640px]:px-6 @min-[768px]:px-10 @min-[768px]:py-16">
        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-accent)_12%,transparent),rgba(255,255,255,0.03),color-mix(in_srgb,var(--theme-accent)_8%,transparent))] p-6 @min-[640px]:p-8 @min-[768px]:p-10">
          <div className="grid gap-8 @min-[1024px]:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className={pm.eyebrow}>Final Course</p>
              <h2 className={`mt-4 max-w-xl ${pm.heading} ${pm.headingSection}`}>{brandName}</h2>
              <p className={`mt-4 max-w-xl text-sm @min-[640px]:text-base ${pm.body}`}>{headline}</p>
              <div className="mt-6 flex flex-col gap-3 @min-[640px]:flex-row">
                <button
                  type="button"
                  onClick={() => scrollToSection("reservation")}
                  className={pm.primaryButton}
                >
                  Reserve Now
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("contact")}
                  className={pm.secondaryButton}
                >
                  Contact Concierge
                </button>
              </div>
            </div>

            <div className="grid gap-px overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 @min-[640px]:grid-cols-2">
              <div className="bg-[var(--theme-card)] px-5 py-5">
                <p className={pm.inputLabel}>Phone</p>
                <a href={toTelHref(phone)} className="mt-3 block text-sm text-[var(--theme-ink)] transition hover:text-[var(--theme-accent)]">
                  {phone}
                </a>
              </div>
              <div className="bg-[var(--theme-card)] px-5 py-5">
                <p className={pm.inputLabel}>Email</p>
                <a href={toMailHref(email)} className="mt-3 block break-all text-sm text-[var(--theme-ink)] transition hover:text-[var(--theme-accent)]">
                  {email}
                </a>
              </div>
              {hours.length > 0 ? (
                <div className="bg-[var(--theme-card)] px-5 py-5 @min-[640px]:col-span-2">
                  <p className={pm.inputLabel}>Hours</p>
                  <div className="mt-3 flex flex-col gap-1 text-sm text-[var(--theme-ink)] @min-[640px]:flex-row @min-[640px]:gap-4">
                    {hours.map((entry) => (
                      <p key={entry}>{entry}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-6">
            {navItems.map((item) => (
              <button
                key={`${item.target}-${item.label}`}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={pm.navLink}
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
