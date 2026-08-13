import type { Brief } from "./intake";
import type { PageFamily } from "@/lib/pageFamily";

export type ChatMessageRole = "user" | "assistant" | "agent";

export type ChatAction = {
  label: string;
  action: "build" | "reset" | "preview" | "skip" | "apply_edit" | "dismiss_edit";
  variant?: "primary" | "outline";
};

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  brief?: Brief;
  pageFamily?: PageFamily;
  questions?: string[];
  actions?: ChatAction[];
  stageName?: string;
  stageStatus?: "pending" | "running" | "done" | "error";
  /** Human-readable thinking / status line for agent stages. */
  stageDetail?: string;
  stageMs?: number;
};

export type ChatPhase =
  | "idle"
  | "analyzing"
  | "clarifying"
  | "confirm"
  | "building"
  | "complete"
  | "editing";
