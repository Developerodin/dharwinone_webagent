export type SectionType =
  | "header"
  | "hero"
  | "menu"
  | "about"
  | "gallery"
  | "location_map"
  | "services"
  | "stats"
  | "testimonials"
  | "team"
  | "reservation"
  | "contact"
  | "footer";

export type PageAsset = {
  key: string;
  imagePath: string;
};

export type ThemeOverrides = {
  accent?: string;
  accentContrast?: string;
  bg?: string;
  bgAlt?: string;
  bgDark?: string;
  card?: string;
  muted?: string;
  onDark?: string;
  ink?: string;
  fontDisplay?: string;
  fontBody?: string;
};

export type SectionStyleOverrides = {
  background?: string;
  text?: string;
  button?: string;
  paddingY?: "tight" | "normal" | "roomy";
};

export type SectionLayout = {
  emphasis: "hero" | "major" | "standard" | "compact";
  intent:
    | "full_bleed"
    | "split_left"
    | "split_right"
    | "centered"
    | "editorial_columns"
    | "grid"
    | "band"
    | "overlap"
    | "marquee";
  background: "base" | "alt" | "dark" | "accent" | "image";
  spacing: "tight" | "normal" | "roomy";
};

export const DEFAULT_SECTION_LAYOUT: SectionLayout = {
  emphasis: "standard",
  intent: "full_bleed",
  background: "base",
  spacing: "normal",
};

export type TextRun = { text: string; color?: string };

export type PageSection = {
  type: SectionType;
  componentId: string;
  content: Record<string, unknown>;
  assets: PageAsset[];
  styleOverrides?: SectionStyleOverrides;
  layout?: SectionLayout;
  rejectedLayouts?: SectionLayout[];
};

export type Page = {
  sections: PageSection[];
  themeOverrides?: ThemeOverrides;
};
