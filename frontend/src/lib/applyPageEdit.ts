import { ApiError } from "@/auth/types";
import { editServerProject, newIntentKey } from "@/lib/projectApi";
import type { PageFamily } from "@/lib/pageFamily";
import type { Brief } from "@/types/intake";
import type { Page, SectionType } from "@/types/page";
import { getAccessToken } from "@/lib/apiClient";

/**
 * Headers for a JSON request to an authenticated pipeline route.
 *
 * /api/edit now requires a session; it runs an LLM call.
 */
function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAccessToken() ?? ""}`,
  };
}

export type EditApiResponse =
  | {
      ok: true;
      page: Page;
      brief: Brief;
      family: PageFamily;
      direction?: unknown;
      applied: unknown[];
      summary: string;
      needsConfirmation?: boolean;
      question?: string;
      candidates?: SectionType[];
    }
  | {
      ok: false;
      error: string;
    };

export type ApplyPageEditArgs = {
  instruction?: string;
  ops?: Array<Record<string, unknown>>;
  targetSection?: SectionType | string | null;
  targetField?: string;
  page: Page;
  brief: Brief;
  family: PageFamily;
  direction?: unknown;
  useFixture: boolean;
  /** Server project this edit belongs to. */
  projectId?: string | null;
  /** Version the client is editing from, for optimistic concurrency. */
  expectedVersion?: number;
  /**
   * Dedupe key for this intent.
   *
   * Supplied by the caller so a retry of the *same* user action reuses it,
   * rather than minting a new key and paying for the edit twice.
   */
  idempotencyKey?: string;
  /**
   * Called when the server reports a newer version before the edit is retried.
   *
   * Lets the caller resync its cached version pointer so the *next* edit does
   * not conflict for the same reason.
   */
  onVersionMoved?: (currentVersion: number) => void;
};

/**
 * Applies an edit to a project's page.
 *
 * For a server-backed project the client sends only the instruction and the
 * version it is editing from. The server loads the document, applies the edit,
 * and appends a version — so the request no longer carries the whole page, and
 * a concurrent change in another tab is rejected instead of overwritten.
 *
 * The legacy path (no `projectId`) posts the page and stores nothing. It exists
 * for anything not yet migrated and should disappear with the last caller.
 */
export async function applyPageEdit(
  args: ApplyPageEditArgs,
): Promise<Extract<EditApiResponse, { ok: true }> & { version?: number }> {
  if (!args.instruction?.trim() && !(args.ops && args.ops.length > 0)) {
    throw new Error("instruction or ops is required.");
  }

  if (args.projectId) {
    const projectId = args.projectId;
    // One key for this user intent, reused across the conflict retry below so
    // a re-apply of the same instruction cannot be billed twice.
    const intentKey = args.idempotencyKey ?? newIntentKey();

    /**
     * Issues the edit against a given version.
     */
    const attempt = (expectedVersion: number) =>
      editServerProject({
        projectId,
        instruction: args.instruction,
        ops: args.ops,
        targetSection: args.targetSection,
        targetField: args.targetField,
        expectedVersion,
        useFixture: args.useFixture,
        idempotencyKey: intentKey,
      });

    let result;
    try {
      result = await attempt(args.expectedVersion ?? 0);
    } catch (error) {
      // Another tab or device moved the project on. The instruction is still
      // what the user asked for, so re-issue it against the new head rather
      // than making them retype it. Exactly once — a second conflict means
      // something is actively racing us and a dialog is the honest answer.
      if (!(error instanceof ApiError) || error.code !== "VERSION_CONFLICT") {
        throw error;
      }

      const current = error.details.currentVersion;
      if (typeof current !== "number") throw error;

      args.onVersionMoved?.(current);
      result = await attempt(current);
    }

    return {
      ok: true,
      page: result.page,
      // The server only echoes brief/family when the edit changed them; fall
      // back to what the caller already holds rather than blanking state.
      brief: result.brief ?? args.brief,
      family: result.family ?? args.family,
      direction: result.direction ?? args.direction,
      applied: result.applied,
      summary: result.summary,
      needsConfirmation: result.needsConfirmation,
      question: result.question,
      candidates: result.candidates,
      version: result.version,
    };
  }

  const query = args.useFixture ? "?fixture=1" : "";
  const response = await fetch(`/api/edit${query}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      instruction: args.instruction,
      ops: args.ops,
      targetSection: args.targetSection ?? undefined,
      targetField: args.targetField,
      page: args.page,
      brief: args.brief,
      family: args.family,
      direction: args.direction,
    }),
  });

  const data = (await response.json()) as EditApiResponse;
  if (!response.ok || !data.ok) {
    throw new Error(data.ok ? "Edit failed." : data.error);
  }
  return data;
}
