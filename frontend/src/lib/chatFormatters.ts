import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";
import { formatStageContent } from "@/lib/pipelineAgents";
import type { PageFamily } from "@/lib/pageFamily";
import type { Brief } from "@/types/intake";

export { formatStageContent };

/** Shared edit tips shown after build (no theme promo — themes only on explicit ask). */
export const EDIT_HINTS =
  "Try: surprise me · make Bite! red · accent green · add testimonials · rewrite gallery headline";

/**
 * Builds the post-build assistant message without dumping theme options.
 */
export function formatBuildReadyMessage(
  businessName: string,
  droppedNote = "",
): string {
  return [
    `Your page for **${businessName}** is ready!${droppedNote}`,
    "",
    `Ask for changes anytime — ${EDIT_HINTS}`,
  ].join("\n");
}

/**
 * Builds the post-edit assistant message (summary only — no theme menu spam).
 */
export function formatEditResultMessage(summary: string): string {
  return summary.trim();
}

/**
 * Formats clarification questions for the chat thread.
 */
export function formatClarificationMessage(
  questions: string[],
  round: number,
  canSkip = false,
): string {
  const list = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
  const skipNote = canSkip
    ? "\n\nIf you don’t have these details, reply **skip for now** (or tap the button) and we’ll continue without them."
    : "\n\nI need these before we can build — please answer so we can continue.";
  return `I still need a bit more clarity (ask #${round}):\n\n${list}${skipNote}`;
}

/**
 * Creates a unique message id for the chat thread.
 */
export function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Default first assistant message for a new chat. */
export const WELCOME_MESSAGE =
  "Tell me about your restaurant — name, cuisine, location, menu items, vibe, and optional brand colors (name or #hex). I'll extract a brief, ask follow-ups if needed, then build your page.";

/**
 * Builds the initial welcome chat message.
 */
export function createWelcomeMessage(): {
  id: string;
  role: "assistant";
  content: string;
  timestamp: number;
} {
  return {
    id: createMessageId(),
    role: "assistant",
    content: WELCOME_MESSAGE,
    timestamp: Date.now(),
  };
}

/**
 * Formats a brief summary for display in the chat thread.
 */
export function formatBriefSummary(brief: Brief, family: PageFamily): string {
  const menuPreview =
    brief.menuItems.length > 0
      ? brief.menuItems
          .slice(0, 4)
          .map((item) => {
            const priceLabel =
              Number.isInteger(item.price) && item.price >= 100
                ? `₹${item.price}`
                : `$${item.price}`;
            return `• ${item.name} — ${priceLabel}`;
          })
          .join("\n")
      : "No menu items yet";

  const brandLine = brief.brandColors?.length
    ? `Brand colors: ${brief.brandColors.join(", ")} (client brand)`
    : "Brand colors: creative pick at build (or skip for theme defaults)";

  return [
    `**${brief.businessName}** · ${brief.category}`,
    `Visual theme: ${getPageFamilyLabel(family)} (Creative Director)`,
    brandLine,
    brief.phone ? `Phone: ${brief.phone}` : "",
    brief.email
      ? `Email: ${brief.email}\nContact / reservation queries will go to this email.`
      : "",
    brief.address ? `Address: ${brief.address}` : "",
    brief.hours?.length
      ? `Hours: ${brief.hours.map((h) => `${h.days} ${h.open}–${h.close}`).join("; ")}`
      : "",
    "",
    `Menu (${brief.menuItems.length} items):`,
    menuPreview,
    brief.menuItems.length > 4 ? `…and ${brief.menuItems.length - 4} more` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

