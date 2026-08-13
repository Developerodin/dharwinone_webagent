import type { EditOp } from "../schemas/editOps.schema.js";
import type { SectionType } from "../schemas/page.schema.js";
import { resolveColor, resolveFont } from "./colorResolve.js";
import { normalizeSearchText } from "./fuzzyMatch.js";
import {
  inferEditSection,
  isCycleSectionComponentIntent,
  resolveSectionFromText,
} from "./resolveEditTarget.js";

const SECTION_COLOR_TOKEN =
  "#?[0-9a-fA-F]{3,6}|dark\\s+green|light\\s+gr[ae]y|red|green|blue|cream|white|black|navy|gold|orange|pink|purple|coral|teal|gray|grey";

/**
 * Parses per-section background/text color asks (fuzzy section labels).
 */
function parseSectionStyleFixture(text: string, ops: EditOp[]): void {
  if (ops.some((op) => op.op === "set_section_style")) return;

  const colorRe = SECTION_COLOR_TOKEN;
  const sectionLabel =
    "(?:our\\s+)?(?:story|about|hero|menu|gallery|contact|reservation|services?|testimonials?|reviews?|team|stats?|footer|header)|storysection";

  const bgOfSection = text.match(
    new RegExp(
      `\\b(?:background|bg)(?:\\s+colou?r)?\\s+(?:of\\s+)?(?:the\\s+)?(${sectionLabel})\\s*section?\\s*(?:to|as|=|:)?\\s*(${colorRe})\\b`,
      "i",
    ),
  );
  const sectionThenBg = text.match(
    new RegExp(
      `\\b(${sectionLabel})\\s*section?\\b.{0,40}\\b(?:background|bg)(?:\\s+colou?r)?\\s*(?:to|as|=|:)?\\s*(${colorRe})\\b`,
      "i",
    ),
  );
  const legacySectionBg = text.match(
    new RegExp(
      `\\b(hero|about|menu|gallery|contact|reservation|services|testimonials|team)\\b.+\\b(?:background|bg)\\b.+\\b(${colorRe})\\b`,
      "i",
    ),
  );

  const bgMatch = bgOfSection ?? sectionThenBg ?? legacySectionBg;
  let section: SectionType | null = null;
  if (bgMatch?.[1]) {
    section =
      resolveSectionFromText(bgMatch[1])?.section ??
      resolveSectionFromText(`${bgMatch[1]} section`)?.section ??
      null;
  }
  let background: string | null = bgMatch?.[2] ?? null;

  // “background … to white” with fuzzy section cue but loose word order
  if (!background) {
    const looseBg = text.match(
      new RegExp(
        `\\b(?:background|bg)(?:\\s+colou?r)?\\b[^\\n]{0,60}?\\b(?:to|as|=)\\s*(${colorRe})\\b`,
        "i",
      ),
    );
    if (looseBg?.[1]) {
      const resolved = resolveSectionFromText(text);
      if (resolved && resolved.score >= 0.72) {
        section = resolved.section;
        background = looseBg[1];
      }
    }
  }

  let textColor: string | null = null;
  const textColorMatch =
    text.match(
      new RegExp(
        `\\b(?:heading|subheading|headline|title|body|text|suhadeing)\\b[^\\n]{0,40}?\\b(?:colou?r|colro|to)\\s*(?:to\\s+)?(${colorRe})\\b`,
        "i",
      ),
    ) ??
    text.match(
      new RegExp(
        `\\b(?:all\\s+)?(?:heading|subheading|headline|text|suhadeing)\\b[^\\n]{0,50}?\\b(${colorRe})\\b`,
        "i",
      ),
    );
  if (textColorMatch?.[1] && resolveColor(textColorMatch[1])) {
    textColor = textColorMatch[1];
  }

  if (!section && (background || textColor)) {
    const resolved = resolveSectionFromText(normalizeSearchText(text) || text);
    if (resolved && resolved.score >= 0.72) section = resolved.section;
    else section = inferEditSection(text, "hero");
  }

  if (!section || (!background && !textColor)) return;
  if (background && !resolveColor(background)) return;

  ops.push({
    op: "set_section_style",
    section,
    background,
    text: textColor,
    button: null,
    paddingY: null,
  });
}

/**
 * Fixture helpers for style / layout intents (deterministic, no LLM).
 */
export function parseStyleLayoutFixture(text: string, ops: EditOp[]): void {
  const lower = text.toLowerCase();

  const wantsGlobalRemix =
    /\b(surprise\s+me|remix(\s+layout)?|different\s+layouts?|reshuffle\s+layouts?)\b/i.test(
      text,
    );
  if (wantsGlobalRemix) {
    ops.push({ op: "remix_layout", salt: null });
  }

  // Header/contact/footer/section layout cycle (single section — never remix)
  const hasCycle = ops.some((op) => op.op === "cycle_section_component");
  if (!wantsGlobalRemix && isCycleSectionComponentIntent(text) && !hasCycle) {
    const cycleOp: EditOp = {
      op: "cycle_section_component",
      section: inferEditSection(text, "header"),
    };
    ops.push(cycleOp);
  }

  // Form / input background → contact section card surface
  const inputBg =
    text.match(
      /\b(?:input|form\s*field|form)\s*(?:bg|background)?\s*(?:to|as|=)?\s*(#?[0-9a-fA-F]{3,6}|light\s*gr[ae]y|white|cream|gray|grey)\b/i,
    ) ??
    text.match(
      /\b(?:bg|background)\s+(?:of\s+)?(?:the\s+)?(?:input|form\s*fields?|inputs?)\s+(?:to|as|=)?\s*(#?[0-9a-fA-F]{3,6}|light\s*gr[ae]y|white|cream)\b/i,
    );
  if (inputBg?.[1]) {
    ops.push({
      op: "set_section_style",
      section: "contact",
      background: inputBg[1].replace(/\s+/g, " "),
      text: null,
      button: null,
      paddingY: null,
    });
  }

  // Black & white / monochrome palette
  if (/\b(black\s+and\s+white|monochrome|b\s*&\s*w)\b/i.test(text)) {
    ops.push({
      op: "set_theme_tokens",
      accent: "black",
      accentContrast: "white",
      bg: "white",
      bgAlt: "light grey",
      ink: "black",
      fontDisplay: null,
      fontBody: null,
    });
  }

  const textColorMatch = text.match(
    /\b(?:make|color|colour)\s+[“"']?([^”"'\n]+?)[”"']?\s+(?:in\s+)?(#?[0-9a-fA-F]{3,6}|red|green|blue|orange|pink|purple|gold|coral|teal|navy|black|white)\b/i,
  );
  if (textColorMatch?.[1] && textColorMatch[2] && resolveColor(textColorMatch[2])) {
    ops.push({
      op: "set_text_style",
      section: inferEditSection(text, "hero"),
      field: "headline",
      match: textColorMatch[1].trim(),
      color: textColorMatch[2],
    });
  }

  const accentMatch = text.match(
    /\b(?:accent|brand|primary|button|cta)\b.+\b(#?[0-9a-fA-F]{3,6}|red|green|blue|orange|pink|purple|gold|coral|teal|navy)\b/i,
  ) ?? text.match(
    /\b(?:use|set)\s+(?:accent|brand)?\s*(#?[0-9a-fA-F]{3,6}|red|green|blue|orange|pink|purple|gold|coral|teal|navy)\b/i,
  );
  const hasThemeTokens = ops.some((op) => op.op === "set_theme_tokens");
  if (accentMatch && !hasThemeTokens) {
    const colorToken =
      accentMatch[1] ??
      text.match(/\b(#?[0-9a-fA-F]{3,6}|red|green|blue|orange|pink|purple|gold|coral|teal|navy)\b/i)?.[1];
    if (colorToken && resolveColor(colorToken)) {
      const tokenOp: EditOp = {
        op: "set_theme_tokens",
        accent: colorToken,
        accentContrast: null,
        bg: null,
        bgAlt: null,
        ink: null,
        fontDisplay: null,
        fontBody: null,
      };
      ops.push(tokenOp);
    }
  }

  parseSectionStyleFixture(text, ops);

  const fontMatch = text.match(
    /\b(?:font|typeface)\b.+\b(serif|sans|playfair|geist|modern|elegant|rustic)\b/i,
  ) ?? text.match(/\buse\s+(serif|sans)\b/i);
  if (fontMatch?.[1] && resolveFont(fontMatch[1])) {
    ops.push({
      op: "set_theme_tokens",
      accent: null,
      accentContrast: null,
      bg: null,
      bgAlt: null,
      ink: null,
      fontDisplay: fontMatch[1],
      fontBody: /body/i.test(text) ? fontMatch[1] : null,
    });
  }

  const spacingMatch = text.match(
    /\b(tighter|tight|more\s+space|roomier|roomy|spacious|less\s+space)\b.+\b(hero|about|menu|gallery|contact|reservation)\b/i,
  ) ?? text.match(
    /\b(hero|about|menu|gallery|contact|reservation)\b.+\b(tighter|tight|more\s+space|roomier|roomy|spacious)\b/i,
  );
  if (spacingMatch) {
    const token = `${spacingMatch[1]} ${spacingMatch[2]}`.toLowerCase();
    const section = (
      /hero|about|menu|gallery|contact|reservation/.test(spacingMatch[1] ?? "")
        ? spacingMatch[1]
        : spacingMatch[2]
    ) as SectionType;
    const paddingY = /tight|less/.test(token)
      ? "tight"
      : /room|more|spacious/.test(token)
        ? "roomy"
        : "normal";
    ops.push({
      op: "set_section_spacing",
      section,
      paddingY,
    });
  }

  const addSection = text.match(
    /\badd\s+(?:a\s+|an\s+)?(testimonials?|team|services|stats|gallery|about|menu|reservation|location_map|contact)\b/i,
  );
  if (addSection?.[1]) {
    let section = addSection[1].toLowerCase().replace(/s$/, "");
    if (section === "testimonial") section = "testimonials";
    if (section === "stat") section = "stats";
    if (section === "service") section = "services";
    ops.push({ op: "add_section", section: section as SectionType });
  }

  const removeSection = text.match(
    /\bremove\s+(?:the\s+)?(testimonials?|team|services|stats|gallery|about|menu|reservation|location_map|hero)\s+section\b/i,
  );
  if (removeSection?.[1]) {
    let section = removeSection[1].toLowerCase().replace(/s$/, "");
    if (section === "testimonial") section = "testimonials";
    if (section === "stat") section = "stats";
    if (section === "service") section = "services";
    ops.push({ op: "remove_section", section: section as SectionType });
  }

  void lower;
}

