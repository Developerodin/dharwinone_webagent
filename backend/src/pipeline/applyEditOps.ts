import type { PageFamily } from "../config/pageFamily.js";
import type { Brief, MenuItem } from "../schemas/brief.schema.js";
import type { EditOp } from "../schemas/editOps.schema.js";
import type { Page, PageSection, SectionType } from "../schemas/page.schema.js";
import { COMPONENT_VARIANTS, pickComponent } from "./pickComponent.js";
import {
  listCatalogImagePaths,
  orientationForSection,
  pickGalleryImages,
  pickImage,
} from "./pickImage.js";
import { rewriteSectionCopy } from "./rewriteCopy.js";

export type ApplyEditOpsResult = {
  page: Page;
  brief: Brief;
  family: PageFamily;
  applied: EditOp[];
  notes: string[];
};

type MenuContentItem = {
  name: string;
  price: number;
  description?: string;
};

/**
 * Case-insensitive name match helper.
 */
function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Deep-clones page JSON for immutable-style edits.
 */
function clonePage(page: Page): Page {
  return structuredClone(page);
}

/**
 * Finds a section by type; returns null when missing.
 */
function findSection(
  sections: PageSection[],
  type: SectionType,
): PageSection | null {
  return sections.find((section) => section.type === type) ?? null;
}

/**
 * Reads menu items from the menu section content.
 */
function readMenuItems(section: PageSection | null): MenuContentItem[] {
  if (!section) return [];
  const items = section.content.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter(
      (item): item is { name: string; price: number; description?: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { name?: unknown }).name === "string" &&
        typeof (item as { price?: unknown }).price === "number",
    )
    .map((item) => ({
      name: item.name,
      price: item.price,
      description:
        typeof item.description === "string" ? item.description : undefined,
    }));
}

/**
 * Writes menu items into the menu section and syncs the brief.
 */
function writeMenuItems(
  page: Page,
  brief: Brief,
  items: MenuContentItem[],
): void {
  const menu = findSection(page.sections, "menu");
  if (menu) {
    menu.content = { ...menu.content, items };
  }
  brief.menuItems = items.map(
    (item): MenuItem => ({
      name: item.name,
      price: item.price,
      description: item.description ?? null,
    }),
  );
}

/** Default gallery size for builds and theme switches. */
const DEFAULT_GALLERY_COUNT = 4;

/**
 * Builds a de-duplicated gallery asset list of the requested length.
 */
function buildGalleryAssets(
  family: PageFamily,
  count: number,
  preferred?: string | null,
  category?: string | null,
): PageSection["assets"] {
  const pool = pickGalleryImages(Math.max(count, 6), family, category);
  const unique: string[] = [];
  if (preferred && !unique.includes(preferred)) unique.push(preferred);
  for (const path of pool) {
    if (!unique.includes(path)) unique.push(path);
    if (unique.length >= count) break;
  }
  return unique.slice(0, count).map((path, index) => ({
    key: `gallery-${index}`,
    imagePath: path,
  }));
}

/**
 * Assigns a primary (or gallery) asset path onto a section.
 */
function setSectionImage(
  section: PageSection,
  imagePath: string,
  family: PageFamily,
  category?: string | null,
): void {
  if (section.type === "gallery") {
    const count = Math.max(section.assets.length || DEFAULT_GALLERY_COUNT, 1);
    section.assets = buildGalleryAssets(family, count, imagePath, category);
    return;
  }

  section.assets = [{ key: "primary", imagePath }];
}

/**
 * Remaps all section components and images to a target family.
 */
function applyTheme(page: Page, family: PageFamily, brief: Brief): void {
  ensureShellSections(page, family, brief);
  const category = brief.category;

  for (const section of page.sections) {
    section.componentId = pickComponent(section.type, family, {
      preferComponentId: section.componentId,
    });

    if (
      section.type === "menu" ||
      section.type === "services" ||
      section.type === "stats" ||
      section.type === "testimonials" ||
      section.type === "header" ||
      section.type === "contact" ||
      section.type === "footer" ||
      section.type === "reservation"
    ) {
      continue;
    }

    if (section.type === "gallery") {
      const count = Math.max(section.assets.length || DEFAULT_GALLERY_COUNT, 1);
      section.assets = buildGalleryAssets(family, count, null, category);
      continue;
    }

    if (section.type === "team") {
      const paths = listCatalogImagePaths({
        sectionType: "team",
        family,
        category,
      }).slice(0, 3);
      section.assets = paths.map((imagePath, index) => ({
        key: `team-${index}`,
        imagePath,
      }));
      continue;
    }

    if (section.type === "hero" && section.componentId.endsWith("-03")) {
      const paths = listCatalogImagePaths({
        sectionType: "hero",
        family,
        category,
      }).slice(0, 3);
      section.assets = paths.map((imagePath, index) => ({
        key: `slide-${index}`,
        imagePath,
      }));
      continue;
    }

    const imagePath = pickImage({
      sectionType: section.type,
      orientation: orientationForSection(section.type),
      family,
      category,
    });
    section.assets = imagePath
      ? [{ key: "primary", imagePath }]
      : [];
  }

  pruneNavToPresentSections(page);
}

const DEFAULT_NAV = [
  { label: "About", target: "about" as const },
  { label: "Menu", target: "menu" as const },
  { label: "Gallery", target: "gallery" as const },
  { label: "Reservations", target: "reservation" as const },
  { label: "Contact", target: "contact" as const },
];

/**
 * Inserts header/contact/footer when an older page is missing them.
 */
function ensureShellSections(
  page: Page,
  family: PageFamily,
  brief: Brief,
): void {
  const types = new Set(page.sections.map((section) => section.type));

  if (!types.has("header")) {
    page.sections.unshift({
      type: "header",
      componentId: pickComponent("header", family),
      content: {
        brandName: brief.businessName,
        tagline: `Restaurant · ${brief.category}`,
        navItems: DEFAULT_NAV,
      },
      assets: [],
    });
  }

  if (!types.has("contact")) {
    const footerIndex = page.sections.findIndex((s) => s.type === "footer");
    const contactSection = {
      type: "contact" as const,
      componentId: pickComponent("contact", family),
      content: {
        headline: "Get In Touch",
        introText: "Questions, bookings, or private events — we are here.",
        ctaLabel: "Send Message",
        phone: brief.phone,
        address: brief.address,
      },
      assets: [],
    };
    if (footerIndex >= 0) {
      page.sections.splice(footerIndex, 0, contactSection);
    } else {
      page.sections.push(contactSection);
    }
  }

  if (!types.has("footer")) {
    page.sections.push({
      type: "footer",
      componentId: pickComponent("footer", family),
      content: {
        tagline: `Thank you for visiting ${brief.businessName}`,
        copyright: `© ${new Date().getFullYear()} ${brief.businessName}. All rights reserved.`,
        brandName: brief.businessName,
        phone: brief.phone,
        address: brief.address,
        navItems: DEFAULT_NAV,
      },
      assets: [],
    });
  }
}

/**
 * Keeps header/footer nav links only for sections present on the page.
 */
function pruneNavToPresentSections(page: Page): void {
  const present = new Set(page.sections.map((section) => section.type));
  for (const section of page.sections) {
    if (section.type !== "header" && section.type !== "footer") continue;
    const navItems = section.content.navItems;
    if (!Array.isArray(navItems)) continue;
    section.content.navItems = navItems.filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { target?: unknown }).target === "string" &&
        present.has((item as { target: SectionType }).target),
    );
  }
}

/**
 * Applies a single edit op; returns a human note when something changed.
 */
async function applyOneOp(
  page: Page,
  brief: Brief,
  family: PageFamily,
  op: EditOp,
): Promise<{ family: PageFamily; note: string | null }> {
  switch (op.op) {
    case "set_copy": {
      const section = findSection(page.sections, op.section);
      if (!section) return { family, note: `No ${op.section} section to update.` };
      section.content = { ...section.content, [op.field]: op.value };
      return {
        family,
        note: `Updated ${op.section}.${op.field}.`,
      };
    }
    case "rewrite_copy": {
      const section = findSection(page.sections, op.section);
      if (!section) {
        return { family, note: `No ${op.section} section to rewrite.` };
      }
      const current =
        typeof section.content[op.field] === "string"
          ? String(section.content[op.field])
          : "";
      const value = await rewriteSectionCopy({
        brief,
        section: op.section,
        field: op.field,
        currentValue: current,
        instruction: op.hint ?? `Rewrite the ${op.field}`,
        maxWords: op.maxWords,
      });
      section.content = { ...section.content, [op.field]: value };
      return {
        family,
        note: `Rewrote ${op.section}.${op.field} → “${value}”.`,
      };
    }
    case "set_menu_price": {
      const items = readMenuItems(findSection(page.sections, "menu"));
      const target = items.find((item) => namesMatch(item.name, op.name));
      if (!target) {
        return { family, note: `Menu item “${op.name}” not found.` };
      }
      target.price = op.price;
      writeMenuItems(page, brief, items);
      const priceLabel =
        Number.isInteger(op.price) && op.price >= 100
          ? `₹${op.price}`
          : `$${op.price.toFixed(2)}`;
      return {
        family,
        note: `Set ${target.name} price to ${priceLabel}.`,
      };
    }
    case "rename_menu_item": {
      const items = readMenuItems(findSection(page.sections, "menu"));
      const target = items.find((item) => namesMatch(item.name, op.from));
      if (!target) {
        return { family, note: `Menu item “${op.from}” not found.` };
      }
      const previous = target.name;
      target.name = op.to;
      writeMenuItems(page, brief, items);
      return { family, note: `Renamed “${previous}” to “${op.to}”.` };
    }
    case "remove_menu_item": {
      const items = readMenuItems(findSection(page.sections, "menu"));
      const next = items.filter((item) => !namesMatch(item.name, op.name));
      if (next.length === items.length) {
        return { family, note: `Menu item “${op.name}” not found.` };
      }
      writeMenuItems(page, brief, next);
      return { family, note: `Removed “${op.name}” from the menu.` };
    }
    case "cycle_image": {
      const section = findSection(page.sections, op.section);
      if (!section) {
        return { family, note: `No ${op.section} section for image change.` };
      }
      if (
        section.type === "menu" ||
        section.type === "services" ||
        section.type === "stats" ||
        section.type === "testimonials"
      ) {
        return {
          family,
          note: `${section.type} does not use a primary image.`,
        };
      }
      const paths = listCatalogImagePaths({
        sectionType: section.type,
        family,
        category: brief.category,
      });
      if (paths.length === 0) {
        return { family, note: `No catalog images for ${section.type}.` };
      }
      const current = section.assets[0]?.imagePath;
      const currentIndex = current ? paths.indexOf(current) : -1;
      const nextIndex =
        typeof op.index === "number"
          ? op.index % paths.length
          : (currentIndex + 1) % paths.length;
      const nextPath = paths[nextIndex] ?? paths[0];
      if (!nextPath) return { family, note: null };
      setSectionImage(section, nextPath, family, brief.category);
      return {
        family,
        note: `Updated ${section.type} image.`,
      };
    }
    case "set_image": {
      const section = findSection(page.sections, op.section);
      if (!section) {
        return { family, note: `No ${op.section} section for image change.` };
      }
      const allowed = listCatalogImagePaths({
        sectionType: section.type,
        family,
        category: brief.category,
      });
      if (!allowed.includes(op.imagePath)) {
        return {
          family,
          note: `Image path not in catalog for ${section.type}.`,
        };
      }
      setSectionImage(section, op.imagePath, family, brief.category);
      return { family, note: `Set ${section.type} image.` };
    }
    case "set_theme": {
      applyTheme(page, op.family, brief);
      return {
        family: op.family,
        note: `Switched theme to ${op.family}.`,
      };
    }
    case "set_gallery_count": {
      const section = findSection(page.sections, "gallery");
      if (!section) {
        return { family, note: "No gallery section to update." };
      }
      section.assets = buildGalleryAssets(family, op.count, null, brief.category);
      return {
        family,
        note: `Gallery now shows ${op.count} image${op.count === 1 ? "" : "s"}.`,
      };
    }
    case "cycle_section_component": {
      const section = findSection(page.sections, op.section);
      if (!section) {
        return { family, note: `No ${op.section} section to restyle.` };
      }
      const variants = COMPONENT_VARIANTS[family][section.type];
      if (variants.length < 2) {
        return {
          family,
          note: `Only one ${section.type} layout is available right now.`,
        };
      }
      const currentIndex = Math.max(0, variants.indexOf(section.componentId));
      const nextId = variants[(currentIndex + 1) % variants.length]!;
      const previous = section.componentId;
      section.componentId = nextId;

      if (section.type === "hero" && nextId.endsWith("-03")) {
        const paths = listCatalogImagePaths({
          sectionType: "hero",
          family,
          category: brief.category,
        }).slice(0, 3);
        section.assets = paths.map((imagePath, index) => ({
          key: `slide-${index}`,
          imagePath,
        }));
      } else if (section.type === "hero" && previous.endsWith("-03")) {
        const imagePath = pickImage({
          sectionType: "hero",
          orientation: orientationForSection("hero"),
          family,
          category: brief.category,
        });
        section.assets = imagePath ? [{ key: "primary", imagePath }] : [];
      }

      return {
        family,
        note: `Switched ${section.type} layout: ${previous} → ${nextId}.`,
      };
    }
    default: {
      return { family, note: null };
    }
  }
}

/**
 * Backfills a venue image when location_map has no assets (e.g. pages built
 * before location_map was wired to the about catalog pool).
 */
function ensureLocationAssets(
  page: Page,
  family: PageFamily,
  brief: Brief,
): void {
  const section = findSection(page.sections, "location_map");
  if (!section || section.assets.length > 0) return;

  const imagePath = pickImage({
    sectionType: "location_map",
    orientation: orientationForSection("location_map"),
    family,
    category: brief.category,
    seed: `${brief.businessName}:${brief.category}`,
  });
  if (!imagePath) return;
  section.assets = [{ key: "primary", imagePath }];
}

/**
 * Applies structured edit ops to page + brief. Pure aside from catalog reads / rewrite LLM.
 */
export async function applyEditOps(args: {
  page: Page;
  brief: Brief;
  family: PageFamily;
  ops: EditOp[];
}): Promise<ApplyEditOpsResult> {
  const page = clonePage(args.page);
  const brief = structuredClone(args.brief);
  let family = args.family;
  const applied: EditOp[] = [];
  const notes: string[] = [];

  for (const op of args.ops) {
    const result = await applyOneOp(page, brief, family, op);
    family = result.family;
    applied.push(op);
    if (result.note) notes.push(result.note);
  }

  ensureLocationAssets(page, family, brief);

  return { page, brief, family, applied, notes };
}
