import type { Brief } from "../schemas/brief.schema.js";
import { pageSchema, type Page, type PageSection } from "../schemas/page.schema.js";
import { seedThemeOverridesFromBrief } from "./applyStyleOps.js";

/**
 * Stage 7 — pure code: combine section objects into Page JSON + Zod validation.
 */
export function assemblePage(
  sections: PageSection[],
  brief?: Brief,
): Page {
  const page = pageSchema.parse({ sections });
  if (brief) {
    seedThemeOverridesFromBrief(page, brief.brandColors);
  }
  return page;
}
