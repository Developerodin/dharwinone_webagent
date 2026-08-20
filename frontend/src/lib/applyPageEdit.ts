import { editServerProject } from "@/lib/projectApi";
import type { PageFamily } from "@/lib/pageFamily";
import type { Brief } from "@/types/intake";
import type { Page, SectionType } from "@/types/page";

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
    const result = await editServerProject({
      projectId: args.projectId,
      instruction: args.instruction,
      ops: args.ops,
      targetSection: args.targetSection,
      targetField: args.targetField,
      expectedVersion: args.expectedVersion ?? 0,
      useFixture: args.useFixture,
    });

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
    headers: { "Content-Type": "application/json" },
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
