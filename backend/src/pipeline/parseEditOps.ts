import { zodResponseFormat } from "openai/helpers/zod";
import { getOpenAIClient, getOpenAIModel } from "../lib/openai.js";
import type { PageFamily } from "../config/pageFamily.js";
import type { Brief } from "../schemas/brief.schema.js";
import {
  editOpsResponseSchema,
  type EditOp,
  type EditOpsResponse,
} from "../schemas/editOps.schema.js";
import type { Page, SectionType } from "../schemas/page.schema.js";
import {
  defaultCopyField,
  extractMaxWords,
  extractQuotedPhrase,
  findCopyTarget,
  inferEditSection,
  isCycleSectionComponentIntent,
  isRewriteCopyIntent,
} from "./resolveEditTarget.js";
import { resolveThemeFamilyIntent } from "./resolveThemeIntent.js";

/**
 * Fixture/regex parser for natural-language edit instructions (no LLM).
 */
export function parseEditOpsFixture(
  instruction: string,
  page?: Page,
): EditOpsResponse {
  const text = instruction.trim();
  const ops: EditOp[] = [];
  const lower = text.toLowerCase();

  const themeFamily = resolveThemeFamilyIntent(text);
  if (themeFamily) {
    ops.push({
      op: "set_theme",
      family: themeFamily,
    });
  }

  const galleryCountMatch =
    lower.match(
      /\b(?:only|just|show|use|keep|set)\s+(\d+)\s+(?:gallery\s+)?(?:images?|photos?|pictures?)\b/,
    ) ??
    lower.match(/\b(?:gallery|moments)\b.+\b(?:only|just|to)\s+(\d+)\b/) ??
    lower.match(/\b(\d+)\s+(?:images?|photos?)\s+only\b/) ??
    lower.match(
      /\badd\s+(?:two|2|\d+)\s+more\s+(?:images?|photos?)\b/,
    );

  if (galleryCountMatch) {
    if (/add\s+(?:two|2)\s+more/i.test(text) && page) {
      const gallery = page.sections.find((section) => section.type === "gallery");
      const current = gallery?.assets.length ?? 2;
      ops.push({
        op: "set_gallery_count",
        count: Math.min(6, current + 2),
      });
    } else if (galleryCountMatch[1]) {
      const count = Math.min(6, Math.max(1, Number(galleryCountMatch[1])));
      if (Number.isFinite(count)) {
        ops.push({ op: "set_gallery_count", count });
      }
    }
  }

  const removeMatch = text.match(
    /\bremove\b(?:\s+menu(?:\s+item)?)?\s*[:\-]?\s*[“"']?([^”"'\n]+)[”"']?/i,
  );
  if (removeMatch?.[1] && /\bmenu\b|\bremove\b/i.test(text)) {
    const name = removeMatch[1].replace(/\s+from\s+the\s+menu.*$/i, "").trim();
    if (name) ops.push({ op: "remove_menu_item", name });
  }

  const priceMatch = text.match(
    /(.+?)\s+(?:to|at|=)\s*\$?\s*(\d+(?:\.\d{1,2})?)/i,
  );
  if (
    priceMatch?.[1] &&
    priceMatch[2] &&
    (/\bprice\b/.test(lower) || /\$/.test(text) || /\bto\s*\$/.test(lower))
  ) {
    const name = priceMatch[1]
      .replace(/^(change|set|update)\s+(the\s+)?(price\s+(of|for)\s+)?/i, "")
      .replace(/\s+price$/i, "")
      .trim();
    if (name && !/\btheme\b|\bheadline\b|\bimage\b/i.test(name)) {
      ops.push({
        op: "set_menu_price",
        name,
        price: Number(priceMatch[2]),
      });
    }
  }

  const renameMatch = text.match(
    /\brename\b\s+[“"']?([^”"']+)[”"']?\s+to\s+[“"']?([^”"']+)[”"']?/i,
  );
  if (renameMatch?.[1] && renameMatch[2]) {
    ops.push({
      op: "rename_menu_item",
      from: renameMatch[1].trim(),
      to: renameMatch[2].trim(),
    });
  }

  const copyMatch = text.match(
    /\b(?:change|set|update)\b(?:\s+the)?\s+(hero\s+)?(headline|subheading|ctaLabel|sectionTitle|introText|body|caption|directionsNote)\s+(?:from\s+.+?\s+)?(?:to|=)\s*[“"']?([^”"'\n]+)[”"']?/i,
  );
  if (
    copyMatch?.[2] &&
    copyMatch[3] &&
    !/\bsomething else\b/i.test(copyMatch[3])
  ) {
    const field = copyMatch[2];
    const section =
      field === "sectionTitle" || field === "introText"
        ? "menu"
        : field === "body"
          ? "about"
          : field === "caption"
            ? "gallery"
            : field === "directionsNote"
              ? "location_map"
              : inferEditSection(text, "hero");
    ops.push({
      op: "set_copy",
      section,
      field,
      value: copyMatch[3].trim(),
    });
  }

  if (ops.length === 0 && isCycleSectionComponentIntent(text)) {
    ops.push({
      op: "cycle_section_component",
      section: inferEditSection(text, "about"),
    });
  }

  if (ops.length === 0 && isRewriteCopyIntent(text) && page) {
    const quoted = extractQuotedPhrase(text);
    const matched = quoted ? findCopyTarget(page, quoted) : null;
    // Also try leading unquoted phrase before “change”
    const leading = text.match(
      /^([A-Za-z][^.]{6,80}?)\s+(?:change|rewrite|to something)/i,
    );
    const fromLeading =
      !matched && leading?.[1] ? findCopyTarget(page, leading[1]) : null;
    const target = matched ?? fromLeading;
    const section: SectionType =
      target?.section ?? inferEditSection(text, "hero");
    const field = target?.field ?? defaultCopyField(section, text);
    ops.push({
      op: "rewrite_copy",
      section,
      field,
      maxWords: extractMaxWords(text),
      hint: text,
    });
  }

  const wantsGalleryCount = ops.some((op) => op.op === "set_gallery_count");
  const wantsLayoutCycle = ops.some(
    (op) => op.op === "cycle_section_component",
  );
  if (
    !wantsGalleryCount &&
    !wantsLayoutCycle &&
    (/\b(different|another|next|cycle)\b.+\b(image|photo|picture)\b/i.test(
      text,
    ) ||
      /\b(image|photo|picture)\b.+\b(different|another|next)\b/i.test(text) ||
      (/\bchange\b.+\b(image|photo|picture)\b/i.test(text) &&
        !/\bcolou?r\b/i.test(text)))
  ) {
    const section = inferEditSection(text, "about");
    const imageSection =
      section === "menu" ||
      section === "location_map" ||
      section === "services" ||
      section === "stats" ||
      section === "testimonials"
        ? "about"
        : section;
    ops.push({ op: "cycle_image", section: imageSection, index: null });
  }

  if (ops.length === 0) {
    return {
      ops: [],
      summary:
        "Could not parse that edit. Try: change about section, rewrite gallery headline, set Item to $12, different about image, use premium theme.",
    };
  }

  return {
    ops,
    summary: `Parsed ${ops.length} edit${ops.length === 1 ? "" : "s"}.`,
  };
}

/**
 * Uses OpenAI to parse a natural-language edit instruction into structured ops.
 */
export async function parseEditOps(args: {
  instruction: string;
  page: Page;
  brief: Brief;
  family: PageFamily;
}): Promise<EditOpsResponse> {
  const client = getOpenAIClient();
  const systemPrompt = `You convert restaurant page edit requests into structured ops.
Allowed ops:
- set_copy: section (hero|menu|about|gallery|location_map|services|stats|testimonials|team|reservation), field, value — when user gives the exact new text
- rewrite_copy: section, field, maxWords (nullable), hint (nullable) — invent better copy only (headline/body/caption), NOT whole-section layout swaps
- cycle_section_component: section — swap to the OTHER layout variant for that section (“change the about section”, “different hero layout”, “switch menu design”, “entire section”)
- set_menu_price: name, price
- rename_menu_item: from, to
- remove_menu_item: name
- cycle_image: section, index (null = next image)
- set_image: section, imagePath (only if exact /images/... path)
- set_theme: family premium|elegant
- set_gallery_count: count 1-6

Critical section rules:
- “Moments” = gallery section (not hero).
- If the user quotes existing on-page text, match that section+field from the page content dump.
- Do NOT change hero when the user named gallery/moments/about/menu.
- “heading/headline/title” alone → hero ONLY if no other section cue and no quoted gallery/about text.
- “change the about section” / “change entire menu section” / “different hero layout” → cycle_section_component (NOT rewrite_copy).

Rules:
- Prefer rewrite_copy over refusing when the user asks you to invent copy text.
- Prefer cycle_section_component when the user wants a different section design/layout/component.
- Prefer cycle_image over set_image unless an exact path is given.
- For cycle_image always include index (null when next).
- "dark to light" → premium; "light to dark" → elegant.
- Theme switch MUST emit set_theme: "use Elegant", "change theme to elegant", typos elegent/elegan/premum, "fine dining" → elegant.
- NEVER invent set_theme for custom brand colors (green/red/etc.).
- NEVER return a theme-update summary with empty ops — if intent is a theme switch, include set_theme.
- Menu names should match existing items when possible.
- summary: short human sentence of intent.`;

  const userPrompt = `Current theme: ${args.family}
Brief: ${JSON.stringify(args.brief)}
Page sections: ${JSON.stringify(
    args.page.sections.map((section) => ({
      type: section.type,
      componentId: section.componentId,
      content: section.content,
      assets: section.assets.map((asset) => asset.key),
    })),
  )}
User request: ${args.instruction}`;

  const completion = await client.chat.completions.parse({
    model: getOpenAIModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(editOpsResponseSchema, "edit_ops"),
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("Failed to parse edit instruction");
  }

  if (
    parsed.ops.length === 0 &&
    isCycleSectionComponentIntent(args.instruction)
  ) {
    const section = inferEditSection(args.instruction, "about");
    return {
      ops: [{ op: "cycle_section_component", section }],
      summary: `Cycle ${section} layout.`,
    };
  }

  // Safety net: if LLM returned nothing but this is clearly a rewrite, inject op
  if (parsed.ops.length === 0 && isRewriteCopyIntent(args.instruction)) {
    const quoted = extractQuotedPhrase(args.instruction);
    const matched = quoted
      ? findCopyTarget(args.page, quoted)
      : findCopyTarget(
          args.page,
          args.instruction.replace(/\bchange\b.*$/i, "").trim(),
        );
    const section =
      matched?.section ?? inferEditSection(args.instruction, "hero");
    const field = matched?.field ?? defaultCopyField(section, args.instruction);
    return {
      ops: [
        {
          op: "rewrite_copy",
          section,
          field,
          maxWords: extractMaxWords(args.instruction),
          hint: args.instruction,
        },
      ],
      summary: `Rewrite ${section}.${field}.`,
    };
  }

  return parsed;
}
