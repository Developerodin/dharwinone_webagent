import { getNavItems, splitNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import { headerCtaClasses } from "@/components/shared/headerChrome";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { scrollToSection } from "@/lib/scrollToSection";
import { getString } from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import { getBrandName, getTagline } from "./shared";

const FAMILY_MOBILE_TRIGGER =
  "border border-[var(--theme-line)] bg-[var(--theme-card)] text-[var(--theme-ink)] hover:bg-[color:color-mix(in_srgb,var(--theme-bg)_80%,white_20%)] focus-visible:outline-[var(--theme-accent)]";

const FAMILY_HEADER_NAV =
  "inline-flex min-h-10 shrink-0 items-center px-2.5 text-[13px] text-[var(--theme-muted)] transition-colors duration-200 hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]";

const CTA_SIZE =
  "min-h-9 w-auto max-w-[10.5rem] shrink-0 truncate px-4 py-2 text-xs shadow-none hover:translate-y-0 hover:scale-100 @min-[640px]/page:max-w-none @min-[640px]/page:px-5 @min-[640px]/page:text-sm";

/**
 * Builds filled / outline / ghost header CTAs (display gated separately).
 */
function familyHeaderCtas(): {
  fill: { chrome: string; drawer: string };
  outline: { chrome: string; drawer: string };
  ghost: { chrome: string; drawer: string };
} {
  return {
    fill: headerCtaClasses(
      `inline-flex ${CTA_SIZE} items-center justify-center rounded-[var(--theme-radius-control)] border border-[var(--theme-accent)] bg-[var(--theme-accent)] font-medium text-[var(--theme-accent-contrast)] transition-colors hover:bg-transparent hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]`,
    ),
    outline: headerCtaClasses(
      `inline-flex ${CTA_SIZE} items-center justify-center rounded-[var(--theme-radius-control)] border border-[var(--theme-ink)] bg-transparent text-[var(--theme-ink)] transition-colors hover:bg-[var(--theme-bg-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]`,
    ),
    ghost: headerCtaClasses(
      "inline-flex min-h-9 w-auto max-w-[10.5rem] shrink-0 items-center justify-center truncate border-b border-[var(--theme-accent)]/70 px-1 py-2 text-xs text-[var(--theme-ink)] transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)] @min-[640px]/page:max-w-none @min-[640px]/page:text-sm",
    ),
  };
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
 * Left wordmark bar with quiet text nav and a filled CTA.
 */
function createHeader01(tokens: ThemeTokens): SectionComponent {
  const { fill } = familyHeaderCtas();

  /**
   * Sticky left-brand family header.
   */
  function FamilyHeader01({ content }: SectionComponentProps) {
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
        className={`${tokens.section} sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--theme-line)] bg-[color:color-mix(in_srgb,var(--theme-bg)_88%,transparent)] backdrop-blur-md`}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-4 px-4 py-3 @min-[640px]/page:px-6 @min-[768px]/page:px-10 @min-[768px]/page:py-3.5">
          <button
            type="button"
            onClick={() => handleNavigate("hero")}
            className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)]"
            aria-label="Scroll to hero section"
          >
            <p
              className={`truncate text-xl leading-none tracking-tight text-[var(--theme-ink)] @min-[640px]/page:text-2xl ${tokens.heading}`}
            >
              {brandName}
            </p>
          </button>

          <nav
            aria-label="Primary navigation"
            className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 @min-[1024px]/page:flex"
          >
            {navItems.map((item) => (
              <button
                key={`${item.target}-${item.label}`}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={FAMILY_HEADER_NAV}
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
              className={fill.chrome}
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
            linkClassName={FAMILY_HEADER_NAV}
            ctaLabel={ctaLabel}
            onCta={handleCta}
            ctaClassName={fill.drawer}
          />
        </div>
      </header>
    );
  }

  return FamilyHeader01;
}

/**
 * Centered wordmark with split nav (magazine masthead).
 */
function createHeader02(tokens: ThemeTokens): SectionComponent {
  const { outline } = familyHeaderCtas();

  /**
   * Sticky centered family header.
   */
  function FamilyHeader02({ content }: SectionComponentProps) {
    const brandName = getBrandName(content);
    const tagline = getTagline(content);
    const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
    const navItems = getNavItems(content);
    const { left, right } = splitNavItems(navItems);
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
        className={`${tokens.section} sticky top-[var(--shell-header-h)] z-30 border-b border-[var(--theme-line)] bg-[color:color-mix(in_srgb,var(--theme-bg)_90%,transparent)] backdrop-blur-md`}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-3 px-4 py-3 @min-[640px]/page:px-6 @min-[768px]/page:px-10 @min-[1024px]/page:grid @min-[1024px]/page:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @min-[1024px]/page:gap-6 @min-[1024px]/page:py-4">
          <nav
            aria-label="Primary left"
            className="hidden min-w-0 items-center justify-end gap-0.5 @min-[1024px]/page:flex"
          >
            {left.map((item) => (
              <button
                key={`l-${item.target}-${item.label}`}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={FAMILY_HEADER_NAV}
                aria-label={`Scroll to ${item.label}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => handleNavigate("hero")}
            className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)] @min-[1024px]/page:justify-self-center @min-[1024px]/page:text-center"
            aria-label="Scroll to hero section"
          >
            <p
              className={`truncate text-xl leading-none tracking-tight text-[var(--theme-ink)] @min-[640px]/page:text-2xl ${tokens.heading}`}
            >
              {brandName}
            </p>
            {tagline ? (
              <p className={`mt-1 hidden max-w-xs truncate text-[12px] leading-snug @min-[1024px]/page:block ${tokens.body}`}>
                {tagline}
              </p>
            ) : null}
          </button>

          <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 @min-[1024px]/page:ml-0">
            <nav
              aria-label="Primary right"
              className="hidden min-w-0 items-center gap-0.5 @min-[1024px]/page:flex"
            >
              {right.map((item) => (
                <button
                  key={`r-${item.target}-${item.label}`}
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  className={FAMILY_HEADER_NAV}
                  aria-label={`Scroll to ${item.label}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={handleCta}
              className={outline.chrome}
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
            linkClassName={FAMILY_HEADER_NAV}
            ctaLabel={ctaLabel}
            onCta={handleCta}
            ctaClassName={outline.drawer}
          />
        </div>
      </header>
    );
  }

  return FamilyHeader02;
}

/**
 * Compact utility bar with a ghost CTA.
 */
function createHeader03(tokens: ThemeTokens): SectionComponent {
  const { ghost } = familyHeaderCtas();

  /**
   * Sticky compact family header.
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
        className={`${tokens.section} sticky top-[var(--shell-header-h)] z-30 border-y border-[var(--theme-line)] bg-[color:color-mix(in_srgb,var(--theme-bg)_92%,transparent)] backdrop-blur-md`}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-4 px-4 py-2 @min-[640px]/page:px-6 @min-[768px]/page:px-10">
          <button
            type="button"
            onClick={() => handleNavigate("hero")}
            className="min-w-0 shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)]"
            aria-label="Scroll to hero section"
          >
            <p
              className={`truncate text-base tracking-tight text-[var(--theme-ink)] @min-[640px]/page:text-lg ${tokens.heading}`}
            >
              {brandName}
            </p>
          </button>

          <nav
            aria-label="Primary navigation"
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 @min-[1024px]/page:flex"
          >
            {navItems.map((item) => (
              <button
                key={`${item.target}-${item.label}`}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className={FAMILY_HEADER_NAV}
                aria-label={`Scroll to ${item.label}`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={handleCta}
              className={ghost.chrome}
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
            linkClassName={FAMILY_HEADER_NAV}
            ctaLabel={ctaLabel}
            onCta={handleCta}
            ctaClassName={ghost.drawer}
          />
        </div>
      </header>
    );
  }

  return FamilyHeader03;
}
