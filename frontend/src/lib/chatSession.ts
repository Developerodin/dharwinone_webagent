import { createWelcomeMessage } from "@/lib/chatFormatters";
import { syncPreviewPayload } from "@/lib/projectPersist";
import {
  clearActiveProjectId,
  loadProject,
  setActiveProjectId,
  type HistoryEntry,
  type StoredProject,
} from "@/lib/projectStorage";
import type { ChatMessage, ChatPhase } from "@/types/chat";
import type { Brief } from "@/types/intake";
import type { Page } from "@/types/page";
import type { PageFamily } from "@/lib/pageFamily";

export type ChatSessionSnapshot = {
  messages: ChatMessage[];
  phase: ChatPhase;
  brief: Brief | null;
  page: Page | null;
  pageFamily: PageFamily | null;
  enrichedChatText: string;
  projectId: string | null;
  direction?: unknown;
  history?: HistoryEntry[];
};

/**
 * Builds a fresh empty chat session and clears the active project pointer.
 */
export function createEmptyChatSession(): ChatSessionSnapshot {
  clearActiveProjectId();
  return {
    messages: [createWelcomeMessage()],
    phase: "idle",
    brief: null,
    page: null,
    pageFamily: null,
    enrichedChatText: "",
    projectId: null,
    direction: null,
    history: [],
  };
}

/**
 * Loads a stored project into a session snapshot; returns null if missing.
 */
export function loadChatSession(id: string): ChatSessionSnapshot | null {
  const project: StoredProject | null = loadProject(id);
  if (!project) return null;

  setActiveProjectId(project.id);

  let phase: ChatPhase = project.phase;
  if (project.page) {
    syncPreviewPayload({
      page: project.page,
      family: project.pageFamily,
      businessName: project.businessName,
      projectId: project.id,
    });
    if (project.phase === "complete") {
      phase = "editing";
    }
  }

  return {
    messages: project.messages,
    phase,
    brief: project.brief,
    page: project.page,
    pageFamily: project.pageFamily,
    enrichedChatText: project.enrichedChatText,
    projectId: project.id,
    direction: project.direction,
    history: project.history ?? [],
  };
}
