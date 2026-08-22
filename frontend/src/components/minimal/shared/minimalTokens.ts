import type { ThemeTokens } from "@/components/shared/themeTokens";

/**
 * Black-and-white token bundle for the minimal family.
 * Geometry follows Impeccable kit (xs radii, hairline rules, no decorative shadow).
 * Palette is chroma-0 — no gold, patina, or accent hue.
 */
export const mn: ThemeTokens = {
  section: "min-w-0 bg-[var(--theme-bg)] text-[var(--theme-ink)]",
  sectionAlt: "min-w-0 bg-[var(--theme-bg-alt)] text-[var(--theme-ink)]",
  sectionDark: "min-w-0 bg-[var(--theme-bg-dark)] text-[var(--theme-on-dark)]",
  sectionPad:
    "px-4 py-[var(--sec-pad-y,4rem)] @min-[640px]:px-6 @min-[640px]:py-[var(--sec-pad-y-md,5rem)] @min-[768px]:px-10 @min-[768px]:py-[var(--sec-pad-y-lg,7rem)]",
  eyebrow:
    "font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--theme-ink)]",
  eyebrowOnDark:
    "font-mono text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-[var(--theme-on-dark)]",
  heading:
    "wrap-break-word font-[family-name:var(--theme-font-display)] font-normal tracking-[-0.01em]",
  headingHero:
    "wrap-break-word text-[calc(1.75rem*var(--sec-type-scale,1))] font-light leading-[1.12] @min-[640px]:text-[calc(2.25rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(3rem*var(--sec-type-scale,1))] @min-[1024px]:text-[calc(4rem*var(--sec-type-scale,1))]",
  headingSection:
    "wrap-break-word text-[calc(1.5rem*var(--sec-type-scale,1))] font-light leading-[1.14] @min-[640px]:text-[calc(2rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(2.75rem*var(--sec-type-scale,1))]",
  body: "font-[family-name:var(--theme-font-body)] text-[1rem] leading-[1.7] text-[var(--theme-muted)]",
  rule: "h-px w-10 bg-[var(--theme-line-strong)]",
  ruleOnDark: "h-px w-10 bg-[var(--theme-on-dark)]",
  primaryButton:
    "inline-flex min-h-11 items-center justify-center rounded-[var(--theme-radius-control)] border border-[var(--theme-ink)] bg-[var(--theme-ink)] px-8 py-3 text-sm font-medium tracking-[0.02em] text-[var(--theme-accent-contrast)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-ink)]",
  primaryButtonOnDark:
    "inline-flex min-h-11 items-center justify-center rounded-[var(--theme-radius-control)] border border-[var(--theme-on-dark)] bg-[var(--theme-on-dark)] px-8 py-3 text-sm font-medium tracking-[0.02em] text-[var(--theme-bg-dark)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--theme-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-on-dark)]",
  navLink:
    "inline-flex min-h-10 items-center px-1 py-2 text-sm text-[var(--theme-muted)] transition-colors hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-ink)]",
  navLinkOnDark:
    "inline-flex min-h-10 items-center px-1 py-2 text-sm text-[var(--theme-muted-on-dark)] transition-colors hover:text-[var(--theme-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-on-dark)]",
  input:
    "min-h-11 w-full rounded-[var(--theme-radius-tile)] border border-[var(--theme-line)] bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-ink)]",
  formCard:
    "rounded-[var(--theme-radius-tile)] border border-[var(--theme-line)] bg-[var(--theme-card)] shadow-none",
  accentText: "text-[var(--theme-ink)]",
  accentTextOnDark: "text-[var(--theme-on-dark)]",
  mutedOnDark: "text-[var(--theme-muted-on-dark)]",
};
