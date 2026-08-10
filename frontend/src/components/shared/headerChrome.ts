/**
 * Strips unconditional `inline-flex` so `hidden` / container-query display
 * gates can win (Tailwind resolves conflicting display by CSS source order).
 */
export function withoutInlineFlex(className: string): string {
  return className.replace(/\binline-flex\b/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Builds header-bar vs mobile-drawer CTA classes from a button style base.
 * Chrome is forced hidden below 1024 `/page`; drawer always uses `inline-flex`.
 */
export function headerCtaClasses(base: string): {
  chrome: string;
  drawer: string;
} {
  const styles = withoutInlineFlex(base);
  return {
    // Dual gate: container max hide + min show — beats leftover display utilities.
    chrome: `@max-[1023px]/page:!hidden hidden @min-[1024px]/page:!inline-flex ${styles}`,
    drawer: `inline-flex ${styles}`,
  };
}
