import { apiRequest } from "@/lib/apiClient";
import type { PageFamily } from "@/lib/pageFamily";
import type { StoredProject } from "@/lib/projectStorage";
import type { ChatMessage } from "@/types/chat";
import type { Brief } from "@/types/intake";
import type { Page, SectionType } from "@/types/page";

/**
 * Generates a dedupe key for one user intent.
 *
 * A UUID per intent, not a hash of the content: the auth layer replays a
 * request after refreshing an expired token, and two genuinely different
 * intents that happen to look alike must not collide into one stored result.
 */
export function newIntentKey(): string {
  return crypto.randomUUID();
}

/**
 * Server-side project storage.
 *
 * The server owns the document now. The client sends intents — "build this
 * brief", "apply this instruction" — and receives the authoritative page plus
 * the version number it was stored as.
 */

export type ServerProject = {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  pageFamily: PageFamily;
  currentVersion: number;
  currentVersionId: string | null;
  thumbnailAssetId: string | null;
  phase: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
  brief?: Brief | null;
  direction?: unknown;
  enrichedChatText?: string;
};

export type ServerMessage = {
  id: string;
  seq: number;
  role: "user" | "assistant" | "agent";
  content: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

/**
 * Lists the signed-in user's projects, newest activity first.
 */
export async function listServerProjects(): Promise<ServerProject[]> {
  const data = await apiRequest<{ projects: ServerProject[] }>(
    "/api/projects?limit=50",
  );
  return data.projects;
}

/**
 * Creates an empty project.
 */
export async function createServerProject(args: {
  name?: string;
  pageFamily?: PageFamily;
}): Promise<ServerProject> {
  const data = await apiRequest<{ project: ServerProject }>("/api/projects", {
    method: "POST",
    body: args,
  });
  return data.project;
}

export type ServerProjectDetail = {
  project: ServerProject;
  page?: Page;
  version?: number;
};

/**
 * Loads a project with its current page.
 */
export async function loadServerProject(
  id: string,
): Promise<ServerProjectDetail> {
  return apiRequest<ServerProjectDetail>(`/api/projects/${id}?include=page`);
}

/**
 * Loads a project's chat history.
 */
export async function loadServerMessages(
  id: string,
): Promise<ServerMessage[]> {
  const data = await apiRequest<{ messages: ServerMessage[] }>(
    `/api/projects/${id}/messages`,
  );
  return data.messages;
}

/**
 * Appends chat messages.
 *
 * Only the fields the server stores are sent; ids and timestamps are assigned
 * there, so a replayed request cannot create a second copy with a new id.
 */
export async function saveServerMessages(
  id: string,
  messages: ChatMessage[],
): Promise<void> {
  if (messages.length === 0) return;

  await apiRequest(`/api/projects/${id}/messages`, {
    method: "POST",
    body: {
      messages: messages.slice(-50).map((message) => {
        const { id: _id, role, content, timestamp: _ts, ...payload } = message;
        return {
          role: role === "agent" ? "agent" : role,
          content,
          payload: Object.keys(payload).length > 0 ? payload : undefined,
        };
      }),
    },
  });
}

export type BuildResult = {
  page: Page;
  brief: Brief;
  direction?: unknown;
  version: number;
  project: ServerProject;
  meta: Record<string, unknown>;
};

/**
 * Builds a page and stores it as a version, server-side.
 */
export async function buildServerProject(args: {
  projectId: string;
  chatText: string;
  brief?: Brief | null;
  family?: PageFamily | null;
  useFixture: boolean;
  idempotencyKey: string;
}): Promise<BuildResult> {
  const query = args.useFixture ? "?fixture=1" : "";

  return apiRequest<BuildResult>(
    `/api/projects/${args.projectId}/build${query}`,
    {
      method: "POST",
      body: {
        confirmed: true,
        chatText: args.chatText,
        brief: args.brief ?? undefined,
        family: args.family ?? undefined,
      },
      idempotencyKey: args.idempotencyKey,
    },
  );
}

export type EditResult = {
  page: Page;
  brief?: Brief;
  family?: PageFamily;
  direction?: unknown;
  applied: unknown[];
  summary: string;
  version: number;
  project?: ServerProject;
  needsConfirmation?: boolean;
  question?: string;
  candidates?: SectionType[];
};

/**
 * Applies an edit to the stored document.
 *
 * `expectedVersion` is what makes two tabs safe: the server rejects a stale
 * edit before spending tokens on it, rather than silently overwriting whatever
 * the other tab just saved.
 */
export async function editServerProject(args: {
  projectId: string;
  instruction?: string;
  ops?: Array<Record<string, unknown>>;
  targetSection?: SectionType | string | null;
  targetField?: string;
  expectedVersion: number;
  useFixture: boolean;
  /** Dedupe key for this intent. Required: an edit runs a billed LLM call. */
  idempotencyKey: string;
}): Promise<EditResult> {
  const query = args.useFixture ? "?fixture=1" : "";

  return apiRequest<EditResult>(
    `/api/projects/${args.projectId}/edit${query}`,
    {
      method: "POST",
      body: {
        instruction: args.instruction,
        ops: args.ops,
        targetSection: args.targetSection ?? undefined,
        targetField: args.targetField,
        expectedVersion: args.expectedVersion,
      },
      idempotencyKey: args.idempotencyKey,
    },
  );
}

/**
 * Saves a page the client already holds.
 *
 * Used by direct manipulation (the preview inspector) where there is no
 * instruction to re-run — the page itself is the intent.
 */
export async function saveServerVersion(args: {
  projectId: string;
  page: Page;
  brief?: Brief | null;
  direction?: unknown;
  pageFamily: PageFamily;
  summary?: string;
  expectedVersion: number;
  /** Dedupe key for this intent. */
  idempotencyKey: string;
}): Promise<{ version: number; project: ServerProject }> {
  return apiRequest(`/api/projects/${args.projectId}/versions`, {
    method: "POST",
    idempotencyKey: args.idempotencyKey,
    body: {
      page: args.page,
      brief: args.brief ?? undefined,
      direction: args.direction,
      pageFamily: args.pageFamily,
      summary: args.summary,
      expectedVersion: args.expectedVersion,
    },
  });
}

/**
 * Reverts to an earlier version, appending it as a new one.
 */
export async function revertServerProject(args: {
  projectId: string;
  toVersion: number;
  expectedVersion: number;
  /** Dedupe key for this intent. */
  idempotencyKey: string;
}): Promise<{ version: number; project: ServerProject }> {
  return apiRequest(`/api/projects/${args.projectId}/revert`, {
    method: "POST",
    idempotencyKey: args.idempotencyKey,
    body: { toVersion: args.toVersion, expectedVersion: args.expectedVersion },
  });
}

export async function deleteServerProject(id: string): Promise<void> {
  await apiRequest(`/api/projects/${id}`, { method: "DELETE" });
}

export type ImportResult = {
  imported: number;
  skipped: number;
  failed: number;
  results: Array<{
    localId: string;
    status: "imported" | "skipped" | "failed";
    projectId?: string;
    versions?: number;
    reason?: string;
  }>;
};

/**
 * Hands this browser's locally-stored projects to the server.
 */
export async function importLocalProjects(
  projects: StoredProject[],
): Promise<ImportResult> {
  return apiRequest<ImportResult>("/api/projects/import", {
    method: "POST",
    body: { projects },
    // Stable per browser, so signing in twice does not run two imports.
    idempotencyKey: `import-${projects.length}-${projects[0]?.id ?? "none"}`,
  });
}
