import { describe, expect, it } from "vitest";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import { assessBrief, buildFallbackQuestions } from "./assessBrief.js";
import {
  briefNeedsClarification,
  detectBriefGaps,
  evaluateBriefReadiness,
  isGenericBusinessName,
} from "./briefGaps.js";
import { mergeClarificationAnswers } from "./mergeClarifications.js";

describe("detectBriefGaps", () => {
  it("flags vague restaurant dump with missing details", () => {
    const gaps = detectBriefGaps({
      businessName: "Restaurant",
      category: "restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
    });

    expect(gaps).toContain("businessName");
    expect(gaps).toContain("category");
    expect(gaps).toContain("menuItems");
    expect(gaps).toContain("phone");
    expect(gaps).toContain("address");
  });

  it("returns no gaps for a complete brief", () => {
    const gaps = detectBriefGaps(FIXTURE_BRIEF);
    expect(gaps).toHaveLength(0);
  });
});

describe("isGenericBusinessName", () => {
  it("treats placeholder names as generic", () => {
    expect(isGenericBusinessName("Restaurant")).toBe(true);
    expect(isGenericBusinessName("Nonna Rosa Trattoria")).toBe(false);
  });
});

describe("briefNeedsClarification", () => {
  it("requires clarification when optional detail fields are missing", () => {
    const gaps = detectBriefGaps({
      businessName: "Luigi's",
      category: "Italian restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
    });
    expect(briefNeedsClarification(gaps)).toBe(true);
  });

  it("still needs clarification when only menu is missing", () => {
    const gaps = detectBriefGaps({
      businessName: "Luigi's",
      category: "Italian restaurant",
      phone: "(555) 111-2222",
      address: "1 Main St",
      menuItems: [],
      photos: [],
    });
    expect(briefNeedsClarification(gaps)).toBe(true);
  });
});

describe("evaluateBriefReadiness", () => {
  it("keeps asking for critical fields even without skip", () => {
    const vagueBrief = {
      businessName: "Restaurant",
      category: "restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
    };

    const result = evaluateBriefReadiness(vagueBrief, { skipConfirmed: true });
    expect(result.status).toBe("needs_clarification");
    if (result.status === "needs_clarification") {
      expect(result.canSkip).toBe(false);
      expect(result.gaps).toContain("businessName");
    }
  });

  it("allows skip only for optional fields after name/cuisine exist", () => {
    const partial = {
      businessName: "Luigi's",
      category: "Italian restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
    };

    expect(evaluateBriefReadiness(partial).status).toBe("needs_clarification");
    expect(evaluateBriefReadiness(partial, { skipConfirmed: true })).toEqual({
      status: "ready",
    });
  });

  it("returns needs_clarification for vague input", () => {
    const vagueBrief = {
      businessName: "Restaurant",
      category: "restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
    };

    const result = evaluateBriefReadiness(vagueBrief);
    expect(result.status).toBe("needs_clarification");
    if (result.status === "needs_clarification") {
      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.canSkip).toBe(false);
    }
  });
});

describe("mergeClarificationAnswers", () => {
  it("appends answers to the original chat dump", () => {
    const merged = mergeClarificationAnswers("I want a restaurant website", {
      "What is the business name?": "Nonna Rosa",
      "What is the phone number?": "(555) 234-8890",
    });

    expect(merged).toContain("I want a restaurant website");
    expect(merged).toContain("Nonna Rosa");
    expect(merged).toContain("(555) 234-8890");
  });
});

describe("buildFallbackQuestions", () => {
  it("generates at most three fallback questions", () => {
    const questions = buildFallbackQuestions([
      "businessName",
      "category",
      "menuItems",
      "phone",
      "address",
    ]);
    expect(questions.length).toBeLessThanOrEqual(3);
    expect(questions[0]).toMatch(/business name/i);
  });
});

describe("assessBrief fixture mode", () => {
  it("returns ready brief without clarification in fixture mode", async () => {
    const result = await assessBrief({
      chatText: "I want a restaurant website",
      useFixture: true,
    });

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.brief.businessName).toBe(FIXTURE_BRIEF.businessName);
      expect(result.pageFamily).toBe("premium");
    }
  });
});
