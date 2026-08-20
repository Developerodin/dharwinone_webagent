import { parsePageFamily, type PageFamily } from "./pageFamily";
import type { Brief } from "@/types/intake";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { Page } from "@/types/page";

/**
 * Local project cache.
 *
 * The server owns projects now; this is a read-through cache that makes the
 * dashboard render instantly and keeps a project openable when the network is
 * down. Anything written here is expected to already be saved server-side.
 */
const PROJECTS_KEY = "prowplus-projects";
const ACTIVE_PROJECT_KEY = "prowplus-active-project";

/** Maximum edit history entries retained per project. */
const MAX_HISTORY = 20;

/** A single undo-able page snapshot stored with each edit. */
export type HistoryEntry = {
  page: unknown;
  brief: unknown;
  family: string;
  direction?: unknown;
  summary: string;
  at: number;
};

export type StoredProject = {
  id: string;
  businessName: string;
  pageFamily: PageFamily;
  messages: ChatMessage[];
  phase: ChatPhase;
  brief: Brief | null;
  page: Page | null;
  enrichedChatText: string;
  createdAt: number;
  updatedAt: number;
  /** Creative direction from build/edit pipeline. */
  direction?: unknown;
  /** Undo history — newest last, capped at MAX_HISTORY entries. */
  history?: HistoryEntry[];
  /**
   * Version this cached copy corresponds to on the server.
   *
   * Sent as `expectedVersion` on the next edit, which is what lets the server
   * reject a stale write from another tab instead of silently overwriting it.
   */
  serverVersion?: number;
};

/**
 * Creates a unique project id.
 */
export function createProjectId(): string {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Loads all stored projects, newest first.
 */
export function listProjects(): StoredProject[] {
  const raw = localStorage.getItem(PROJECTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeProject(item))
      .filter((item): item is StoredProject => item !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/**
 * Loads a single project by id.
 */
export function loadProject(id: string): StoredProject | null {
  return listProjects().find((project) => project.id === id) ?? null;
}

/**
 * Upserts a project into localStorage.
 */
export function saveProject(project: StoredProject): void {
  const projects = listProjects().filter((item) => item.id !== project.id);
  projects.unshift({ ...project, updatedAt: Date.now() });
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, 30)));
  localStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
}

/**
 * Replaces the entire cache with the server's view.
 *
 * Used after a sync: the server is authoritative, so anything cached that it
 * does not know about was either deleted elsewhere or already imported.
 */
export function replaceProjects(projects: StoredProject[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.slice(0, 50)));
}

/**
 * Deletes a project by id.
 */
export function deleteProject(id: string): void {
  const projects = listProjects().filter((project) => project.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  if (localStorage.getItem(ACTIVE_PROJECT_KEY) === id) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

/**
 * Returns the last active project id, if any.
 */
export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

/**
 * Marks a project as the active one.
 */
export function setActiveProjectId(id: string): void {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

/**
 * Clears the last-active project pointer (used when starting a fresh session).
 */
export function clearActiveProjectId(): void {
  localStorage.removeItem(ACTIVE_PROJECT_KEY);
}

/**
 * Caps a history array to MAX_HISTORY, keeping the most recent entries.
 */
export function capHistory(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.length <= MAX_HISTORY ? entries : entries.slice(-MAX_HISTORY);
}

/**
 * Validates and normalizes a raw project payload from storage.
 */
function normalizeProject(raw: unknown): StoredProject | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<StoredProject>;
  if (typeof value.id !== "string" || typeof value.businessName !== "string") {
    return null;
  }

  const pageFamily = parsePageFamily(value.pageFamily) ?? "premium";
  if (!Array.isArray(value.messages)) return null;

  const history = Array.isArray(value.history)
    ? capHistory(value.history as HistoryEntry[])
    : undefined;

  return {
    id: value.id,
    businessName: value.businessName,
    pageFamily,
    messages: value.messages as ChatMessage[],
    phase: (value.phase as ChatPhase) ?? "idle",
    brief: (value.brief as Brief | null) ?? null,
    page: (value.page as Page | null) ?? null,
    enrichedChatText:
      typeof value.enrichedChatText === "string" ? value.enrichedChatText : "",
    createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    direction: value.direction,
    history,
    serverVersion:
      typeof value.serverVersion === "number" ? value.serverVersion : undefined,
  };
}
