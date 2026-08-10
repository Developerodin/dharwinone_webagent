import {
  formatThemeSuggestions,
  getPageFamilyLabel,
} from "@/lib/pageFamilyLabel";
import { formatStageContent } from "@/lib/pipelineAgents";
import type { PageFamily } from "@/lib/pageFamily";
import type { Brief } from "@/types/intake";

export { formatStageContent };

/** Shared edit tips shown after build and after each edit. */
export const EDIT_HINTS =
  "Try: change about section · rewrite gallery headline · attach Media in chat · different about image · use premium/elegant theme";

/**
 * Builds the post-build assistant message with theme suggestions.
 */
export function formatBuildReadyMessage(
  businessName: string,
  family: PageFamily,
  droppedNote = "",
): string {
  return [
    `Your page for **${businessName}** is ready!${droppedNote}`,
    "",
    formatThemeSuggestions(family),
    "",
    `Ask for changes anytime — ${EDIT_HINTS}`,
  ].join("\n");
}

/**
 * Builds the post-edit assistant message with theme suggestions.
 */
export function formatEditResultMessage(
  summary: string,
  family: PageFamily,
): string {
  return [summary, "", formatThemeSuggestions(family), "", EDIT_HINTS].join(
    "\n",
  );
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
  "Tell me about your restaurant — name, cuisine, location, menu items, vibe. I'll extract a brief, ask follow-ups if needed, then build your page.";

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

  return [
    `**${brief.businessName}** · ${brief.category}`,
    `Visual theme: ${getPageFamilyLabel(family)} (auto-detected)`,
    brief.phone ? `Phone: ${brief.phone}` : "",
    brief.address ? `Address: ${brief.address}` : "",
    "",
    `Menu (${brief.menuItems.length} items):`,
    menuPreview,
    brief.menuItems.length > 4 ? `…and ${brief.menuItems.length - 4} more` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

