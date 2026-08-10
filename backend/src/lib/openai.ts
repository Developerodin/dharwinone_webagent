import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-4o-mini";

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
  return process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
}
