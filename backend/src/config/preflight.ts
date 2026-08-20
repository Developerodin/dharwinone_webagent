import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "../db/client.js";
import { getSmtpTransport, readSmtpConfig } from "../lib/smtpMailer.js";

/**
 * Startup dependency checks.
 *
 * Every external service this app needs is probed once at boot and printed as
 * a table, so a misconfigured key is discovered on `npm run dev` rather than by
 * a user hitting the one feature that depends on it.
 *
 * Nothing here throws. A failed probe degrades the feature that needs it; it
 * must not stop the server starting, because an unreachable SMTP host is no
 * reason to take the whole API down.
 */

export type CheckStatus = "ok" | "warn" | "fail" | "skip";

export type CheckResult = {
  name: string;
  status: CheckStatus;
  detail: string;
  ms: number;
};

type Probe = Omit<CheckResult, "name" | "ms">;

/** Per-check timeout. A hung DNS lookup must not delay boot. */
const CHECK_TIMEOUT_MS = 8000;

/**
 * Runs a probe with a timeout, converting any throw into a failed result.
 */
async function check(name: string, run: () => Promise<Probe>): Promise<CheckResult> {
  const startedAt = Date.now();

  try {
    const result = await Promise.race([
      run(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`timed out after ${CHECK_TIMEOUT_MS}ms`)),
          CHECK_TIMEOUT_MS,
        ),
      ),
    ]);
    return { name, ...result, ms: Date.now() - startedAt };
  } catch (error) {
    return {
      name,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
      ms: Date.now() - startedAt,
    };
  }
}

/**
 * Verifies the database is reachable and migrations have been applied.
 */
async function checkDatabase(): Promise<Probe> {
  if (!process.env.DATABASE_URL) {
    return { status: "fail", detail: "DATABASE_URL is not set" };
  }

  await prisma.$queryRaw`SELECT 1`;

  const applied = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL
  `;

  const count = Number(applied[0]?.count ?? 0);
  const host = new URL(process.env.DATABASE_URL).host;

  if (count === 0) {
    return {
      status: "fail",
      detail: `connected to ${host} but no migrations applied - run: npm run db:deploy`,
    };
  }

  return { status: "ok", detail: `${host} - ${count} migrations applied` };
}

/**
 * Verifies the OpenAI key is accepted and the configured models exist.
 *
 * Uses the models endpoint, which authenticates the key without spending
 * tokens; a completion call on every restart would be a real cost.
 */
async function checkOpenAi(): Promise<Probe> {
  const key = process.env.OPENAI_API_KEY?.trim();

  if (!key) {
    return { status: "warn", detail: "OPENAI_API_KEY not set - build pipeline disabled" };
  }

  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (response.status === 401) {
    return { status: "fail", detail: "key rejected (401) - check OPENAI_API_KEY" };
  }
  if (!response.ok) {
    return { status: "fail", detail: `HTTP ${response.status}` };
  }

  const body = (await response.json()) as { data?: Array<{ id: string }> };
  const available = new Set((body.data ?? []).map((model) => model.id));

  // Knowing the key works is only half the answer - the configured models have
  // to actually be available to this account.
  const configured = [
    process.env.OPENAI_MODEL,
    process.env.OPENAI_MODEL_FAST,
    process.env.OPENAI_MODEL_CREATIVE,
  ].filter((model): model is string => Boolean(model));

  const missing = [...new Set(configured)].filter((model) => !available.has(model));

  if (missing.length > 0) {
    return {
      status: "warn",
      detail: `key valid, but unavailable to this account: ${missing.join(", ")}`,
    };
  }

  return {
    status: "ok",
    detail: `key valid - ${available.size} models - using ${process.env.OPENAI_MODEL ?? "gpt-4o-mini"}`,
  };
}

/**
 * Verifies the Google Maps key against Places API (New).
 *
 * Billed per call, so the live request runs only in the deep check rather than
 * on every restart of a watch process.
 */
async function checkGoogleMaps(deep: boolean): Promise<Probe> {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim() || process.env.googel_api?.trim();

  if (!key) {
    return { status: "warn", detail: "not set - maps and location picker disabled" };
  }

  if (!deep) {
    return {
      status: "ok",
      detail: `key present (${key.slice(0, 6)}...) - run 'npm run preflight' to call the API`,
    };
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.displayName",
    },
    body: JSON.stringify({ textQuery: "coffee in Jaipur", pageSize: 1 }),
  });

  if (response.ok) {
    return { status: "ok", detail: "Places API (New) responding" };
  }

  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  const message = body?.error?.message ?? `HTTP ${response.status}`;

  // Name the failures whose fixes differ completely.
  if (/API key not valid|API_KEY_INVALID/i.test(message)) {
    return { status: "fail", detail: "key rejected - check GOOGLE_MAPS_API_KEY" };
  }
  if (/has not been used|disabled|SERVICE_DISABLED/i.test(message)) {
    return {
      status: "fail",
      detail: "Places API (New) not enabled for this project - enable it in Cloud Console",
    };
  }
  if (/billing/i.test(message)) {
    return { status: "fail", detail: "billing not enabled on this Google Cloud project" };
  }

  return { status: "fail", detail: message.slice(0, 160) };
}

/**
 * Verifies object storage credentials and the bucket.
 *
 * Probed from the raw environment rather than the app's storage config, so the
 * credentials are still validated when uploads are switched off for a missing
 * CDN_BASE_URL.
 */
async function checkStorage(): Promise<Probe> {
  const bucket = process.env.STORAGE_BUCKET?.trim();
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim();
  const region = process.env.STORAGE_REGION?.trim() || "auto";
  const endpoint = process.env.STORAGE_ENDPOINT?.trim() || undefined;
  const cdn = process.env.CDN_BASE_URL?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return { status: "warn", detail: "not configured - uploads disabled" };
  }

  const client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: Boolean(endpoint),
  });

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const name = (error as { name?: string })?.name ?? "";
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;

    if (name === "NotFound" || status === 404) {
      return { status: "fail", detail: `bucket "${bucket}" not found in ${region}` };
    }
    if (name === "Forbidden" || status === 403) {
      return {
        status: "fail",
        detail: `access denied to "${bucket}" - key lacks permission, or wrong region`,
      };
    }
    if (/InvalidAccessKeyId|SignatureDoesNotMatch/i.test(name)) {
      return { status: "fail", detail: "credentials rejected" };
    }
    throw error;
  }

  if (!cdn) {
    // Reachable but unusable: the app will not issue a presigned upload without
    // a public base URL to hand back for the stored object.
    return {
      status: "warn",
      detail: `bucket "${bucket}" reachable, but CDN_BASE_URL is empty - uploads stay disabled`,
    };
  }

  return { status: "ok", detail: `bucket "${bucket}" (${region}) - CDN ${cdn}` };
}

/**
 * Verifies the SMTP host accepts our credentials.
 *
 * `verify()` opens a connection and authenticates without sending anything.
 */
async function checkSmtp(): Promise<Probe> {
  const config = readSmtpConfig();

  if (!config) {
    return { status: "warn", detail: "not configured - OTP emails will not send" };
  }

  const transport = getSmtpTransport(config);
  if (!transport) {
    return { status: "warn", detail: "transport unavailable" };
  }

  await transport.verify();

  const from = config.from.toLowerCase();
  const username = config.username.toLowerCase();

  if (from !== username) {
    // A From that differs from the authenticated user is normal when it is a
    // verified alias, and only fails when it is not. We cannot tell which
    // without actually sending, and the mailer already retries as the username
    // if the host refuses - so this is reported, not flagged.
    return {
      status: "ok",
      detail: `${config.host}:${config.port} as ${config.username}, sending as ${config.from} (alias)`,
    };
  }

  return { status: "ok", detail: `${config.host}:${config.port} as ${config.username}` };
}

/**
 * Verifies auth secrets are present, long enough, and distinct.
 */
function checkAuthSecrets(): Probe {
  const access = process.env.JWT_ACCESS_SECRET?.trim() ?? "";
  const reset = process.env.JWT_RESET_SECRET?.trim() ?? "";

  if (!access || !reset) {
    return { status: "fail", detail: "JWT_ACCESS_SECRET / JWT_RESET_SECRET missing" };
  }
  if (access.length < 32 || reset.length < 32) {
    return { status: "fail", detail: "secrets must be at least 32 characters" };
  }
  if (access === reset) {
    return {
      status: "fail",
      detail:
        "access and reset secrets are identical - a reset ticket could be replayed as a session",
    };
  }

  return { status: "ok", detail: "two distinct secrets, sufficient length" };
}

/**
 * Reports Google sign-in configuration.
 */
function checkGoogleOAuth(): Probe {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    return { status: "warn", detail: "GOOGLE_CLIENT_ID not set - Google sign-in hidden" };
  }
  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    return { status: "fail", detail: "GOOGLE_CLIENT_ID is not a valid client id" };
  }

  return {
    status: "ok",
    detail: `${clientId.slice(0, 16)}... - frontend needs the same value as VITE_GOOGLE_CLIENT_ID`,
  };
}

/**
 * Runs every dependency check.
 *
 * `deep` additionally calls billed third-party APIs. It is off during boot so
 * a watch process restarting twenty times an hour does not spend money.
 */
export async function runPreflight(
  options: { deep?: boolean } = {},
): Promise<CheckResult[]> {
  const deep = options.deep ?? false;

  return Promise.all([
    check("database", checkDatabase),
    check("auth secrets", async () => checkAuthSecrets()),
    check("openai", checkOpenAi),
    check("google oauth", async () => checkGoogleOAuth()),
    check("google maps", () => checkGoogleMaps(deep)),
    check("object storage", checkStorage),
    check("smtp", checkSmtp),
  ]);
}

const RESET = "[0m";

const COLOURS: Record<CheckStatus, string> = {
  ok: "[32m",
  warn: "[33m",
  fail: "[31m",
  skip: "[90m",
};

const LABELS: Record<CheckStatus, string> = {
  ok: "OK  ",
  warn: "WARN",
  fail: "FAIL",
  skip: "SKIP",
};

/**
 * Colours text, unless output is piped somewhere that cannot render it.
 */
function paint(status: CheckStatus, text: string): string {
  if (!process.stdout.isTTY) return text;
  return `${COLOURS[status]}${text}${RESET}`;
}

/**
 * Prints results as an aligned table.
 */
export function printPreflight(results: CheckResult[]): void {
  const width = Math.max(...results.map((result) => result.name.length));

  console.log("");
  console.log("  Dependency check");
  console.log("  " + "-".repeat(width + 62));

  for (const result of results) {
    const name = result.name.padEnd(width);
    const timing = `${result.ms}ms`.padStart(7);
    console.log(
      `  ${paint(result.status, LABELS[result.status])}  ${name} ${timing}  ${result.detail}`,
    );
  }

  const failed = results.filter((result) => result.status === "fail");
  const warned = results.filter((result) => result.status === "warn");

  console.log("  " + "-".repeat(width + 62));

  if (failed.length === 0 && warned.length === 0) {
    console.log("  " + paint("ok", "All dependencies healthy."));
  } else {
    const parts: string[] = [];
    if (failed.length) parts.push(paint("fail", `${failed.length} failing`));
    if (warned.length) parts.push(paint("warn", `${warned.length} degraded`));
    console.log("  " + parts.join(", "));
  }

  console.log("");
}
