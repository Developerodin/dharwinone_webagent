import type { SectionComponent } from "./premium/registry";
import { boldRegistry } from "./bold/registry";
import { elegantRegistry } from "./elegant/registry";
import { minimalRegistry } from "./minimal/registry";
import { componentRegistry as premiumRegistry } from "./premium/registry";
import { rusticRegistry } from "./rustic/registry";
import { vibrantRegistry } from "./vibrant/registry";

/**
 * Unified registry for all component families.
 */
export const pageComponentRegistry: Record<string, SectionComponent> = {
  ...premiumRegistry,
  ...elegantRegistry,
  ...minimalRegistry,
  ...rusticRegistry,
  ...vibrantRegistry,
  ...boldRegistry,
};
