import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";

/** Compact CTA for the single-row header. */
const headerCtaClass = `${pm.primaryButton} w-auto max-w-[9.5rem] shrink-0 truncate px-3 py-2 text-xs @min-[640px]/page:max-w-none @min-[640px]/page:px-5`;

/**
 * Premium compact single-row header — brand | inline nav | CTA.
 * Mobile: brand + hamburger; desktop: full inline bar.
 */
export function PremiumHeader03({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Maison Copper");
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
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-white/10 bg-[var(--theme-bg)]/92 backdrop-blur-xl"
      role="banner"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 @min-[640px]/page:px-6 @min-[768px]/page:gap-6 @min-[768px]/page:px-10 @min-[768px]/page:py-3">
        <button
          type="button"
          onClick={() => handleNavigate("hero")}
          className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)]"
          aria-label="Scroll to hero section"
        >
          <span className="block truncate font-[family-name:var(--font-display)] text-lg tracking-[0.05em] text-[var(--theme-ink)] @min-[640px]/page:text-xl">
            {brandName}
          </span>
        </button>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-1 overflow-x-auto @min-[1024px]/page:flex"
        >
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
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCta}
            className={`hidden @min-[1024px]/page:inline-flex ${headerCtaClass}`}
          >
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

      <div className="mx-auto max-w-7xl px-4 @min-[640px]/page:px-6 @min-[768px]/page:px-10">
        <MobileNavPanel
          open={open}
          menuId={menuId}
          navItems={navItems}
          onNavigate={handleNavigate}
          panelClassName="mt-0 border-white/10 pb-3"
          linkClassName={pm.navLink}
          ctaLabel={ctaLabel}
          onCta={handleCta}
          ctaClassName={headerCtaClass}
        />
      </div>
    </header>
  );
}
