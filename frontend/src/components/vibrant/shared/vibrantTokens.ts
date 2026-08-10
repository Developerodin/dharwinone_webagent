import type { ThemeTokens } from "@/components/shared/themeTokens";

/** Tailwind token bundle for the high-energy vibrant family. */
export const vb: ThemeTokens = {
  section: "overflow-x-hidden bg-[var(--theme-bg)] text-[var(--theme-ink)]",
  sectionAlt: "overflow-x-hidden bg-[var(--theme-bg-alt)] text-[var(--theme-ink)]",
  sectionDark: "overflow-x-hidden bg-[var(--theme-bg-dark)] text-[var(--theme-on-dark)]",
  sectionPad:
    "px-4 py-14 @min-[640px]:px-6 @min-[640px]:py-18 @min-[768px]:px-10 @min-[768px]:py-24",
  eyebrow:
    "text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--theme-accent)] @min-[640px]:text-xs",
  heading:
    "wrap-break-word font-[family-name:var(--theme-font-display)] text-[var(--theme-ink)]",
  headingHero:
    "wrap-break-word text-[2rem] leading-[0.98] @min-[640px]:text-[3.5rem] @min-[768px]:text-[4.5rem] @min-[1024px]:text-[5.5rem]",
  headingSection:
    "wrap-break-word text-[1.85rem] leading-[1.02] @min-[640px]:text-[2.6rem] @min-[768px]:text-[3.4rem]",
  body: "font-[family-name:var(--theme-font-body)] leading-relaxed text-[var(--theme-muted)]",
  rule: "h-1 w-16 rounded-full bg-[var(--theme-accent)]",
  primaryButton:
    "inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 py-3 text-sm font-bold text-[var(--theme-accent-contrast)] shadow-[0_18px_40px_rgba(255,104,76,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:scale-[1.01] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] @min-[640px]:px-8",
  navLink:
    "inline-flex min-h-10 items-center rounded-full border border-transparent px-4 py-2 text-sm font-medium text-[var(--theme-muted)] transition-colors hover:border-[var(--theme-line)] hover:bg-[var(--theme-card)] hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  input:
    "min-h-11 w-full rounded-[1rem] border border-[var(--theme-line)] bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  formCard:
    "rounded-[2rem] border border-[var(--theme-line)] bg-[var(--theme-card)] shadow-[0_28px_80px_rgba(7,16,27,0.12)]",
  accentText: "text-[var(--theme-accent)]",
  mutedOnDark: "text-[var(--theme-muted-on-dark)]",
};
