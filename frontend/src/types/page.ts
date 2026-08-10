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

export type PageSection = {
  type: SectionType;
  componentId: string;
  content: Record<string, unknown>;
  assets: PageAsset[];
};

export type Page = {
  sections: PageSection[];
};
