import { headerCtaClasses } from "@/components/shared/headerChrome";

/** Quiet text nav — no pills, no uppercase tracking. */
export const premiumHeaderNav =
  "inline-flex h-10 shrink-0 items-center whitespace-nowrap px-2.5 text-[13px] leading-none text-[var(--theme-muted)] transition-colors duration-200 hover:text-[var(--theme-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]";

const ctaFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]";

const ctaSize =
  "h-10 w-auto max-w-[11rem] shrink-0 items-center justify-center truncate px-4 text-xs leading-none @min-[640px]/page:max-w-none @min-[640px]/page:px-5 @min-[640px]/page:text-sm";

/** Filled header CTA sized for a bar, not a hero. */
export const premiumHeaderCtaFill = headerCtaClasses(
  `inline-flex ${ctaSize} rounded-full bg-[var(--theme-accent)] font-medium text-[var(--theme-accent-contrast)] transition-colors hover:bg-[var(--theme-accent-on-dark)] ${ctaFocus}`,
);

/** Outline header CTA for the centered masthead. */
export const premiumHeaderCtaOutline = headerCtaClasses(
  `inline-flex ${ctaSize} rounded-full border border-[var(--theme-accent)]/50 bg-transparent font-medium text-[var(--theme-ink)] transition-colors hover:border-[var(--theme-accent)] hover:bg-white/[0.04] ${ctaFocus}`,
);

/** Rectangular white ghost CTA for the transparent overlay header. */
export const premiumOverlayCta =
  "inline-flex min-h-10 w-auto max-w-[11rem] shrink-0 items-center justify-center truncate border border-white bg-transparent px-4 text-[10px] font-medium uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-white hover:text-[#111318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white @min-[640px]/page:min-h-11 @min-[640px]/page:max-w-none @min-[640px]/page:px-5 @min-[640px]/page:text-[11px]";

/** Accent outline CTA used inside the light off-canvas drawer. */
export const premiumOverlayDrawerCta =
  "inline-flex min-h-11 w-full max-w-[16rem] items-center justify-center border border-[var(--theme-accent)] bg-transparent px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-accent)] transition-colors duration-200 hover:bg-[var(--theme-accent)] hover:text-[var(--theme-accent-contrast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-accent)]";
