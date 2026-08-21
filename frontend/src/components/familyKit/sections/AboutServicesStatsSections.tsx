import type { ThemeTokens } from "@/components/shared/themeTokens";
import {
  getServiceItems,
  getStatItems,
} from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import { SectionFrame } from "@/components/shared/SectionFrame";
import {
  MediaPanel,
  SectionIntro,
  getBodyCopy,
  getHeadline,
  getLeadMedia,
  getStringList,
} from "./shared";

/**
 * Creates about, services, and stats sections for a family.
 */
export function createAboutServicesStatsSections(
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    about01: createAbout01(tokens),
    about02: createAbout02(tokens),
    services01: createServices01(tokens),
    services02: createServices02(tokens),
    stats01: createStats01(tokens),
    stats02: createStats02(tokens),
  };
}

/**
 * Builds the split about section.
 */
function createAbout01(tokens: ThemeTokens): SectionComponent {
  /**
   * Story section with portrait media and left-aligned copy.
   */
  function FamilyAbout01({ content, assets, layout }: SectionComponentProps) {
    const headline = getHeadline(content, "Built on good produce and steady hospitality.");
    const body = getBodyCopy(
      content,
      "Our kitchen is rooted in seasonality, clean technique, and the kind of service that feels polished without losing warmth.",
    );
    const imagePath = getLeadMedia(assets);

    return (
      <SectionFrame
        aria-label="About"
        layout={layout}
        className={`${tokens.sectionPad} ${tokens.section}`}
      >
        <div className="mx-auto grid max-w-6xl gap-8 @min-[768px]:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] @min-[768px]:items-center @min-[768px]:gap-14">
          <div className="min-w-0 overflow-hidden rounded-[var(--theme-radius-frame)]">
            <MediaPanel
              src={imagePath}
              alt={headline}
              className="aspect-[4/5] h-full w-full object-cover"
              fallbackClassName="aspect-[4/5] w-full bg-[var(--theme-bg-alt)]"
            />
          </div>
          <div className="min-w-0">
            <SectionIntro
              title={headline}
              body={body}
              tokens={tokens}
            />
          </div>
        </div>
      </SectionFrame>
    );
  }

  return FamilyAbout01;
}

/**
 * Builds the centered about section with wide landscape media.
 */
function createAbout02(tokens: ThemeTokens): SectionComponent {
  /**
   * Editorial story layout with centered copy and panoramic media.
   */
  function FamilyAbout02({ content, assets }: SectionComponentProps) {
    const headline = getHeadline(content, "A room shaped for long meals and easy conversation.");
    const body = getBodyCopy(
      content,
      "Every detail is tuned to feel calm, deliberate, and quietly memorable from the first pour to the last course.",
    );
    const imagePath = getLeadMedia(assets);

    return (
      <section aria-label="About" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl">
            <SectionIntro
              title={headline}
              body={body}
              tokens={tokens}
              align="center"
            />
          </div>
          <div className="mt-10 overflow-hidden rounded-[var(--theme-radius-frame)] @min-[640px]:mt-14">
            <MediaPanel
              src={imagePath}
              alt={headline}
              className="aspect-[16/10] h-full w-full object-cover @min-[768px]:aspect-[21/9]"
              fallbackClassName="aspect-[16/10] w-full bg-[var(--theme-bg)] @min-[768px]:aspect-[21/9]"
            />
          </div>
        </div>
      </section>
    );
  }

  return FamilyAbout02;
}

/**
 * Builds the services grid.
 */
function createServices01(tokens: ThemeTokens): SectionComponent {
  /**
   * Feature grid for service promises and dining formats.
   */
  function FamilyServices01({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Ways we host the room.");
    const body = getBodyCopy(
      content,
      "Thoughtful pacing, polished floor service, and flexible experiences for lunch, dinner, or private gatherings.",
    );
    const items = getServiceItems(content);

    return (
      <section aria-label="Services" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={headline}
            body={body}
            tokens={tokens}
            align="center"
          />
          <ul
            className="mt-10 grid gap-5 @min-[640px]:mt-14 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-4"
            role="list"
          >
            {items.map((item) => (
              <li
                key={item.title}
                className="border-t border-[var(--theme-line)] pt-5 text-center"
              >
                <h3 className="text-lg font-medium text-[var(--theme-ink)] @min-[640px]:text-xl">
                  {item.title}
                </h3>
                <p className={`mt-3 text-sm leading-7 ${tokens.body}`}>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return FamilyServices01;
}

/**
 * Builds the linear service list.
 */
function createServices02(tokens: ThemeTokens): SectionComponent {
  /**
   * Linear service narrative with more whitespace.
   */
  function FamilyServices02({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "How the experience unfolds.");
    const body = getBodyCopy(
      content,
      "From the welcome to the final course, each touchpoint is designed to feel composed, personal, and easy to enjoy.",
    );
    const items = getServiceItems(content);

    return (
      <section aria-label="Services" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto grid max-w-6xl gap-10 @min-[768px]:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] @min-[768px]:gap-14">
          <SectionIntro title={headline} body={body} tokens={tokens} />
          <ul className="space-y-6" role="list">
            {items.map((item) => (
              <li
                key={item.title}
                className="border-b border-[var(--theme-line)] pb-6 last:border-b-0"
              >
                <h3 className="text-lg font-medium text-[var(--theme-ink)] @min-[640px]:text-xl">
                  {item.title}
                </h3>
                <p className={`mt-3 text-sm leading-7 ${tokens.body}`}>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return FamilyServices02;
}

/**
 * Builds the stat cards section.
 */
function createStats01(tokens: ThemeTokens): SectionComponent {
  /**
   * Stat blocks laid out as clean cards.
   */
  function FamilyStats01({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "The numbers behind the atmosphere.");
    const stats = getStatItems(content);

    return (
      <section aria-label="Stats" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={headline}
            tokens={tokens}
            align="center"
          />
          <ul
            className="mt-10 grid gap-5 @min-[640px]:mt-14 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-4"
            role="list"
          >
            {stats.map((item) => (
              <li
                key={item.label}
                className="rounded-[var(--theme-radius-tile)] border border-[var(--theme-line)] bg-[var(--theme-card)] px-6 py-8 text-center"
              >
                <p className={`text-3xl @min-[640px]:text-4xl text-[var(--theme-ink)] ${tokens.heading} ${tokens.accentText}`}>
                  {item.value}
                </p>
                <p className={`mt-3 text-sm @min-[640px]:text-base ${tokens.body}`}>
                  {item.label}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return FamilyStats01;
}

/**
 * Builds the stat strip section with optional supporting notes.
 */
function createStats02(tokens: ThemeTokens): SectionComponent {
  /**
   * Compact metric strip with editorial notes drawn from optional highlights.
   */
  function FamilyStats02({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Steady craft, every service.");
    const stats = getStatItems(content);
    const highlights = getStringList(content, "highlights");

    return (
      <section aria-label="Stats" className={`${tokens.sectionPad} ${tokens.sectionDark}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={headline}
            tokens={tokens}
            align="center"
            onDark
          />
          <ul
            className="mt-8 grid gap-4 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-4"
            role="list"
          >
            {stats.map((item) => (
              <li key={item.label} className="border-t border-white/10 pt-4 text-center">
                <p className={`text-3xl ${tokens.heading} ${tokens.accentTextOnDark}`}>{item.value}</p>
                <p className={`mt-2 text-sm @min-[640px]:text-base ${tokens.mutedOnDark}`}>
                  {item.label}
                </p>
              </li>
            ))}
          </ul>
          {highlights.length > 0 ? (
            <p className={`mt-8 text-center text-sm ${tokens.mutedOnDark}`}>
              {highlights.join(" · ")}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return FamilyStats02;
}
