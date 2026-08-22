import type { ThemeTokens } from "@/components/shared/themeTokens";

/** Tailwind token bundle for the warm rustic family. */
export const rs: ThemeTokens = {
  section: "overflow-x-hidden bg-[var(--theme-bg)] text-[var(--theme-ink)]",
  sectionAlt: "overflow-x-hidden bg-[var(--theme-bg-alt)] text-[var(--theme-ink)]",
  sectionDark: "overflow-x-hidden bg-[var(--theme-bg-dark)] text-[var(--theme-on-dark)]",
  sectionPad:
    "px-4 py-[var(--sec-pad-y,3.5rem)] @min-[640px]:px-6 @min-[640px]:py-[var(--sec-pad-y-md,4.5rem)] @min-[768px]:px-10 @min-[768px]:py-[var(--sec-pad-y-lg,6rem)]",
  eyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--theme-accent)] @min-[640px]:text-xs",
  eyebrowOnDark:
    "text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--theme-accent-on-dark)] @min-[640px]:text-xs",
  heading: "wrap-break-word font-[family-name:var(--theme-font-display)]",
  headingHero:
    "wrap-break-word text-[calc(2rem*var(--sec-type-scale,1))] leading-[1.05] @min-[640px]:text-[calc(3rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(3.75rem*var(--sec-type-scale,1))] @min-[1024px]:text-[calc(5.25rem*var(--sec-type-scale,1))]",
  headingSection:
    "wrap-break-word text-[calc(1.9rem*var(--sec-type-scale,1))] leading-[1.08] @min-[640px]:text-[calc(2.5rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(3.25rem*var(--sec-type-scale,1))]",
  body: "font-[family-name:var(--theme-font-body)] leading-relaxed text-[var(--theme-muted)]",
  rule: "h-px w-16 bg-[var(--theme-line-strong)]",
  ruleOnDark: "h-px w-16 bg-[var(--theme-accent-on-dark)]",
  primaryButton:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 py-3 text-sm font-semibold text-[var(--theme-accent-contrast)] shadow-[0_18px_40px_rgba(84,52,33,0.22)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] @min-[640px]:px-8",
  primaryButtonOnDark:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--theme-on-dark)] bg-[var(--theme-on-dark)] px-6 py-3 text-sm font-semibold text-[var(--theme-bg-dark)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--theme-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-on-dark)] @min-[640px]:px-8",
  navLink:
    "inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-card)] hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  navLinkOnDark:
    "inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm text-[var(--theme-muted-on-dark)] transition-colors hover:bg-white/10 hover:text-[var(--theme-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-on-dark)]",
  input:
    "min-h-11 w-full rounded-[1rem] border border-[var(--theme-line)] bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  formCard:
    "rounded-[2rem] border border-[var(--theme-line)] bg-[var(--theme-card)] shadow-[0_24px_70px_rgba(74,44,24,0.12)]",
  accentText: "text-[var(--theme-accent)]",
  accentTextOnDark: "text-[var(--theme-accent-on-dark)]",
  mutedOnDark: "text-[var(--theme-muted-on-dark)]",
};
