import { describe, expect, it } from "vitest";
import {
  buildIntakeClarificationActions,
  isLocationIntakeRound,
} from "./intakeClarificationActions";
import { buildIntakeClarificationUi } from "./intakeClarificationUi";

describe("isLocationIntakeRound", () => {
  it("is true only when address is the sole asked gap", () => {
    expect(isLocationIntakeRound(["address"])).toBe(true);
    expect(isLocationIntakeRound(["email", "address", "hours"])).toBe(false);
    expect(isLocationIntakeRound(["email"])).toBe(false);
    expect(isLocationIntakeRound([])).toBe(false);
  });
});

describe("buildIntakeClarificationActions", () => {
  it("shows Select location only on a dedicated location turn", () => {
    const location = buildIntakeClarificationActions({
      canSkip: true,
      gaps: ["address"],
    });
    expect(location?.map((action) => action.label)).toEqual([
      "Select location",
      "Skip for now",
    ]);

    const emailRound = buildIntakeClarificationActions({
      canSkip: false,
      gaps: ["email"],
    });
    expect(emailRound).toBeUndefined();

    const leftoverAddress = buildIntakeClarificationActions({
      canSkip: false,
      gaps: ["email", "address", "hours"],
    });
    expect(leftoverAddress).toBeUndefined();
  });
});

describe("buildIntakeClarificationUi", () => {
  it("auto-opens the picker only on a dedicated location turn", () => {
    const location = buildIntakeClarificationUi({
      questions: ["Where are you located? Tap Select location on the map."],
      round: 2,
      canSkip: true,
      gaps: ["address"],
      addressPrefill: "",
    });
    expect(location.locationOnly).toBe(true);
    expect(location.locationPicker.open).toBe(true);
    expect(location.content).toContain("only the pin");

    const email = buildIntakeClarificationUi({
      questions: ["What is the contact email for enquiries?"],
      round: 1,
      canSkip: false,
      gaps: ["email"],
      addressPrefill: "",
    });
    expect(email.locationOnly).toBe(false);
    expect(email.locationPicker.open).toBe(false);
    expect(email.actions).toBeUndefined();
  });
});
