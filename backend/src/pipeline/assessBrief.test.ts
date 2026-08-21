import { describe, expect, it } from "vitest";
import { FIXTURE_BRIEF } from "../data/fixtureBrief.js";
import type { Brief } from "../schemas/brief.schema.js";
import { coerceBriefInput } from "../schemas/brief.schema.js";
import {
  assessBrief,
  buildFallbackQuestions,
  sanitizeClarificationQuestions,
} from "./assessBrief.js";
import {
  applyIntakeRoundCap,
  briefNeedsClarification,
  detectBriefGaps,
  enrichVagueCategory,
  evaluateBriefReadiness,
  isGenericBusinessName,
  isVagueCategory,
  selectGapsForRound,
} from "./briefGaps.js";
import { mergeClarificationAnswers } from "./mergeClarifications.js";

/**
 * Minimal Wave 2 field defaults for inline brief objects used in tests.
 * Spread before custom fields to satisfy the full Brief type.
 */
const W2: Pick<
  Brief,
  | "usp"
  | "story"
  | "foundedYear"
  | "signatureDishes"
  | "audience"
  | "priceBand"
  | "vibe"
  | "hours"
  | "neighbourhood"
  | "awards"
  | "testimonials"
  | "team"
  | "dietary"
  | "socials"
  | "email"
> = {
  usp: null,
  story: null,
  foundedYear: null,
  signatureDishes: [],
  audience: null,
  priceBand: null,
  vibe: [],
  hours: [],
  neighbourhood: null,
  awards: [],
  testimonials: [],
  team: [],
  dietary: [],
  socials: null,
  email: null,
};

describe("detectBriefGaps", () => {
  it("flags vague restaurant dump with missing details", () => {
    const gaps = detectBriefGaps({
      ...W2,
      businessName: "Restaurant",
      category: "restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
      brandColors: null,
    });

    expect(gaps).toContain("businessName");
    expect(gaps).toContain("category");
    expect(gaps).toContain("menuItems");
    expect(gaps).toContain("phone");
    expect(gaps).toContain("address");
    expect(gaps).toContain("email");
    expect(gaps).toContain("brandColors");
  });

  it("returns no gaps for a complete brief", () => {
    const gaps = detectBriefGaps({
      ...FIXTURE_BRIEF,
      brandColors: ["#c9a962", "cream"],
    });
    expect(gaps).toHaveLength(0);
  });

  it("treats missing brand colors as an optional soft gap", () => {
    expect(detectBriefGaps(FIXTURE_BRIEF)).toEqual(["brandColors"]);
  });

  it("gap ranking: email and address appear before usp", () => {
    const gaps = detectBriefGaps({
      ...W2,
      businessName: "Spice House",
      category: "Indian restaurant",
      phone: null,
      address: null,
      menuItems: [{ name: "Butter Chicken", price: 380, description: null }],
      photos: [],
      brandColors: null,
    });
    const emailIndex = gaps.indexOf("email");
    const addressIndex = gaps.indexOf("address");
    const uspIndex = gaps.indexOf("usp");
    expect(emailIndex).toBeGreaterThanOrEqual(0);
    expect(addressIndex).toBeGreaterThanOrEqual(0);
    expect(uspIndex).toBeGreaterThanOrEqual(0);
    expect(emailIndex).toBeLessThan(uspIndex);
    expect(addressIndex).toBeLessThan(uspIndex);
  });

  it("ranks menu items with hours, before USP", () => {
    const gaps = detectBriefGaps({
      ...W2,
      businessName: "Spice House",
      category: "Indian restaurant",
      phone: null,
      address: "Jaipur",
      menuItems: [],
      photos: [],
      brandColors: null,
      email: "host@spicehouse.in",
    });
    expect(gaps.indexOf("hours")).toBeGreaterThanOrEqual(0);
    expect(gaps.indexOf("menuItems")).toBeGreaterThanOrEqual(0);
    expect(gaps.indexOf("menuItems")).toBeLessThan(gaps.indexOf("usp"));
    expect(gaps.indexOf("hours")).toBeLessThan(gaps.indexOf("usp"));
  });
});

describe("coerceBriefInput", () => {
  it("defaults missing Wave 2 array fields to []", () => {
    const result = coerceBriefInput({
      businessName: "Old Cafe",
      category: "cafe",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
      brandColors: null,
    }) as Brief;

    expect(result.signatureDishes).toEqual([]);
    expect(result.vibe).toEqual([]);
    expect(result.hours).toEqual([]);
    expect(result.awards).toEqual([]);
    expect(result.testimonials).toEqual([]);
    expect(result.team).toEqual([]);
    expect(result.dietary).toEqual([]);
  });

  it("defaults missing Wave 2 nullable scalars to null", () => {
    const result = coerceBriefInput({
      businessName: "Old Cafe",
      category: "cafe",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
      brandColors: null,
    }) as Brief;

    expect(result.usp).toBeNull();
    expect(result.story).toBeNull();
    expect(result.foundedYear).toBeNull();
    expect(result.audience).toBeNull();
    expect(result.priceBand).toBeNull();
    expect(result.neighbourhood).toBeNull();
    expect(result.socials).toBeNull();
  });
});

describe("isGenericBusinessName", () => {
  it("treats placeholder names as generic", () => {
    expect(isGenericBusinessName("Restaurant")).toBe(true);
    expect(isGenericBusinessName("Nonna Rosa Trattoria")).toBe(false);
  });
});

describe("enrichVagueCategory", () => {
  it("keeps specific categories", () => {
    expect(enrichVagueCategory("Italian restaurant", "hello")).toBe(
      "Italian restaurant",
    );
  });

  it("rescues vague cafe when chat mentions cuisine", () => {
    expect(isVagueCategory("cafe")).toBe(true);
    expect(enrichVagueCategory("cafe", "We serve Italian pasta and espresso")).toBe(
      "Italian cafe",
    );
  });
});

describe("briefNeedsClarification", () => {
  it("requires clarification when optional detail fields are missing", () => {
    const gaps = detectBriefGaps({
      ...W2,
      businessName: "Luigi's",
      category: "Italian restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
      brandColors: null,
    });
    expect(briefNeedsClarification(gaps)).toBe(true);
  });

  it("still needs clarification when only menu is missing", () => {
    const gaps = detectBriefGaps({
      ...W2,
      businessName: "Luigi's",
      category: "Italian restaurant",
      phone: "(555) 111-2222",
      address: "1 Main St",
      menuItems: [],
      photos: [],
      brandColors: null,
    });
    expect(briefNeedsClarification(gaps)).toBe(true);
  });
});

describe("evaluateBriefReadiness", () => {
  it("keeps asking for critical fields even without skip", () => {
    const vagueBrief: Brief = {
      ...W2,
      businessName: "Restaurant",
      category: "restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
      brandColors: null,
    };

    const result = evaluateBriefReadiness(vagueBrief, { skipConfirmed: true });
    expect(result.status).toBe("needs_clarification");
    if (result.status === "needs_clarification") {
      expect(result.canSkip).toBe(false);
      expect(result.gaps).toContain("businessName");
    }
  });

  it("blocks skip when restaurant email is missing", () => {
    const partial: Brief = {
      ...W2,
      businessName: "Luigi's",
      category: "Italian restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
      brandColors: null,
    };

    const skipped = evaluateBriefReadiness(partial, { skipConfirmed: true });
    expect(skipped.status).toBe("needs_clarification");
    if (skipped.status === "needs_clarification") {
      expect(skipped.canSkip).toBe(false);
      expect(skipped.gaps).toContain("email");
    }
  });

  it("allows skip for optional fields after name, cuisine, and email exist", () => {
    const partial: Brief = {
      ...W2,
      businessName: "Luigi's",
      category: "Italian restaurant",
      email: "owner@luigis.com",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
      brandColors: null,
    };

    expect(evaluateBriefReadiness(partial).status).toBe("needs_clarification");
    expect(evaluateBriefReadiness(partial, { skipConfirmed: true })).toEqual({
      status: "ready",
    });
  });

  it("returns needs_clarification for vague input", () => {
    const vagueBrief: Brief = {
      ...W2,
      businessName: "Restaurant",
      category: "restaurant",
      phone: null,
      address: null,
      menuItems: [],
      photos: [],
      brandColors: null,
    };

    const result = evaluateBriefReadiness(vagueBrief);
    expect(result.status).toBe("needs_clarification");
    if (result.status === "needs_clarification") {
      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.canSkip).toBe(false);
    }
  });
});

describe("applyIntakeRoundCap", () => {
  const p0Ok = {
    nameOk: true,
    categoryOk: true,
    emailOk: true,
    addressMissing: true,
  };

  it("does not auto-skip a missing map pin at the round cap", () => {
    const capped = applyIntakeRoundCap(
      {
        status: "needs_clarification",
        gaps: ["address", "hours", "usp"],
        canSkip: true,
      },
      3,
      p0Ok,
    );
    expect(capped).toEqual({
      status: "needs_clarification",
      gaps: ["address"],
      canSkip: true,
    });
  });

  it("still auto-skips hours/USP once the pin is known", () => {
    const capped = applyIntakeRoundCap(
      {
        status: "needs_clarification",
        gaps: ["hours", "usp", "audience"],
        canSkip: true,
      },
      3,
      { ...p0Ok, addressMissing: false },
    );
    expect(capped).toEqual({ status: "ready" });
  });

  it("does not auto-skip a missing menu at the round cap", () => {
    const capped = applyIntakeRoundCap(
      {
        status: "needs_clarification",
        gaps: ["menuItems", "usp", "audience"],
        canSkip: true,
      },
      3,
      { ...p0Ok, addressMissing: false },
    );
    expect(capped).toEqual({
      status: "needs_clarification",
      gaps: ["menuItems"],
      canSkip: true,
    });
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

  it("uses the map-pin copy for a solo address gap", () => {
    const questions = buildFallbackQuestions(["address"]);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatch(/select location/i);
  });
});

describe("selectGapsForRound", () => {
  it("asks email before a dedicated location turn", () => {
    expect(
      selectGapsForRound(["email", "address", "hours", "usp"]),
    ).toEqual(["email"]);
  });

  it("asks only address when location is next (never with hours)", () => {
    expect(selectGapsForRound(["address", "hours", "usp"])).toEqual([
      "address",
    ]);
  });

  it("asks location next even if name/cuisine are still missing", () => {
    expect(
      selectGapsForRound(["businessName", "category", "address", "hours"]),
    ).toEqual(["address"]);
  });

  it("batches hours and menu after the pin is known", () => {
    expect(
      selectGapsForRound(["hours", "menuItems", "usp", "signatureDishes"]),
    ).toEqual(["hours", "menuItems", "usp"]);
  });

  it("batches non-location gaps after the pin is known", () => {
    expect(selectGapsForRound(["hours", "usp", "audience", "story"])).toEqual([
      "hours",
      "usp",
      "audience",
    ]);
  });

  it("keeps critical name/cuisine/email together and defers the pin", () => {
    expect(
      selectGapsForRound([
        "businessName",
        "category",
        "email",
        "address",
        "hours",
      ]),
    ).toEqual(["businessName", "category", "email"]);
  });
});

describe("sanitizeClarificationQuestions", () => {
  it("collapses a location round to a single map question", () => {
    const questions = sanitizeClarificationQuestions(
      [
        "What is the contact email?",
        "Where are you located? Tap Select location on the map.",
        "What are your opening hours?",
      ],
      ["address"],
    );
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatch(/select location/i);
  });

  it("strips location questions from a non-location round", () => {
    const questions = sanitizeClarificationQuestions(
      [
        "What is the contact email for enquiries?",
        "What is the street address or nearest landmark (tap Select location)?",
        "What are your opening hours?",
      ],
      ["email", "hours"],
    );
    expect(questions).toEqual([
      "What is the contact email for enquiries?",
      "What are your opening hours?",
    ]);
  });

  it("fills dropped P0 questions so name/cuisine are not skipped", () => {
    const questions = sanitizeClarificationQuestions(
      ["What is the contact email for enquiries and reservations?"],
      ["businessName", "category", "email"],
    );
    expect(questions).toHaveLength(3);
    expect(questions[0]).toMatch(/business name/i);
    expect(questions[1]).toMatch(/cuisine|restaurant type/i);
    expect(questions[2]).toMatch(/email/i);
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
