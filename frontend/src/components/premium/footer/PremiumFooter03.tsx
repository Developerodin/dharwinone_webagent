import type { SectionComponentProps } from "../registry";
import { getString, toMailHref, toTelHref } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import { scrollToSection } from "@/lib/scrollToSection";

/**
 * Premium footer 03 — compact colophon: brand, text nav, one contact line.
 */
export function PremiumFooter03({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", getString(content, "headline", "Maison Copper"));
  const tagline = getString(content, "tagline");
  const copyright = getString(content, "copyright");
  const phone = getString(content, "phone");
  const email = getString(content, "email");
  const navItems = getNavItems(content);

  return (
    <footer className="border-t border-white/10 bg-[var(--theme-bg)]" aria-label="Footer">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 @min-[640px]:px-6 @min-[768px]:px-10 @min-[768px]:py-10">
        <div className="flex flex-col gap-4 @min-[768px]:flex-row @min-[768px]:items-end @min-[768px]:justify-between">
          <div className="min-w-0">
            <p className={`text-xl ${pm.heading}`}>{brandName}</p>
            {tagline ? <p className={`mt-2 max-w-md text-sm ${pm.body}`}>{tagline}</p> : null}
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
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
        <div className="flex flex-col gap-2 border-t border-white/10 pt-5 text-sm text-[var(--theme-muted)] @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
          <p>{copyright || brandName}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {phone ? (
              <a href={toTelHref(phone)} className={pm.footerLink}>
                {phone}
              </a>
            ) : null}
            {email ? (
              <a href={toMailHref(email)} className={pm.footerLink}>
                {email}
              </a>
            ) : null}
          </p>
        </div>
      </div>
    </footer>
  );
}
