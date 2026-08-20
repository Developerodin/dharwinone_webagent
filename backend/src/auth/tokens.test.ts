import { beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { resetAuthEnvCache } from "../config/env.js";
import {
  mintResetTicket,
  signAccessToken,
  verifyAccessToken,
  verifyResetTicket,
} from "./tokens.js";
import { HttpError } from "../lib/httpError.js";

const ACCESS_SECRET = "test-access-secret-at-least-32-characters-long";
const RESET_SECRET = "test-reset-secret-that-is-different-and-long";

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
  process.env.JWT_RESET_SECRET = RESET_SECRET;
  process.env.DATABASE_URL = "postgresql://localhost:5432/test";
  resetAuthEnvCache();
});

const claims = {
  sub: "user_1",
  sid: "sess_1",
  email: "a@example.com",
  ev: true,
  ob: false,
};

describe("access tokens", () => {
  it("round-trips its claims", () => {
    const payload = verifyAccessToken(signAccessToken(claims));
    expect(payload.sub).toBe("user_1");
    expect(payload.sid).toBe("sess_1");
    expect(payload.ev).toBe(true);
    expect(payload.ob).toBe(false);
  });

  it("rejects a tampered payload", () => {
    const token = signAccessToken(claims);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...claims, sub: "user_2" }),
    ).toString("base64url");

    expect(() => verifyAccessToken(`${header}.${forged}.${signature}`)).toThrow(
      HttpError,
    );
  });

  it("rejects a token signed with the reset secret", () => {
    // Without separate secrets a reset ticket could be replayed as a session.
    const foreign = jwt.sign(claims, RESET_SECRET, {
      algorithm: "HS256",
      issuer: "prowplus",
      audience: "prowplus-web",
      expiresIn: 900,
    });
    expect(() => verifyAccessToken(foreign)).toThrow(HttpError);
  });

  it("rejects the alg=none downgrade", () => {
    const header = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
    ).toString("base64url");
    const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
    expect(() => verifyAccessToken(`${header}.${body}.`)).toThrow(HttpError);
  });

  it("rejects a token minted for another audience", () => {
    const foreign = jwt.sign(claims, ACCESS_SECRET, {
      algorithm: "HS256",
      issuer: "prowplus",
      audience: "someone-else",
      expiresIn: 900,
    });
    expect(() => verifyAccessToken(foreign)).toThrow(HttpError);
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign(claims, ACCESS_SECRET, {
      algorithm: "HS256",
      issuer: "prowplus",
      audience: "prowplus-web",
      expiresIn: -10,
    });
    expect(() => verifyAccessToken(expired)).toThrow(HttpError);
  });

  it("reports SESSION_EXPIRED rather than leaking the reason", () => {
    try {
      verifyAccessToken("not.a.token");
      expect.unreachable();
    } catch (error) {
      expect((error as HttpError).code).toBe("SESSION_EXPIRED");
    }
  });
});

describe("reset tickets", () => {
  it("round-trips and carries a unique jti", () => {
    const a = mintResetTicket("user_1");
    const b = mintResetTicket("user_1");
    expect(a.jti).not.toBe(b.jti);
    expect(verifyResetTicket(a.ticket).sub).toBe("user_1");
    expect(verifyResetTicket(a.ticket).jti).toBe(a.jti);
  });

  it("rejects an access token presented as a reset ticket", () => {
    expect(() => verifyResetTicket(signAccessToken(claims))).toThrow(HttpError);
  });

  it("rejects a ticket with the wrong purpose", () => {
    const wrong = jwt.sign(
      { sub: "user_1", jti: "x", purpose: "something-else" },
      RESET_SECRET,
      { algorithm: "HS256", issuer: "prowplus", audience: "prowplus-web", expiresIn: 600 },
    );
    expect(() => verifyResetTicket(wrong)).toThrow(HttpError);
  });

  it("expires within ten minutes", () => {
    const { expiresAt } = mintResetTicket("user_1");
    const minutes = (expiresAt.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(9);
    expect(minutes).toBeLessThanOrEqual(10);
  });
});
