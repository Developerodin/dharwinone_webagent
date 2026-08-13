import type { ThemeTokens } from "@/components/shared/themeTokens";
import { getString } from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import { scrollToSection } from "@/lib/scrollToSection";
import {
  MediaPanel,
  SectionIntro,
  getBodyCopy,
  getHeadline,
  getLeadMedia,
  getStyledHeadline,
} from "./shared";

/**
 * Creates both hero variants for a family.
 */
export function createHeroSections(
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    hero01: createHero01(tokens),
    hero02: createHero02(tokens),
  };
}

/**
 * Creates both reservation variants for a family.
 */
export function createReservationSections(
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    reservation01: createReservation01(tokens),
    reservation02: createReservation02(tokens),
  };
}

/**
 * Builds the image-led hero variant with menu CTA.
 */
function createHero01(tokens: ThemeTokens): SectionComponent {
  /**
   * Full-bleed hero with atmospheric overlay and menu CTA.
   */
  function FamilyHero01({ content, assets }: SectionComponentProps) {
    const headlinePlain = getHeadline(
      content,
      "A dining room built around generous flavor.",
    );
    const headline = getStyledHeadline(
      content,
      "A dining room built around generous flavor.",
    );
    const body = getBodyCopy(
      content,
      "Seasonal plates, precise cocktails, and a room that moves from bright lunches to slow late-night dinners.",
    );
    const ctaLabel = getString(content, "ctaLabel", "Explore Menu");
    const imagePath = getLeadMedia(assets);

    return (
      <section
        aria-label="Hero"
        className={`${tokens.sectionAlt} relative min-h-[68svh] overflow-hidden @min-[640px]:min-h-[76svh] @min-[768px]:min-h-[88svh]`}
      >
        <MediaPanel
          src={imagePath}
          alt={headlinePlain}
          className="absolute inset-0 z-0 h-full w-full object-cover"
          fallbackClassName="absolute inset-0 z-0 bg-[linear-gradient(135deg,var(--theme-bg-dark),var(--theme-bg-alt))]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[1] bg-gradient-to-t from-black/78 via-black/48 to-black/22"
        />
        <div className="relative z-[2] mx-auto flex min-h-[68svh] max-w-6xl flex-col justify-center px-4 py-16 @min-[640px]:min-h-[76svh] @min-[640px]:px-6 @min-[640px]:py-20 @min-[768px]:min-h-[88svh] @min-[768px]:px-10 @min-[768px]:py-24">
          <p className={tokens.eyebrowOnDark}>Restaurant Experience</p>
          <span aria-hidden="true" className={`mt-4 block ${tokens.ruleOnDark}`} />
          <h2 className={`mt-5 max-w-4xl text-[var(--theme-on-dark)] ${tokens.heading} ${tokens.headingHero}`}>
            {headline}
          </h2>
          <p className={`mt-5 max-w-2xl text-base leading-relaxed @min-[640px]:text-lg @min-[768px]:text-xl ${tokens.mutedOnDark}`}>
            {body}
          </p>
          <div className="mt-8 flex justify-start">
            <button
              type="button"
              className={tokens.primaryButtonOnDark}
              onClick={() => scrollToSection("menu")}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return FamilyHero01;
}

/**
 * Builds the editorial split hero variant with reservation CTA.
 */
function createHero02(tokens: ThemeTokens): SectionComponent {
  /**
   * Two-column hero that pairs story copy with a framed lead image.
   */
  function FamilyHero02({ content, assets }: SectionComponentProps) {
    const headlinePlain = getHeadline(
      content,
      "Gather around a table that feels intentional.",
    );
    const headline = getStyledHeadline(
      content,
      "Gather around a table that feels intentional.",
    );
    const body = getBodyCopy(
      content,
      "Thoughtful hospitality, expressive ingredients, and a rhythm that makes every booking feel like an occasion.",
    );
    const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
    const imagePath = getLeadMedia(assets);

    return (
      <section aria-label="Hero" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto grid max-w-6xl gap-8 @min-[768px]:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] @min-[768px]:items-center @min-[768px]:gap-14">
          <div className="min-w-0">
            <p className={tokens.eyebrow}>Curated Evenings</p>
            <h2 className={`mt-4 max-w-3xl text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingHero}`}>
              {headline}
            </h2>
            <p className={`mt-5 max-w-2xl text-base @min-[640px]:text-lg ${tokens.body}`}>
              {body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className={tokens.primaryButton}
                onClick={() => scrollToSection("reservation")}
              >
                {ctaLabel}
              </button>
              <button
                type="button"
                className={`inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--theme-line)] px-6 py-3 text-sm text-[var(--theme-ink)] transition-colors hover:bg-[var(--theme-bg-alt)]`}
                onClick={() => scrollToSection("menu")}
              >
                View Signature Dishes
              </button>
            </div>
          </div>
          <div className="relative min-w-0 pl-3 pt-3 @min-[640px]:pl-4 @min-[640px]:pt-4">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-[2rem] border border-[var(--theme-line-strong)]"
            />
            <div className="relative min-h-0 overflow-hidden rounded-[2rem]">
              <MediaPanel
                src={imagePath}
                alt={headlinePlain}
                className="relative aspect-[4/5] w-full object-cover shadow-[0_30px_60px_rgba(0,0,0,0.12)]"
                fallbackClassName="relative aspect-[4/5] w-full bg-[var(--theme-bg-alt)]"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return FamilyHero02;
}

/**
 * Builds the centered reservation CTA variant.
 */
function createReservation01(tokens: ThemeTokens): SectionComponent {
  /**
   * Reservation callout with booking-focused copy and contact CTA.
   */
  function FamilyReservation01({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Reserve the table before the room fills.");
    const body = getBodyCopy(
      content,
      "Let us know your date, party size, and any details worth preparing for. We'll take care of the rest.",
    );
    const ctaLabel = getString(content, "ctaLabel", "Start Reservation");

    return (
      <section aria-label="Reservation" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className={`${tokens.formCard} mx-auto max-w-3xl p-6 text-center @min-[640px]:p-8 @min-[768px]:p-10`}>
          <SectionIntro
            eyebrow="Reservations"
            title={headline}
            body={body}
            tokens={tokens}
            align="center"
          />
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              className={tokens.primaryButton}
              onClick={() => scrollToSection("contact")}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return FamilyReservation01;
}

/**
 * Builds the split reservation banner variant.
 */
function createReservation02(tokens: ThemeTokens): SectionComponent {
  /**
   * Dark reservation strip pairing guest promises with the contact CTA.
   */
  function FamilyReservation02({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Mark the date. We'll shape the rest of the evening.");
    const body = getBodyCopy(
      content,
      "Ideal for date nights, celebrations, and private dinners that need a little extra attention from the floor.",
    );
    const ctaLabel = getString(content, "ctaLabel", "Speak With the Team");

    return (
      <section aria-label="Reservation" className={`${tokens.sectionPad} ${tokens.sectionDark}`}>
        <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm @min-[768px]:grid-cols-[minmax(0,1fr)_auto] @min-[768px]:items-center @min-[768px]:gap-10 @min-[768px]:p-8">
          <div className="min-w-0">
            <p className={tokens.eyebrowOnDark}>Table Service</p>
            <h2 className={`mt-4 text-[var(--theme-on-dark)] ${tokens.heading} ${tokens.headingSection}`}>
              {headline}
            </h2>
            <p className={`mt-4 max-w-2xl text-sm leading-7 @min-[640px]:text-base ${tokens.mutedOnDark}`}>
              {body}
            </p>
          </div>
          <div className="flex justify-start @min-[768px]:justify-end">
            <button
              type="button"
              className={tokens.primaryButtonOnDark}
              onClick={() => scrollToSection("contact")}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return FamilyReservation02;
}
