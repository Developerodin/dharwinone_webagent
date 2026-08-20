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
import { HairlineFacts } from "@/components/shared/HairlineFacts";

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
        <div className="grid gap-8 border-t border-white/10 pt-10 @min-[1024px]:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className={`max-w-xl ${pm.heading} ${pm.headingSection}`}>{brandName}</h2>
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

          <HairlineFacts
            inkClass="text-[var(--theme-ink)]"
            mutedClass="text-[var(--theme-muted)]"
            lineClass="divide-white/10"
            facts={[
              {
                label: "Phone",
                value: (
                  <a href={toTelHref(phone)} className={pm.footerLink}>
                    {phone}
                  </a>
                ),
              },
              {
                label: "Email",
                value: (
                  <a href={toMailHref(email)} className={`${pm.footerLink} break-all`}>
                    {email}
                  </a>
                ),
              },
              ...(hours.length > 0
                ? [
                    {
                      label: "Hours",
                      value: (
                        <div className="space-y-1">
                          {hours.map((entry) => (
                            <p key={entry}>{entry}</p>
                          ))}
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <nav
          aria-label="Footer navigation"
          className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-6"
        >
          {navItems.map((item) => (
            <button
              key={`${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={pm.footerLink}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </footer>
  );
}
