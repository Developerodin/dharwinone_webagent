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
 * Premium centered header — brand lockup center, nav below, CTA top-right.
 * Mobile: brand + hamburger; desktop: stacked centered composition.
 */
export function PremiumHeader02({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Maison Copper");
  const tagline = getString(
    content,
    "tagline",
    "Seasonal plates and neighborhood hospitality",
  );
  const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
  const eyebrow = getString(content, "eyebrow", "");
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
      <div className="relative mx-auto w-full min-w-0 max-w-7xl px-4 py-3 @min-[640px]/page:px-6 @min-[768px]/page:px-10 @min-[768px]/page:py-5">
        <div className="flex w-full min-w-0 items-center justify-between gap-3 @min-[1024px]/page:block">
          <button
            type="button"
            onClick={() => handleNavigate("hero")}
            className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)] @min-[1024px]/page:mx-auto @min-[1024px]/page:max-w-2xl @min-[1024px]/page:flex-none @min-[1024px]/page:text-center"
            aria-label="Scroll to hero section"
          >
            {eyebrow ? (
              <span className={`hidden @min-[1024px]/page:inline ${pm.eyebrow}`}>
                {eyebrow}
              </span>
            ) : null}
            <div
              className={`${eyebrow ? "@min-[1024px]/page:mt-2" : ""} flex items-center gap-2 @min-[640px]/page:gap-3 @min-[1024px]/page:justify-center`}
            >
              <span
                className="hidden h-px w-8 shrink-0 bg-[var(--theme-accent)]/55 @min-[1024px]/page:block"
                aria-hidden="true"
              />
              <span className="truncate font-[family-name:var(--font-display)] text-xl tracking-[0.06em] text-[var(--theme-ink)] @min-[640px]/page:text-2xl @min-[768px]/page:text-[2rem]">
                {brandName}
              </span>
              <span
                className="hidden h-px w-8 shrink-0 bg-[var(--theme-accent)]/55 @min-[1024px]/page:block"
                aria-hidden="true"
              />
            </div>
            <p className="mt-1.5 hidden text-sm text-[var(--theme-muted)] @min-[1024px]/page:block">
              {tagline}
            </p>
          </button>

          <div className="flex shrink-0 items-center gap-2 @min-[1024px]/page:absolute @min-[1024px]/page:right-10 @min-[1024px]/page:top-5">
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

        <nav
          aria-label="Primary"
          className="mt-4 hidden flex-nowrap items-center justify-center gap-x-6 overflow-x-auto @min-[1024px]/page:flex"
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

        <MobileNavPanel
          open={open}
          menuId={menuId}
          navItems={navItems}
          onNavigate={handleNavigate}
          panelClassName="mt-3 border-white/10"
          linkClassName={pm.navLink}
          ctaLabel={ctaLabel}
          onCta={handleCta}
          ctaClassName={headerCtaDrawer}
        />
      </div>
    </header>
  );
}
