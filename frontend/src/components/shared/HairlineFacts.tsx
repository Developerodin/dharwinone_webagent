import type { ReactNode } from "react";

export type HairlineFact = {
  label: string;
  value: ReactNode;
};

type HairlineFactsProps = {
  facts: HairlineFact[];
  className?: string;
  inkClass?: string;
  mutedClass?: string;
  lineClass?: string;
};

/**
 * Stacks labeled facts with hairline dividers instead of icon tiles or nested cards.
 */
export function HairlineFacts({
  facts,
  className = "",
  inkClass = "text-[var(--theme-ink)]",
  mutedClass = "text-[var(--theme-muted)]",
  lineClass = "divide-[var(--theme-line)]",
}: HairlineFactsProps) {
  if (facts.length === 0) return null;

  return (
    <dl className={`divide-y ${lineClass} ${className}`.trim()}>
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
          <dt className={`text-sm ${mutedClass}`}>{fact.label}</dt>
          <dd className={`text-sm leading-6 ${inkClass}`}>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
