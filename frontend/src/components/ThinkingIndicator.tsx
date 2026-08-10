import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ThinkingIndicatorProps = {
  label?: string;
  size?: "sm" | "md";
  className?: string;
  /** When true, announces updates to assistive tech. */
  live?: boolean;
};

/**
 * Accessible loading circle used for agent thinking / busy states.
 */
export function ThinkingIndicator({
  label = "Thinking",
  size = "sm",
  className,
  live = false,
}: ThinkingIndicatorProps) {
  const iconClass = size === "md" ? "size-5" : "size-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[var(--lovable-text-muted)]",
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live={live ? "polite" : undefined}
      aria-label={label}
    >
      <span className="relative inline-flex shrink-0 items-center justify-center">
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-sky-500/20 animate-think-pulse",
            size === "md" ? "scale-150" : "scale-[1.65]",
          )}
          aria-hidden="true"
        />
        <Loader2
          className={cn(iconClass, "relative animate-spin text-sky-400")}
          aria-hidden="true"
        />
      </span>
      <span className={cn(size === "md" ? "text-sm" : "text-xs")}>{label}</span>
    </span>
  );
}
