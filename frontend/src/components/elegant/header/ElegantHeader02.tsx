import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { getNavItems, splitNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";
import {
  HeaderBrandMark,
  HEADER_SPLIT_ROW,
  HEADER_SPLIT_ROW_TAGLINE,
} from "@/components/shared/HeaderBrandMark";
import {
  elegantHeaderCta,
  elegantHeaderNav,
  elegantHeaderNavMobile,
} from "./elegantHeaderChrome";

/**
 * Elegant header 02 — centered wordmark with split gold nav.
 */
export function ElegantHeader02({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Caverta House");
  const tagline = getString(
    content,
    "tagline",
    "Refined tasting menus and candlelit service",
  );
  const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
  const navItems = getNavItems(content);
  const { left, right } = splitNavItems(navItems);
  const { open, menuId, rootRef, toggle, close } = useMobileNav();
  const { chrome: headerCtaChrome, drawer: headerCtaDrawer } = elegantHeaderCta;

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
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--eg-gold)]/20 bg-[#000000]/92 backdrop-blur-md"
      role="banner"
    >
      <div className={tagline ? HEADER_SPLIT_ROW_TAGLINE : HEADER_SPLIT_ROW}>
        <nav
          aria-label="Primary left"
          className="hidden min-w-0 items-center justify-end gap-0.5 @min-[1024px]/page:flex"
        >
          {left.map((item) => (
            <button
              key={`l-${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={elegantHeaderNav}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <HeaderBrandMark
          brandName={brandName}
          tagline={tagline}
          onClick={() => handleNavigate("hero")}
          align="center"
          nameClassName="font-[family-name:var(--eg-font-display)] text-xl tracking-[0.08em] text-[var(--eg-cream)] @min-[640px]/page:text-2xl @min-[1024px]/page:text-[1.65rem]"
          taglineClassName="font-[family-name:var(--eg-font-body)] text-[10px] uppercase leading-none tracking-[0.22em] text-[var(--eg-muted)]"
          focusRingClassName="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--eg-gold)]"
        />

        <nav
          aria-label="Primary right"
          className="hidden min-w-0 items-center justify-start gap-0.5 @min-[1024px]/page:flex"
        >
          {right.map((item) => (
            <button
              key={`r-${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={elegantHeaderNav}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center justify-end gap-2 @min-[1024px]/page:ml-0">
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
