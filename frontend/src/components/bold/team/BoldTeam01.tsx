import type { SectionComponentProps } from "@/components/premium/registry";
import { getString, getTeamMembers } from "@/components/premium/contentHelpers";
import { SectionMedia } from "@/components/shared/SectionMedia";
import { bd } from "../shared/boldTokens";

/**
 * Bold team — Demo9 crew grid with crimson labels.
 */
export function BoldTeam01({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "The Crew");
  const introText = getString(content, "introText");
  const members = getTeamMembers(content);

  return (
    <section aria-label="Team" className={`${bd.sectionPad} ${bd.section}`}>
      <div className="mx-auto max-w-6xl text-center">
        <p className="font-[family-name:var(--bold-font-script)] text-2xl text-[var(--bold-hero-red)] @min-[640px]:text-3xl">
          Behind the grill
        </p>
        <h2 className="mt-3 font-[family-name:var(--theme-font-display)] text-[2rem] font-bold uppercase text-[var(--theme-ink)] @min-[640px]:text-[2.75rem]">
          {headline}
        </h2>
        {introText ? (
          <p className={`mx-auto mt-4 max-w-2xl text-sm uppercase tracking-[0.04em] ${bd.body}`}>
            {introText}
          </p>
        ) : null}
        <ul className="mt-12 grid gap-8 @min-[640px]:grid-cols-3" role="list">
          {(members.length > 0
            ? members
            : [
                { name: "Chef Marcus", role: "Kitchen lead", bio: undefined },
                { name: "Priya", role: "Front of house", bio: undefined },
                { name: "Leo", role: "Service", bio: undefined },
              ]
          ).map((member, index) => {
            const image =
              assets.find((a) => a.key === `team-${index}`)?.imagePath ??
              assets[index]?.imagePath;
            return (
              <li key={`${member.name}-${index}`} className="min-w-0">
                {image ? (
                  <SectionMedia
                    src={image}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="aspect-square w-full bg-[linear-gradient(145deg,var(--bold-hero-red),#7a1018)]"
                  />
                )}
                <h3 className="mt-4 font-[family-name:var(--theme-font-display)] text-xl font-bold uppercase text-[var(--theme-ink)]">
                  {member.name}
                </h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--bold-hero-red)]">
                  {member.role}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
