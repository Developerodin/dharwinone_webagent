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
import { HairlineFacts } from "@/components/shared/HairlineFacts";

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
        <div className="grid gap-8 border-t border-[var(--eg-gold)]/15 pt-10 @min-[1024px]:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className={`max-w-xl ${eg.heading} ${eg.headingSection}`}>{brandName}</h2>
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
                className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full border border-[var(--eg-gold)]/35 px-6 py-3 text-sm text-[var(--eg-cream)] transition duration-200 hover:border-[var(--eg-gold)] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)] @min-[640px]:w-auto @min-[640px]:px-8"
              >
                Contact Concierge
              </button>
            </div>
          </div>

          <HairlineFacts
            inkClass="text-[var(--eg-cream)]"
            mutedClass="text-[var(--eg-muted)]"
            lineClass="divide-[var(--eg-gold)]/15"
            facts={[
              {
                label: "Phone",
                value: (
                  <a href={toTelHref(phone)} className={eg.footerLink}>
                    {phone}
                  </a>
                ),
              },
              {
                label: "Email",
                value: (
                  <a href={toMailHref(email)} className={`${eg.footerLink} break-all`}>
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
          className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--eg-gold)]/15 pt-6"
        >
          {navItems.map((item) => (
            <button
              key={`${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={eg.footerLink}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </footer>
  );
}
