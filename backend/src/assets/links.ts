import type { Prisma } from "../generated/prisma/client.js";
import { storageConfig } from "../storage/config.js";

/**
 * The ProjectAsset refcount.
 *
 * A link is created for every asset referenced by ANY version of a project,
 * never just the head. An old version must still render, so an image dropped
 * from the current page cannot be collected while history references it.
 */

/** Transaction client, so linking joins the caller's version-write. */
type Tx = Prisma.TransactionClient;

/**
 * Maps page URLs back to the assets they reference.
 *
 * Only CDN-hosted URLs can be resolved. Catalog images and legacy
 * `/images/uploads/...` paths have no Asset row and are ignored rather than
 * rejected, so pages created before object storage keep working.
 */
async function resolveAssetIds(
  tx: Tx,
  ownerId: string,
  urls: string[],
): Promise<string[]> {
  if (urls.length === 0) return [];

  const config = storageConfig();
  const cdnUrls = config
    ? urls.filter((url) => url.startsWith(config.cdnBaseUrl))
    : [];

  if (cdnUrls.length === 0) return [];

  const assets = await tx.asset.findMany({
    where: { ownerId, cdnUrl: { in: cdnUrls } },
    select: { id: true },
  });

  return assets.map((asset) => asset.id);
}

/**
 * Links every asset a page references to the project.
 *
 * Idempotent: `skipDuplicates` means re-saving a page that reuses the same
 * images is a no-op rather than a constraint violation.
 */
export async function linkPageAssets(
  tx: Tx,
  projectId: string,
  ownerId: string,
  urls: string[],
): Promise<number> {
  const assetIds = await resolveAssetIds(tx, ownerId, urls);
  if (assetIds.length === 0) return 0;

  const result = await tx.projectAsset.createMany({
    data: assetIds.map((assetId) => ({ projectId, assetId })),
    skipDuplicates: true,
  });

  return result.count;
}

/**
 * Removes a single asset's link to a project.
 *
 * The object itself is not deleted here — garbage collection decides that
 * later, once nothing references it.
 */
export async function unlinkAsset(
  tx: Tx,
  projectId: string,
  assetId: string,
): Promise<void> {
  await tx.projectAsset.deleteMany({ where: { projectId, assetId } });
}
