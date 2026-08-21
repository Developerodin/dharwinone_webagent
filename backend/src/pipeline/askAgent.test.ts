import { describe, expect, it } from "vitest";
import {
  CANNED_BUILDER_HELP,
  classifyIntentHeuristic,
  isClearEditHeuristic,
  isEmailInboxIntent,
  isGeneralConversationHeuristic,
  shouldShortCircuitAsk,
  wantsLocationPicker,
} from "./askAgent.js";

describe("Ask location vs email intent", () => {
  it("treats contact email updates as edits, not a map picker", () => {
    const withInbox = "need to update email address akshay96102@gmail.com add this emaisl for cocntect us";
    expect(isEmailInboxIntent(withInbox)).toBe(true);
    expect(wantsLocationPicker(withInbox)).toBe(false);
    expect(isClearEditHeuristic(withInbox)).toBe(true);

    const result = classifyIntentHeuristic(withInbox);
    expect(result.intent).toBe("edit");
    expect(result.openLocationPicker).toBe(false);

    const contactUs = "i need to update the email address for contct us section";
    expect(isEmailInboxIntent(contactUs)).toBe(true);
    expect(classifyIntentHeuristic(contactUs).openLocationPicker).toBe(false);
  });

  it("opens the map picker for restaurant location, not email", () => {
    const location = "i want to update the location";
    expect(isEmailInboxIntent(location)).toBe(false);
    expect(wantsLocationPicker(location)).toBe(true);

    const result = classifyIntentHeuristic(location);
    expect(result.openLocationPicker).toBe(true);
    expect(result.intent).toBe("ask");
  });
});

describe("Ask general conversation", () => {
  it.each([
    "what is 2 + 3",
    "who is prime minister of indian",
    "hi",
  ])("does not treat %s as a clear edit or canned builder help", (text) => {
    expect(isClearEditHeuristic(text)).toBe(false);
    expect(isGeneralConversationHeuristic(text)).toBe(true);
    expect(shouldShortCircuitAsk(text)).toBe(false);
    expect(classifyIntentHeuristic(text).message).not.toContain(
      "I can help with colors",
    );
    expect(classifyIntentHeuristic(text).message).not.toBe(CANNED_BUILDER_HELP);
    expect(classifyIntentHeuristic(text).intent).toBe("ask");
  });

  it("still short-circuits clear visual edits", () => {
    expect(shouldShortCircuitAsk("make this button black and white")).toBe(
      true,
    );
  });
});
