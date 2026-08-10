import type { ThemeTokens } from "@/components/shared/themeTokens";

/** Tailwind token bundle for the restrained minimal family. */
export const mn: ThemeTokens = {
  section: "overflow-x-hidden bg-[var(--theme-bg)] text-[var(--theme-ink)]",
  sectionAlt: "overflow-x-hidden bg-[var(--theme-bg-alt)] text-[var(--theme-ink)]",
  sectionDark: "overflow-x-hidden bg-[var(--theme-bg-dark)] text-[var(--theme-on-dark)]",
  sectionPad:
    "px-4 py-14 @min-[640px]:px-6 @min-[640px]:py-18 @min-[768px]:px-10 @min-[768px]:py-24",
  eyebrow:
    "text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--theme-accent)] @min-[640px]:text-xs",
  heading:
    "wrap-break-word font-[family-name:var(--theme-font-display)] text-[var(--theme-ink)]",
  headingHero:
    "wrap-break-word text-[2rem] leading-[1.04] @min-[640px]:text-5xl @min-[768px]:text-6xl @min-[1024px]:text-7xl",
  headingSection:
    "wrap-break-word text-[1.75rem] leading-[1.08] @min-[640px]:text-[2.4rem] @min-[768px]:text-[3rem]",
  body: "font-[family-name:var(--theme-font-body)] leading-relaxed text-[var(--theme-muted)]",
  rule: "h-px w-14 bg-[var(--theme-line-strong)]",
  primaryButton:
    "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--theme-ink)] bg-[var(--theme-ink)] px-6 py-3 text-sm font-medium text-[var(--theme-accent-contrast)] transition-colors duration-200 hover:bg-transparent hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-ink)] @min-[640px]:px-8",
  navLink:
    "inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-bg-alt)] hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  input:
    "min-h-11 w-full rounded-[1rem] border border-[var(--theme-line)] bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  formCard:
    "rounded-[2rem] border border-[var(--theme-line)] bg-[var(--theme-card)] shadow-[0_24px_60px_rgba(15,23,42,0.06)]",
  accentText: "text-[var(--theme-accent)]",
  mutedOnDark: "text-[var(--theme-muted-on-dark)]",
};
