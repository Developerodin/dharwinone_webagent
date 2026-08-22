/** Tailwind class bundles for the Caverta-inspired elegant theme. */
export const eg = {
  section: "overflow-x-hidden bg-[var(--eg-bg)] text-[var(--eg-cream)]",
  sectionAlt: "overflow-x-hidden bg-[var(--eg-bg-alt)] text-[var(--eg-cream)]",
  sectionPad: "px-4 py-[var(--sec-pad-y,3rem)] @min-[640px]:px-6 @min-[640px]:py-[var(--sec-pad-y-md,4rem)] @min-[768px]:px-10 @min-[768px]:py-[var(--sec-pad-y-lg,6rem)]",
  eyebrow:
    "text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--eg-gold)] @min-[640px]:text-xs @min-[640px]:tracking-[0.35em]",
  heading:
    "wrap-break-word font-[family-name:var(--eg-font-display)] text-[var(--eg-cream)]",
  headingHero:
    "wrap-break-word text-[calc(1.75rem*var(--sec-type-scale,1))] leading-[1.15] @min-[640px]:text-[calc(2.25rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(3rem*var(--sec-type-scale,1))] @min-[1024px]:text-[calc(3.75rem*var(--sec-type-scale,1))] @min-[1280px]:text-[calc(4.5rem*var(--sec-type-scale,1))]",
  headingSection:
    "wrap-break-word text-[calc(1.625rem*var(--sec-type-scale,1))] leading-tight @min-[640px]:text-[calc(1.875rem*var(--sec-type-scale,1))] @min-[768px]:text-[calc(2.25rem*var(--sec-type-scale,1))] @min-[1024px]:text-[calc(3rem*var(--sec-type-scale,1))]",
  body: "wrap-break-word font-[family-name:var(--eg-font-body)] text-[var(--eg-muted)]",
  goldRule: "h-px w-10 bg-[var(--eg-gold)] @min-[640px]:w-16",
  goldButton:
    "inline-flex min-h-11 w-full max-w-xs items-center justify-center border border-[var(--eg-gold)] px-6 py-3 text-xs uppercase tracking-[0.2em] text-[var(--eg-gold)] transition-colors duration-200 hover:bg-[var(--eg-gold)] hover:text-[var(--eg-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)] @min-[640px]:w-auto @min-[640px]:px-8 @min-[640px]:text-sm",
  panel:
    "rounded-[1.75rem] border border-[var(--eg-gold)]/20 bg-white/[0.03] shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-sm",
  navLink:
    "inline-flex min-h-11 items-center justify-center rounded-full px-3 py-2 text-xs uppercase tracking-[0.22em] text-[var(--eg-muted)] transition duration-200 hover:bg-white/[0.04] hover:text-[var(--eg-cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)] @min-[768px]:text-[11px]",
  footerLink:
    "text-sm text-[var(--eg-muted)] transition duration-200 hover:text-[var(--eg-gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)]",
  inputLabel:
    "text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--eg-gold)] @min-[640px]:text-xs",
  input:
    "min-h-12 w-full rounded-2xl border border-[var(--eg-gold)]/20 bg-[#151515] px-4 py-3 text-sm text-[var(--eg-cream)] outline-none transition duration-200 placeholder:text-[var(--eg-muted)]/75 focus:border-[var(--eg-gold)] focus:ring-2 focus:ring-[var(--eg-gold)]/18",
  inputLight:
    "min-h-12 w-full rounded-2xl border border-[var(--eg-gold)]/30 bg-[var(--eg-cream)] px-4 py-3 text-sm text-[var(--eg-bg)] outline-none transition duration-200 placeholder:text-[#827766] focus:border-[var(--eg-gold)] focus:ring-2 focus:ring-[var(--eg-gold)]/18",
} as const;
