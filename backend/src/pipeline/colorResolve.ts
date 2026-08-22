/**
 * Resolves color names and hex codes to normalized #RRGGBB values,
 * and derives contrast-safe surface tokens for theme overrides.
 */

const NAMED_COLORS: Record<string, string> = {
  red: "#ef4444",
  crimson: "#dc143c",
  coral: "#ff684c",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  gold: "#c9a962",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  navy: "#1e3a5f",
  indigo: "#6366f1",
  purple: "#a855f7",
  violet: "#8b5cf6",
  pink: "#ec4899",
  maroon: "#800000",
  brown: "#9f6840",
  cream: "#f5f0e8",
  beige: "#f5f5dc",
  white: "#ffffff",
  black: "#111111",
  gray: "#6b7280",
  grey: "#6b7280",
  silver: "#c0c0c0",
  charcoal: "#2a2a2a",
  // Compound / common aliases
  "dark green": "#166534",
  "forest green": "#166534",
  "light green": "#86efac",
  "dark red": "#991b1b",
  "light red": "#fca5a5",
  "dark blue": "#1e3a8a",
  "light blue": "#93c5fd",
  "dark gray": "#374151",
  "dark grey": "#374151",
  "light gray": "#d1d5db",
  "light grey": "#d3d3d3",
  "dark orange": "#c2410c",
  "dark purple": "#6b21a8",
  "dark pink": "#9d174d",
  "dark brown": "#78350f",
  "dark yellow": "#a16207",
  "light yellow": "#fef08a",
  "off white": "#f5f5f5",
};

const FONT_STACKS: Record<string, string> = {
  serif: '"Playfair Display", "Times New Roman", serif',
  "instrument serif": '"Playfair Display", Georgia, serif',
  playfair: '"Playfair Display", Georgia, serif',
  "playfair display": '"Playfair Display", Georgia, serif',
  sans: '"DM Sans", system-ui, sans-serif',
  geist: '"DM Sans", system-ui, sans-serif',
  "dm sans": '"DM Sans", system-ui, sans-serif',
  modern: '"Sora", "DM Sans", system-ui, sans-serif',
  elegant: '"Playfair Display", Georgia, serif',
  rustic: '"Lora", Georgia, serif',
};

export type SurfaceTokens = {
  bgDark: string;
  card: string;
  muted: string;
  onDark: string;
  bgAlt?: string;
};

/**
 * Expands #RGB to #RRGGBB.
 */
function expandShortHex(hex: string): string {
  if (hex.length !== 4) return hex;
  const [, r, g, b] = hex;
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

/**
 * Parses #rrggbb into RGB channels.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  return {
    r: Number.parseInt(cleaned.slice(0, 2), 16),
    g: Number.parseInt(cleaned.slice(2, 4), 16),
    b: Number.parseInt(cleaned.slice(4, 6), 16),
  };
}

/**
 * Formats RGB channels as #rrggbb.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Relative luminance 0–1 (sRGB approximation).
 */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

/**
 * WCAG 2.1 relative luminance (linearised sRGB). Unlike `luminance`, which is a
 * YIQ brightness approximation kept for legacy surface heuristics, this is the
 * value contrast ratios must be computed from.
 */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
  );
}

/**
 * WCAG contrast ratio between two colors, 1–21.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Darkens a hex color by mixing toward black.
 */
function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(rgb.r * (1 - amount), rgb.g * (1 - amount), rgb.b * (1 - amount));
}

/**
 * Lightens a hex color by mixing toward white.
 */
function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount,
  );
}

/**
 * Strips quotes, slashes, and whitespace junk around a color token.
 */
function sanitizeColorInput(input: string): string {
  return input
    .trim()
    .replace(/^["'`/\\]+/, "")
    .replace(/["'`/\\]+$/, "")
    .trim();
}

/**
 * Resolves a user color (name or hex) to #rrggbb, or null if invalid.
 */
export function resolveColor(input: string): string | null {
  const raw = sanitizeColorInput(input);
  if (!raw) return null;

  const hexMatch = raw.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const withHash = `#${hexMatch[1]}`;
    return expandShortHex(
      withHash.length === 4 ? withHash : withHash.toLowerCase(),
    );
  }

  const lower = raw.toLowerCase().replace(/\s+/g, " ");
  if (NAMED_COLORS[lower]) return NAMED_COLORS[lower] ?? null;

  // dark/light + base color (e.g. "dark green" if not in aliases)
  const modMatch = lower.match(/^(dark|light)\s+([a-z]+)$/);
  if (modMatch) {
    const [, mod, base] = modMatch;
    const baseHex = NAMED_COLORS[base ?? ""];
    if (baseHex) {
      return mod === "dark" ? darken(baseHex, 0.35) : lighten(baseHex, 0.35);
    }
  }

  return null;
}

/**
 * Nudges an accent's lightness just far enough that one of the two ink
 * candidates clears AA. Some otherwise good hues (mid oranges, sages, golds)
 * sit in a band where neither black nor white is readable on them; a few
 * percent of lightness fixes that and is imperceptible next to the original.
 * Returns the input unchanged when it already works.
 */
export function ensureAccentIsUsable(accentHex: string, floor = 4.5): string {
  const best = (hex: string): number =>
    Math.max(contrastRatio(hex, "#111111"), contrastRatio(hex, "#ffffff"));

  if (best(accentHex) >= floor) return accentHex;

  // Move toward whichever pole is already winning, so the hue reads the same.
  const towardDark = contrastRatio(accentHex, "#ffffff") >= contrastRatio(accentHex, "#111111");

  let candidate = accentHex;
  for (let step = 1; step <= 14; step += 1) {
    candidate = towardDark
      ? darken(accentHex, step * 0.03)
      : lighten(accentHex, step * 0.03);
    if (best(candidate) >= floor) return candidate;
  }
  return candidate;
}

/**
 * Picks a readable contrast color for buttons on an accent.
 */
export function contrastForAccent(accentHex: string): string {
  const dark = "#111111";
  const light = "#ffffff";
  const darkRatio = contrastRatio(accentHex, dark);
  const lightRatio = contrastRatio(accentHex, light);
  return darkRatio >= lightRatio ? dark : light;
}

/**
 * Derives bg-dark / card / muted / on-dark so ink never sits on near-black
 * when the user set a light bg (e.g. black & white theme).
 */
export function deriveSurfaceTokens(args: {
  bg?: string | null;
  ink?: string | null;
  bgAlt?: string | null;
}): SurfaceTokens | null {
  const bg = args.bg ? resolveColor(args.bg) ?? args.bg : null;
  const ink = args.ink ? resolveColor(args.ink) ?? args.ink : null;
  if (!bg && !ink) return null;

  const bgHex = bg ?? "#f6f5f2";
  const inkHex = ink ?? "#111111";
  const bgIsLight = luminance(bgHex) > 0.55;

  const bgDark = bgIsLight ? darken(bgHex, 0.06) : bgHex;
  const card = bgIsLight ? darken(bgHex, 0.04) : lighten(bgHex, 0.12);
  const muted = bgIsLight
    ? lighten(inkHex, 0.35)
    : darken(contrastForAccent(bgDark) === "#ffffff" ? "#ffffff" : inkHex, 0.15);
  // Text sitting on bg-dark surfaces
  const onDark = luminance(bgDark) > 0.55 ? inkHex : "#f5f5f5";
  const bgAlt = args.bgAlt
    ? (resolveColor(args.bgAlt) ?? args.bgAlt)
    : bgIsLight
      ? darken(bgHex, 0.03)
      : lighten(bgHex, 0.08);

  return { bgDark, card, muted, onDark, bgAlt };
}

/**
 * Resolves a font ask to a CSS font-family stack, or null.
 */
export function resolveFont(input: string): string | null {
  const key = input.trim().toLowerCase();
  if (!key) return null;
  if (FONT_STACKS[key]) return FONT_STACKS[key] ?? null;
  for (const [name, stack] of Object.entries(FONT_STACKS)) {
    if (key.includes(name)) return stack;
  }
  return null;
}

/**
 * Lists supported named colors for Ask agent replies.
 */
export function listNamedColors(): string[] {
  return Object.keys(NAMED_COLORS).sort();
}
