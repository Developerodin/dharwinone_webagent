/** Shared visual token bundle for generated page families. */
export type ThemeTokens = {
  section: string;
  sectionAlt: string;
  sectionDark: string;
  sectionPad: string;
  eyebrow: string;
  /** Eyebrow color/weight tuned for dark bands and image overlays. */
  eyebrowOnDark: string;
  /** Font/display only — color comes from section inheritance or on-dark tokens. */
  heading: string;
  headingHero: string;
  headingSection: string;
  body: string;
  rule: string;
  ruleOnDark: string;
  primaryButton: string;
  /** High-contrast CTA for dark sections and hero overlays. */
  primaryButtonOnDark: string;
  navLink: string;
  /** Nav/footer links sitting on dark surfaces. */
  navLinkOnDark: string;
  input: string;
  formCard: string;
  accentText: string;
  accentTextOnDark: string;
  mutedOnDark: string;
};
