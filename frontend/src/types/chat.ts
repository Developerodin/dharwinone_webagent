import type { Brief } from "./intake";
import type { PageFamily } from "@/lib/pageFamily";

export type ChatMessageRole = "user" | "assistant" | "agent";

export type ChatAction = {
  label: string;
  action:
    | "build"
    | "reset"
    | "preview"
    | "skip"
    | "apply_edit"
    | "dismiss_edit"
    | "open_location_picker";
  variant?: "primary" | "outline";
  ariaLabel?: string;
};

export type ChatMessageKind = "message" | "roundup";

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
  /** Roundup card after a build; omitted for normal bubbles. */
  kind?: ChatMessageKind;
  /** Title shown on a roundup card. */
  roundupTitle?: string;
  /** Tap-to-send follow-up chips under the bubble or roundup. */
  suggestions?: string[];
};

export type ChatPhase =
  | "idle"
  | "analyzing"
  | "clarifying"
  | "confirm"
  | "building"
  | "complete"
  | "editing";
