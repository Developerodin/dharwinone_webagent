import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";
import {
  premiumHeaderCtaFill,
  premiumHeaderNav,
} from "./premiumHeaderChrome";

/**
 * Premium header 01 — left wordmark, quiet text nav, filled CTA.
 */
export function PremiumHeader01({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Maison Copper");
  const tagline = getString(
    content,
    "tagline",
    "Seasonal plates and neighborhood hospitality",
  );
  const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
  const navItems = getNavItems(content);
  const { open, menuId, rootRef, toggle, close } = useMobileNav();
  const { chrome: headerCtaChrome, drawer: headerCtaDrawer } = premiumHeaderCtaFill;

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
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-white/10 bg-[var(--theme-bg)]/80 backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-4 px-4 py-3 @min-[640px]/page:px-6 @min-[768px]/page:px-10 @min-[768px]/page:py-3.5">
        <button
          type="button"
          onClick={() => handleNavigate("hero")}
          className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)]"
          aria-label="Scroll to hero section"
        >
          <span className="block truncate font-[family-name:var(--font-display)] text-xl leading-none tracking-tight text-[var(--theme-ink)] @min-[640px]/page:text-2xl">
            {brandName}
          </span>
          {tagline ? (
            <p className="mt-1 hidden max-w-[18rem] truncate text-[12px] leading-snug text-[var(--theme-muted)] @min-[1280px]/page:block">
              {tagline}
            </p>
          ) : null}
        </button>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 @min-[1024px]/page:flex"
        >
          {navItems.map((item) => (
            <button
              key={`${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={premiumHeaderNav}
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
            className="border border-white/12 bg-white/[0.04] text-[var(--theme-ink)] hover:bg-white/[0.08] focus-visible:outline-[var(--theme-accent)]"
          />
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 @min-[640px]/page:px-6 @min-[768px]/page:px-10">
        <MobileNavPanel
          open={open}
          menuId={menuId}
          navItems={navItems}
          onNavigate={handleNavigate}
          panelClassName="mt-0 border-white/10 pb-3"
          linkClassName={premiumHeaderNav}
          ctaLabel={ctaLabel}
          onCta={handleCta}
          ctaClassName={headerCtaDrawer}
        />
      </div>
    </header>
  );
}
