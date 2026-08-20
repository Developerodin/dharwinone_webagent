import {
  importLocalProjects,
  listServerProjects,
  loadServerProject,
  loadServerMessages,
  type ServerProject,
} from "@/lib/projectApi";
import { markMessagesSynced } from "@/lib/projectPersist";
import {
  listProjects,
  replaceProjects,
  type StoredProject,
} from "@/lib/projectStorage";
import { parsePageFamily } from "@/lib/pageFamily";
import type { ChatMessage } from "@/types/chat";

/**
 * Reconciles the local cache with the server.
 *
 * Runs once after sign-in: anything this browser built before the user had an
 * account is handed over, then the cache is replaced with what the server
 * actually holds.
 */

/** Set once the import has run this session, so a re-render cannot repeat it. */
const IMPORTED_KEY = "prowplus-projects-imported";

/**
 * Returns projects sitting in this browser that the server has never seen.
 *
 * A cached copy of a server project has a `serverVersion`; a project built
 * before sign-in does not. That is what distinguishes "work to rescue" from
 * "cache to discard".
 */
function unclaimedLocalProjects(): StoredProject[] {
  return listProjects().filter((project) => project.serverVersion === undefined);
}

/**
 * Converts a server project into the shape the UI already renders.
 *
 * The page and chat thread are fetched separately and only for the project
 * being opened — the dashboard must never pull every document.
 */
function toStoredProject(project: ServerProject): StoredProject {
  return {
    id: project.id,
    businessName: project.name,
    pageFamily: parsePageFamily(project.pageFamily) ?? "premium",
    messages: [],
    phase: project.currentVersion > 0 ? "complete" : "idle",
    brief: project.brief ?? null,
    page: null,
    enrichedChatText: project.enrichedChatText ?? "",
    createdAt: new Date(project.createdAt).getTime(),
    updatedAt: new Date(project.updatedAt).getTime(),
    direction: project.direction,
    serverVersion: project.currentVersion,
  };
}

export type SyncResult = {
  imported: number;
  projects: StoredProject[];
};

/**
 * Imports local work, then refreshes the cache from the server.
 *
 * Never throws: a failed sync leaves the user with their cached projects,
 * which is worse than being up to date but far better than an empty dashboard.
 */
export async function syncProjectsWithServer(): Promise<SyncResult> {
  let imported = 0;

  try {
    if (!sessionStorage.getItem(IMPORTED_KEY)) {
      const unclaimed = unclaimedLocalProjects();

      if (unclaimed.length > 0) {
        const result = await importLocalProjects(unclaimed);
        imported = result.imported;
      }

      // Marked whether or not anything was found, so a user with no local work
      // does not re-check on every navigation.
      sessionStorage.setItem(IMPORTED_KEY, "1");
    }
  } catch {
    // Import is best-effort. The local copies are still on disk and will be
    // offered again next session.
  }

  try {
    const projects = await listServerProjects();
    const stored = projects.map(toStoredProject);
    replaceProjects(stored);
    return { imported, projects: stored };
  } catch {
    return { imported, projects: listProjects() };
  }
}

/**
 * Loads a project's page and chat history from the server into the cache.
 *
 * Called when a project is opened, because the list endpoint deliberately
 * carries neither.
 */
export async function hydrateProject(
  id: string,
): Promise<StoredProject | null> {
  try {
    const [detail, messages] = await Promise.all([
      loadServerProject(id),
      loadServerMessages(id),
    ]);

    const chat: ChatMessage[] = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: new Date(message.createdAt).getTime(),
      ...(message.payload ?? {}),
    })) as ChatMessage[];

    // The thread just came from the server; telling the sync bookkeeping it is
    // already sent stops the next save from posting all of it back as new.
    markMessagesSynced(id, chat.length);

    const stored: StoredProject = {
      ...toStoredProject(detail.project),
      page: detail.page ?? null,
      messages: chat,
      serverVersion: detail.version ?? detail.project.currentVersion,
    };

    replaceProjects([
      stored,
      ...listProjects().filter((project) => project.id !== id),
    ]);

    return stored;
  } catch {
    return null;
  }
}
