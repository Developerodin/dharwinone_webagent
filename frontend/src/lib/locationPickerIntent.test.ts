import { describe, expect, it } from "vitest";
import { parseLocationPickerIntent } from "./locationPickerIntent";

describe("parseLocationPickerIntent", () => {
  it("does not treat contact email updates as a map pin", () => {
    expect(
      parseLocationPickerIntent(
        "i need to add email address akshay96102@gmail.com",
      ),
    ).toBeNull();
    expect(
      parseLocationPickerIntent(
        "i need to update the email address for contct us section",
      ),
    ).toBeNull();
    expect(
      parseLocationPickerIntent(
        "need to update email address akshay96102@gmail.com add this emaisl for cocntect us",
      ),
    ).toBeNull();
  });

  it("still matches real location updates including typos", () => {
    expect(parseLocationPickerIntent("i want to update the location")).not.toBeNull();
    expect(parseLocationPickerIntent("i want to udpate the location")).not.toBeNull();
    expect(
      parseLocationPickerIntent("change the location to Gopalpura Mode"),
    ).toEqual({ prefill: "Gopalpura Mode" });
  });
});
