import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const catalogEntrySchema = z.object({
  id: z.string(),
  path: z.string(),
  tags: z.array(z.string()),
  orientation: z.enum(["landscape", "portrait", "square"]),
  section_type: z.enum(["hero", "menu", "about", "gallery"]),
  family: z
    .enum(["premium", "elegant", "minimal", "rustic", "vibrant", "bold"])
    .optional(),
});

const catalogSchema = z.object({
  images: z.array(catalogEntrySchema),
});

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

let cachedCatalog: CatalogEntry[] | null = null;

/**
 * Loads and validates the static image catalog from disk.
 */
export function loadCatalog(): CatalogEntry[] {
  if (cachedCatalog) return cachedCatalog;

  const dir = dirname(fileURLToPath(import.meta.url));
  const catalogPath = join(dir, "../../data/catalog.json");
  const raw = readFileSync(catalogPath, "utf-8");
  const parsed = catalogSchema.parse(JSON.parse(raw));
  cachedCatalog = parsed.images;
  return cachedCatalog;
}

/**
 * Resets the in-memory catalog cache (for tests).
 */
export function resetCatalogCache(): void {
  cachedCatalog = null;
}
