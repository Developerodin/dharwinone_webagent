import { getNavItems } from "@/components/shared/contentExtras";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import { createScrollHandler } from "@/lib/scrollToSection";
import { getString } from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import { createFamilyHeaders } from "./FamilyHeaders";
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

/**
 * Creates family-scoped header, contact, and footer sections.
 */
export function createHeaderContactFooter(
  family: string,
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    ...createFamilyHeaders(family, tokens),
    [`${family}-contact-01`]: createContact01(tokens),
    [`${family}-contact-02`]: createContact02(tokens),
    [`${family}-footer-01`]: createFooter01(tokens),
    [`${family}-footer-02`]: createFooter02(tokens),
  };
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
