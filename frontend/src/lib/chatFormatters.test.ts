import { describe, expect, it } from "vitest";
import { formatClarificationMessage } from "./chatFormatters";

describe("formatClarificationMessage", () => {
  it("lists mixed text questions as a numbered ask", () => {
    const message = formatClarificationMessage(
      [
        "What is the contact email for enquiries and reservations?",
        "What are your opening hours?",
      ],
      1,
    );
    expect(message).toContain("ask #1");
    expect(message).toContain("1. What is the contact email");
    expect(message).toContain("2. What are your opening hours?");
    expect(message).not.toContain("only the pin");
  });

  it("formats a location-only turn without mixing other questions", () => {
    const message = formatClarificationMessage(
      [
        "Where are you located? Tap Select location on the map, or type the street address.",
      ],
      2,
      true,
      { locationOnly: true },
    );
    expect(message).toContain("restaurant location (ask #2)");
    expect(message).toContain("only the pin");
    expect(message).not.toMatch(/^1\./m);
    expect(message).not.toContain("opening hours");
  });
});
