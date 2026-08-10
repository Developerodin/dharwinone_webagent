/** Tailwind class bundles for the premium casual theme. */
export const pm = {
  section: "overflow-x-hidden bg-[#110d0b] text-[#f6efe8]",
  sectionAlt: "overflow-x-hidden bg-[#17120f] text-[#f6efe8]",
  sectionPad: "px-4 py-12 @min-[640px]:px-6 @min-[640px]:py-16 @min-[768px]:px-10 @min-[768px]:py-24",
  eyebrow:
    "text-[10px] font-medium uppercase tracking-[0.24em] text-[#c68e6b] @min-[640px]:text-xs @min-[640px]:tracking-[0.3em]",
  heading: "wrap-break-word font-[family-name:var(--font-display)] text-[#f6efe8]",
  headingHero:
    "wrap-break-word text-[1.75rem] leading-[1.15] @min-[640px]:text-4xl @min-[768px]:text-5xl @min-[1024px]:text-6xl @min-[1280px]:text-7xl",
  headingSection:
    "wrap-break-word text-[1.625rem] leading-tight @min-[640px]:text-3xl @min-[768px]:text-4xl @min-[1024px]:text-5xl",
  body: "wrap-break-word font-[family-name:var(--font-body)] text-[#cbb8a9] leading-relaxed",
  accentRule: "h-px w-12 bg-[#c68e6b]/60 @min-[640px]:w-16",
  primaryButton:
    "inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full bg-[#c68e6b] px-6 py-3 text-sm font-medium text-[#140f0d] shadow-[0_18px_48px_rgba(198,142,107,0.22)] transition duration-200 hover:bg-[#d6a27f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c68e6b] disabled:cursor-not-allowed disabled:opacity-70 @min-[640px]:w-auto @min-[640px]:px-8",
  secondaryButton:
    "inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-full border border-[#c68e6b]/50 bg-transparent px-6 py-3 text-sm font-medium text-[#f6efe8] transition duration-200 hover:border-[#c68e6b] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c68e6b] disabled:cursor-not-allowed disabled:opacity-70 @min-[640px]:w-auto @min-[640px]:px-8",
  panel:
    "rounded-[1.75rem] border border-white/10 bg-white/[0.04] shadow-[0_24px_70px_rgba(0,0,0,0.36)] backdrop-blur-sm",
  navLink:
    "inline-flex min-h-11 items-center justify-center rounded-full px-3 py-2 text-xs uppercase tracking-[0.22em] text-[#cbb8a9] transition duration-200 hover:bg-white/[0.05] hover:text-[#f6efe8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c68e6b] @min-[768px]:text-[11px]",
  footerLink:
    "text-sm text-[#cbb8a9] transition duration-200 hover:text-[#f6efe8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c68e6b]",
  inputLabel:
    "text-[10px] font-medium uppercase tracking-[0.22em] text-[#c68e6b] @min-[640px]:text-xs",
  input:
    "min-h-12 w-full rounded-2xl border border-white/12 bg-[#1c1613] px-4 py-3 text-sm text-[#f6efe8] outline-none transition duration-200 placeholder:text-[#8e7b6b] focus:border-[#c68e6b] focus:ring-2 focus:ring-[#c68e6b]/20",
  inputLight:
    "min-h-12 w-full rounded-2xl border border-[#dcc7b7] bg-white px-4 py-3 text-sm text-[#1d1713] outline-none transition duration-200 placeholder:text-[#8b7565] focus:border-[#c68e6b] focus:ring-2 focus:ring-[#c68e6b]/20",
} as const;
