import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { headerCtaClasses } from "@/components/shared/headerChrome";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";

/** Compact CTA for the centered header layout (display gated separately). */
const { chrome: headerCtaChrome, drawer: headerCtaDrawer } = headerCtaClasses(
  `${pm.primaryButton} w-auto max-w-[10.5rem] shrink-0 truncate px-4 py-2 text-xs @min-[640px]/page:max-w-none @min-[640px]/page:px-6 @min-[640px]/page:text-sm`,
);

/**
 * Premium sticky header — single row: brand+tagline left | inline nav center | CTA right.
 * Mobile: brand + hamburger; desktop: full bar with centered nav.
 */
export function PremiumHeader02({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Maison Copper");
  const tagline = getString(
    content,
    "tagline",
    "Seasonal plates and neighborhood hospitality",
  );
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
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-white/10 bg-[var(--theme-bg)]/90 backdrop-blur-xl"
      role="banner"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-3 px-4 py-2.5 @min-[640px]/page:px-6 @min-[640px]/page:py-3 @min-[768px]/page:gap-6 @min-[768px]/page:px-10">
        <button
          type="button"
          onClick={() => handleNavigate("hero")}
          className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)]"
          aria-label="Scroll to hero section"
        >
          <div className="flex items-center gap-2 @min-[640px]/page:gap-3">
            <span
              className="hidden h-px w-8 shrink-0 bg-[var(--theme-accent)]/55 @min-[480px]/page:block @min-[640px]/page:w-10"
              aria-hidden="true"
            />
            <span className="truncate font-[family-name:var(--font-display)] text-lg tracking-[0.06em] text-[var(--theme-ink)] @min-[640px]/page:text-xl @min-[768px]/page:text-2xl">
              {brandName}
            </span>
          </div>
          {tagline ? (
            <p className="mt-0.5 hidden max-w-xs truncate text-[11px] text-[var(--theme-muted)] @min-[1024px]/page:block">
              {tagline}
            </p>
          ) : null}
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
            className={headerCtaChrome}
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

      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 @min-[640px]/page:px-6 @min-[768px]/page:px-10">
        <MobileNavPanel
          open={open}
          menuId={menuId}
          navItems={navItems}
          onNavigate={handleNavigate}
          panelClassName="mt-0 border-white/10 pb-3"
          linkClassName={pm.navLink}
          ctaLabel={ctaLabel}
          onCta={handleCta}
          ctaClassName={headerCtaDrawer}
        />
      </div>
    </header>
  );
}
