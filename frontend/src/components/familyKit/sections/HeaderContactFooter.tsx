import { getNavItems } from "@/components/shared/contentExtras";
import type { ThemeTokens } from "@/components/shared/themeTokens";
import { createScrollHandler } from "@/lib/scrollToSection";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import { SiteLeadForm } from "@/components/shared/SiteLeadForm";
import { createFamilyHeaders } from "./FamilyHeaders";
import {
  SectionIntro,
  getBodyCopy,
  getBrandName,
  ContactFactList,
  ContactFactValue,
  getContactFacts,
  getCopyrightLine,
  getHeadline,
  getTagline,
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
              title={headline}
              body={body}
              tokens={tokens}
            />
            <dl className="mt-8 divide-y divide-[var(--theme-line)]">
              {facts.map((fact) => (
                <div key={fact.label} className="flex min-w-0 flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <dt className={`text-sm ${tokens.body}`}>{fact.label}</dt>
                  <dd className="min-w-0 text-sm leading-7 text-[var(--theme-ink)] @min-[640px]:text-base">
                    <ContactFactValue fact={fact} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={`${tokens.formCard} min-w-0 p-6 @min-[640px]:p-8`}>
            <SiteLeadForm
              content={content}
              tokens={tokens}
              kind="contact"
              layout="enquiry"
              submitLabel="Send Enquiry"
            />
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
    const facts = getContactFacts(content);

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
              title={headline}
              body={body}
              tokens={tokens}
              align="center"
            />
            <SiteLeadForm
              content={content}
              tokens={tokens}
              kind="reservation"
              layout="reservation"
              submitLabel="Send Request"
              align="center"
            />
          </div>

          <ContactFactList
            facts={facts}
            onDark
            align="center"
            className="mx-auto mt-10 flex w-full max-w-4xl min-w-0 flex-wrap justify-center gap-x-12 gap-y-8"
          />
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
    const facts = getContactFacts(content);
    const copyright = getCopyrightLine(content);

    return (
      <footer aria-label="Footer" className={`${tokens.sectionPad} ${tokens.sectionAlt} border-t border-[var(--theme-line)]`}>
        <div className="mx-auto grid max-w-6xl min-w-0 grid-cols-1 gap-10 @min-[768px]:grid-cols-2 @min-[1024px]:grid-cols-3">
          <div className="min-w-0">
            <p className={`text-xl text-[var(--theme-ink)] ${tokens.heading}`}>{brandName}</p>
            <p className={`mt-3 max-w-md text-sm @min-[640px]:text-base ${tokens.body}`}>
              {tagline}
            </p>
          </div>
          <nav aria-label="Footer navigation" className="flex min-w-0 flex-col items-start gap-2">
            {navItems.map((item) => (
              <button
                key={`${item.target}-${item.label}`}
                type="button"
                onClick={createScrollHandler(item.target)}
                className="w-fit text-left text-sm text-[var(--theme-ink)] transition hover:opacity-70"
                aria-label={`Scroll to ${item.label}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="min-w-0 @min-[768px]:col-span-2 @min-[1024px]:col-span-1">
            <ContactFactList facts={facts} />
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
    const facts = getContactFacts(content);
    const copyright = getCopyrightLine(content);

    return (
      <footer aria-label="Footer" className={`${tokens.sectionPad} ${tokens.sectionDark}`}>
        <div className="mx-auto max-w-6xl min-w-0">
          <div className="grid min-w-0 grid-cols-1 gap-10 @min-[768px]:grid-cols-2 @min-[1024px]:grid-cols-3 @min-[1024px]:items-start">
            <div className="min-w-0">
              <p className={`text-xl text-[var(--theme-on-dark)] ${tokens.heading}`}>{brandName}</p>
              <p className={`mt-3 max-w-md text-sm @min-[640px]:text-base ${tokens.mutedOnDark}`}>
                {tagline}
              </p>
            </div>
            <nav aria-label="Footer navigation" className="flex min-w-0 flex-col items-start gap-2">
              {navItems.map((item) => (
                <button
                  key={`${item.target}-${item.label}`}
                  type="button"
                  onClick={createScrollHandler(item.target)}
                  className={`text-sm ${tokens.mutedOnDark} transition hover:text-[var(--theme-on-dark)]`}
                  aria-label={`Scroll to ${item.label}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="min-w-0 @min-[768px]:col-span-2 @min-[1024px]:col-span-1">
              <ContactFactList facts={facts} onDark />
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
