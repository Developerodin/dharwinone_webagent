import type { PipelineStage } from "@/types/intake";
import type { Page } from "@/types/page";

/**
 * Parses SSE frames from a streaming build response.
 */
export async function consumeBuildStream(
  response: Response,
  onStage: (stage: PipelineStage) => void,
): Promise<{
  page: Page;
  meta: Record<string, unknown>;
  direction?: unknown;
  /** Version the server stored this build as; drives later expectedVersion. */
  version?: number;
}> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming body unavailable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: {
    page: Page;
    meta: Record<string, unknown>;
    direction?: unknown;
    version?: number;
  } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame
        .split("\n")
        .find((entry) => entry.startsWith("data: "));
      if (!line) continue;

      const payload = JSON.parse(line.slice(6)) as {
        type?: string;
        stage?: PipelineStage;
        page?: Page;
        meta?: Record<string, unknown>;
        direction?: unknown;
        version?: number;
        error?: string;
      };

      if (payload.type === "stage" && payload.stage) {
        onStage(payload.stage);
      }

      if (payload.type === "complete" && payload.page) {
        finalPayload = {
          page: payload.page,
          meta: payload.meta ?? {},
          direction: payload.direction,
          version: payload.version,
        };
      }

      if (payload.type === "error") {
        throw new Error(payload.error ?? "Build stream failed");
      }
    }
  }

  if (!finalPayload) {
    throw new Error("Build stream ended without a result");
  }

  return finalPayload;
}
