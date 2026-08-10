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

/** Compact CTA sizing for the sticky header action row. */
const headerCtaClass = `${pm.primaryButton} w-auto max-w-[10.5rem] shrink-0 truncate px-4 py-2 text-xs @min-[640px]:max-w-none @min-[640px]:px-6 @min-[640px]:text-sm`;

/**
 * Premium sticky header with brand lockup, section nav, and reservation CTA.
 * Mobile: single-row brand + CTA + hamburger; desktop: full brand/CTA/nav.
 */
export function PremiumHeader01({ content }: SectionComponentProps) {
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
      className="sticky top-[var(--shell-header-h)] z-30 border-b border-white/10 bg-[#120f0d]/85 backdrop-blur-xl"
      role="banner"
    >
      <div className="mx-auto max-w-7xl px-4 py-3 @min-[640px]:px-6 @min-[768px]:px-10">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleNavigate("hero")}
            className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c68e6b]"
            aria-label="Scroll to hero section"
          >
            {eyebrow ? (
              <span className={`hidden @min-[768px]:inline ${pm.eyebrow}`}>
                {eyebrow}
              </span>
            ) : null}
            <div
              className={`${eyebrow ? "@min-[768px]:mt-2" : ""} flex items-center gap-2 @min-[640px]:gap-3`}
            >
              <span
                className="hidden h-px w-8 shrink-0 bg-[#c68e6b]/55 @min-[480px]:block @min-[640px]:w-10"
                aria-hidden="true"
              />
              <span className="truncate font-[family-name:var(--font-display)] text-xl tracking-[0.06em] text-[#f6efe8] @min-[640px]:text-2xl @min-[768px]:text-[2rem]">
                {brandName}
              </span>
            </div>
            <p className="mt-1.5 hidden max-w-xl text-sm text-[#bfae9f] @min-[768px]:block">
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
              className="border border-white/12 bg-white/[0.04] text-[#f6efe8] hover:bg-white/[0.08] focus-visible:outline-[#c68e6b]"
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
          ctaClassName={headerCtaClass}
        />
      </div>
    </header>
  );
}
