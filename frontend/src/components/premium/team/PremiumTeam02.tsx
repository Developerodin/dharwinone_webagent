import type { SectionComponentProps } from "../registry";
import { getString, getTeamMembers } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Premium asymmetric featured-chef team layout.
 */
export function PremiumTeam02({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Chefs");
  const introText = getString(content, "introText");
  const members = getTeamMembers(content);
  const [featured, ...rest] = members;
  const side = rest.slice(0, 2);

  /**
   * Resolves a team member image by index.
   */
  function memberImage(index: number): string | undefined {
    return (
      assets.find((a) => a.key === `team-${index}`)?.imagePath ??
      assets[index]?.imagePath
    );
  }

  return (
    <section aria-label="Team" className={`${pm.sectionPad} ${pm.section}`}>
      <div className="mx-auto max-w-[var(--sec-measure,72rem)] min-w-0">
        <span aria-hidden="true" className={`mt-3 block ${pm.accentRule}`} />
        <h2 className={`mt-4 ${pm.heading} ${pm.headingSection}`}>{headline}</h2>
        {introText ? (
          <p className={`mt-4 max-w-2xl text-sm @min-[640px]:text-base ${pm.body}`}>{introText}</p>
        ) : null}
        {featured ? (
          <div className="mt-10 grid gap-8 @min-[768px]:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] @min-[768px]:gap-12">
            <article className="min-w-0">
              {memberImage(0) ? (
                <SectionMedia
                  src={memberImage(0)!}
                  className="aspect-[4/5] w-full object-cover"
                />
              ) : null}
              <h3 className="mt-5 text-2xl font-medium text-[var(--theme-ink)]">
                {featured.name}
              </h3>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--theme-accent)]">
                {featured.role}
              </p>
              {featured.bio ? (
                <p className={`mt-3 text-sm ${pm.body}`}>{featured.bio}</p>
              ) : null}
            </article>
            <ul className="space-y-8" role="list">
              {side.map((member, i) => (
                <li key={member.name} className="grid grid-cols-[5rem_1fr] gap-4">
                  {memberImage(i + 1) ? (
                    <SectionMedia
                      src={memberImage(i + 1)!}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div aria-hidden="true" className="aspect-square bg-[var(--theme-card)]" />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-lg font-medium text-[var(--theme-ink)]">
                      {member.name}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--theme-accent)]">
                      {member.role}
                    </p>
                    {member.bio ? (
                      <p className={`mt-2 text-sm ${pm.body}`}>{member.bio}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
