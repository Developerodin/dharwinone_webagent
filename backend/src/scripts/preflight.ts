import "dotenv/config";
import { printPreflight, runPreflight } from "../config/preflight.js";
import { disconnectPrisma } from "../db/client.js";

/**
 * Full dependency check, including the third-party calls that cost money.
 *
 * Run manually (`npm run preflight`) rather than on boot, so a watch process
 * restarting repeatedly does not bill a Places API call every time.
 *
 * Exits non-zero when anything is failing, so CI and deploy scripts can gate
 * on it.
 */
const results = await runPreflight({ deep: true });
printPreflight(results);

await disconnectPrisma();

process.exit(results.some((result) => result.status === "fail") ? 1 : 0);
