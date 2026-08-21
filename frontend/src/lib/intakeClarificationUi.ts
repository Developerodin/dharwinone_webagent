import { formatClarificationMessage } from "@/lib/chatFormatters";
import {
  buildIntakeClarificationActions,
  isLocationIntakeRound,
} from "@/lib/intakeClarificationActions";
import type { ChatAction } from "@/types/chat";

export type IntakeClarificationUi = {
  locationOnly: boolean;
  locationPicker: { open: boolean; prefill: string };
  content: string;
  actions: ChatAction[] | undefined;
};

/**
 * Builds chat copy, map-picker state, and actions for one intake clarification turn.
 */
export function buildIntakeClarificationUi(args: {
  questions: string[];
  round: number;
  canSkip: boolean;
  gaps: string[];
  addressPrefill: string;
}): IntakeClarificationUi {
  const locationOnly = isLocationIntakeRound(args.gaps);
  return {
    locationOnly,
    locationPicker: {
      open: locationOnly,
      prefill: args.addressPrefill,
    },
    content: formatClarificationMessage(
      args.questions,
      args.round,
      args.canSkip,
      { locationOnly },
    ),
    actions: buildIntakeClarificationActions({
      canSkip: args.canSkip,
      gaps: args.gaps,
    }),
  };
}
