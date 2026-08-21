import { apiRequest } from "@/lib/apiClient";
import { newIntentKey } from "@/lib/projectApi";

/**
 * Object-storage uploads.
 *
 * The file goes browser → storage directly. The API only hands out a
 * short-lived signed PUT and records the result, which is what removes the
 * base64 inflation, the 80 MB request body, and the server-side memory spike
 * the old data-URL route carried.
 */

export type ServerAsset = {
  id: string;
  url: string;
  kind: "IMAGE" | "VIDEO";
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  status: "PENDING" | "READY" | "FAILED";
  createdAt: string;
};

type PresignResponse =
  | { deduped: true; asset: ServerAsset }
  | {
      deduped: false;
      asset: ServerAsset;
      uploadUrl: string;
      uploadHeaders: Record<string, string>;
      expiresInSeconds: number;
    };

/**
 * Whether this deployment has object storage configured.
 *
 * The answer is cached for the session — it is a deploy-time fact, and every
 * upload would otherwise pay for it again. A *failed* lookup is deliberately
 * not cached: one request that happened to land before the session was ready
 * would otherwise pin the app to the legacy disk uploader for as long as the
 * tab stayed open.
 */
let storageEnabled: Promise<boolean> | null = null;

export function assetsEnabled(): Promise<boolean> {
  storageEnabled ??= apiRequest<{ enabled: boolean }>("/api/assets/config")
    .then((data) => data.enabled)
    .catch(() => {
      storageEnabled = null;
      return false;
    });
  return storageEnabled;
}

/**
 * Hex SHA-256 of a file, computed in the browser.
 *
 * The server uses it as the storage key, which is what makes the same photo
 * used in five projects one stored object rather than five.
 */
export async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Uploads a file and returns the stored asset.
 *
 * Three steps: reserve (presign) → PUT to storage → commit. The commit is what
 * verifies the bytes actually landed and sniffs the real file type, so an
 * asset only becomes usable after the server has seen it.
 *
 * `onProgress` reports 0–1 across the transfer, so a 20 MB photo on a phone
 * shows movement rather than a frozen spinner.
 */
export async function uploadAsset(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<ServerAsset> {
  const sha256 = await sha256Hex(file);

  const presigned = await apiRequest<PresignResponse>("/api/assets/presign", {
    method: "POST",
    body: {
      filename: file.name,
      mime: file.type || "application/octet-stream",
      bytes: file.size,
      sha256,
    },
  });

  // Identical bytes are already stored — nothing to transfer at all.
  if (presigned.deduped) {
    onProgress?.(1);
    return presigned.asset;
  }

  await putToStorage(presigned.uploadUrl, presigned.uploadHeaders, file, onProgress);

  const committed = await apiRequest<{ asset: ServerAsset }>(
    "/api/assets/commit",
    {
      method: "POST",
      body: { assetId: presigned.asset.id },
      idempotencyKey: newIntentKey(),
    },
  );

  return committed.asset;
}

/**
 * PUTs the file straight to object storage.
 *
 * XHR rather than fetch purely for upload progress — fetch still cannot report
 * it. The signed headers are replayed exactly as the server returned them;
 * changing or omitting one invalidates the signature.
 */
function putToStorage(
  url: string,
  headers: Record<string, string>,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url, true);

    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      reject(
        new Error(
          request.status === 403
            ? "Upload link expired or was rejected by storage. Please retry."
            : `Upload failed (HTTP ${request.status}).`,
        ),
      );
    };

    request.onerror = () =>
      reject(
        new Error(
          "Could not reach storage. If this keeps happening the bucket's CORS rules may not allow uploads from this site.",
        ),
      );
    request.onabort = () => reject(new Error("Upload cancelled."));

    request.send(file);
  });
}

/**
 * Lists the signed-in user's media library, newest first.
 */
export async function listAssets(limit = 60): Promise<ServerAsset[]> {
  const data = await apiRequest<{ assets: ServerAsset[] }>(
    `/api/assets?limit=${limit}`,
  );
  return data.assets;
}

/**
 * Detaches an asset from every project.
 *
 * The object itself survives until collection confirms nothing references it,
 * because an older version of a project may still render it.
 */
export async function unlinkAsset(id: string): Promise<void> {
  await apiRequest(`/api/assets/${id}`, { method: "DELETE" });
}

/**
 * Reports how much of the storage quota is used.
 */
export async function assetUsage(): Promise<{ used: number; limit: number }> {
  return apiRequest<{ used: number; limit: number }>("/api/assets/usage");
}
