import type { SectionComponent } from "@/components/premium/registry";
import { createFamilyRegistry } from "@/components/familyKit/createFamilyRegistry";
import { mn } from "./shared/minimalTokens";

/** Black-and-white registry for the minimal restaurant family. */
export const minimalRegistry: Record<string, SectionComponent> =
  createFamilyRegistry("minimal", mn);
