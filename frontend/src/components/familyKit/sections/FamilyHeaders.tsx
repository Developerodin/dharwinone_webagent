import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { headerCtaClasses } from "@/components/shared/headerChrome";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { createScrollHandler, scrollToSection } from "@/lib/scrollToSection";
import { getString } from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import { getBrandName, getTagline } from "./shared";

const FAMILY_MOBILE_TRIGGER =
  "border border-[var(--theme-line)] bg-[var(--theme-card)] text-[var(--theme-ink)] hover:bg-[color:color-mix(in_srgb,var(--theme-bg)_80%,white_20%)] focus-visible:outline-[var(--theme-accent)]";

const FAMILY_MOBILE_PANEL = "mt-3 border-[var(--theme-line)]";

/**
 * Builds chrome/drawer CTA classes for family headers (display gated separately).
 */
function familyHeaderCta(
  tokens: ThemeTokens,
  compact = false,
): { chrome: string; drawer: string } {
  const sizing = compact
    ? "w-auto max-w-[9.5rem] shrink-0 truncate px-3 py-2 text-xs @min-[640px]/page:max-w-none @min-[640px]/page:px-5"
    : "w-auto max-w-[10.5rem] shrink-0 truncate px-4 py-2 text-xs @min-[640px]/page:max-w-none @min-[640px]/page:px-6 @min-[640px]/page:text-sm";
  return headerCtaClasses(`${tokens.primaryButton} ${sizing}`);
}

/**
 * Creates three structurally different family header variants.
 */
export function createFamilyHeaders(
  family: string,
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    [`${family}-header-01`]: createHeader01(tokens),
    [`${family}-header-02`]: createHeader02(tokens),
    [`${family}-header-03`]: createHeader03(tokens),
  };
}

/**
 * Brand left + CTA right; nav row under brand.
 */
function createHeader01(tokens: ThemeTokens): SectionComponent {
  const { chrome: headerCtaChrome, drawer: headerCtaDrawer } =
    familyHeaderCta(tokens);

  /**
   * Sticky left-brand family header.
   */
  function FamilyHeader01({ content }: SectionComponentProps) {
    const brandName = getBrandName(content);
    const tagline = getTagline(content);
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
        aria-label="Site header"
        className={`${tokens.section} sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--theme-line)] bg-[color:color-mix(in_srgb,var(--theme-bg)_88%,transparent)]/95 shadow-[0_1px_0_rgba(17,17,17,0.04)] backdrop-blur-md`}
      >
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-3 @min-[640px]/page:px-6 @min-[640px]/page:py-4 @min-[768px]/page:px-10">
          <div className="flex w-full min-w-0 items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleNavigate("hero")}
              className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)]"
              aria-label="Scroll to hero section"
            >
              {eyebrow ? (
                <p className={`hidden @min-[1024px]/page:block ${tokens.eyebrow}`}>
                  {eyebrow}
                </p>
              ) : null}
              <p
                className={`truncate text-lg text-[var(--theme-ink)] @min-[640px]/page:text-xl ${tokens.heading} ${eyebrow ? "@min-[1024px]/page:mt-1" : ""}`}
              >
                {brandName}
              </p>
              <p className={`mt-1 hidden text-sm @min-[1024px]/page:block ${tokens.body}`}>
                {tagline}
              </p>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCta}
                className={headerCtaChrome}
                aria-label={ctaLabel}
              >
                {ctaLabel}
              </button>
              <MobileNavToggle
                open={open}
                menuId={menuId}
                onToggle={toggle}
                className={FAMILY_MOBILE_TRIGGER}
              />
            </div>
          </div>

          <nav
            aria-label="Primary navigation"
            className="mt-4 hidden flex-nowrap items-center gap-2 overflow-x-auto @min-[1024px]/page:flex"
          >
            {navItems.map((item) => (
              <button
                key={`${item.target}-${item.label}`}
                type="button"
                onClick={createScrollHandler(item.target)}
                className={tokens.navLink}
                aria-label={`Scroll to ${item.label}`}
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
            panelClassName={FAMILY_MOBILE_PANEL}
            linkClassName={tokens.navLink}
            ctaLabel={ctaLabel}
            onCta={handleCta}
            ctaClassName={headerCtaDrawer}
          />
        </div>
      </header>
    );
  }

  return FamilyHeader01;
}

/**
 * Centered brand lockup with nav below and CTA top-right.
 */
function createHeader02(tokens: ThemeTokens): SectionComponent {
  const { chrome: headerCtaChrome, drawer: headerCtaDrawer } =
    familyHeaderCta(tokens);

  /**
   * Sticky centered family header.
   */
  function FamilyHeader02({ content }: SectionComponentProps) {
    const brandName = getBrandName(content);
    const tagline = getTagline(content);
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
        aria-label="Site header"
        className={`${tokens.section} sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--theme-line)] bg-[color:color-mix(in_srgb,var(--theme-bg)_90%,transparent)]/95 backdrop-blur-md`}
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
                <p className={`hidden @min-[1024px]/page:block ${tokens.eyebrow}`}>
                  {eyebrow}
                </p>
              ) : null}
              <p
                className={`truncate text-lg text-[var(--theme-ink)] @min-[640px]/page:text-xl @min-[768px]/page:text-2xl ${tokens.heading}`}
              >
                {brandName}
              </p>
              <p className={`mt-1 hidden text-sm @min-[1024px]/page:block ${tokens.body}`}>
                {tagline}
              </p>
            </button>

            <div className="flex shrink-0 items-center gap-2 @min-[1024px]/page:absolute @min-[1024px]/page:right-10 @min-[1024px]/page:top-5">
              <button
                type="button"
                onClick={handleCta}
                className={headerCtaChrome}
                aria-label={ctaLabel}
              >
                {ctaLabel}
              </button>
              <MobileNavToggle
                open={open}
                menuId={menuId}
                onToggle={toggle}
                className={FAMILY_MOBILE_TRIGGER}
              />
            </div>
          </div>

          <nav
            aria-label="Primary navigation"
            className="mt-4 hidden flex-nowrap items-center justify-center gap-2 overflow-x-auto @min-[1024px]/page:flex"
          >
            {navItems.map((item) => (
              <button
                key={`${item.target}-${item.label}`}
                type="button"
                onClick={createScrollHandler(item.target)}
                className={tokens.navLink}
                aria-label={`Scroll to ${item.label}`}
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
            panelClassName={FAMILY_MOBILE_PANEL}
            linkClassName={tokens.navLink}
            ctaLabel={ctaLabel}
            onCta={handleCta}
            ctaClassName={headerCtaDrawer}
          />
        </div>
      </header>
    );
  }

  return FamilyHeader02;
}

/**
 * Compact single-row: brand | inline nav | CTA.
 */
function createHeader03(tokens: ThemeTokens): SectionComponent {
  const { chrome: headerCtaChrome, drawer: headerCtaDrawer } =
    familyHeaderCta(tokens, true);

  /**
   * Sticky compact single-row family header.
   */
  function FamilyHeader03({ content }: SectionComponentProps) {
    const brandName = getBrandName(content);
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
        aria-label="Site header"
        className={`${tokens.section} sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--theme-line)] bg-[color:color-mix(in_srgb,var(--theme-bg)_92%,transparent)]/95 backdrop-blur-md`}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-3 px-4 py-2.5 @min-[640px]/page:px-6 @min-[768px]/page:gap-6 @min-[768px]/page:px-10 @min-[768px]/page:py-3">
          <button
            type="button"
            onClick={() => handleNavigate("hero")}
            className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)]"
            aria-label="Scroll to hero section"
          >
            <p
              className={`truncate text-lg text-[var(--theme-ink)] @min-[640px]/page:text-xl ${tokens.heading}`}
            >
              {brandName}
            </p>
          </button>

          <nav
            aria-label="Primary navigation"
            className="hidden min-w-0 flex-1 flex-nowrap items-center justify-center gap-1 overflow-x-auto @min-[1024px]/page:flex"
          >
            {navItems.map((item) => (
              <button
                key={`${item.target}-${item.label}`}
                type="button"
                onClick={createScrollHandler(item.target)}
                className={tokens.navLink}
                aria-label={`Scroll to ${item.label}`}
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
              aria-label={ctaLabel}
            >
              {ctaLabel}
            </button>
            <MobileNavToggle
              open={open}
              menuId={menuId}
              onToggle={toggle}
              className={FAMILY_MOBILE_TRIGGER}
            />
          </div>
        </div>

        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 @min-[640px]/page:px-6 @min-[768px]/page:px-10">
          <MobileNavPanel
            open={open}
            menuId={menuId}
            navItems={navItems}
            onNavigate={handleNavigate}
            panelClassName="mt-0 border-[var(--theme-line)] pb-3"
            linkClassName={tokens.navLink}
            ctaLabel={ctaLabel}
            onCta={handleCta}
            ctaClassName={headerCtaDrawer}
          />
        </div>
      </header>
    );
  }

  return FamilyHeader03;
}
