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
 * Thin section landmark.
 *
 * Surface, vertical rhythm, measure and type scale are applied by
 * `styles/sectionLayout.css` against the `data-*` attributes `PageRenderer`
 * stamps on the wrapper around every section. This component therefore only
 * needs to render the landmark and mirror the layout onto the element for
 * styling hooks and tests — it must NOT emit its own container, because the
 * section components already supply one and two competing containers double the
 * page's max-width and padding.
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
      className={cn(className)}
    >
      {children}
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
