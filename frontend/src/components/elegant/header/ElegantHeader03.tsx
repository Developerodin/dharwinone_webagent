import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { headerCtaClasses } from "@/components/shared/headerChrome";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";

/** Compact gold CTA for single-row elegant header (display gated separately). */
const { chrome: headerCtaChrome, drawer: headerCtaDrawer } = headerCtaClasses(
  "w-auto max-w-[9.5rem] shrink-0 items-center justify-center truncate border border-[var(--eg-gold)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--eg-gold)] transition-colors duration-200 hover:bg-[var(--eg-gold)] hover:text-[var(--eg-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)] @min-[640px]/page:max-w-none @min-[640px]/page:px-5",
);

/** Inline gold nav link. */
const headerNavLinkClass =
  "inline-flex min-h-9 items-center justify-center px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--eg-gold)] transition-opacity duration-200 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--eg-gold)]";

/** Mobile panel gold link. */
const mobileNavLinkClass =
  "inline-flex min-h-11 w-full items-center justify-start rounded-xl px-3 py-3 text-xs uppercase tracking-[0.22em] text-[var(--eg-gold)] transition-colors duration-200 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)]";

/**
 * Elegant compact single-row header — brand | inline nav | CTA.
 */
export function ElegantHeader03({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Caverta House");
  const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
  const navItems = getNavItems(content);
  const { open, menuId, rootRef, toggle, close } = useMobileNav();

  /**
   * Scrolls to a section and closes the mobile menu.
   */
  function handleNavigate(target: string) {
    close();
    scrollToSection(target);
  }

  /**
   * Scrolls to the reservation section and closes the mobile menu.
   */
  function handleCta() {
    handleNavigate("reservation");
  }

  return (
    <header
      ref={rootRef}
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--eg-gold)]/25 bg-[#000000]/95 backdrop-blur-xl"
      role="banner"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-3 px-4 py-2.5 @min-[640px]/page:px-6 @min-[768px]/page:gap-6 @min-[768px]/page:px-10 @min-[768px]/page:py-3">
        <button
          type="button"
          onClick={() => handleNavigate("hero")}
          className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--eg-gold)]"
          aria-label="Scroll to hero section"
        >
          <span className="block truncate font-[family-name:var(--eg-font-display)] text-lg tracking-[0.08em] text-[var(--eg-cream)] @min-[640px]/page:text-xl">
            {brandName}
          </span>
        </button>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-x-1 overflow-x-auto @min-[1024px]/page:flex"
        >
          {navItems.map((item) => (
            <button
              key={`${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={headerNavLinkClass}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCta}
            className={headerCtaChrome}
          >
            {ctaLabel}
          </button>
          <MobileNavToggle
            open={open}
            menuId={menuId}
            onToggle={toggle}
            className="border border-[var(--eg-gold)]/30 bg-transparent text-[var(--eg-cream)] hover:border-[var(--eg-gold)]/55 hover:bg-white/[0.04] focus-visible:outline-[var(--eg-gold)]"
          />
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 @min-[640px]/page:px-6 @min-[768px]/page:px-10">
        <MobileNavPanel
          open={open}
          menuId={menuId}
          navItems={navItems}
          onNavigate={handleNavigate}
          panelClassName="mt-0 border-[var(--eg-gold)]/15 pb-3"
          linkClassName={mobileNavLinkClass}
          ctaLabel={ctaLabel}
          onCta={handleCta}
          ctaClassName={headerCtaDrawer}
        />
      </div>
    </header>
  );
}
