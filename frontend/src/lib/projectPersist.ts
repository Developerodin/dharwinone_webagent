import {
  capHistory,
  createProjectId,
  saveProject,
  type HistoryEntry,
  type StoredProject,
} from "@/lib/projectStorage";
import { saveServerMessages } from "@/lib/projectApi";
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
  /**
   * Version the server stored this page as.
   *
   * The page itself is already saved server-side by the build and edit
   * endpoints; this records which version the local cache is showing so the
   * next edit can send a correct `expectedVersion`.
   */
  serverVersion?: number;
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
 * Records project state.
 *
 * The page is already stored server-side — the build and edit endpoints append
 * a version as part of the request that produced it, so writing it again here
 * would create a duplicate. What this does is:
 *
 *  1. update the local cache, so the UI re-renders instantly and the project
 *     still opens if the network is down
 *  2. push the chat thread to the server, which is the one piece of project
 *     state no pipeline endpoint saves
 *
 * The message push is deliberately fire-and-forget: a user typing must never
 * wait on a round trip, and a failed push is recovered on the next save.
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
    serverVersion: args.serverVersion,
  };
  saveProject(project);

  void syncMessages(args.id, args.nextMessages);
}

/** Messages already sent, per project, so each save pushes only what is new. */
const sentMessageCounts = new Map<string, number>();

/**
 * Pushes newly-added chat messages to the server.
 *
 * Only the tail is sent. Re-posting the whole thread on every keystroke-level
 * save would duplicate every message, because the server appends rather than
 * replaces.
 */
async function syncMessages(
  projectId: string,
  messages: PersistProjectArgs["nextMessages"],
): Promise<void> {
  const alreadySent = sentMessageCounts.get(projectId) ?? 0;
  const pending = messages.slice(alreadySent);
  if (pending.length === 0) return;

  // Claim the range before awaiting, so two saves in flight cannot both send
  // the same messages.
  sentMessageCounts.set(projectId, messages.length);

  try {
    await saveServerMessages(projectId, pending);
  } catch {
    // Roll back the claim so the next save retries these messages.
    sentMessageCounts.set(projectId, alreadySent);
  }
}

/**
 * Resets message-sync bookkeeping for a project.
 *
 * Called when a project is opened from the server, where the stored thread is
 * already complete and re-sending it would duplicate every message.
 */
export function markMessagesSynced(projectId: string, count: number): void {
  sentMessageCounts.set(projectId, count);
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
