import { describe, expect, it } from "vitest";
import { AUTH_BRAND_NAME, AUTH_LOGO_CID, authLogoPng } from "./emailBrand.js";
import { emailShell } from "./emailShell.js";
import { buildVerifyEmailContent } from "./emails.js";

describe("auth email brand", () => {
  it("names the product Dharwin, not ProwPlus", () => {
    const mail = buildVerifyEmailContent("123456", 10);
    expect(AUTH_BRAND_NAME).toBe("Dharwin");
    expect(mail.subject).toContain("Dharwin");
    expect(mail.subject).not.toMatch(/ProwPlus/i);
    expect(mail.text).toContain("Dharwin");
    expect(mail.text).not.toMatch(/ProwPlus/i);
    expect(mail.html).toContain("Dharwin");
    expect(mail.html).not.toMatch(/ProwPlus/i);
  });

  it("uses the dark builder palette and CID logo", () => {
    const html = emailShell("Confirm your email address", "<p>body</p>");
    expect(html).toContain("#0c0c0e");
    expect(html).toContain("#141416");
    expect(html).toContain(`cid:${AUTH_LOGO_CID}`);
    expect(html).toContain('alt="Dharwin"');
  });

  it("rasterizes the Dharwin mark to a PNG", async () => {
    const png = await authLogoPng();
    expect(png.subarray(0, 8).toString("ascii")).toContain("PNG");
  });
});
