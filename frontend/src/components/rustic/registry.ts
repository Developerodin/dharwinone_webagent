import type { SectionComponent } from "@/components/premium/registry";
import { createFamilyRegistry } from "@/components/familyKit/createFamilyRegistry";
import { rs } from "./shared/rusticTokens";

/** Shared registry for the rustic restaurant family. */
export const rusticRegistry: Record<string, SectionComponent> =
  createFamilyRegistry("rustic", rs);
