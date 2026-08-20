import type { ThemeTokens } from "@/components/shared/themeTokens";
import { getString, toMailHref, toTelHref } from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import { getNavItems } from "@/components/shared/contentExtras";
import { AddressActions } from "@/components/shared/AddressActions";
import { LocationMapEmbed } from "@/components/shared/LocationMapEmbed";
import { readCoord } from "@/lib/googleMapsLinks";
import { scrollToSection } from "@/lib/scrollToSection";
import {
  ContactFactValue,
  getBodyCopy,
  getBrandName,
  getContactFacts,
  getCopyrightLine,
  getHeadline,
  getTagline,
} from "./shared";

/**
 * Creates reservation/location/footer 03 layouts for a family.
 */
export function createClosing03Sections(
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    reservation03: createReservation03(tokens),
    location03: createLocation03(tokens),
    footer03: createFooter03(tokens),
  };
}

/**
 * Builds a left-thesis reservation band with phone.
 */
function createReservation03(tokens: ThemeTokens): SectionComponent {
  /**
   * Reservation strip: headline, body, CTA, optional phone.
   */
  function FamilyReservation03({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Keep the table.");
    const body = getBodyCopy(content, "Write with a date and a count. The floor will take it from there.");
    const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
    const phone = getString(content, "phone");

    return (
      <section aria-label="Reservation" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-8 border-t border-[var(--theme-line)] pt-10 @min-[768px]:flex-row @min-[768px]:items-end @min-[768px]:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h2 className={`text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingSection}`}>
              {headline}
            </h2>
            {body ? <p className={`mt-4 text-sm ${tokens.body}`}>{body}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className={tokens.primaryButton}
              onClick={() => scrollToSection("contact")}
            >
              {ctaLabel}
            </button>
            {phone ? (
              <a href={toTelHref(phone)} className={`text-sm ${tokens.body}`}>
                {phone}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return FamilyReservation03;
}

/**
 * Builds an address-as-thesis location section.
 */
function createLocation03(tokens: ThemeTokens): SectionComponent {
  /**
   * Large address over a map, without a centered Visit Us stack.
   */
  function FamilyLocation03({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Find the room.");
    const note = getString(content, "directionsNote");
    const facts = getContactFacts(content);
    const addressFact = facts.find((fact) => fact.kind === "address");
    const phoneFact = facts.find((fact) => fact.kind === "phone");
    const hoursFact = facts.find((fact) => fact.kind === "hours");
    const point = {
      address: addressFact?.value ?? null,
      lat: readCoord(content.lat),
      lng: readCoord(content.lng),
    };

    return (
      <section aria-label="Location" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-6xl">
          <h2 className={`text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingSection}`}>
            {headline}
          </h2>
          {addressFact ? (
            <p className={`mt-6 text-2xl leading-snug text-[var(--theme-ink)] @min-[640px]:text-3xl ${tokens.heading}`}>
              {addressFact.value}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            {phoneFact ? <ContactFactValue fact={phoneFact} /> : null}
            {addressFact ? <AddressActions point={point} /> : null}
          </div>
          {hoursFact ? (
            <p className={`mt-8 text-xl leading-snug text-[var(--theme-ink)] @min-[640px]:text-2xl ${tokens.heading}`}>
              {hoursFact.value}
            </p>
          ) : null}
          {note ? <p className={`mt-4 max-w-xl text-sm ${tokens.body}`}>{note}</p> : null}
          <div className="mt-10">
            <LocationMapEmbed point={point} label="Restaurant location map" />
          </div>
        </div>
      </section>
    );
  }

  return FamilyLocation03;
}

/**
 * Builds a compact colophon footer.
 */
function createFooter03(tokens: ThemeTokens): SectionComponent {
  /**
   * Tight footer: brand, text nav, copyright — no nested cards.
   */
  function FamilyFooter03({ content }: SectionComponentProps) {
    const brandName = getBrandName(content);
    const tagline = getTagline(content);
    const copyright = getCopyrightLine(content);
    const navItems = getNavItems(content);
    const phone = getString(content, "phone");
    const email = getString(content, "email");

    return (
      <footer
        aria-label="Footer"
        className={`${tokens.section} border-t border-[var(--theme-line)] px-4 py-8 @min-[640px]:px-6 @min-[768px]:px-10`}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col gap-4 @min-[768px]:flex-row @min-[768px]:items-end @min-[768px]:justify-between">
            <div className="min-w-0">
              <p className={`text-xl text-[var(--theme-ink)] ${tokens.heading}`}>{brandName}</p>
              {tagline ? <p className={`mt-2 max-w-md text-sm ${tokens.body}`}>{tagline}</p> : null}
            </div>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2">
              {navItems.map((item) => (
                <button
                  key={`${item.target}-${item.label}`}
                  type="button"
                  onClick={() => scrollToSection(item.target)}
                  className={`text-sm ${tokens.body} hover:text-[var(--theme-ink)]`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className={`flex flex-col gap-2 border-t border-[var(--theme-line)] pt-5 text-sm ${tokens.body} @min-[640px]:flex-row @min-[640px]:justify-between`}>
            <p>{copyright}</p>
            <p className="flex flex-wrap gap-x-4">
              {phone ? <a href={toTelHref(phone)}>{phone}</a> : null}
              {email ? <a href={toMailHref(email)}>{email}</a> : null}
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return FamilyFooter03;
}
