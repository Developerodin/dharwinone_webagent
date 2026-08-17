import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  /** When true, exposes the brand name to assistive tech. */
  labelled?: boolean;
};

/**
 * Dharwin overlapping-square mark used in headers and empty states.
 */
export function BrandMark({ className, labelled = false }: BrandMarkProps) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={labelled ? BRAND_NAME : ""}
      className={cn("size-7 shrink-0 object-contain", className)}
      aria-hidden={labelled ? undefined : true}
    />
  );
}
