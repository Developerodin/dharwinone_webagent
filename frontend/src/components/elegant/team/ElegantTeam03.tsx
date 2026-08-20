import type { SectionComponentProps } from "../registry";
import { getString, getTeamMembers } from "../../premium/contentHelpers";
import { eg } from "../shared/elegantTokens";
import { SectionMedia } from "@/components/shared/SectionMedia";

/**
 * Elegant team 03 — lead cook as thesis.
 */
export function ElegantTeam03({ content, assets }: SectionComponentProps) {
  const headline = getString(content, "headline", "The kitchen");
  const introText = getString(content, "introText");
  const members = getTeamMembers(content);
  const lead = members[0];
  const rest = members.slice(1);
  const leadImage =
    assets.find((asset) => asset.key === "team-0")?.imagePath ?? assets[0]?.imagePath;

  return (
    <section aria-label="Team" className={`${eg.sectionPad} ${eg.section}`}>
      <div className="mx-auto grid max-w-6xl gap-10 @min-[768px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] @min-[768px]:items-end">
        <div className="min-w-0">
          {leadImage ? (
            <SectionMedia src={leadImage} className="aspect-[4/5] w-full object-cover" />
          ) : (
            <div aria-hidden="true" className="aspect-[4/5] w-full bg-[var(--eg-bg-alt)]" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className={`${eg.heading} ${eg.headingSection}`}>{headline}</h2>
          {lead ? (
            <>
              <p className={`mt-6 text-2xl ${eg.heading}`}>{lead.name}</p>
              {lead.role ? <p className={`mt-1 text-sm ${eg.body}`}>{lead.role}</p> : null}
              {lead.bio ? (
                <p className={`mt-4 text-sm leading-7 @min-[640px]:text-base ${eg.body}`}>{lead.bio}</p>
              ) : introText ? (
                <p className={`mt-4 text-sm ${eg.body}`}>{introText}</p>
              ) : null}
            </>
          ) : introText ? (
            <p className={`mt-4 text-sm ${eg.body}`}>{introText}</p>
          ) : null}
          {rest.length > 0 ? (
            <ul className="mt-8 space-y-3 border-t border-[var(--eg-gold)]/25 pt-6" role="list">
              {rest.map((member) => (
                <li key={member.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[var(--eg-cream)]">{member.name}</span>
                  {member.role ? <span className={`text-sm ${eg.body}`}>{member.role}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
