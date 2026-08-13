/** Tailwind class bundles for the premium casual theme (CSS vars from `.premium-theme`). */
export const pm = {
  section: "overflow-x-hidden bg-[var(--theme-bg)] text-[var(--theme-ink)]",
  sectionAlt: "overflow-x-hidden bg-[var(--theme-bg-alt)] text-[var(--theme-ink)]",
  sectionPad: "px-4 py-12 @min-[640px]:px-6 @min-[640px]:py-16 @min-[768px]:px-10 @min-[768px]:py-24",
  eyebrow:
    "text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--theme-accent)] @min-[640px]:text-xs @min-[640px]:tracking-[0.3em]",
  heading: "wrap-break-word font-[family-name:var(--font-display)] text-[var(--theme-ink)]",
  headingHero:
    "wrap-break-word text-[1.75rem] leading-[1.15] @min-[640px]:text-4xl @min-[768px]:text-5xl @min-[1024px]:text-6xl @min-[1280px]:text-7xl",
  headingSection:
    "wrap-break-word text-[1.625rem] leading-tight @min-[640px]:text-3xl @min-[768px]:text-4xl @min-[1024px]:text-5xl",
  body: "wrap-break-word font-[family-name:var(--font-body)] text-[var(--theme-muted)] leading-relaxed",
  accentRule: "h-px w-12 bg-[var(--theme-accent)]/60 @min-[640px]:w-16",
  primaryButton:
    "inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 py-3 text-sm font-medium text-[var(--theme-accent-contrast)] shadow-[0_18px_48px_rgba(0,0,0,0.28)] transition duration-200 hover:bg-[var(--theme-accent-on-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] disabled:cursor-not-allowed disabled:opacity-70 @min-[640px]:w-auto @min-[640px]:px-8",
  secondaryButton:
    "inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full border border-[var(--theme-accent)]/50 bg-transparent px-6 py-3 text-sm font-medium text-[var(--theme-ink)] transition duration-200 hover:border-[var(--theme-accent)] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] disabled:cursor-not-allowed disabled:opacity-70 @min-[640px]:w-auto @min-[640px]:px-8",
  panel:
    "rounded-[1.75rem] border border-white/10 bg-white/[0.04] shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-sm",
  navLink:
    "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3 py-2 text-xs uppercase tracking-[0.22em] text-[var(--theme-muted)] transition duration-200 hover:bg-white/[0.05] hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)] @min-[768px]:text-[11px]",
  footerLink:
    "text-sm text-[var(--theme-muted)] transition duration-200 hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]",
  inputLabel:
    "text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--theme-accent)] @min-[640px]:text-xs",
  input:
    "min-h-12 w-full rounded-2xl border border-white/12 bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-ink)] outline-none transition duration-200 placeholder:text-[var(--theme-muted)]/70 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20",
  inputLight:
    "min-h-12 w-full rounded-2xl border border-[var(--theme-line-strong)]/35 bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-ink)] outline-none transition duration-200 placeholder:text-[var(--theme-muted)] focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20",
} as const;
