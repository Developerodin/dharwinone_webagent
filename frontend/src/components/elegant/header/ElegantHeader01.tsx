import type { SectionComponentProps } from "../registry";
import { getString } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";

/** Compact CTA sizing for the sticky header action row. */
const headerCtaClass = `${eg.goldButton} w-auto max-w-[10.5rem] shrink-0 truncate px-4 py-2 text-[10px] tracking-[0.16em] @min-[640px]:max-w-none @min-[640px]:px-6 @min-[640px]:text-xs`;

/**
 * Elegant sticky header with a restrained gold-accent navigation bar.
 * Mobile: single-row brand + CTA + hamburger; desktop: full brand/CTA/nav.
 */
export function ElegantHeader01({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Caverta House");
  const tagline = getString(
    content,
    "tagline",
    "Refined tasting menus and candlelit service",
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
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--eg-gold)]/15 bg-[#101010]/88 backdrop-blur-xl"
      role="banner"
    >
      <div className="mx-auto max-w-7xl px-4 py-3 @min-[640px]:px-6 @min-[768px]:px-10">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleNavigate("hero")}
            className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--eg-gold)]"
            aria-label="Scroll to hero section"
          >
            {eyebrow ? (
              <span className={`hidden @min-[768px]:inline ${eg.eyebrow}`}>
                {eyebrow}
              </span>
            ) : null}
            <div
              className={`${eyebrow ? "@min-[768px]:mt-2" : ""} flex items-center gap-2 @min-[640px]:gap-3`}
            >
              <span
                className={`hidden ${eg.goldRule} w-8 shrink-0 @min-[480px]:block @min-[640px]:w-10`}
                aria-hidden="true"
              />
              <span className="truncate font-[family-name:var(--eg-font-display)] text-xl tracking-[0.08em] text-[var(--eg-cream)] @min-[640px]:text-2xl @min-[768px]:text-[2rem]">
                {brandName}
              </span>
            </div>
            <p className="mt-1.5 hidden max-w-xl text-sm text-[var(--eg-muted)] @min-[768px]:block">
              {tagline}
            </p>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleCta}
              className={`hidden @min-[480px]:inline-flex ${headerCtaClass}`}
            >
              {ctaLabel}
            </button>
            <MobileNavToggle
              open={open}
              menuId={menuId}
              onToggle={toggle}
              className="border border-[var(--eg-gold)]/25 bg-white/[0.03] text-[var(--eg-cream)] hover:border-[var(--eg-gold)]/45 hover:bg-white/[0.06] focus-visible:outline-[var(--eg-gold)]"
            />
          </div>
        </div>

        <nav
          aria-label="Primary"
          className="mt-4 hidden flex-wrap items-center gap-2 @min-[768px]:flex"
        >
          {navItems.map((item) => (
            <button
              key={`${item.target}-${item.label}`}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={eg.navLink}
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
          panelClassName="mt-3 border-[var(--eg-gold)]/15"
          linkClassName={eg.navLink}
          ctaLabel={ctaLabel}
          onCta={handleCta}
          ctaClassName={headerCtaClass}
        />
      </div>
    </header>
  );
}
