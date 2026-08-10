import type { PageFamily } from "@/lib/pageFamily";

export type MenuItem = {
  name: string;
  price: number;
  description: string | null;
};

export type Brief = {
  businessName: string;
  category: string;
  phone: string | null;
  address: string | null;
  menuItems: MenuItem[];
  photos: string[];
};

export type IntakeResponse =
  | {
      ok: true;
      status: "needs_clarification";
      questions: string[];
      partialBrief: Brief;
      clarificationRound: number;
      enrichedChatText: string;
      pageFamily: PageFamily;
      canSkip?: boolean;
      gaps?: string[];
    }
  | {
      ok: true;
      status: "ready";
      brief: Brief;
      clarificationRound: number;
      enrichedChatText: string;
      pageFamily: PageFamily;
    }
  | {
      ok: true;
      status: "unsupported";
      message: string;
      clarificationRound: number;
      enrichedChatText: string;
    }
  | {
      ok: false;
      error: string;
    };

export type PipelineStageStatus = "pending" | "running" | "done" | "error";

export type PipelineStage = {
  name: string;
  status: PipelineStageStatus;
  ms?: number;
  /** Optional richer SSE status line from the pipeline. */
  message?: string;
  /** Optional agents-collaborating detail from the pipeline. */
  detail?: string;
};

export type FlowStep =
  | "intake"
  | "clarification"
  | "confirm"
  | "building"
  | "preview";
