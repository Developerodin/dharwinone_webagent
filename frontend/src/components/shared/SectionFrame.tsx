import type { ReactNode } from "react";
import {
  DEFAULT_SECTION_LAYOUT,
  type SectionLayout,
} from "@/types/page";
import { cn } from "@/lib/utils";

export type SectionFrameProps = {
  layout?: SectionLayout | null;
  children: ReactNode;
  className?: string;
  /** Accessible name for the section landmark. */
  "aria-label"?: string;
};

/**
 * Resolves layout.background to theme surface classes.
 */
function backgroundClass(background: SectionLayout["background"]): string {
  switch (background) {
    case "alt":
      return "bg-[var(--theme-bg-alt,var(--theme-bg))]";
    case "dark":
      return "bg-[var(--theme-bg-dark,#111)] text-[var(--theme-on-dark,#fff)]";
    case "accent":
      return "bg-[var(--theme-accent)] text-[var(--theme-accent-contrast,#fff)]";
    case "image":
      return "bg-transparent";
    case "base":
    default:
      return "bg-[var(--theme-bg)]";
  }
}

/**
 * Resolves layout.spacing to vertical padding scale.
 */
function spacingClass(spacing: SectionLayout["spacing"]): string {
  switch (spacing) {
    case "tight":
      return "py-10 @min-[768px]:py-12";
    case "roomy":
      return "py-20 @min-[768px]:py-28";
    case "normal":
    default:
      return "py-14 @min-[768px]:py-20";
  }
}

/**
 * Resolves layout.intent to container / grid template classes.
 */
function intentClass(intent: SectionLayout["intent"]): string {
  switch (intent) {
    case "split_left":
    case "split_right":
      return "mx-auto grid max-w-6xl gap-8 px-5 @min-[1024px]:grid-cols-2 @min-[1024px]:items-center";
    case "centered":
      return "mx-auto max-w-3xl px-5 text-center";
    case "editorial_columns":
      return "mx-auto grid max-w-6xl gap-10 px-5 @min-[768px]:grid-cols-[1.2fr_0.8fr]";
    case "grid":
      return "mx-auto grid max-w-6xl gap-6 px-5 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3";
    case "band":
      return "mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5";
    case "overlap":
      return "relative mx-auto max-w-6xl px-5";
    case "marquee":
      return "mx-auto max-w-none overflow-hidden px-0";
    case "full_bleed":
    default:
      return "mx-auto w-full max-w-none";
  }
}

/**
 * Emphasis tweaks max-width / type scale hint via data attribute.
 */
function emphasisClass(emphasis: SectionLayout["emphasis"]): string {
  switch (emphasis) {
    case "hero":
      return "min-h-[70vh]";
    case "major":
      return "min-h-0";
    case "compact":
      return "min-h-0 [&_h2]:text-2xl";
    case "standard":
    default:
      return "";
  }
}

/**
 * Shared layout shell that maps DesignDirection layout params → container classes.
 * Section components supply content slots; this owns rhythm/background/grid.
 */
export function SectionFrame({
  layout,
  children,
  className,
  "aria-label": ariaLabel,
}: SectionFrameProps) {
  const resolved = layout ?? DEFAULT_SECTION_LAYOUT;

  return (
    <section
      aria-label={ariaLabel}
      data-emphasis={resolved.emphasis}
      data-layout-intent={resolved.intent}
      data-layout-bg={resolved.background}
      data-spacing={resolved.spacing}
      className={cn(
        backgroundClass(resolved.background),
        spacingClass(resolved.spacing),
        emphasisClass(resolved.emphasis),
        className,
      )}
    >
      <div
        className={cn(
          intentClass(resolved.intent),
          resolved.intent === "split_right" &&
            "@min-[1024px]:[&>*:first-child]:order-2",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Returns a layout object with defaults filled for missing fields.
 */
export function resolveSectionLayout(
  layout?: SectionLayout | null,
): SectionLayout {
  if (!layout) return { ...DEFAULT_SECTION_LAYOUT };
  return {
    emphasis: layout.emphasis ?? "standard",
    intent: layout.intent ?? "full_bleed",
    background: layout.background ?? "base",
    spacing: layout.spacing ?? "normal",
  };
}
