import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { allSpecs, catalogCovers, findCandidates, getSpec } from "./index.js";
import { componentSpecSchema } from "../schemas/componentSpec.schema.js";
import { COMPONENT_MANIFESTS } from "../schemas/manifest.schema.js";
import { sectionTypeSchema } from "../schemas/page.schema.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY_DIR = join(HERE, "../../../frontend/src/components");

/**
 * Reads every frontend registry so catalog ids can be checked against the
 * components that actually exist.
 */
function registryIds(): Set<string> {
  const files = [
    "premium/registry.ts",
    "elegant/registry.ts",
    "bold/registry.ts",
    "familyKit/createFamilyRegistry.tsx",
    "familyKit/sections/HeaderContactFooter.tsx",
    "familyKit/sections/FamilyHeaders.tsx",
  ];
  const ids = new Set<string>();
  for (const file of files) {
    const source = readFileSync(join(REGISTRY_DIR, file), "utf8");
    for (const match of source.matchAll(/"([a-z]+-[a-z_]+-\d{2})"/g)) {
      ids.add(match[1]!);
    }
    // familyKit builds ids from a template: `${family}-hero-01`
    for (const match of source.matchAll(/\$\{family\}-([a-z_]+-\d{2})/g)) {
      for (const family of ["minimal", "rustic", "vibrant", "bold"]) {
        ids.add(`${family}-${match[1]!}`);
      }
    }
  }
  return ids;
}

describe("ComponentSpec validation", () => {
  it("every spec in the catalog is valid", () => {
    expect(() => allSpecs()).not.toThrow();
    expect(allSpecs().length).toBeGreaterThanOrEqual(15);
  });

  it("rejects a spec whose id does not match its family", () => {
    const result = componentSpecSchema.safeParse({
      ...allSpecs()[0]!,
      id: "elegant-hero-01",
      family: "premium",
    });
    expect(result.success).toBe(false);
  });

  it("rejects impossible media contracts", () => {
    const result = componentSpecSchema.safeParse({
      ...allSpecs()[0]!,
      media: { min: 3, max: 1, role: "atmosphere", orientation: "landscape" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown properties so typos cannot pass silently", () => {
    const result = componentSpecSchema.safeParse({
      ...allSpecs()[0]!,
      visualWieght: 4,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a component that declares no content", () => {
    const result = componentSpecSchema.safeParse({
      ...allSpecs()[0]!,
      slots: {},
      list: undefined,
    });
    expect(result.success).toBe(false);
  });
});

describe("catalog registration", () => {
  it("every catalog id is a component that actually exists", () => {
    const ids = registryIds();
    const missing = allSpecs()
      .map((spec) => spec.id)
      .filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });

  it("every catalog id has a manifest so legacy paths keep working", () => {
    const missing = allSpecs()
      .map((spec) => spec.id)
      .filter((id) => !COMPONENT_MANIFESTS[id]);
    expect(missing).toEqual([]);
  });

  it("a spec's section agrees with its manifest", () => {
    for (const spec of allSpecs()) {
      expect(COMPONENT_MANIFESTS[spec.id]!.sectionType).toBe(spec.section);
    }
  });

  it("has no duplicate ids", () => {
    const ids = allSpecs().map((spec) => spec.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("component discovery", () => {
  it("returns candidates for a covered section", () => {
    const candidates = findCandidates({ section: "hero", family: "premium" });
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates.every((spec) => spec.section === "hero")).toBe(true);
  });

  it("never returns another family's components", () => {
    const candidates = findCandidates({ section: "hero", family: "elegant" });
    expect(candidates.every((spec) => spec.family === "elegant")).toBe(true);
  });

  it("covers every section type for every shipped family", () => {
    const families = ["premium", "elegant", "minimal", "rustic", "vibrant", "bold"];
    const sections = sectionTypeSchema.options;
    const gaps: string[] = [];
    for (const family of families) {
      for (const section of sections) {
        if (!catalogCovers(section, family)) gaps.push(`${family}/${section}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it("returns nothing for a family that does not exist", () => {
    expect(findCandidates({ section: "hero", family: "nonexistent" })).toEqual([]);
    expect(catalogCovers("hero", "nonexistent")).toBe(false);
  });

  it("filters by the surface the plan asked for", () => {
    const onImage = findCandidates({
      section: "hero",
      family: "premium",
      surface: "image",
    });
    expect(onImage.length).toBeGreaterThan(0);
    expect(onImage.every((spec) => spec.surfaces.includes("image"))).toBe(true);
    // The split hero is not designed to have copy sitting over the media.
    expect(onImage.map((spec) => spec.id)).not.toContain("premium-hero-02");
  });

  it("gates on media the brief cannot supply", () => {
    const withOne = findCandidates({
      section: "gallery",
      family: "premium",
      available: { media: 1 },
    });
    expect(withOne).toEqual([]);

    const withFour = findCandidates({
      section: "gallery",
      family: "premium",
      available: { media: 4 },
    });
    expect(withFour.length).toBeGreaterThan(0);
  });

  it("gates on list content the brief cannot supply", () => {
    const oneQuote = findCandidates({
      section: "testimonials",
      family: "premium",
      available: { listCounts: { items: 1 } },
    });
    // A three-up quote grid needs three quotes.
    expect(oneQuote.map((spec) => spec.id)).not.toContain(
      "premium-testimonials-02",
    );

    const threeQuotes = findCandidates({
      section: "testimonials",
      family: "premium",
      available: { listCounts: { items: 3 } },
    });
    expect(threeQuotes.map((spec) => spec.id)).toContain(
      "premium-testimonials-02",
    );
  });

  it("excludes components opted out of an industry", () => {
    const spec = getSpec("premium-hero-01")!;
    expect(spec.industries?.exclude ?? []).toEqual([]);
  });
});
