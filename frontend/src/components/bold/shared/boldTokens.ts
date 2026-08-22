import type { ThemeTokens } from "@/components/shared/themeTokens";

/** Tailwind token bundle for the bold casual / QSR family (crimson + script accents). */
export const bd: ThemeTokens = {
  section: "overflow-x-hidden bg-[var(--theme-bg)] text-[var(--theme-ink)]",
  sectionAlt: "overflow-x-hidden bg-[var(--theme-bg-alt)] text-[var(--theme-ink)]",
  sectionDark: "overflow-x-hidden bg-[var(--theme-bg-dark)] text-[var(--theme-on-dark)]",
  sectionPad:
    "px-4 py-[var(--sec-pad-y,3.5rem)] @min-[640px]:px-6 @min-[640px]:py-[var(--sec-pad-y-md,4.5rem)] @min-[768px]:px-10 @min-[768px]:py-[var(--sec-pad-y-lg,6rem)]",
  eyebrow:
    "font-[family-name:var(--bold-font-script)] text-xl font-normal normal-case tracking-normal text-[var(--theme-accent)] @min-[640px]:text-2xl",
  eyebrowOnDark:
    "font-[family-name:var(--bold-font-script)] text-xl font-normal normal-case tracking-normal text-[var(--theme-accent-on-dark)] @min-[640px]:text-2xl",
  heading: "wrap-break-word font-[family-name:var(--theme-font-display)] font-bold uppercase tracking-tight",
  headingHero:
    "wrap-break-word text-[calc(2.75rem*var(--sec-type-scale,1))] leading-[0.92] @min-[640px]:text-[calc(4.5rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(5.75rem*var(--sec-type-scale,1))] @min-[1024px]:text-[calc(6.5rem*var(--sec-type-scale,1))]",
  headingSection:
    "wrap-break-word text-[calc(2rem*var(--sec-type-scale,1))] leading-[0.98] @min-[640px]:text-[calc(2.75rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(3.5rem*var(--sec-type-scale,1))]",
  body: "font-[family-name:var(--theme-font-body)] leading-relaxed text-[var(--theme-muted)]",
  rule: "h-1 w-14 rounded-full bg-[var(--theme-accent)]",
  ruleOnDark: "h-1 w-14 rounded-full bg-[var(--theme-accent-on-dark)]",
  primaryButton:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--theme-accent)] px-7 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--theme-accent-contrast)] shadow-[0_16px_36px_rgba(220,148,87,0.35)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] @min-[640px]:px-9",
  primaryButtonOnDark:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--theme-on-dark)] bg-[var(--theme-on-dark)] px-7 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--theme-bg-dark)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--theme-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-on-dark)] @min-[640px]:px-9",
  navLink:
    "inline-flex min-h-10 items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-ink)] transition-colors hover:text-[var(--theme-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  navLinkOnDark:
    "inline-flex min-h-10 items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--theme-on-dark)] transition-colors hover:text-[var(--theme-accent-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent-on-dark)]",
  input:
    "min-h-11 w-full rounded-full border border-[var(--theme-line)] bg-[var(--theme-card)] px-5 py-3 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  formCard:
    "rounded-[2rem] border border-[var(--theme-line)] bg-[var(--theme-card)] shadow-[0_24px_70px_rgba(28,33,35,0.1)]",
  accentText: "text-[var(--theme-accent)]",
  accentTextOnDark: "text-[var(--theme-accent-on-dark)]",
  mutedOnDark: "text-[var(--theme-muted-on-dark)]",
};
