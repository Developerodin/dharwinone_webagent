import type { SectionComponentProps } from "../registry";
import { getString, toMailHref, toTelHref } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import { scrollToSection } from "@/lib/scrollToSection";

/**
 * Elegant footer 03 — compact gold colophon.
 */
export function ElegantFooter03({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", getString(content, "headline", "Caverta House"));
  const tagline = getString(content, "tagline");
  const copyright = getString(content, "copyright");
  const phone = getString(content, "phone");
  const email = getString(content, "email");
  const navItems = getNavItems(content);

  return (
    <footer className="border-t border-[var(--eg-gold)]/20 bg-[var(--eg-bg)]" aria-label="Footer">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 @min-[640px]:px-6 @min-[768px]:px-10">
        <div className="flex flex-col gap-4 @min-[768px]:flex-row @min-[768px]:items-end @min-[768px]:justify-between">
          <div className="min-w-0">
            <p className={`text-xl ${eg.heading}`}>{brandName}</p>
            {tagline ? <p className={`mt-2 max-w-md text-sm ${eg.body}`}>{tagline}</p> : null}
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
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
        <div className="flex flex-col gap-2 border-t border-[var(--eg-gold)]/20 pt-5 text-sm text-[var(--eg-muted)] @min-[640px]:flex-row @min-[640px]:justify-between">
          <p>{copyright || brandName}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {phone ? (
              <a href={toTelHref(phone)} className={eg.footerLink}>
                {phone}
              </a>
            ) : null}
            {email ? (
              <a href={toMailHref(email)} className={eg.footerLink}>
                {email}
              </a>
            ) : null}
          </p>
        </div>
      </div>
    </footer>
  );
}
