import {
  capHistory,
  createProjectId,
  saveProject,
  type HistoryEntry,
  type StoredProject,
} from "@/lib/projectStorage";
import { savePreviewPayload } from "@/lib/previewStorage";
import type { PageFamily } from "@/lib/pageFamily";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { Brief } from "@/types/intake";
import type { Page } from "@/types/page";

export type PersistProjectArgs = {
  id: string;
  nextMessages: ChatMessage[];
  nextPhase: ChatPhase;
  nextBrief: Brief | null;
  nextPage: Page | null;
  nextFamily: PageFamily | null;
  nextEnriched: string;
  createdAt?: number;
  /** Creative direction from build/edit response. */
  nextDirection?: unknown;
  /** Edit history to persist (already capped). Pass [] to clear on new build. */
  nextHistory?: HistoryEntry[];
};

/**
 * Resolves a display name for a stored project.
 */
function resolveBusinessName(
  brief: Brief | null,
  page: Page | null,
): string {
  const heroHeadline = page?.sections.find(
    (section) => section.type === "hero",
  )?.content.headline;
  return (
    brief?.businessName ??
    (typeof heroHeadline === "string" ? heroHeadline : null) ??
    "Untitled project"
  );
}

/**
 * Persists chat/build state into local project storage.
 */
export function persistProjectState(args: PersistProjectArgs): void {
  const project: StoredProject = {
    id: args.id,
    businessName: resolveBusinessName(args.nextBrief, args.nextPage),
    pageFamily: args.nextFamily ?? "premium",
    messages: args.nextMessages,
    phase: args.nextPhase,
    brief: args.nextBrief,
    page: args.nextPage,
    enrichedChatText: args.nextEnriched,
    createdAt: args.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    direction: args.nextDirection,
    history: args.nextHistory !== undefined
      ? capHistory(args.nextHistory)
      : undefined,
  };
  saveProject(project);
}

/**
 * Ensures a project id exists, creating one when missing.
 */
export function ensureProjectId(projectId: string | null): string {
  return projectId ?? createProjectId();
}

/**
 * Saves preview payload for the latest page state.
 */
export function syncPreviewPayload(args: {
  page: Page;
  family: PageFamily;
  businessName: string;
  projectId: string;
}): void {
  savePreviewPayload({
    page: args.page,
    pageFamily: args.family,
    businessName: args.businessName,
    projectId: args.projectId,
  });
}
