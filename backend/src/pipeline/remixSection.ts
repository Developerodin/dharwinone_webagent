import type { Page, SectionLayout, SectionType } from "../schemas/page.schema.js";
import { DEFAULT_SECTION_LAYOUT } from "../schemas/page.schema.js";
import { stableHash } from "../lib/stableHash.js";

const EMPHASIS: SectionLayout["emphasis"][] = [
  "hero",
  "major",
  "standard",
  "compact",
];
const INTENTS: SectionLayout["intent"][] = [
  "full_bleed",
  "split_left",
  "split_right",
  "centered",
  "editorial_columns",
  "grid",
  "band",
  "overlap",
  "marquee",
];
const BACKGROUNDS: SectionLayout["background"][] = [
  "base",
  "alt",
  "dark",
  "accent",
  "image",
];
const SPACINGS: SectionLayout["spacing"][] = ["tight", "normal", "roomy"];

/**
 * Serializes a layout for rejection comparison.
 */
function layoutKey(layout: SectionLayout): string {
  return `${layout.emphasis}|${layout.intent}|${layout.background}|${layout.spacing}`;
}

/**
 * Builds a candidate layout from a salt, skipping rejected combos.
 */
function nextLayout(
  section: SectionType,
  salt: string,
  rejected: SectionLayout[],
  current?: SectionLayout,
): SectionLayout {
  const rejectedKeys = new Set(rejected.map(layoutKey));
  if (current) rejectedKeys.add(layoutKey(current));

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const seed = `${salt}:${section}:${attempt}`;
    const candidate: SectionLayout = {
      emphasis: EMPHASIS[stableHash(`${seed}:e`) % EMPHASIS.length]!,
      intent: INTENTS[stableHash(`${seed}:i`) % INTENTS.length]!,
      background: BACKGROUNDS[stableHash(`${seed}:b`) % BACKGROUNDS.length]!,
      spacing: SPACINGS[stableHash(`${seed}:s`) % SPACINGS.length]!,
    };
    if (!rejectedKeys.has(layoutKey(candidate))) return candidate;
  }

  return {
    ...DEFAULT_SECTION_LAYOUT,
    intent: "centered",
    spacing: "roomy",
  };
}

/**
 * Re-rolls layoutIntent × emphasis × background × spacing for one section,
 * excluding combinations the user already rejected.
 */
export function applyRemixSectionOp(
  page: Page,
  sectionType: SectionType,
  salt: string,
): string {
  const section = page.sections.find((s) => s.type === sectionType);
  if (!section) return `No ${sectionType} section to remix.`;

  const current = section.layout ?? { ...DEFAULT_SECTION_LAYOUT };
  const rejected = [...(section.rejectedLayouts ?? []), current];
  const next = nextLayout(sectionType, salt, rejected, current);

  section.rejectedLayouts = rejected.slice(-12);
  section.layout = next;

  return `Remixed ${sectionType} layout → ${next.intent}/${next.emphasis}/${next.background}/${next.spacing}.`;
}
