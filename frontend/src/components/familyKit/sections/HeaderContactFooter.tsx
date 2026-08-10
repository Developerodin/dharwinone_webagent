import { getNavItems } from "@/components/shared/contentExtras";
import {
  MobileNavPanel,
  MobileNavToggle,
} from "@/components/shared/MobileNavMenu";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import { useMobileNav } from "@/components/shared/useMobileNav";
import { createScrollHandler, scrollToSection } from "@/lib/scrollToSection";
import { getString } from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import {
  SectionIntro,
  getBodyCopy,
  getBrandName,
  getContactFacts,
  getCopyrightLine,
  getHeadline,
  getTagline,
  getHoursText,
} from "./shared";

const FAMILY_MOBILE_TRIGGER =
  "border border-[var(--theme-line)] bg-[var(--theme-card)] text-[var(--theme-ink)] hover:bg-[color:color-mix(in_srgb,var(--theme-bg)_80%,white_20%)] focus-visible:outline-[var(--theme-accent)]";

const FAMILY_MOBILE_PANEL =
  "mt-3 border-[var(--theme-line)]";

/**
 * Creates family-scoped header, contact, and footer sections.
 */
export function createHeaderContactFooter(
  family: string,
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    [`${family}-header-01`]: createHeader01(tokens),
    [`${family}-contact-01`]: createContact01(tokens),
    [`${family}-contact-02`]: createContact02(tokens),
    [`${family}-footer-01`]: createFooter01(tokens),
    [`${family}-footer-02`]: createFooter02(tokens),
  };
}

/**
 * Builds the sticky family header component.
 */
function createHeader01(tokens: ThemeTokens): SectionComponent {
  /** Compact CTA sizing for the sticky header action row. */
  const headerCtaClass = `${tokens.primaryButton} w-auto max-w-[10.5rem] shrink-0 truncate px-4 py-2 text-xs @min-[640px]/page:max-w-none @min-[640px]/page:px-6 @min-[640px]/page:text-sm`;

  /**
   * Sticky navigation header with scroll-linked section buttons.
   * Mobile: single-row brand + hamburger; desktop: brand/CTA/nav.
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
        <div className="mx-auto max-w-7xl px-4 py-3 @min-[640px]/page:px-6 @min-[640px]/page:py-4 @min-[768px]/page:px-10">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleNavigate("hero")}
              className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--theme-accent)]"
              aria-label="Scroll to hero section"
            >
              {eyebrow ? (
                <p className={`hidden @min-[768px]/page:block ${tokens.eyebrow}`}>
                  {eyebrow}
                </p>
              ) : null}
              <p
                className={`truncate text-lg text-[var(--theme-ink)] @min-[640px]/page:text-xl ${tokens.heading} ${eyebrow ? "@min-[768px]/page:mt-1" : ""}`}
              >
                {brandName}
              </p>
              <p className={`mt-1 hidden text-sm @min-[768px]/page:block ${tokens.body}`}>
                {tagline}
              </p>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCta}
                className={`hidden @min-[768px]/page:inline-flex ${headerCtaClass}`}
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
            className="mt-4 hidden flex-wrap items-center justify-end gap-2 @min-[768px]/page:flex"
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
            ctaClassName={headerCtaClass}
          />
        </div>
      </header>
    );
  }

  return FamilyHeader01;
}

/**
 * Builds the lighter split contact section.
 */
function createContact01(tokens: ThemeTokens): SectionComponent {
  /**
   * Contact split layout with facts on one side and a lightweight form on the other.
   */
  function FamilyContact01({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Let's plan your next table.");
    const body = getBodyCopy(
      content,
      "Share your preferred date, guest count, and anything special. The team will follow up shortly.",
    );
    const facts = getContactFacts(content);

    return (
      <section aria-label="Contact" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto grid max-w-6xl gap-10 @min-[768px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @min-[768px]:gap-14">
          <div className="min-w-0">
            <SectionIntro
              eyebrow="Contact"
              title={headline}
              body={body}
              tokens={tokens}
            />
            <dl className="mt-8 grid gap-5 @min-[640px]:mt-10 @min-[640px]:grid-cols-2 @min-[768px]:grid-cols-1">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-[1.5rem] border border-[var(--theme-line)] bg-[var(--theme-card)] p-5"
                >
                  <dt className={`text-[11px] uppercase tracking-[0.22em] ${tokens.accentText}`}>
                    {fact.label}
                  </dt>
                  <dd className="mt-3 text-sm leading-7 text-[var(--theme-ink)] @min-[640px]:text-base">
                    {fact.href ? (
                      <a href={fact.href} className="transition-opacity hover:opacity-75">
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={`${tokens.formCard} min-w-0 p-6 @min-[640px]:p-8`}>
            <div className="grid gap-4 @min-[640px]:grid-cols-2">
              <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
                <span>Name</span>
                <input type="text" aria-label="Name" className={tokens.input} />
              </label>
              <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
                <span>Email</span>
                <input type="email" aria-label="Email" className={tokens.input} />
              </label>
            </div>
            <label className="mt-4 grid gap-2 text-sm text-[var(--theme-ink)]">
              <span>Message</span>
              <textarea
                aria-label="Message"
                rows={6}
                className={`${tokens.input} resize-none`}
              />
            </label>
            <div className="mt-6 flex justify-start">
              <button type="button" className={tokens.primaryButton}>
                Send Enquiry
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return FamilyContact01;
}

/**
 * Builds the darker atmospheric contact section.
 */
function createContact02(tokens: ThemeTokens): SectionComponent {
  /**
   * Contact card with reservation request fields and footer facts.
   */
  function FamilyContact02({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Tell us about the evening you have in mind.");
    const body = getBodyCopy(
      content,
      "From celebrations to intimate dinners, send the details and we'll shape the right table for the moment.",
    );
    const address = getString(content, "address", "17 Market Lane, Old Quarter");
    const phone = getString(content, "phone", "+1 (555) 410-1200");
    const hours = getHoursText(content);

    return (
      <section
        aria-label="Contact form"
        className={`${tokens.sectionPad} ${tokens.sectionDark} relative overflow-hidden`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_48%)]"
        />
        <div className="relative mx-auto max-w-6xl">
          <div className={`${tokens.formCard} mx-auto max-w-4xl p-6 @min-[640px]:p-8 @min-[768px]:p-10`}>
            <SectionIntro
              eyebrow="Private Dining"
              title={headline}
              body={body}
              tokens={tokens}
              align="center"
            />
            <div className="mt-8 grid gap-4 @min-[640px]:grid-cols-2">
              <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
                <span>Name</span>
                <input type="text" aria-label="Name" className={tokens.input} />
              </label>
              <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
                <span>Email</span>
                <input type="email" aria-label="Email" className={tokens.input} />
              </label>
              <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
                <span>Phone</span>
                <input type="tel" aria-label="Phone" className={tokens.input} />
              </label>
              <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
                <span>Date</span>
                <input type="text" aria-label="Date" className={tokens.input} />
              </label>
              <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
                <span>Time</span>
                <input type="text" aria-label="Time" className={tokens.input} />
              </label>
              <label className="grid gap-2 text-sm text-[var(--theme-ink)]">
                <span>Requests</span>
                <input type="text" aria-label="Special requests" className={tokens.input} />
              </label>
            </div>
            <label className="mt-4 grid gap-2 text-sm text-[var(--theme-ink)]">
              <span>Notes</span>
              <textarea
                aria-label="Notes"
                rows={5}
                className={`${tokens.input} resize-none`}
              />
            </label>
            <div className="mt-6 flex justify-center">
              <button type="button" className={tokens.primaryButton}>
                Send Request
              </button>
            </div>
          </div>

          <div className="mx-auto mt-8 grid max-w-5xl gap-4 @min-[640px]:grid-cols-3">
            {[
              { label: "Address", value: address },
              { label: "Phone", value: phone },
              { label: "Hours", value: hours },
            ].map((fact) => (
              <div
                key={fact.label}
                className="rounded-[1.25rem] border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm"
              >
                <p className={`text-[11px] uppercase tracking-[0.24em] ${tokens.accentTextOnDark}`}>
                  {fact.label}
                </p>
                <p className={`mt-3 text-sm leading-7 @min-[640px]:text-base ${tokens.mutedOnDark}`}>
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return FamilyContact02;
}

/**
 * Builds the lighter footer layout.
 */
function createFooter01(tokens: ThemeTokens): SectionComponent {
  /**
   * Footer with brand copy, scroll navigation, and contact facts.
   */
  function FamilyFooter01({ content }: SectionComponentProps) {
    const brandName = getBrandName(content);
    const tagline = getTagline(content);
    const navItems = getNavItems(content);
    const facts = getContactFacts(content).slice(0, 3);
    const copyright = getCopyrightLine(content);

    return (
      <footer aria-label="Footer" className={`${tokens.sectionPad} ${tokens.sectionAlt} border-t border-[var(--theme-line)]`}>
        <div className="mx-auto grid max-w-6xl gap-10 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <div className="min-w-0">
            <p className={`text-xl text-[var(--theme-ink)] ${tokens.heading}`}>{brandName}</p>
            <p className={`mt-3 max-w-md text-sm @min-[640px]:text-base ${tokens.body}`}>
              {tagline}
            </p>
          </div>
          <div>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${tokens.accentText}`}>
              Navigate
            </p>
            <div className="mt-4 flex flex-col items-start gap-2">
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
            </div>
          </div>
          <div>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${tokens.accentText}`}>
              Contact
            </p>
            <ul className="mt-4 space-y-3" role="list">
              {facts.map((fact) => (
                <li key={fact.label} className={`text-sm @min-[640px]:text-base ${tokens.body}`}>
                  <span className="text-[var(--theme-ink)]">{fact.label}:</span> {fact.value}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className={`mx-auto mt-10 max-w-6xl text-sm ${tokens.body}`}>{copyright}</p>
      </footer>
    );
  }

  return FamilyFooter01;
}

/**
 * Builds the darker atmospheric footer layout.
 */
function createFooter02(tokens: ThemeTokens): SectionComponent {
  /**
   * Dense footer with dark backdrop, nav, and contact summary.
   */
  function FamilyFooter02({ content }: SectionComponentProps) {
    const brandName = getBrandName(content);
    const tagline = getTagline(content);
    const navItems = getNavItems(content);
    const facts = getContactFacts(content).slice(0, 3);
    const copyright = getCopyrightLine(content);

    return (
      <footer aria-label="Footer" className={`${tokens.sectionPad} ${tokens.sectionDark}`}>
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm @min-[640px]:p-8">
          <div className="grid gap-8 @min-[768px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.9fr)] @min-[768px]:items-start">
            <div>
              <p className={`text-xl text-[var(--theme-on-dark)] ${tokens.heading}`}>{brandName}</p>
              <p className={`mt-3 max-w-md text-sm @min-[640px]:text-base ${tokens.mutedOnDark}`}>
                {tagline}
              </p>
            </div>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <button
                  key={`${item.target}-${item.label}`}
                  type="button"
                  onClick={createScrollHandler(item.target)}
                  className={tokens.navLinkOnDark}
                  aria-label={`Scroll to ${item.label}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="space-y-2">
              {facts.map((fact) => (
                <p key={fact.label} className={`text-sm leading-7 @min-[640px]:text-base ${tokens.mutedOnDark}`}>
                  <span className="text-[var(--theme-on-dark)]">{fact.label}:</span> {fact.value}
                </p>
              ))}
            </div>
          </div>
          <p className={`mt-8 border-t border-white/10 pt-5 text-sm ${tokens.mutedOnDark}`}>
            {copyright}
          </p>
        </div>
      </footer>
    );
  }

  return FamilyFooter02;
}
