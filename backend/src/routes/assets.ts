import { Router, type NextFunction, type Request, type Response } from "express";
import { ok } from "../lib/respond.js";
import { idempotent } from "../middleware/idempotency.js";
import { requireAuth, requireVerified } from "../middleware/requireAuth.js";
import * as assets from "../assets/service.js";
import { storageEnabled } from "../storage/driver.js";
import {
  commitAssetSchema,
  presignAssetSchema,
} from "../schemas/project.schema.js";

export const assetsRouter = Router();

/**
 * Wraps an async handler so rejections reach the error middleware.
 */
function handle(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

assetsRouter.use(requireAuth, requireVerified);

/**
 * Serializes an asset for the client, hiding storage internals.
 */
function present(asset: {
  id: string;
  cdnUrl: string;
  kind: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  status: string;
  createdAt: Date;
}) {
  return {
    id: asset.id,
    url: asset.cdnUrl,
    kind: asset.kind,
    mime: asset.mime,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    blurhash: asset.blurhash,
    status: asset.status,
    createdAt: asset.createdAt,
  };
}

/**
 * Reserves an upload and returns a presigned PUT.
 *
 * The browser then uploads straight to object storage — the file never passes
 * through this process, which is what removes the base64 inflation and the
 * memory spike the old data-URL route carried.
 */
assetsRouter.post(
  "/presign",
  handle(async (req, res) => {
    const body = presignAssetSchema.parse(req.body);
    const result = await assets.presignAsset(req.auth!.sub, body);

    if (result.deduped) {
      // Identical bytes already stored: nothing to upload at all.
      ok(res, { deduped: true, asset: present(result.asset) });
      return;
    }

    ok(res, {
      deduped: false,
      asset: present(result.asset),
      uploadUrl: result.uploadUrl,
      uploadHeaders: result.uploadHeaders,
      expiresInSeconds: result.expiresInSeconds,
    });
  }),
);

/**
 * Confirms an upload landed and makes the asset usable.
 */
assetsRouter.post(
  "/commit",
  idempotent("assets.commit"),
  handle(async (req, res) => {
    const body = commitAssetSchema.parse(req.body);
    const asset = await assets.commitAsset(req.auth!.sub, body.assetId);
    ok(res, { asset: present(asset) });
  }),
);

assetsRouter.get(
  "/",
  handle(async (req, res) => {
    const limit = Number(req.query.limit ?? 60);
    const beforeRaw = req.query.before;
    const before =
      typeof beforeRaw === "string" ? new Date(beforeRaw) : undefined;

    const rows = await assets.listAssets(
      req.auth!.sub,
      Number.isFinite(limit) ? limit : 60,
      before && !Number.isNaN(before.getTime()) ? before : undefined,
    );

    const last = rows[rows.length - 1];

    ok(res, { assets: rows.map(present) }, 200, {
      nextCursor: last ? last.createdAt.toISOString() : null,
    });
  }),
);

assetsRouter.get(
  "/usage",
  handle(async (req, res) => {
    ok(res, await assets.storageUsage(req.auth!.sub));
  }),
);

/**
 * Detaches an asset from every project.
 *
 * The object survives until garbage collection confirms nothing references it,
 * because an older version of a project may still render it.
 */
assetsRouter.delete(
  "/:id",
  handle(async (req, res) => {
    await assets.unlinkAssetEverywhere(req.auth!.sub, req.params.id!);
    ok(res, { unlinked: true });
  }),
);

/**
 * Reports whether uploads are available on this deployment.
 */
assetsRouter.get(
  "/config",
  handle(async (_req, res) => {
    ok(res, { enabled: storageEnabled() });
  }),
);
