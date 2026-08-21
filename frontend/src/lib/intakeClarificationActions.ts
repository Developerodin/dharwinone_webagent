import type { ChatAction } from "@/types/chat";

/**
 * True when this clarification turn is the dedicated map-pin step.
 */
export function isLocationIntakeRound(gaps: string[] | undefined): boolean {
  return Boolean(gaps && gaps.length === 1 && gaps.includes("address"));
}

/**
 * Builds clarifying-chat actions: Select location only on a location-only turn, Skip when allowed.
 */
export function buildIntakeClarificationActions(args: {
  canSkip: boolean;
  gaps: string[] | undefined;
}): ChatAction[] | undefined {
  const actions: ChatAction[] = [];
  if (isLocationIntakeRound(args.gaps)) {
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
