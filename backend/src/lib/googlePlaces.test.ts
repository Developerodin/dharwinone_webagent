import { describe, expect, it } from "vitest";
import {
  normalizePlaceId,
  placesErrorMessage,
  readSuggestionText,
} from "./googlePlaces.js";

describe("googlePlaces helpers", () => {
  it("strips the Places API (New) resource prefix", () => {
    expect(normalizePlaceId("places/ChIJ123")).toBe("ChIJ123");
    expect(normalizePlaceId("ChIJ123")).toBe("ChIJ123");
    expect(normalizePlaceId("  places/ChIJ123  ")).toBe("ChIJ123");
  });

  it("reads suggestion text from string or { text }", () => {
    expect(readSuggestionText("Jaipur, Rajasthan")).toBe("Jaipur, Rajasthan");
    expect(readSuggestionText({ text: " Cafe Copper " })).toBe("Cafe Copper");
    expect(readSuggestionText(null)).toBe("");
    expect(readSuggestionText({ text: 12 })).toBe("");
  });

  it("maps billing and permission errors for the UI", () => {
    expect(
      placesErrorMessage(
        { message: "You must enable Billing on the Google Cloud Project" },
        403,
      ),
    ).toMatch(/billing/i);
    expect(
      placesErrorMessage({ message: "PERMISSION_DENIED" }, 403),
    ).toMatch(/Places API \(New\)/);
    expect(placesErrorMessage({ message: "boom" }, 500)).toMatch(/Could not search/);
  });
});
