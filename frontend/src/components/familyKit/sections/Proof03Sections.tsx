import type { ThemeTokens } from "@/components/shared/themeTokens";
import { getServiceItems, getStatItems, getTeamMembers, getTestimonials } from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import { MediaPanel, getBodyCopy, getHeadline, getIndexedAsset } from "./shared";

/**
 * Creates services/stats/testimonials/team 03 layouts for a family.
 */
export function createProof03Sections(
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    services03: createServices03(tokens),
    stats03: createStats03(tokens),
    testimonials03: createTestimonials03(tokens),
    team03: createTeam03(tokens),
  };
}

/**
 * Builds a manifesto services list without cards.
 */
function createServices03(tokens: ThemeTokens): SectionComponent {
  /**
   * Sticky intro with a hairline list of service promises.
   */
  function FamilyServices03({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "How we host.");
    const body = getBodyCopy(content, "Private rooms, the pass, and the long lunch.");
    const items = getServiceItems(content);

    return (
      <section aria-label="Services" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto grid max-w-6xl gap-10 @min-[768px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
          <header className="min-w-0">
            <h2 className={`text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingSection}`}>
              {headline}
            </h2>
            {body ? <p className={`mt-4 max-w-sm text-sm ${tokens.body}`}>{body}</p> : null}
          </header>
          <ul className="divide-y divide-[var(--theme-line)]" role="list">
            {items.map((item) => (
              <li key={item.title} className="py-6 first:pt-0">
                <h3 className="text-lg text-[var(--theme-ink)]">{item.title}</h3>
                <p className={`mt-2 text-sm leading-7 ${tokens.body}`}>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return FamilyServices03;
}

/**
 * Builds a running-numbers stats band.
 */
function createStats03(tokens: ThemeTokens): SectionComponent {
  /**
   * Stats as a hairline row instead of a 4-up counter grid.
   */
  function FamilyStats03({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "A few honest numbers.");
    const items = getStatItems(content);

    return (
      <section aria-label="Stats" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto max-w-6xl">
          <h2 className={`text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingSection}`}>
            {headline}
          </h2>
          <ul
            className="mt-10 flex flex-col gap-8 border-t border-[var(--theme-line)] pt-8 @min-[640px]:flex-row @min-[640px]:flex-wrap @min-[640px]:gap-x-12"
            role="list"
          >
            {items.map((item) => (
              <li key={item.label} className="min-w-0">
                <p className={`text-3xl tabular-nums leading-none text-[var(--theme-ink)] ${tokens.heading}`}>
                  {item.value}
                </p>
                <p className={`mt-2 text-sm ${tokens.body}`}>{item.label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return FamilyStats03;
}

/**
 * Builds a single-quote testimonial layout.
 */
function createTestimonials03(tokens: ThemeTokens): SectionComponent {
  /**
   * One oversized guest note with remaining quotes in a quiet rail.
   */
  function FamilyTestimonials03({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "What guests remember.");
    const items = getTestimonials(content);
    const featured = items[0];
    const rest = items.slice(1, 4);

    return (
      <section aria-label="Testimonials" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-5xl">
          <p className={`text-sm ${tokens.body}`}>{headline}</p>
          {featured ? (
            <figure className="mt-6">
              <blockquote className={`text-[1.75rem] leading-[1.2] text-[var(--theme-ink)] @min-[640px]:text-4xl ${tokens.heading}`}>
                {featured.quote}
              </blockquote>
              <figcaption className="mt-8 text-sm text-[var(--theme-ink)]">
                {featured.name}
                {featured.role ? <span className={`ml-2 ${tokens.body}`}>{featured.role}</span> : null}
              </figcaption>
            </figure>
          ) : null}
          {rest.length > 0 ? (
            <ul className="mt-12 grid gap-6 border-t border-[var(--theme-line)] pt-8 @min-[768px]:grid-cols-3" role="list">
              {rest.map((item) => (
                <li key={item.name}>
                  <p className={`text-sm leading-7 ${tokens.body}`}>{item.quote}</p>
                  <p className="mt-3 text-sm text-[var(--theme-ink)]">{item.name}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    );
  }

  return FamilyTestimonials03;
}

/**
 * Builds a lead-cook team layout.
 */
function createTeam03(tokens: ThemeTokens): SectionComponent {
  /**
   * First member as thesis; remaining names as a rail.
   */
  function FamilyTeam03({ content, assets }: SectionComponentProps) {
    const headline = getHeadline(content, "The kitchen.");
    const body = getBodyCopy(content);
    const members = getTeamMembers(content);
    const lead = members[0];
    const rest = members.slice(1);
    const leadImage = getIndexedAsset(assets, "team-0", 0);

    return (
      <section aria-label="Team" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto grid max-w-6xl gap-10 @min-[768px]:grid-cols-2 @min-[768px]:items-end">
          <MediaPanel
            src={leadImage}
            alt={lead?.name ?? headline}
            className="aspect-[4/5] h-full w-full object-cover"
            fallbackClassName="aspect-[4/5] w-full bg-[var(--theme-bg-alt)]"
          />
          <div className="min-w-0">
            <h2 className={`text-[var(--theme-ink)] ${tokens.heading} ${tokens.headingSection}`}>
              {headline}
            </h2>
            {lead ? (
              <>
                <p className="mt-6 text-2xl text-[var(--theme-ink)]">{lead.name}</p>
                {lead.role ? <p className={`mt-1 text-sm ${tokens.body}`}>{lead.role}</p> : null}
                {lead.bio || body ? (
                  <p className={`mt-4 text-sm leading-7 ${tokens.body}`}>{lead.bio || body}</p>
                ) : null}
              </>
            ) : null}
            {rest.length > 0 ? (
              <ul className="mt-8 space-y-3 border-t border-[var(--theme-line)] pt-6" role="list">
                {rest.map((member) => (
                  <li key={member.name} className="flex flex-wrap gap-x-3">
                    <span className="text-[var(--theme-ink)]">{member.name}</span>
                    {member.role ? <span className={`text-sm ${tokens.body}`}>{member.role}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return FamilyTeam03;
}
