import { headerCtaClasses } from "@/components/shared/headerChrome";

/** Gold text nav — hairline hover, not pill chrome. */
export const elegantHeaderNav =
  "inline-flex h-10 shrink-0 items-center whitespace-nowrap px-2.5 text-[11px] font-medium uppercase leading-none tracking-[0.18em] text-[var(--eg-gold)] transition-colors duration-200 hover:text-[var(--eg-cream)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--eg-gold)]";

/** Mobile drawer gold links with full tap targets. */
export const elegantHeaderNavMobile =
  "inline-flex min-h-11 w-full items-center justify-start px-3 py-3 text-xs uppercase tracking-[0.16em] text-[var(--eg-gold)] transition-colors duration-200 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)]";

const ctaBase =
  "h-10 w-auto max-w-[11rem] shrink-0 items-center justify-center truncate border border-[var(--eg-gold)] px-4 text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-[var(--eg-gold)] transition-colors duration-200 hover:bg-[var(--eg-gold)] hover:text-[var(--eg-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--eg-gold)] @min-[640px]/page:max-w-none @min-[640px]/page:px-5 @min-[640px]/page:text-[11px]";

/** Gold outline CTA for the masthead. */
export const elegantHeaderCta = headerCtaClasses(ctaBase);

/** Filled gold CTA for the left-brand bar. */
export const elegantHeaderCtaFill = headerCtaClasses(
  `${ctaBase} bg-[var(--eg-gold)] text-[var(--eg-bg)] hover:bg-transparent hover:text-[var(--eg-gold)]`,
);
