import { describe, expect, it } from "vitest";
import { getModelFor } from "./openai.js";

describe("getModelFor", () => {
  it("uses creative model for direction and copy", () => {
    const prevCreative = process.env.OPENAI_MODEL_CREATIVE;
    const prevFast = process.env.OPENAI_MODEL_FAST;
    process.env.OPENAI_MODEL_CREATIVE = "gpt-4o-test";
    process.env.OPENAI_MODEL_FAST = "gpt-4o-mini-test";
    expect(getModelFor("direct")).toBe("gpt-4o-test");
    expect(getModelFor("copy")).toBe("gpt-4o-test");
    expect(getModelFor("extract")).toBe("gpt-4o-mini-test");
    expect(getModelFor("editops")).toBe("gpt-4o-mini-test");
    expect(getModelFor("questions")).toBe("gpt-4o-mini-test");
    process.env.OPENAI_MODEL_CREATIVE = prevCreative;
    process.env.OPENAI_MODEL_FAST = prevFast;
  });
});
