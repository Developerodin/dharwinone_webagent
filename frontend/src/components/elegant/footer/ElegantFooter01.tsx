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
 * Elegant footer with brand story, navigation, and concierge details.
 */
export function ElegantFooter01({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", getString(content, "headline", "Caverta House"));
  const body = getString(
    content,
    "body",
    "A measured dining room for tasting menus, polished service, and quietly theatrical evenings.",
  );
  const address = getString(content, "address", "18 Heritage Court, New Delhi 110001");
  const phone = getString(content, "phone", "+91 98111 22334");
  const email = getString(content, "email", "reservations@cavertahouse.com");
  const hours = getStringArray(content, "hours", []);
  const navItems = getNavItems(content);

  return (
    <footer className="border-t border-[var(--eg-gold)]/15 bg-[#0b0b0b]" aria-label="Footer">
      <div className="mx-auto max-w-7xl px-4 py-12 @min-[640px]:px-6 @min-[768px]:px-10 @min-[768px]:py-16">
        <div className="grid gap-10 @min-[768px]:grid-cols-[1.15fr_0.75fr_0.95fr]">
          <div>
            <p className={eg.eyebrow}>Elegant Collection</p>
            <h2 className={`mt-4 text-[2rem] ${eg.heading}`}>{brandName}</h2>
            <p className={`mt-4 max-w-md text-sm @min-[640px]:text-base ${eg.body}`}>{body}</p>
            <button
              type="button"
              onClick={() => scrollToSection("reservation")}
              className={`mt-6 ${eg.goldButton}`}
            >
              Reserve an Evening
            </button>
          </div>

          <div>
            <p className={eg.inputLabel}>Navigate</p>
            <nav aria-label="Footer navigation" className="mt-4 flex flex-col gap-3">
              {navItems.map((item) => (
                <button
                  key={`${item.target}-${item.label}`}
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  className="w-fit text-left text-sm text-[var(--eg-muted)] transition hover:text-[var(--eg-gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)]"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="space-y-5">
            <div>
              <p className={eg.inputLabel}>Address</p>
              <p className="mt-3 text-sm leading-6 text-[var(--eg-cream)]">{address}</p>
            </div>
            <div>
              <p className={eg.inputLabel}>Phone</p>
              <a href={toTelHref(phone)} className={eg.footerLink}>
                {phone}
              </a>
            </div>
            <div>
              <p className={eg.inputLabel}>Email</p>
              <a href={toMailHref(email)} className={eg.footerLink}>
                {email}
              </a>
            </div>
            {hours.length > 0 ? (
              <div>
                <p className={eg.inputLabel}>Hours</p>
                <div className="mt-3 space-y-1 text-sm text-[var(--eg-cream)]">
                  {hours.map((entry) => (
                    <p key={entry}>{entry}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--eg-gold)]/15 pt-5 text-xs uppercase tracking-[0.18em] text-[var(--eg-muted)] @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
          <p>Crafted for composed evenings.</p>
          <button
            type="button"
            onClick={() => scrollToSection("hero")}
            className="w-fit text-left transition hover:text-[var(--eg-gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)]"
          >
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
