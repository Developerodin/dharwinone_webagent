import type { ThemeTokens } from "@/components/shared/themeTokens";
import { formatPrice, getMenuItems, getString, isBookingCtaLabel } from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import { scrollToSection } from "@/lib/scrollToSection";
import {
  MediaPanel,
  getBodyCopy,
  getGalleryMedia,
  getLeadMedia,
  getMenuTitle,
  getStyledHeadline,
} from "./shared";

/**
 * Creates the third-layout variants for hero, about, menu, and gallery.
 */
export function createSignature03Sections(
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    hero03: createHero03(tokens),
    about03: createAbout03(tokens),
    menu03: createMenu03(tokens),
    gallery03: createGallery03(tokens),
  };
}

/**
 * Builds a type-led hero with a narrow portrait still.
 */
function createHero03(tokens: ThemeTokens): SectionComponent {
  /**
   * Editorial hero: oversized headline, portrait strip, single CTA.
   */
  function FamilyHero03({ content, assets }: SectionComponentProps) {
    const headlinePlain = getString(
      content,
      "headline",
      "A table built around one dish you come back for.",
    );
    const headline = getStyledHeadline(
      content,
      "A table built around one dish you come back for.",
    );
    const body = getBodyCopy(
      content,
      "The room stays quiet so the plate can do the talking.",
    );
    const ctaLabel = getString(content, "ctaLabel", "Reserve a Table");
    const imagePath = getLeadMedia(assets);
    const ctaTarget = isBookingCtaLabel(ctaLabel) ? "reservation" : "menu";

    return (
      <section aria-label="Hero" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto grid max-w-[var(--sec-measure,72rem)] gap-8 @min-[768px]:grid-cols-[minmax(0,1.25fr)_minmax(0,0.55fr)] @min-[768px]:items-end @min-[768px]:gap-12">
          <div className="min-w-0">
            <h2 className={`max-w-3xl text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingHero}`}>
              {headline}
            </h2>
            <p className={`mt-5 max-w-xl text-base @min-[640px]:text-lg ${tokens.body}`}>
              {body}
            </p>
            <div className="mt-8">
              <button
                type="button"
                className={tokens.primaryButton}
                onClick={() => scrollToSection(ctaTarget)}
              >
                {ctaLabel}
              </button>
            </div>
          </div>
          <div className="min-w-0 overflow-hidden">
            <MediaPanel
              src={imagePath}
              alt={headlinePlain}
              className="aspect-[3/4] h-full w-full object-cover"
              fallbackClassName="aspect-[3/4] w-full bg-[var(--theme-bg-alt)]"
            />
          </div>
        </div>
      </section>
    );
  }

  return FamilyHero03;
}

/**
 * Builds an overlapping story slab on a wide photograph.
 */
function createAbout03(tokens: ThemeTokens): SectionComponent {
  /**
   * About layout with copy overlapping the photograph instead of sitting beside it.
   */
  function FamilyAbout03({ content, assets }: SectionComponentProps) {
    const headline = getString(
      content,
      "headline",
      "The room is the argument.",
    );
    const body = getBodyCopy(
      content,
      "Light, pace, and a table that holds a long conversation without trying to impress.",
    );
    const imagePath = getLeadMedia(assets);

    return (
      <section aria-label="About" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="relative mx-auto max-w-[var(--sec-measure,72rem)]">
          <div className="overflow-hidden">
            <MediaPanel
              src={imagePath}
              alt={headline}
              className="aspect-[5/4] h-full w-full object-cover @min-[768px]:aspect-[16/9]"
              fallbackClassName="aspect-[5/4] w-full bg-[var(--theme-bg-alt)] @min-[768px]:aspect-[16/9]"
            />
          </div>
          <div className="relative bg-[var(--theme-bg)] py-8 @min-[768px]:absolute @min-[768px]:bottom-8 @min-[768px]:left-8 @min-[768px]:max-w-md @min-[768px]:px-8">
            <span aria-hidden="true" className={`block ${tokens.rule}`} />
            <h2 className={`mt-5 text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingSection}`}>
              {headline}
            </h2>
            {body ? (
              <p className={`mt-4 text-sm leading-7 @min-[640px]:text-base ${tokens.body}`}>
                {body}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return FamilyAbout03;
}

/**
 * Builds a featured-plate menu with a compact remainder grid.
 */
function createMenu03(tokens: ThemeTokens): SectionComponent {
  /**
   * Menu layout that treats the first dish as the page thesis.
   */
  function FamilyMenu03({ content }: SectionComponentProps) {
    const headline = getMenuTitle(content, "Start with the plate we are known for.");
    const body = getBodyCopy(
      content,
      "One dish leads. The rest of the list stays quiet enough to read.",
    );
    const items = getMenuItems(content);
    const featured = items[0];
    const rest = items.slice(1);

    return (
      <section aria-label="Menu" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-[var(--sec-measure,72rem)]">
          <header className="max-w-2xl">
            <h2 className={`text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingSection}`}>
              {headline}
            </h2>
            {body ? (
              <p className={`mt-4 text-sm @min-[640px]:text-base ${tokens.body}`}>{body}</p>
            ) : null}
          </header>

          {featured ? (
            <article className="mt-10 border-t border-[var(--theme-line)] pt-10 @min-[640px]:mt-14">
              <h3 className={`text-[1.75rem] leading-[1.15] text-[var(--theme-ink)] @min-[640px]:text-4xl ${tokens.heading}`}>
                {featured.name}
              </h3>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                {featured.description ? (
                  <p className={`max-w-xl text-sm leading-7 ${tokens.body}`}>
                    {featured.description}
                  </p>
                ) : null}
                <span className={`text-lg font-medium tabular-nums ${tokens.accentText}`}>
                  {formatPrice(featured.price)}
                </span>
              </div>
            </article>
          ) : (
            <p className={`mt-10 text-sm ${tokens.body}`}>
              Menu items will appear when included in the brief.
            </p>
          )}

          {rest.length > 0 ? (
            <ul
              className="mt-10 grid gap-x-10 gap-y-6 border-t border-[var(--theme-line)] pt-8 @min-[768px]:grid-cols-2"
              role="list"
            >
              {rest.map((item) => (
                <li key={item.name} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <h4 className="text-lg font-medium text-[var(--theme-ink)]">{item.name}</h4>
                    <span className={`shrink-0 text-sm tabular-nums ${tokens.accentText}`}>
                      {formatPrice(item.price)}
                    </span>
                  </div>
                  {item.description ? (
                    <p className={`mt-2 text-sm leading-7 ${tokens.body}`}>{item.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    );
  }

  return FamilyMenu03;
}

/**
 * Builds a lead-still gallery with a stacked film strip.
 */
function createGallery03(tokens: ThemeTokens): SectionComponent {
  /**
   * Gallery layout with one dominant frame and supporting stills beside it.
   */
  function FamilyGallery03({ content, assets }: SectionComponentProps) {
    const headline = getString(content, "headline", "The room, plated.");
    const caption =
      getString(content, "caption") ||
      getBodyCopy(content, "Light, linen, and the pass — without a grid of equal tiles.");
    const images = getGalleryMedia(assets);
    const lead = images[0];
    const rest = images.slice(1, 4);

    return (
      <section aria-label="Gallery" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto max-w-[var(--sec-measure,72rem)]">
          <header className="flex flex-col gap-3 @min-[640px]:flex-row @min-[640px]:items-end @min-[640px]:justify-between">
            <h2 className={`text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingSection}`}>
              {headline}
            </h2>
            {caption ? (
              <p className={`max-w-sm text-sm @min-[640px]:text-right ${tokens.body}`}>{caption}</p>
            ) : null}
          </header>

          {!lead ? (
            <p className={`mt-10 text-center text-sm ${tokens.body}`}>
              No gallery images available for this build.
            </p>
          ) : (
            <ul
              className="mt-10 grid gap-3 @min-[768px]:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]"
              role="list"
            >
              <li className="min-w-0 overflow-hidden">
                <MediaPanel
                  src={lead}
                  alt={`${headline} featured still`}
                  className="aspect-[4/5] h-full w-full object-cover @min-[768px]:min-h-[28rem]"
                  fallbackClassName="aspect-[4/5] w-full bg-[var(--theme-bg-alt)]"
                />
              </li>
              {rest.length > 0 ? (
                <li className="grid min-w-0 gap-3 @min-[480px]:grid-cols-2 @min-[768px]:grid-cols-1">
                  {rest.map((image, index) => (
                    <div key={image} className="min-w-0 overflow-hidden">
                      <MediaPanel
                        src={image}
                        alt={`${headline} still ${index + 2}`}
                        className="aspect-[16/10] h-full w-full object-cover"
                        fallbackClassName="aspect-[16/10] w-full bg-[var(--theme-bg-alt)]"
                      />
                    </div>
                  ))}
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </section>
    );
  }

  return FamilyGallery03;
}
