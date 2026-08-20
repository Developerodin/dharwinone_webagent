import {
  capHistory,
  createProjectId,
  loadProject,
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

/**
 * Per-project mutex, so two saves in flight cannot both claim the same range.
 */
const syncLocks = new Map<string, Promise<void>>();

/**
 * Pushes newly-added chat messages to the server.
 *
 * Correctness here is fiddly enough to be worth spelling out. The previous
 * version tracked "how many messages we have sent" in process memory, which
 * broke in four ways: a shrinking thread made the count exceed the array and
 * silently synced nothing; two concurrent saves could each roll the count back
 * over the other; sending was capped at 50 while the count claimed the full
 * length, permanently stranding anything older; and a refresh reset the count
 * to zero, re-appending the whole thread as new messages.
 *
 * So the marker is now the last synced *sequence number*, persisted with the
 * project, and the whole pending batch is sent in chunks rather than truncated.
 */
async function syncMessages(
  projectId: string,
  messages: PersistProjectArgs["nextMessages"],
): Promise<void> {
  const previous = syncLocks.get(projectId) ?? Promise.resolve();

  const run = previous
    .catch(() => {})
    .then(async () => {
      const cached = loadProject(projectId);
      const syncedCount = cached?.syncedMessageCount ?? 0;

      // A shorter thread means it was reset or replaced, not appended to.
      // Re-sending from zero would duplicate; the server thread is replaced on
      // the next open instead.
      if (messages.length < syncedCount) return;

      const pending = messages.slice(syncedCount);
      if (pending.length === 0) return;

      // Chunked, because the endpoint accepts 50 at a time. Sending only the
      // last 50 while marking the whole range synced is how messages went
      // missing before.
      let sent = syncedCount;
      for (let i = 0; i < pending.length; i += 50) {
        const batch = pending.slice(i, i + 50);
        await saveServerMessages(projectId, batch);
        sent += batch.length;

        const current = loadProject(projectId);
        if (current) {
          saveProject({ ...current, syncedMessageCount: sent });
        }
      }
    });

  syncLocks.set(projectId, run);
  await run;
}

/**
 * Records how much of a project's thread the server already has.
 *
 * Called after loading a project from the server, where the stored thread is
 * complete and re-sending it would duplicate every message.
 */
export function markMessagesSynced(projectId: string, count: number): void {
  const cached = loadProject(projectId);
  if (cached) saveProject({ ...cached, syncedMessageCount: count });
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
