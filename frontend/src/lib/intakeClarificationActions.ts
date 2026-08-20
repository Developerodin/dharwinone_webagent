import type { ChatAction } from "@/types/chat";

/**
 * Builds clarifying-chat actions: Select location when address is a gap, Skip when allowed.
 */
export function buildIntakeClarificationActions(args: {
  canSkip: boolean;
  gaps: string[] | undefined;
}): ChatAction[] | undefined {
  const actions: ChatAction[] = [];
  if (args.gaps?.includes("address")) {
    actions.push({
      label: "Select location",
      action: "open_location_picker",
      variant: "primary",
      ariaLabel: "Select location on Google Maps",
    });
  }
  if (args.canSkip) {
    actions.push({
      label: "Skip for now",
      action: "skip",
      variant: "outline",
    });
  }
  return actions.length > 0 ? actions : undefined;
}
