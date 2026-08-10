import type { SectionComponentProps } from "../registry";
import { getString, getTeamMembers } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Caverta-style chef/team portrait grid with gold accents.
 */
export function ElegantTeam01({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "Our Chefs");
  const introText = getString(content, "introText");
  const members = getTeamMembers(content);

  return (
    <section aria-label="Team" className={`${eg.sectionPad} ${eg.sectionAlt}`}>
      <div className="mx-auto max-w-6xl min-w-0">
        <p className={`text-center ${eg.eyebrow}`}>Our Team</p>
        <span aria-hidden="true" className={`mx-auto mt-3 block @min-[640px]:mt-4 ${eg.goldRule}`} />
        <h2 className={`mt-4 text-center @min-[640px]:mt-6 ${eg.heading} ${eg.headingSection}`}>
          {headline}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-center text-sm @min-[640px]:text-base ${eg.body}`}>
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
                    className="mx-auto aspect-[3/4] w-full max-w-xs bg-[var(--eg-bg)]"
                  />
                )}
                <h3 className={`mt-5 text-lg ${eg.heading}`}>{member.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--eg-gold)]">
                  {member.role}
                </p>
                {member.bio ? (
                  <p className={`mt-3 text-sm ${eg.body}`}>{member.bio}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
