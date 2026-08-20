import type { ThemeTokens } from "@/components/shared/themeTokens";
import {
  formatPrice,
  galleryBentoGridClass,
  galleryBentoItemClass,
  galleryEvenGridClass,
  getMenuItems,
  getString,
} from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import {
  MediaPanel,
  SectionIntro,
  ContactFactValue,
  getBodyCopy,
  getContactFacts,
  getGalleryMedia,
  getHeadline,
  getLeadMedia,
  getMenuTitle,
} from "./shared";
import { LocationMapEmbed } from "@/components/shared/LocationMapEmbed";
import { readCoord } from "@/lib/googleMapsLinks";

/**
 * Creates menu, gallery, and location sections for a family.
 */
export function createMenuGalleryLocationSections(
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    menu01: createMenu01(tokens),
    menu02: createMenu02(tokens),
    gallery01: createGallery01(tokens),
    gallery02: createGallery02(tokens),
    location01: createLocation01(tokens),
    location02: createLocation02(tokens),
  };
}

/**
 * Builds the single-column editorial menu.
 */
function createMenu01(tokens: ThemeTokens): SectionComponent {
  /**
   * Menu list with generous spacing and clean price alignment.
   */
  function FamilyMenu01({ content }: SectionComponentProps) {
    const headline = getMenuTitle(content, "A menu tuned to the season.");
    const body = getBodyCopy(
      content,
      "Balanced plates, confident flavor, and enough range to keep the table ordering one more round.",
    );
    const items = getMenuItems(content);

    return (
      <section aria-label="Menu" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-4xl">
          <SectionIntro
            title={headline}
            body={body}
            tokens={tokens}
            align="center"
          />
          <ul className="mt-10 space-y-0 @min-[640px]:mt-14" role="list">
            {items.map((item) => (
              <li
                key={item.name}
                className="flex flex-col gap-3 border-t border-[var(--theme-line)] py-5 first:border-t-0 @min-[640px]:flex-row @min-[640px]:items-start @min-[640px]:justify-between"
              >
                <div className="min-w-0 max-w-xl">
                  <h3 className="text-lg font-medium text-[var(--theme-ink)] @min-[640px]:text-xl">
                    {item.name}
                  </h3>
                  {item.description ? (
                    <p className={`mt-2 text-sm leading-7 ${tokens.body}`}>{item.description}</p>
                  ) : null}
                </div>
                <span className={`shrink-0 text-base font-medium tabular-nums @min-[640px]:text-lg ${tokens.accentText}`}>
                  {formatPrice(item.price)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return FamilyMenu01;
}

/**
 * Builds the two-column menu showcase.
 */
function createMenu02(tokens: ThemeTokens): SectionComponent {
  /**
   * Menu cards arranged in responsive columns for dense service menus.
   */
  function FamilyMenu02({ content }: SectionComponentProps) {
    const headline = getMenuTitle(content, "Signature dishes worth returning for.");
    const body = getBodyCopy(
      content,
      "A tighter format for featured plates, pairings, and best sellers the team loves to recommend.",
    );
    const items = getMenuItems(content);
    const midpoint = Math.ceil(items.length / 2);
    const columns = [items.slice(0, midpoint), items.slice(midpoint)].filter(
      (column) => column.length > 0,
    );

    return (
      <section aria-label="Menu" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro title={headline} body={body} tokens={tokens} />
          <div className="mt-10 grid gap-10 @min-[640px]:mt-14 @min-[1024px]:grid-cols-2 @min-[1024px]:gap-16">
            {columns.map((column, columnIndex) => (
              <ul
                key={`column-${columnIndex}`}
                className="space-y-0 border-t border-[var(--theme-line)]"
                role="list"
              >
                {column.map((item) => (
                  <li
                    key={item.name}
                    className="border-b border-[var(--theme-line)] py-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-medium text-[var(--theme-ink)]">
                        {item.name}
                      </h3>
                      <span className={`shrink-0 text-sm font-medium tabular-nums @min-[640px]:text-base ${tokens.accentText}`}>
                        {formatPrice(item.price)}
                      </span>
                    </div>
                    {item.description ? (
                      <p className={`mt-2 text-sm leading-7 ${tokens.body}`}>{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return FamilyMenu02;
}

/**
 * Builds the even gallery grid.
 */
function createGallery01(tokens: ThemeTokens): SectionComponent {
  /**
   * Balanced gallery grid for dining room and plate photography.
   */
  function FamilyGallery01({ content, assets }: SectionComponentProps) {
    const headline = getString(content, "headline", "A look inside the room.");
    const body =
      getString(content, "caption") ||
      getBodyCopy(
        content,
        "Moments from the pass, the bar, and the tables that keep the energy moving through service.",
      );
    const images = getGalleryMedia(assets);

    return (
      <section aria-label="Gallery" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={headline}
            body={body}
            tokens={tokens}
            align="center"
          />
          {images.length === 0 ? (
            <p className={`mt-10 text-center text-sm @min-[640px]:mt-12 ${tokens.body}`}>
              No gallery images available for this build.
            </p>
          ) : (
            <ul
              className={`mt-10 grid gap-3 @min-[640px]:mt-14 @min-[640px]:gap-4 ${galleryEvenGridClass(images.length)}`}
              role="list"
            >
              {images.map((image, index) => (
                <li key={image} className="min-w-0 overflow-hidden rounded-[1.5rem]">
                  <MediaPanel
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    className="aspect-[4/5] h-full w-full object-cover"
                    fallbackClassName="aspect-[4/5] w-full bg-[var(--theme-bg)]"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  }

  return FamilyGallery01;
}

/**
 * Builds the asymmetrical bento gallery.
 */
function createGallery02(tokens: ThemeTokens): SectionComponent {
  /**
   * Bento gallery layout with a featured visual when assets allow it.
   */
  function FamilyGallery02({ content, assets }: SectionComponentProps) {
    const headline = getString(content, "headline", "Texture, light, and service in motion.");
    const body =
      getString(content, "caption") ||
      getBodyCopy(
        content,
        "A more kinetic layout for bar energy, plated details, and scenes that show the personality of the space.",
      );
    const images = getGalleryMedia(assets);
    const count = images.length;

    return (
      <section aria-label="Gallery" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro title={headline} body={body} tokens={tokens} />
          {count === 0 ? (
            <p className={`mt-10 text-center text-sm @min-[640px]:mt-12 ${tokens.body}`}>
              No gallery images available for this build.
            </p>
          ) : (
            <ul
              className={`mt-10 grid gap-3 @min-[640px]:mt-14 @min-[640px]:gap-4 ${galleryBentoGridClass(count)}`}
              role="list"
            >
              {images.map((image, index) => (
                <li
                  key={image}
                  className={`min-w-0 overflow-hidden rounded-[1.5rem] ${galleryBentoItemClass(count, index)}`}
                >
                  <MediaPanel
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    className="h-full w-full object-cover"
                    fallbackClassName="h-full min-h-[8rem] w-full bg-[var(--theme-bg-alt)]"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  }

  return FamilyGallery02;
}

/**
 * Builds the image-forward location section.
 */
function createLocation01(tokens: ThemeTokens): SectionComponent {
  /**
   * Split location layout pairing venue imagery with address facts.
   */
  function FamilyLocation01({ content, assets }: SectionComponentProps) {
    const headline = getHeadline(content, "Find the room, then settle in.");
    const body = getString(
      content,
      "directionsNote",
      "Easy to reach, hard to rush through. Join us for lunch, late cocktails, or a full evening at the table.",
    );
    const imagePath = getLeadMedia(assets);
    const facts = getContactFacts(content).slice(0, 3);
    const point = {
      address: getString(content, "address") || null,
      lat: readCoord(content.lat),
      lng: readCoord(content.lng),
    };

    return (
      <section aria-label="Location" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto grid max-w-6xl gap-8 @min-[768px]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] @min-[768px]:items-center @min-[768px]:gap-14">
          <div className="min-w-0 overflow-hidden rounded-[2rem]">
            <MediaPanel
              src={imagePath}
              alt={headline}
              className="aspect-[5/4] h-full w-full object-cover"
              fallbackClassName="aspect-[5/4] w-full bg-[var(--theme-bg)]"
            />
          </div>
          <div className="min-w-0">
            <SectionIntro title={headline} body={body} tokens={tokens} />
            <dl className="mt-8 space-y-5">
              {facts.map((fact) => (
                <div key={fact.label} className="border-b border-[var(--theme-line)] pb-5 last:border-b-0 last:pb-0">
                  <dt className={`text-[11px] uppercase tracking-[0.24em] ${tokens.accentText}`}>
                    {fact.label}
                  </dt>
                  <dd className="mt-3 text-sm leading-7 text-[var(--theme-ink)] @min-[640px]:text-base">
                    <ContactFactValue fact={fact} />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[var(--theme-line)]">
              <LocationMapEmbed point={point} label="Restaurant location map" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return FamilyLocation01;
}

/**
 * Builds the card-based location spotlight.
 */
function createLocation02(tokens: ThemeTokens): SectionComponent {
  /**
   * Location section with dark framing, media, and a stacked info card.
   */
  function FamilyLocation02({ content, assets }: SectionComponentProps) {
    const headline = getHeadline(content, "Join us where the energy feels best in person.");
    const body = getString(
      content,
      "directionsNote",
      "The neighbourhood adds texture, but the destination is the room itself: warm lighting, strong pours, and a table worth arriving for.",
    );
    const imagePath = getLeadMedia(assets);
    const facts = getContactFacts(content).slice(0, 3);
    const point = {
      address: getString(content, "address") || null,
      lat: readCoord(content.lat),
      lng: readCoord(content.lng),
    };

    return (
      <section aria-label="Location" className={`${tokens.sectionPad} ${tokens.sectionDark}`}>
        <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm @min-[768px]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] @min-[768px]:items-center @min-[768px]:gap-12 @min-[768px]:p-8">
          <div className="min-w-0 overflow-hidden rounded-[1.75rem]">
            <MediaPanel
              src={imagePath}
              alt={headline}
              className="aspect-[5/4] h-full w-full object-cover"
              fallbackClassName="aspect-[5/4] w-full bg-white/10"
            />
          </div>
          <div className="min-w-0">
            <SectionIntro
              title={headline}
              body={body}
              tokens={tokens}
              onDark
            />
            <div className="mt-8 grid gap-4">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-[1.25rem] border border-white/10 bg-black/10 p-4"
                >
                  <p className={`text-[11px] uppercase tracking-[0.24em] ${tokens.accentTextOnDark}`}>
                    {fact.label}
                  </p>
                  <p className={`mt-3 text-sm leading-7 @min-[640px]:text-base ${tokens.mutedOnDark}`}>
                    <ContactFactValue fact={fact} onDark />
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 overflow-hidden rounded-[1.25rem] border border-white/10">
              <LocationMapEmbed point={point} label="Restaurant location map" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return FamilyLocation02;
}
