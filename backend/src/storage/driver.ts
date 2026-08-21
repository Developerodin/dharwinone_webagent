import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { badRequest } from "../lib/httpError.js";
import { storageConfig, type StorageConfig } from "./config.js";

/**
 * S3-compatible object storage.
 */

let client: S3Client | null = null;
let clientKey = "";

/**
 * Returns the configured storage client, throwing if uploads are disabled.
 */
function s3(): { client: S3Client; config: StorageConfig } {
  const config = storageConfig();

  if (!config) {
    throw badRequest(
      "STORAGE_UNAVAILABLE",
      "File uploads are not configured on this server.",
    );
  }

  const key = `${config.endpoint ?? ""}:${config.bucket}:${config.accessKeyId}`;
  if (!client || clientKey !== key) {
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // R2 and MinIO require path-style addressing; S3 tolerates it.
      forcePathStyle: Boolean(config.endpoint),
    });
    clientKey = key;
  }

  return { client, config };
}

/**
 * Returns true when object storage is configured.
 */
export function storageEnabled(): boolean {
  return storageConfig() !== null;
}

/**
 * Builds the public CDN URL for a stored object.
 */
export function publicUrl(storageKey: string): string {
  const config = storageConfig();
  if (!config) return storageKey;
  return `${config.cdnBaseUrl}/${storageKey}`;
}

/** Cache header signed into every upload; content-addressed keys never change. */
const UPLOAD_CACHE_CONTROL = "public, max-age=31536000, immutable";

export type PresignedUpload = {
  url: string;
  /** Headers the browser must send with the PUT for the signature to match. */
  headers: Record<string, string>;
  expiresInSeconds: number;
};

/**
 * Issues a short-lived presigned PUT.
 *
 * The browser uploads straight to storage, so the file never passes through
 * this process. That removes the base64 inflation, the memory spike, and the
 * dependency on a writable local filesystem in one step.
 *
 * `ContentLength` is signed into the URL, so the holder cannot upload a
 * different-sized object than the one we authorised and quota-checked.
 */
export async function presignUpload(args: {
  storageKey: string;
  mime: string;
  bytes: number;
  sha256: string;
}): Promise<PresignedUpload> {
  const { client: s3Client, config } = s3();

  // Every header signed here must be replayed byte-for-byte by the browser or
  // the signature check fails, so they are returned alongside the URL rather
  // than left for the client to reconstruct from memory.
  const headers: Record<string, string> = {
    "Content-Type": args.mime,
    "Cache-Control": UPLOAD_CACHE_CONTROL,
    "x-amz-meta-sha256": args.sha256,
  };

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: args.storageKey,
    ContentType: args.mime,
    ContentLength: args.bytes,
    // Content-addressed keys never change, so they are safe to cache forever.
    CacheControl: UPLOAD_CACHE_CONTROL,
    Metadata: { sha256: args.sha256 },
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: config.presignTtlSeconds,
    // The presigner hoists `x-amz-*` headers into the query string by default,
    // which leaves the browser sending a header S3 never signed — and S3
    // rejects the whole PUT for it. Keeping it unhoisted and signable is what
    // lets the checksum travel with the object.
    unhoistableHeaders: new Set(["x-amz-meta-sha256"]),
    signableHeaders: new Set(["x-amz-meta-sha256"]),
  });

  return { url, headers, expiresInSeconds: config.presignTtlSeconds };
}

export type ObjectHead = {
  bytes: number;
  mime: string | null;
};

/**
 * Reads an object's size and content type, or null when it does not exist.
 */
export async function headObject(
  storageKey: string,
): Promise<ObjectHead | null> {
  const { client: s3Client, config } = s3();

  try {
    const result = await s3Client.send(
      new HeadObjectCommand({ Bucket: config.bucket, Key: storageKey }),
    );
    return {
      bytes: Number(result.ContentLength ?? 0),
      mime: result.ContentType ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Downloads an object into memory.
 *
 * Only used for post-upload probing of images, which are bounded by the upload
 * size cap. Never call this on an unbounded key.
 */
export async function getObjectBuffer(storageKey: string): Promise<Buffer> {
  const { client: s3Client, config } = s3();

  const result = await s3Client.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: storageKey }),
  );

  const chunks: Buffer[] = [];
  for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Uploads a buffer directly. Used for generated derivatives.
 */
export async function putObject(args: {
  storageKey: string;
  body: Buffer;
  mime: string;
}): Promise<void> {
  const { client: s3Client, config } = s3();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: args.storageKey,
      Body: args.body,
      ContentType: args.mime,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

/**
 * Deletes an object. Missing keys are not an error.
 */
export async function deleteObject(storageKey: string): Promise<void> {
  const { client: s3Client, config } = s3();

  try {
    await s3Client.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: storageKey }),
    );
  } catch {
    // Deleting an object that is already gone is the desired end state.
  }
}
