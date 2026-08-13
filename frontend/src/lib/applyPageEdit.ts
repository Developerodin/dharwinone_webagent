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
};

/**
 * Calls the edit API with NL instruction and/or deterministic ops.
 */
export async function applyPageEdit(
  args: ApplyPageEditArgs,
): Promise<Extract<EditApiResponse, { ok: true }>> {
  if (!args.instruction?.trim() && !(args.ops && args.ops.length > 0)) {
    throw new Error("instruction or ops is required.");
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
