import { pageSchema, type Page, type PageSection } from "../schemas/page.schema.js";

/**
 * Stage 7 — pure code: combine section objects into Page JSON + Zod validation.
 */
export function assemblePage(sections: PageSection[]): Page {
  const page = pageSchema.parse({ sections });
  return page;
}
