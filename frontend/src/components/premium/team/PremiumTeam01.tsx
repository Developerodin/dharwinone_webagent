import type { SectionComponentProps } from "../registry";
import { getString, getTeamMembers } from "../contentHelpers";
import { pm } from "../shared/premiumTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Premium chef/team portrait grid.
 */
export function PremiumTeam01({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Chefs");
  const introText = getString(content, "introText");
  const members = getTeamMembers(content);

  return (
    <section aria-label="Team" className={`${pm.sectionPad} ${pm.sectionAlt}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <p className={`text-center ${pm.eyebrow}`}>Our Team</p>
        <h2 className={`mt-3 text-center ${pm.heading} ${pm.headingSection}`}>
          {headline}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-center text-sm @min-[640px]:text-base ${pm.body}`}>
            {introText}
          </p>
        ) : null}
        <ul
          className="mt-10 grid gap-8 @min-[640px]:mt-14 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3"
          role="list"
        >
          {members.map((member, index) => {
            const image =
              assets.find((a) => a.key === `team-${index}`)?.imagePath ??
              assets[index]?.imagePath;
            return (
              <li key={member.name} className="min-w-0 text-center">
                {image ? (
                  <SectionMedia
                    src={image}
                    className="mx-auto aspect-[3/4] w-full max-w-xs object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="mx-auto aspect-[3/4] w-full max-w-xs bg-[var(--theme-card)]"
                  />
                )}
                <h3 className="mt-5 text-lg font-medium text-[var(--theme-ink)]">
                  {member.name}
                </h3>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--theme-accent)]">
                  {member.role}
                </p>
                {member.bio ? (
                  <p className={`mt-3 text-sm ${pm.body}`}>{member.bio}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
