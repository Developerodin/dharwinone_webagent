import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { headerCtaClasses } from "@/components/shared/headerChrome";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";

/** Compact gold outline CTA for the sticky header action row (display gated separately). */
const { chrome: headerCtaChrome, drawer: headerCtaDrawer } = headerCtaClasses(
  "w-auto max-w-[10.5rem] shrink-0 items-center justify-center truncate border border-[var(--eg-gold)] px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-[var(--eg-gold)] transition-colors duration-200 hover:bg-[var(--eg-gold)] hover:text-[var(--eg-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)] @min-[640px]/page:max-w-none @min-[640px]/page:px-6 @min-[640px]/page:text-xs",
);

/** Desktop nav link — gold uppercase, no pill chrome. */
const headerNavLinkClass =
  "inline-flex min-h-10 items-center justify-center px-1 py-1 text-[11px] uppercase tracking-[0.22em] text-[var(--eg-gold)] transition-opacity duration-200 hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--eg-gold)]";

/** Mobile panel link — same gold treatment with fuller tap targets. */
const mobileNavLinkClass =
  "inline-flex min-h-11 w-full items-center justify-start rounded-xl px-3 py-3 text-xs uppercase tracking-[0.22em] text-[var(--eg-gold)] transition-colors duration-200 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)]";

/**
 * Elegant sticky header — single row: brand left | inline gold nav center | CTA right.
 * Mobile: brand + hamburger; desktop: full bar with inline nav.
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
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--eg-gold)]/20 bg-[#000000]/92 backdrop-blur-xl"
      role="banner"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-3 px-4 py-2.5 @min-[640px]/page:px-6 @min-[640px]/page:py-3 @min-[768px]/page:gap-6 @min-[768px]/page:px-10">
        <button
          type="button"
          onClick={() => handleNavigate("hero")}
          className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--eg-gold)]"
          aria-label="Scroll to hero section"
        >
          <div className="flex items-center gap-2.5 @min-[640px]/page:gap-3">
            <span
              className={`hidden ${eg.goldRule} w-8 shrink-0 @min-[480px]/page:block @min-[640px]/page:w-10`}
              aria-hidden="true"
            />
            <span className="truncate font-[family-name:var(--eg-font-display)] text-lg tracking-[0.08em] text-[var(--eg-cream)] @min-[640px]/page:text-xl @min-[768px]/page:text-2xl">
              {brandName}
            </span>
          </div>
          {tagline ? (
            <p className="mt-0.5 hidden max-w-xs truncate font-[family-name:var(--eg-font-body)] text-[11px] text-[var(--eg-muted)] @min-[1280px]/page:block">
              {tagline}
            </p>
          ) : null}
        </button>

        <nav
          aria-label="Primary"
          className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-x-2 overflow-x-auto @min-[1024px]/page:flex"
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
