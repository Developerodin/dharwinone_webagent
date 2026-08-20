import { LIMITS } from "../config/limits.js";
import { prisma } from "../db/client.js";
import type { Asset, Prisma } from "../generated/prisma/client.js";
import { badRequest, notFound } from "../lib/httpError.js";
import {
  deleteObject,
  getObjectBuffer,
  headObject,
  presignUpload,
  publicUrl,
} from "../storage/driver.js";
import { generateDerivatives, probeImage } from "./derivatives.js";
import { resolveMediaType, sniffMime } from "./mime.js";

/**
 * Asset lifecycle: presign → upload → commit → link → collect.
 */

export type PresignArgs = {
  filename: string;
  mime: string;
  bytes: number;
  /** Hex SHA-256 of the file, computed by the browser before uploading. */
  sha256: string;
};

export type PresignResult =
  | { deduped: true; asset: Asset }
  | { deduped: false; asset: Asset; uploadUrl: string; expiresInSeconds: number };

/**
 * Validates a hex SHA-256.
 */
function assertSha256(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw badRequest("VALIDATION_ERROR", "Invalid file checksum.");
  }
  return normalized;
}

/**
 * Enforces the per-user storage quota.
 *
 * Checked at presign, before a single byte moves: rejecting a 25 MB upload
 * after it has been transferred wastes the user's bandwidth to tell them
 * something we already knew.
 */
async function assertStorageQuota(
  ownerId: string,
  incomingBytes: number,
): Promise<void> {
  const aggregate = await prisma.asset.aggregate({
    where: { ownerId, status: { not: "FAILED" } },
    _sum: { bytes: true },
  });

  const used = aggregate._sum.bytes ?? 0;

  if (used + incomingBytes > LIMITS.maxStorageBytesPerUser) {
    throw badRequest(
      "QUOTA_EXCEEDED",
      "You've reached your storage limit. Delete some media to free space.",
      {
        limit: LIMITS.maxStorageBytesPerUser,
        used,
        requested: incomingBytes,
      },
    );
  }
}

/**
 * Reserves an upload slot and returns a presigned PUT.
 *
 * When the same content already exists for this owner the upload is skipped
 * entirely — the same hero photo used across five projects is one object.
 */
export async function presignAsset(
  ownerId: string,
  args: PresignArgs,
): Promise<PresignResult> {
  const sha256 = assertSha256(args.sha256);
  const media = resolveMediaType(args.mime);

  if (args.bytes <= 0 || args.bytes > media.maxBytes) {
    throw badRequest(
      "PAYLOAD_TOO_LARGE",
      `That file is too large. The limit is ${Math.floor(media.maxBytes / (1024 * 1024))} MB.`,
      { bytes: args.bytes, limit: media.maxBytes },
    );
  }

  const existing = await prisma.asset.findUnique({
    where: { ownerId_sha256: { ownerId, sha256 } },
  });

  if (existing?.status === "READY") {
    return { deduped: true, asset: existing };
  }

  await assertStorageQuota(ownerId, args.bytes);

  // Content-addressed key: identical bytes always produce the same path, which
  // is what makes the object safely cacheable forever.
  const storageKey = `users/${ownerId}/${sha256}.${media.extension}`;

  const asset =
    existing ??
    (await prisma.asset.create({
      data: {
        ownerId,
        sha256,
        storageKey,
        cdnUrl: publicUrl(storageKey),
        kind: media.kind,
        mime: args.mime.trim().toLowerCase(),
        bytes: args.bytes,
        status: "PENDING",
      },
    }));

  const { url, expiresInSeconds } = await presignUpload({
    storageKey: asset.storageKey,
    mime: asset.mime,
    bytes: args.bytes,
    sha256,
  });

  return { deduped: false, asset, uploadUrl: url, expiresInSeconds };
}

/**
 * Confirms an upload landed and marks the asset usable.
 *
 * Verifies the object exists and matches the size we authorised, then sniffs
 * the real magic bytes: the browser's declared Content-Type is not evidence of
 * anything, and an executable file announced as an image must be caught here
 * rather than when something links to it.
 */
export async function commitAsset(
  ownerId: string,
  assetId: string,
): Promise<Asset> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, ownerId },
  });

  if (!asset) {
    throw notFound("ASSET_NOT_FOUND", "That upload could not be found.");
  }

  if (asset.status === "READY") return asset;

  const head = await headObject(asset.storageKey);

  if (!head) {
    throw badRequest(
      "ASSET_NOT_READY",
      "That upload hasn't finished. Please try again.",
    );
  }

  if (head.bytes !== asset.bytes) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "FAILED" },
    });
    throw badRequest(
      "VALIDATION_ERROR",
      "That upload didn't complete correctly. Please try again.",
      { expected: asset.bytes, received: head.bytes },
    );
  }

  if (asset.kind === "VIDEO") {
    // Videos are not probed or transcoded here; that needs a media pipeline
    // rather than an in-process sharp call.
    return prisma.asset.update({
      where: { id: asset.id },
      data: { status: "READY" },
    });
  }

  const buffer = await getObjectBuffer(asset.storageKey);
  const sniffed = sniffMime(buffer);

  if (!sniffed || !sniffed.startsWith("image/")) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: "FAILED" },
    });
    await deleteObject(asset.storageKey);
    throw badRequest(
      "UNSUPPORTED_MEDIA_TYPE",
      "That file isn't a valid image.",
      { declared: asset.mime, actual: sniffed },
    );
  }

  const probe = await probeImage(buffer);

  const ready = await prisma.asset.update({
    where: { id: asset.id },
    data: {
      status: "READY",
      mime: sniffed,
      width: probe.width,
      height: probe.height,
      blurhash: probe.blurhash,
    },
  });

  // Derivatives are generated after the response is sent. Nothing the user is
  // waiting on depends on them, and the original always serves in the meantime.
  void generateDerivatives(buffer, `users/${ownerId}/${asset.sha256}`, probe.width)
    .then((derivatives) =>
      prisma.asset.update({
        where: { id: asset.id },
        data: { derivatives: derivatives as Prisma.InputJsonValue },
      }),
    )
    .catch((error) =>
      console.warn(`[assets] derivative generation failed for ${asset.id}:`, error),
    );

  return ready;
}

/**
 * Lists a user's media library, newest first.
 */
export async function listAssets(
  ownerId: string,
  limit = 60,
  before?: Date,
): Promise<Asset[]> {
  return prisma.asset.findMany({
    where: {
      ownerId,
      status: "READY",
      ...(before ? { createdAt: { lt: before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}

/**
 * Detaches an asset from every project and queues it for collection.
 *
 * The object is not removed inline. Deleting it here would break any earlier
 * version of a project that still references it.
 */
export async function unlinkAssetEverywhere(
  ownerId: string,
  assetId: string,
): Promise<void> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, ownerId },
    select: { id: true },
  });

  if (!asset) {
    throw notFound("ASSET_NOT_FOUND", "That file could not be found.");
  }

  await prisma.projectAsset.deleteMany({ where: { assetId } });
}

/**
 * Collects unreferenced assets.
 *
 * An asset is eligible only when nothing links to it and it is older than the
 * grace period — that window protects a file uploaded moments ago but not yet
 * placed into a page.
 */
export async function collectOrphanAssets(
  graceHours = 24,
  batchSize = 200,
): Promise<number> {
  const cutoff = new Date(Date.now() - graceHours * 60 * 60 * 1000);

  const orphans = await prisma.asset.findMany({
    where: {
      createdAt: { lt: cutoff },
      links: { none: {} },
    },
    select: { id: true, storageKey: true, sha256: true, ownerId: true },
    take: batchSize,
  });

  let removed = 0;

  for (const orphan of orphans) {
    try {
      await deleteObject(orphan.storageKey);
      // Derivatives share the asset's key prefix; remove the known widths.
      for (const format of ["avif", "webp"]) {
        for (const width of [480, 960, 1600, 2400]) {
          await deleteObject(
            `users/${orphan.ownerId}/${orphan.sha256}/w${width}.${format}`,
          );
        }
      }
      await prisma.asset.delete({ where: { id: orphan.id } });
      removed += 1;
    } catch (error) {
      console.warn(`[assets] failed to collect ${orphan.id}:`, error);
    }
  }

  return removed;
}

/**
 * Reports a user's storage usage.
 */
export async function storageUsage(
  ownerId: string,
): Promise<{ used: number; limit: number }> {
  const aggregate = await prisma.asset.aggregate({
    where: { ownerId, status: { not: "FAILED" } },
    _sum: { bytes: true },
  });

  return {
    used: aggregate._sum.bytes ?? 0,
    limit: LIMITS.maxStorageBytesPerUser,
  };
}
