import { applyPageEdit } from "@/lib/applyPageEdit";
import { formatEditResultMessage } from "@/lib/chatFormatters";
import type { PageFamily } from "@/lib/pageFamily";
import type { Brief } from "@/types/intake";
import type { Page } from "@/types/page";

export type PageEditResult = {
  page: Page;
  brief: Brief;
  family: PageFamily;
  message: string;
};

/**
 * Runs a post-preview edit and returns updated page state + chat copy.
 */
export async function performPageEdit(args: {
  instruction: string;
  page: Page;
  brief: Brief;
  family: PageFamily;
  useFixture: boolean;
}): Promise<PageEditResult> {
  const result = await applyPageEdit(args);
  return {
    page: result.page,
    brief: result.brief,
    family: result.family,
    message: formatEditResultMessage(result.summary, result.family),
  };
}
