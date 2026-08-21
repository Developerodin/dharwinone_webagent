/**
 * Probes whether this repo's Google OAuth client is actually accepted by
 * Google — not just present in .env / Cloud Console.
 *
 * Run from backend/: `npx tsx scripts/check-google-oauth.ts`
 *
 * Distinguishes the two flows:
 *  - redirect/code  → what the email/webagent apps use (Authorized redirect URIs)
 *  - GIS popup      → what this SPA uses (Authorized JavaScript origins)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const REDIRECT_URIS = [
  "http://localhost:3000/v1/email/auth/google/callback",
  "http://localhost:4000/api/auth/google/callback",
  "http://localhost:5173/",
  "http://localhost:5174/",
  "https://webagent.agenticaisolutionsllc.ai/api/auth/google/callback",
];

const GIS_ORIGINS = [
  "http://localhost:5174",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://dharwinone.com",
  "https://webagent.agenticaisolutionsllc.ai",
];

type Probe = {
  target: string;
  ok: boolean;
  detail: string;
};

/**
 * Reads a KEY=value from a dotenv file without printing other secrets.
 */
function readEnvValue(filePath: string, key: string): string {
  if (!fs.existsSync(filePath)) return "";
  const parsed = dotenv.parse(fs.readFileSync(filePath));
  return (parsed[key] ?? "").trim().replace(/^['"]|['"]$/g, "");
}

/**
 * Follows Google's OAuth authorize endpoint without completing login.
 *
 * `interaction_required` / a sign-in identifier page means the client+params
 * were accepted. `oauth/error` means Google rejected the request.
 */
async function followAuth(params: Record<string, string>): Promise<{
  status: number;
  location: string;
  path: string;
  flow: string;
  error: string;
  authError: string;
}> {
  const url = new URL("https://accounts.google.com/o/oauth2/auth");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: { "User-Agent": UA },
  });

  const location = response.headers.get("location") ?? "";
  const parsed = new URL(location || "https://accounts.google.com/");
  const authRaw = parsed.searchParams.get("authError") ?? "";
  return {
    status: response.status,
    location,
    path: parsed.pathname,
    flow: parsed.searchParams.get("flowName") ?? "",
    error: parsed.searchParams.get("error") ?? "",
    authError: decodeAuthError(authRaw),
  };
}

/**
 * Pulls readable strings out of Google's protobuf-ish authError blob.
 */
function decodeAuthError(raw: string): string {
  if (!raw) return "";
  const decoded = decodeURIComponent(raw);
  try {
    const text = Buffer.from(decoded, "base64").toString("utf8");
    const strings = text.match(/[a-z][a-z0-9_ ]{6,}/gi) ?? [];
    if (strings.length) return strings.join(" / ");
  } catch {
    // Fall through to the raw decoded form.
  }
  return decoded.slice(0, 180);
}

/**
 * Checks whether a redirect URI is registered for the authorization-code flow.
 */
async function probeRedirect(clientId: string, redirectUri: string): Promise<Probe> {
  const result = await followAuth({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "none",
  });

  if (result.path.includes("/signin/oauth/error") || result.authError) {
    return {
      target: redirectUri,
      ok: false,
      detail: result.authError || result.error || result.path,
    };
  }

  if (
    result.error === "interaction_required" ||
    result.error === "immediate_failed" ||
    result.error === "login_required" ||
    result.path.includes("/signin/identifier")
  ) {
    return { target: redirectUri, ok: true, detail: "accepted by Google" };
  }

  return {
    target: redirectUri,
    ok: result.status === 302 && Boolean(result.location),
    detail: result.error || result.path || `HTTP ${result.status}`,
  };
}

/**
 * Checks whether a JavaScript origin is registered for GIS (popup ID-token).
 *
 * GIS sends redirect_uri=postmessage plus origin=window.location.origin.
 * That is the check that produced `401 invalid_client / no registered origin`.
 */
async function probeGisOrigin(clientId: string, origin: string): Promise<Probe> {
  const result = await followAuth({
    client_id: clientId,
    redirect_uri: "postmessage",
    response_type: "id_token permission",
    scope: "openid email profile",
    origin,
    ss_domain: origin,
    gsiwebsdk: "3",
    ux_mode: "popup",
    nonce: crypto.randomUUID(),
  });

  if (result.path.includes("/signin/oauth/error") || /invalid_client|no registered origin/i.test(result.authError)) {
    return {
      target: origin,
      ok: false,
      detail: result.authError || result.error || "rejected",
    };
  }

  if (result.path.includes("/signin/identifier") || result.flow) {
    return { target: origin, ok: true, detail: "GIS origin accepted" };
  }

  return {
    target: origin,
    ok: false,
    detail: result.authError || result.error || result.path || `HTTP ${result.status}`,
  };
}

/**
 * Reports who is listening on common local ports.
 */
function listening(port: number): string {
  try {
    const out = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
      encoding: "utf8",
    });
    const line = out.split("\n").find((row) => row.includes("LISTEN"));
    if (!line) return "nothing";
    const parts = line.split(/\s+/);
    return `${parts[0]} pid=${parts[1]} ${parts.at(-1) ?? ""}`;
  } catch {
    return "nothing";
  }
}

/**
 * Prints a labeled pass/fail table.
 */
function printTable(title: string, rows: Probe[]): void {
  console.log(`\n${title}`);
  for (const row of rows) {
    const mark = row.ok ? "PASS" : "FAIL";
    console.log(`  [${mark}] ${row.target}`);
    console.log(`         ${row.detail}`);
  }
}

async function main(): Promise<void> {
  const backendEnv = path.join(ROOT, "backend/.env");
  const frontendEnv = path.join(ROOT, "frontend/.env");
  const backendId = readEnvValue(backendEnv, "GOOGLE_CLIENT_ID");
  const frontendId = readEnvValue(frontendEnv, "VITE_GOOGLE_CLIENT_ID");
  const secretSet = Boolean(readEnvValue(backendEnv, "GOOGLE_CLIENT_SECRET"));

  console.log("Google OAuth diagnostic");
  console.log("=======================");
  console.log(`frontend VITE_GOOGLE_CLIENT_ID: ${frontendId || "(missing)"}`);
  console.log(`backend  GOOGLE_CLIENT_ID:      ${backendId || "(missing)"}`);
  console.log(`backend  GOOGLE_CLIENT_SECRET:  ${secretSet ? "set (unused by GIS popup)" : "missing"}`);
  console.log(
    `client IDs match: ${backendId && frontendId && backendId === frontendId ? "yes" : "NO"}`,
  );

  const clientId = frontendId || backendId;
  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    console.log("\nFAIL: client id is missing or not a Google web client id.");
    process.exitCode = 1;
    return;
  }

  console.log("\nLocal ports (this SPA is Vite 5173; 5174 means 5173 was already taken)");
  for (const port of [5173, 5174, 4000, 3000, 3001]) {
    console.log(`  :${port}  ${listening(port)}`);
  }

  const redirects = await Promise.all(REDIRECT_URIS.map((uri) => probeRedirect(clientId, uri)));
  printTable("Redirect/code flow (other Dharwin apps)", redirects);

  const origins = await Promise.all(GIS_ORIGINS.map((origin) => probeGisOrigin(clientId, origin)));
  printTable("GIS popup origins (THIS app — Continue with Google)", origins);

  const viteOrigin =
    listening(5174) !== "nothing"
      ? "http://localhost:5174"
      : listening(5173) !== "nothing"
        ? "http://localhost:5173"
        : null;
  const gisHere = origins.find((row) => row.target === viteOrigin);

  console.log("\nVerdict");
  console.log("-------");
  if (viteOrigin && gisHere?.ok) {
    console.log(
      `Google now accepts GIS from ${viteOrigin}. The 401 you hit was origin-cache; retry in Incognito.`,
    );
  } else if (viteOrigin) {
    console.log(
      `THIS app is serving ${viteOrigin}, and Google is still rejecting that origin for GIS.`,
    );
    console.log(
      "The other project works because it uses redirect/code URIs (email callback), not GIS.",
    );
    console.log("Fix: Cloud Console → this client → Authorized JavaScript origins → exact origin, no slash.");
  } else {
    console.log("Vite is not listening. Start frontend, then re-run.");
  }

  const failedGis = origins.filter((row) => !row.ok);
  if (failedGis.length) {
    console.log("\nOrigins Google is still rejecting for GIS:");
    for (const row of failedGis) console.log(`  - ${row.target} (${row.detail})`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Diagnostic failed:", message);
  process.exitCode = 1;
});
