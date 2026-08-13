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
 * Premium footer with refined brand summary, nav, and reservation details.
 */
export function PremiumFooter01({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", getString(content, "headline", "Maison Copper"));
  const body = getString(
    content,
    "body",
    "An intimate dining room for long conversations, precise cocktails, and quietly memorable service.",
  );
  const address = getString(content, "address", "15 Copper Lane, Jaipur 302001");
  const phone = getString(content, "phone", "+91 98765 43210");
  const email = getString(content, "email", "reservations@maisoncopper.com");
  const hours = getStringArray(content, "hours", []);
  const navItems = getNavItems(content);

  return (
    <footer className="border-t border-white/10 bg-[var(--theme-bg-dark)]" aria-label="Footer">
      <div className="mx-auto max-w-7xl px-4 py-12 @min-[640px]:px-6 @min-[768px]:px-10 @min-[768px]:py-16">
        <div className="grid gap-10 @min-[768px]:grid-cols-[1.2fr_0.8fr_0.9fr]">
          <div>
            <p className={pm.eyebrow}>Premium Collection</p>
            <h2 className={`mt-4 text-[2rem] ${pm.heading}`}>{brandName}</h2>
            <p className={`mt-4 max-w-md text-sm @min-[640px]:text-base ${pm.body}`}>{body}</p>
            <button
              type="button"
              onClick={() => scrollToSection("reservation")}
              className={`mt-6 ${pm.primaryButton}`}
            >
              Reserve an Evening
            </button>
          </div>

          <div>
            <p className={pm.inputLabel}>Navigate</p>
            <nav aria-label="Footer navigation" className="mt-4 flex flex-col gap-3">
              {navItems.map((item) => (
                <button
                  key={`${item.target}-${item.label}`}
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  className="w-fit text-left text-sm text-[var(--theme-muted)] transition hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="space-y-5">
            <div>
              <p className={pm.inputLabel}>Address</p>
              <p className="mt-3 text-sm leading-6 text-[var(--theme-ink)]">{address}</p>
            </div>
            <div>
              <p className={pm.inputLabel}>Phone</p>
              <a href={toTelHref(phone)} className={pm.footerLink}>
                {phone}
              </a>
            </div>
            <div>
              <p className={pm.inputLabel}>Email</p>
              <a href={toMailHref(email)} className={pm.footerLink}>
                {email}
              </a>
            </div>
            {hours.length > 0 ? (
              <div>
                <p className={pm.inputLabel}>Hours</p>
                <div className="mt-3 space-y-1 text-sm text-[var(--theme-ink)]">
                  {hours.map((entry) => (
                    <p key={entry}>{entry}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs uppercase tracking-[0.18em] text-[var(--theme-muted)] @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
          <p>Crafted for memorable nights.</p>
          <button
            type="button"
            onClick={() => scrollToSection("hero")}
            className="w-fit text-left transition hover:text-[var(--theme-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]"
          >
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
