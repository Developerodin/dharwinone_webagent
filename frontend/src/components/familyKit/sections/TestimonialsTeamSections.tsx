import type { ThemeTokens } from "@/components/shared/themeTokens";
import {
  getTeamMembers,
  getTestimonials,
} from "@/components/premium/contentHelpers";
import type {
  SectionComponent,
  SectionComponentProps,
} from "@/components/premium/registry";
import {
  MediaPanel,
  SectionIntro,
  getBodyCopy,
  getHeadline,
  getIndexedAsset,
} from "./shared";

/**
 * Creates testimonial and team sections for a family.
 */
export function createTestimonialsTeamSections(
  tokens: ThemeTokens,
): Record<string, SectionComponent> {
  return {
    testimonials01: createTestimonials01(tokens),
    testimonials02: createTestimonials02(tokens),
    team01: createTeam01(tokens),
    team02: createTeam02(tokens),
  };
}

/**
 * Builds the featured testimonial layout.
 */
function createTestimonials01(tokens: ThemeTokens): SectionComponent {
  /**
   * Large quote-led testimonial section with supporting cards underneath.
   */
  function FamilyTestimonials01({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Guests keep coming back for the feeling.");
    const body = getBodyCopy(
      content,
      "A few notes from diners who remember the pace, the details, and the way the room treated the occasion.",
    );
    const items = getTestimonials(content);
    const [featured, ...rest] = items;

    return (
      <section aria-label="Testimonials" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={headline}
            body={body}
            tokens={tokens}
            align="center"
          />
          {featured ? (
            <figure className="mx-auto mt-10 max-w-4xl text-center @min-[640px]:mt-14">
              <blockquote className={`text-pretty text-xl leading-relaxed text-[var(--theme-ink)] @min-[640px]:text-2xl @min-[768px]:text-3xl ${tokens.heading}`}>
                “{featured.quote}”
              </blockquote>
              <figcaption className="mt-6">
                <p className="text-base font-medium text-[var(--theme-ink)]">{featured.name}</p>
                <p className={`mt-1 text-sm ${tokens.accentText}`}>
                  {featured.role}
                </p>
              </figcaption>
            </figure>
          ) : null}
          {rest.length > 0 ? (
            <ul className="mt-6 grid gap-5 @min-[768px]:grid-cols-2" role="list">
              {rest.map((item) => (
                  <li
                    key={item.name}
                    className="border-t border-[var(--theme-line)] pt-6 text-center"
                  >
                  <p className={`text-sm leading-7 ${tokens.body}`}>“{item.quote}”</p>
                  <p className="mt-4 text-base font-medium text-[var(--theme-ink)]">{item.name}</p>
                  <p className={`mt-1 text-sm ${tokens.accentText}`}>
                    {item.role}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    );
  }

  return FamilyTestimonials01;
}

/**
 * Builds the quote card grid testimonial layout.
 */
function createTestimonials02(tokens: ThemeTokens): SectionComponent {
  /**
   * Dark testimonial grid for denser review and social-proof moments.
   */
  function FamilyTestimonials02({ content }: SectionComponentProps) {
    const headline = getHeadline(content, "Every service should feel this polished.");
    const items = getTestimonials(content);

    return (
      <section aria-label="Testimonials" className={`${tokens.sectionPad} ${tokens.sectionDark}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={headline}
            tokens={tokens}
            align="center"
            onDark
          />
          <ul className="mt-8 grid gap-5 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3" role="list">
            {items.map((item) => (
              <li key={item.name} className="border-t border-white/10 pt-5 text-center">
                <p className={`text-sm leading-7 @min-[640px]:text-base ${tokens.mutedOnDark}`}>
                  “{item.quote}”
                </p>
                <p className="mt-5 text-base font-medium text-[var(--theme-on-dark)]">{item.name}</p>
                <p className={`mt-1 text-sm ${tokens.accentTextOnDark}`}>
                  {item.role}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return FamilyTestimonials02;
}

/**
 * Builds the portrait-card team section.
 */
function createTeam01(tokens: ThemeTokens): SectionComponent {
  /**
   * Team grid with portrait media and short biographies.
   */
  function FamilyTeam01({ content, assets }: SectionComponentProps) {
    const headline = getHeadline(content, "The people shaping the room.");
    const body = getBodyCopy(
      content,
      "Chefs, hosts, and bartenders who keep the energy precise, warm, and unmistakably human every service.",
    );
    const members = getTeamMembers(content);

    return (
      <section aria-label="Team" className={`${tokens.sectionPad} ${tokens.sectionAlt}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro
            title={headline}
            body={body}
            tokens={tokens}
            align="center"
          />
          <ul className="mt-10 grid gap-6 @min-[640px]:mt-14 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3" role="list">
            {members.map((member, index) => (
              <li key={member.name} className="min-w-0 text-center">
                <div className="overflow-hidden rounded-[var(--theme-radius-frame)]">
                  <MediaPanel
                    src={getIndexedAsset(assets, `team-${index}`, index)}
                    alt={member.name}
                    className="aspect-[3/4] h-full w-full object-cover"
                    fallbackClassName="aspect-[3/4] w-full bg-[var(--theme-bg)]"
                  />
                </div>
                <h3 className="mt-5 text-lg font-medium text-[var(--theme-ink)] @min-[640px]:text-xl">
                  {member.name}
                </h3>
                <p className={`mt-1 text-sm ${tokens.accentText}`}>
                  {member.role}
                </p>
                {member.bio ? (
                  <p className={`mt-3 text-sm leading-7 ${tokens.body}`}>{member.bio}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return FamilyTeam01;
}

/**
 * Builds the split spotlight team section.
 */
function createTeam02(tokens: ThemeTokens): SectionComponent {
  /**
   * Team spotlight layout with a lead member and supporting roster cards.
   */
  function FamilyTeam02({ content, assets }: SectionComponentProps) {
    const headline = getHeadline(content, "A floor and kitchen tuned in sync.");
    const members = getTeamMembers(content);
    const [leadMember, ...rest] = members;

    return (
      <section aria-label="Team" className={`${tokens.sectionPad} ${tokens.section}`}>
        <div className="mx-auto max-w-6xl">
          <SectionIntro title={headline} tokens={tokens} />
          {leadMember ? (
            <div className="mt-10 grid gap-8 @min-[768px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] @min-[768px]:items-center">
              <div className="overflow-hidden rounded-[var(--theme-radius-frame)]">
                <MediaPanel
                  src={getIndexedAsset(assets, "team-0", 0)}
                  alt={leadMember.name}
                  className="aspect-[4/5] h-full w-full object-cover"
                  fallbackClassName="aspect-[4/5] w-full bg-[var(--theme-bg-alt)]"
                />
              </div>
              <div className={`${tokens.formCard} p-6 @min-[640px]:p-8`}>
                <h3 className={`mt-4 text-2xl text-[var(--theme-ink)] @min-[640px]:text-3xl ${tokens.heading}`}>
                  {leadMember.name}
                </h3>
                <p className={`mt-2 text-sm ${tokens.accentText}`}>
                  {leadMember.role}
                </p>
                {leadMember.bio ? (
                  <p className={`mt-4 text-sm leading-7 @min-[640px]:text-base ${tokens.body}`}>
                    {leadMember.bio}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {rest.length > 0 ? (
            <ul className="mt-6 grid gap-5 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3" role="list">
              {rest.map((member, index) => (
                <li
                  key={member.name}
                  className="rounded-[var(--theme-radius-tile)] border border-[var(--theme-line)] bg-[var(--theme-card)] p-5"
                >
                  <p className="text-lg font-medium text-[var(--theme-ink)]">{member.name}</p>
                  <p className={`mt-2 text-sm ${tokens.accentText}`}>
                    {member.role}
                  </p>
                  {member.bio ? (
                    <p className={`mt-3 text-sm leading-7 ${tokens.body}`}>{member.bio}</p>
                  ) : null}
                  <MediaPanel
                    src={getIndexedAsset(assets, `team-${index + 1}`, index + 1)}
                    alt={member.name}
                    className="mt-4 aspect-[4/3] h-auto w-full rounded-[var(--theme-radius-tile)] object-cover"
                    fallbackClassName="mt-4 aspect-[4/3] w-full rounded-[var(--theme-radius-tile)] bg-[var(--theme-bg)]"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    );
  }

  return FamilyTeam02;
}
