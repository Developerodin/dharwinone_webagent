import type { SectionComponent } from "@/components/premium/registry";
import { createFamilyRegistry } from "@/components/familyKit/createFamilyRegistry";
import { vb } from "./shared/vibrantTokens";

/** Shared registry for the vibrant restaurant family. */
export const vibrantRegistry: Record<string, SectionComponent> =
  createFamilyRegistry("vibrant", vb);
