import { getSpec } from "../catalog/index.js";
import type { ComponentSpec } from "../schemas/componentSpec.schema.js";

export type ContentViolation = {
  componentId: string;
  field: string;
  kind: "missing" | "too_long";
  limit?: number;
  actual?: number;
};

/**
 * Checks generated copy against a component's declared content contract.
 *
 * Components not yet in the catalog have no contract to check, so they return
 * no violations rather than failing.
 */
export function checkContentContract(args: {
  componentId: string;
  content: Record<string, unknown>;
  spec?: ComponentSpec | null;
}): ContentViolation[] {
  const spec = args.spec ?? getSpec(args.componentId);
  if (!spec) return [];

  const violations: ContentViolation[] = [];

  for (const [field, slot] of Object.entries(spec.slots)) {
    const raw = args.content[field];
    const value = typeof raw === "string" ? raw.trim() : "";

    if (slot.required && value.length === 0) {
      violations.push({ componentId: spec.id, field, kind: "missing" });
      continue;
    }
    if (value.length > slot.maxChars) {
      violations.push({
        componentId: spec.id,
        field,
        kind: "too_long",
        limit: slot.maxChars,
        actual: value.length,
      });
    }
  }

  return violations;
}

/**
 * Checks every section of a page against its component's contract.
 */
export function checkPageContentContracts(
  sections: ReadonlyArray<{ componentId: string; content: Record<string, unknown> }>,
): ContentViolation[] {
  return sections.flatMap((section) =>
    checkContentContract({
      componentId: section.componentId,
      content: section.content,
    }),
  );
}
