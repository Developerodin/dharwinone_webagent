import type { SectionComponentProps } from "@/components/premium/registry";
import { getString } from "@/components/premium/contentHelpers";
import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { headerCtaClasses } from "@/components/shared/headerChrome";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";

/** White outline CTA sitting on the Demo9 crimson header. */
const { chrome: headerCtaChrome, drawer: headerCtaDrawer } = headerCtaClasses(
  "w-auto max-w-[10.5rem] shrink-0 truncate border border-white bg-transparent px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-[var(--bold-hero-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white @min-[640px]:max-w-none @min-[640px]:px-6 @min-[640px]:text-xs",
);

const navLinkClass =
  "inline-flex min-h-10 items-center px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 transition-colors hover:text-[var(--theme-accent-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * Bold sticky header — Demo9: crimson bar, split white nav, boxed center logo.
 */
export function BoldHeader01({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Grand Burger");
  const ctaLabel = getString(content, "ctaLabel", "Order Online");
  const navItems = getNavItems(content);
  const { open, menuId, rootRef, toggle, close } = useMobileNav();

  const midpoint = Math.ceil(navItems.length / 2);
  const leftNav = navItems.slice(0, midpoint);
  const rightNav = navItems.slice(midpoint);

  /**
   * Scrolls to a section and closes the mobile menu.
   */
  function handleNavigate(target: string) {
    close();
    scrollToSection(target);
  }

  /**
   * Scrolls to reservation / order and closes the mobile menu.
   */
  function handleCta() {
    handleNavigate("reservation");
  }

  return (
    <header
      ref={rootRef}
      className="sticky top-[var(--shell-header-h)] z-30 bg-[var(--bold-hero-red)]"
      role="banner"
    >
      <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 @min-[640px]:px-6 @min-[640px]:py-4 @min-[768px]:px-10">
        <nav
          aria-label="Primary left"
          className="hidden min-w-0 items-center justify-end gap-x-1 @min-[1024px]:flex"
        >
          {leftNav.map((item) => (
            <button
              key={`l-${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={navLinkClass}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => handleNavigate("hero")}
          className="min-w-0 justify-self-center border border-white px-4 py-2 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white @min-[640px]:px-6 @min-[640px]:py-2.5"
          aria-label="Scroll to hero section"
        >
          <span className="block truncate font-[family-name:var(--theme-font-display)] text-sm font-bold uppercase tracking-[0.22em] text-white @min-[640px]:text-base @min-[768px]:text-lg">
            {brandName}
          </span>
        </button>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <nav
            aria-label="Primary right"
            className="hidden min-w-0 items-center gap-x-1 @min-[1024px]:flex"
          >
            {rightNav.map((item) => (
              <button
                key={`r-${item.target}-${item.label}`}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={navLinkClass}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <button type="button" onClick={handleCta} className={headerCtaChrome}>
            {ctaLabel}
          </button>
          <MobileNavToggle
            open={open}
            menuId={menuId}
            onToggle={toggle}
            className="border border-white/40 bg-transparent text-white hover:bg-white/10 focus-visible:outline-white @min-[1024px]:hidden"
          />
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 @min-[640px]:px-6 @min-[768px]:px-10">
        <MobileNavPanel
          open={open}
          menuId={menuId}
          navItems={navItems}
          onNavigate={handleNavigate}
          panelClassName="mt-0 border-white/20 pb-3"
          linkClassName={`${navLinkClass} w-full justify-start rounded-xl px-3 py-3`}
          ctaLabel={ctaLabel}
          onCta={handleCta}
          ctaClassName={headerCtaDrawer}
        />
      </div>
    </header>
  );
}
