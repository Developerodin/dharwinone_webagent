import type { PageFamily } from "@/lib/pageFamily";
import type { Brief } from "@/types/intake";
import type { Page } from "@/types/page";
import { getAccessToken } from "@/lib/apiClient";

/**
 * Headers for a JSON request to an authenticated pipeline route.
 *
 * /api/ask now requires a session; it runs an LLM call.
 */
function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAccessToken() ?? ""}`,
  };
}

export type AskResult = {
  intent: "ask" | "edit";
  message: string;
  proposedEdit: string | null;
  specialist: "style" | "layout" | "copy" | "general" | null;
  openLocationPicker: boolean;
};

/**
 * Calls the Ask agent to classify intent and optionally propose an edit.
 */
export async function performAsk(args: {
  instruction: string;
  page: Page;
  brief: Brief;
  family: PageFamily;
  useFixture?: boolean;
}): Promise<AskResult> {
  const query = args.useFixture ? "?fixture=1" : "";
  const response = await fetch(`/api/ask${query}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      instruction: args.instruction,
      page: args.page,
      brief: args.brief,
      family: args.family,
    }),
  });

  const data = (await response.json()) as AskResult & {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok || data.ok === false) {
    throw new Error(data.error ?? "Ask agent failed");
  }

  return {
    intent: data.intent,
    message: data.message ?? "",
    proposedEdit: data.proposedEdit ?? null,
    specialist: data.specialist ?? null,
    openLocationPicker: Boolean(data.openLocationPicker),
  };
}
