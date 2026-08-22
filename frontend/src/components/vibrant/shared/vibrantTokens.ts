import type { ThemeTokens } from "@/components/shared/themeTokens";

/** Tailwind token bundle for the high-energy vibrant family. */
export const vb: ThemeTokens = {
  section: "overflow-x-hidden bg-[var(--theme-bg)] text-[var(--theme-ink)]",
  sectionAlt: "overflow-x-hidden bg-[var(--theme-bg-alt)] text-[var(--theme-ink)]",
  sectionDark: "overflow-x-hidden bg-[var(--theme-bg-dark)] text-[var(--theme-on-dark)]",
  sectionPad:
    "px-4 py-[var(--sec-pad-y,3.5rem)] @min-[640px]:px-6 @min-[640px]:py-[var(--sec-pad-y-md,4.5rem)] @min-[768px]:px-10 @min-[768px]:py-[var(--sec-pad-y-lg,6rem)]",
  eyebrow:
    "text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--theme-accent)] @min-[640px]:text-xs",
  eyebrowOnDark:
    "text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--theme-accent-on-dark)] @min-[640px]:text-xs",
  heading: "wrap-break-word font-[family-name:var(--theme-font-display)]",
  headingHero:
    "wrap-break-word text-[calc(2rem*var(--sec-type-scale,1))] leading-[0.98] @min-[640px]:text-[calc(3.5rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(4.5rem*var(--sec-type-scale,1))] @min-[1024px]:text-[calc(5.5rem*var(--sec-type-scale,1))]",
  headingSection:
    "wrap-break-word text-[calc(1.85rem*var(--sec-type-scale,1))] leading-[1.02] @min-[640px]:text-[calc(2.6rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(3.4rem*var(--sec-type-scale,1))]",
  body: "font-[family-name:var(--theme-font-body)] leading-relaxed text-[var(--theme-muted)]",
  rule: "h-1 w-16 rounded-full bg-[var(--theme-accent)]",
  ruleOnDark: "h-1 w-16 rounded-full bg-[var(--theme-accent-on-dark)]",
  primaryButton:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 py-3 text-sm font-bold text-[var(--theme-accent-contrast)] shadow-[0_18px_40px_rgba(255,104,76,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] @min-[640px]:px-8",
  primaryButtonOnDark:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--theme-on-dark)] bg-[var(--theme-on-dark)] px-6 py-3 text-sm font-bold text-[var(--theme-bg-dark)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--theme-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-on-dark)] @min-[640px]:px-8",
  navLink:
    "inline-flex min-h-10 items-center rounded-full border border-transparent px-4 py-2 text-sm font-medium text-[var(--theme-muted)] transition-colors hover:border-[var(--theme-line)] hover:bg-[var(--theme-card)] hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  navLinkOnDark:
    "inline-flex min-h-10 items-center rounded-full border border-transparent px-4 py-2 text-sm font-medium text-[var(--theme-muted-on-dark)] transition-colors hover:border-white/20 hover:bg-white/10 hover:text-[var(--theme-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-on-dark)]",
  input:
    "min-h-11 w-full rounded-[1rem] border border-[var(--theme-line)] bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  formCard:
    "rounded-[2rem] border border-[var(--theme-line)] bg-[var(--theme-card)] shadow-[0_28px_80px_rgba(7,16,27,0.12)]",
  accentText: "text-[var(--theme-accent)]",
  accentTextOnDark: "text-[var(--theme-accent-on-dark)]",
  mutedOnDark: "text-[var(--theme-muted-on-dark)]",
};
