import { applyPageEdit } from "@/lib/applyPageEdit";
import { formatEditResultMessage } from "@/lib/chatFormatters";
import type { PageFamily } from "@/lib/pageFamily";
import type { Brief } from "@/types/intake";
import type { Page } from "@/types/page";

export type PageEditResult = {
  page: Page;
  brief: Brief;
  family: PageFamily;
  /** Creative direction returned by the pipeline (if any). */
  direction?: unknown;
  /** Version the server stored this edit as. */
  version?: number;
  message: string;
};

/**
 * Runs a post-preview edit and returns updated page state + chat copy.
 */
export async function performPageEdit(args: {
  /** Natural-language edit instruction. */
  instruction?: string;
  /** Explicit edit ops array (from section panel). */
  ops?: Array<Record<string, unknown>>;
  /** Section type context for targeted edits. */
  targetSection?: string;
  /** Field context for targeted edits. */
  targetField?: string;
  page: Page;
  brief: Brief;
  family: PageFamily;
  /** Creative direction to forward to the pipeline. */
  direction?: unknown;
  useFixture: boolean;
  /** Server project this edit belongs to. */
  projectId?: string | null;
  /** Version being edited from, for optimistic concurrency. */
  expectedVersion?: number;
}): Promise<PageEditResult> {
  const result = await applyPageEdit(args);
  return {
    page: result.page,
    brief: result.brief,
    family: result.family,
    direction: result.direction,
    version: result.version,
    message: formatEditResultMessage(result.summary),
  };
}
