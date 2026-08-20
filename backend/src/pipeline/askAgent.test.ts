import { describe, expect, it } from "vitest";
import {
  classifyIntentHeuristic,
  isClearEditHeuristic,
  isEmailInboxIntent,
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
