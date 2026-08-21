import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetStorageConfigCache } from "./config.js";
import { presignUpload, resetStorageClient } from "./driver.js";

const ENV_KEYS = [
  "STORAGE_BUCKET",
  "STORAGE_REGION",
  "STORAGE_ENDPOINT",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "CDN_BASE_URL",
] as const;

const previous = new Map<string, string | undefined>();

/**
 * Stashes and restores process.env around each test so other suites are not
 * affected by the dummy S3 credentials this file injects.
 */
function stashEnv(): void {
  for (const key of ENV_KEYS) {
    previous.set(key, process.env[key]);
  }
}

/**
 * Puts dummy S3 credentials in env. getSignedUrl signs locally; it never
 * contacts AWS, so these values only need to be well-formed.
 */
function useDummyStorageEnv(): void {
  process.env.STORAGE_BUCKET = "vsc-files-storage";
  process.env.STORAGE_REGION = "ap-south-1";
  delete process.env.STORAGE_ENDPOINT;
  process.env.STORAGE_ACCESS_KEY_ID = "AKIATESTKEYID0000000";
  process.env.STORAGE_SECRET_ACCESS_KEY = "testsecretkeytestsecretkeytest12";
  process.env.CDN_BASE_URL = "https://cdn.example.com";
  resetStorageConfigCache();
  resetStorageClient();
}

/**
 * Restores the env keys captured by stashEnv.
 */
function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetStorageConfigCache();
  resetStorageClient();
}

describe("presignUpload", () => {
  beforeEach(() => {
    stashEnv();
    useDummyStorageEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it("does not bake an empty CRC32 checksum into the PUT URL", async () => {
    const { url, headers } = await presignUpload({
      storageKey: "users/abc/" + "a".repeat(64) + ".png",
      mime: "image/png",
      bytes: 1234,
      sha256: "a".repeat(64),
    });

    expect(url).not.toMatch(/x-amz-checksum/i);
    expect(url).not.toMatch(/x-amz-sdk-checksum-algorithm/i);
    expect(headers["Content-Type"]).toBe("image/png");
    expect(headers["x-amz-meta-sha256"]).toBe("a".repeat(64));
  });
});
