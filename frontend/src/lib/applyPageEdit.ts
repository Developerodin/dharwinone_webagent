import type { PageFamily } from "@/lib/pageFamily";
import type { Brief } from "@/types/intake";
import type { Page } from "@/types/page";

export type EditApiResponse =
  | {
      ok: true;
      page: Page;
      brief: Brief;
      family: PageFamily;
      applied: unknown[];
      summary: string;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Calls the edit API to apply a natural-language change to the current page.
 */
export async function applyPageEdit(args: {
  instruction: string;
  page: Page;
  brief: Brief;
  family: PageFamily;
  useFixture: boolean;
}): Promise<Extract<EditApiResponse, { ok: true }>> {
  const query = args.useFixture ? "?fixture=1" : "";
  const response = await fetch(`/api/edit${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instruction: args.instruction,
      page: args.page,
      brief: args.brief,
      family: args.family,
    }),
  });

  const data = (await response.json()) as EditApiResponse;
  if (!response.ok || !data.ok) {
    throw new Error(data.ok ? "Edit failed." : data.error);
  }
  return data;
}
