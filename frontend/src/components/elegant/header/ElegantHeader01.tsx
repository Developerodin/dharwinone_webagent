import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";
import {
  elegantHeaderCtaFill,
  elegantHeaderNav,
  elegantHeaderNavMobile,
} from "./elegantHeaderChrome";

/**
 * Elegant header 01 — left wordmark, gold text nav, filled gold CTA.
 */
export function ElegantHeader01({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Caverta House");
  const tagline = getString(
    content,
    "tagline",
    "Refined tasting menus and candlelit service",
  );
  const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
  const navItems = getNavItems(content);
  const { open, menuId, rootRef, toggle, close } = useMobileNav();
  const { chrome: headerCtaChrome, drawer: headerCtaDrawer } = elegantHeaderCtaFill;

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
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--eg-gold)]/20 bg-[#000000]/90 backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-4 px-4 py-3 @min-[640px]/page:px-6 @min-[768px]/page:px-10 @min-[768px]/page:py-3.5">
        <button
          type="button"
          onClick={() => handleNavigate("hero")}
          className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--eg-gold)]"
          aria-label="Scroll to hero section"
        >
          <span className="block truncate font-[family-name:var(--eg-font-display)] text-xl leading-none tracking-[0.06em] text-[var(--eg-cream)] @min-[640px]/page:text-2xl">
            {brandName}
          </span>
          {tagline ? (
            <p className="mt-1 hidden max-w-[18rem] truncate font-[family-name:var(--eg-font-body)] text-[12px] leading-snug text-[var(--eg-muted)] @min-[1280px]/page:block">
              {tagline}
            </p>
          ) : null}
        </button>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 @min-[1024px]/page:flex"
        >
          {navItems.map((item) => (
            <button
              key={`${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={elegantHeaderNav}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button type="button" onClick={handleCta} className={headerCtaChrome}>
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
          linkClassName={elegantHeaderNavMobile}
          ctaLabel={ctaLabel}
          onCta={handleCta}
          ctaClassName={headerCtaDrawer}
        />
      </div>
    </header>
  );
}
