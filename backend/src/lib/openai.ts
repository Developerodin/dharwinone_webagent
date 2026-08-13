import OpenAI from "openai";

const DEFAULT_FAST = "gpt-4o-mini";
const DEFAULT_CREATIVE = "gpt-4o";

export type OpenAIJob =
  | "extract"
  | "direct"
  | "copy"
  | "editops"
  | "questions";

/**
 * Returns a configured OpenAI client or throws if the API key is missing.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in backend/.env");
  }
  return new OpenAI({ apiKey });
}

/**
 * Resolves the OpenAI model name from env with a sensible default.
 */
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL ?? DEFAULT_FAST;
}

/**
 * Picks a model by job — creative direction/copy use a stronger model.
 */
export function getModelFor(job: OpenAIJob): string {
  switch (job) {
    case "direct":
    case "copy":
      return (
        process.env.OPENAI_MODEL_CREATIVE ??
        process.env.OPENAI_MODEL ??
        DEFAULT_CREATIVE
      );
    default:
      return (
        process.env.OPENAI_MODEL_FAST ??
        process.env.OPENAI_MODEL ??
        DEFAULT_FAST
      );
  }
}
