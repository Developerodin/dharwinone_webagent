/**
 * Object-storage configuration.
 *
 * Cloudflare R2 by default, reached through the S3-compatible API so the
 * driver stays portable to S3 or MinIO without a code change.
 */

export type StorageConfig = {
  bucket: string;
  region: string;
  endpoint: string | undefined;
  accessKeyId: string;
  secretAccessKey: string;
  /** Public base for asset URLs, e.g. https://cdn.prowplus.com */
  cdnBaseUrl: string;
  presignTtlSeconds: number;
};

let cached: StorageConfig | null | undefined;

/**
 * Reads storage configuration, returning null when it is not configured.
 *
 * Null rather than throwing so the rest of the API keeps working on a
 * deployment that has not enabled uploads yet; the asset routes surface a
 * clear STORAGE_UNAVAILABLE instead of the process refusing to boot.
 */
export function storageConfig(): StorageConfig | null {
  if (cached !== undefined) return cached;

  const bucket = process.env.STORAGE_BUCKET?.trim();
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim();
  const cdnBaseUrl = process.env.CDN_BASE_URL?.trim();

  if (!bucket || !accessKeyId || !secretAccessKey || !cdnBaseUrl) {
    cached = null;
    return cached;
  }

  cached = {
    bucket,
    region: process.env.STORAGE_REGION?.trim() || "auto",
    endpoint: process.env.STORAGE_ENDPOINT?.trim() || undefined,
    accessKeyId,
    secretAccessKey,
    cdnBaseUrl: cdnBaseUrl.replace(/\/+$/, ""),
    presignTtlSeconds: Number(process.env.PRESIGN_TTL_SECONDS ?? 300),
  };

  return cached;
}

/**
 * Clears the memoized config. Test-only.
 */
export function resetStorageConfigCache(): void {
  cached = undefined;
}
