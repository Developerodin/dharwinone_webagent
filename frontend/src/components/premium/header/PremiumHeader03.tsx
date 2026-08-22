import type { SectionComponentProps } from "../registry";
import { getString } from "../contentHelpers";
import {
  getNavItems,
  withHomeNavItem,
} from "@/components/shared/contentExtras";
import { MobileNavToggle } from "@/components/shared/MobileNavMenu";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";
import { premiumOverlayCta } from "./premiumHeaderChrome";
import {
  getOverlaySocials,
  PremiumOverlayDrawer,
} from "./PremiumOverlayDrawer";

/**
 * Premium header 03 — transparent overlay, centered wordmark, left off-canvas.
 */
export function PremiumHeader03({ content }: SectionComponentProps) {
  const brandName = getString(content, "brandName", "Maison Copper");
  const tagline = getString(content, "eyebrow") || getString(content, "tagline");
  const ctaLabel = getString(content, "ctaLabel", "Find a Table");
  const navItems = withHomeNavItem(getNavItems(content));
  const socials = getOverlaySocials(content);
  const { open, menuId, rootRef, toggle, close } = useMobileNav({
    persistOnDesktop: true,
    closeOnScroll: false,
  });

  /**
   * Scrolls to a section and closes the off-canvas menu.
   */
  function handleNavigate(target: string) {
    close();
    scrollToSection(target);
  }

  /**
   * Scrolls to the reservation section and closes the off-canvas menu.
   */
  function handleCta() {
    handleNavigate("reservation");
  }

  return (
    <header
      ref={rootRef}
      className="sticky top-[var(--shell-header-h)] z-40 -mb-[5.75rem] bg-transparent"
      role="banner"
    >
      <div className="relative z-20 mx-auto grid h-[5.75rem] w-full min-w-0 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 @min-[640px]/page:px-6 @min-[768px]/page:px-10">
        <MobileNavToggle
          open={open}
          menuId={menuId}
          onToggle={toggle}
          alwaysVisible
          className={`!rounded-none justify-self-start text-white hover:bg-white/10 focus-visible:outline-white ${
            open ? "pointer-events-none opacity-0" : ""
          }`}
        />

        <button
          type="button"
          onClick={() => handleNavigate("hero")}
          className="min-w-0 justify-self-center text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          aria-label="Scroll to hero section"
        >
          <span className="block truncate font-[family-name:var(--font-display)] text-[1.65rem] italic leading-none tracking-tight text-white @min-[640px]/page:text-[2rem] @min-[1024px]/page:text-[2.15rem]">
            {brandName}
          </span>
          {tagline ? (
            <p className="mt-1.5 truncate text-[9px] font-medium uppercase leading-none tracking-[0.28em] text-white/85 @min-[640px]/page:text-[10px] @min-[640px]/page:tracking-[0.32em]">
              {tagline}
            </p>
          ) : null}
        </button>

        <button
          type="button"
          onClick={handleCta}
          className={`${premiumOverlayCta} justify-self-end`}
        >
          {ctaLabel}
        </button>
      </div>

      <PremiumOverlayDrawer
        open={open}
        menuId={menuId}
        navItems={navItems}
        ctaLabel={ctaLabel}
        onNavigate={handleNavigate}
        onCta={handleCta}
        onClose={close}
        socials={socials}
      />
    </header>
  );
}
