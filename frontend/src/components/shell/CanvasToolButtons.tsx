import { Pencil, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasTool } from "@/hooks/useCanvasTool";

type CanvasToolButtonsProps = {
  tool: CanvasTool;
  onToggleSelect: () => void;
  onToggleText: () => void;
  className?: string;
  /** Compact chips for the mobile preview chrome. */
  compact?: boolean;
};

/**
 * Edit (pick) and T (inline text) toggles. Mutually exclusive.
 */
export function CanvasToolButtons({
  tool,
  onToggleSelect,
  onToggleText,
  className,
  compact = false,
}: CanvasToolButtonsProps) {
  const selectOn = tool === "select";
  const textOn = tool === "text";
  const buttonClass = compact
    ? "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
    : "inline-flex min-h-7 items-center gap-1 rounded-lg border px-2.5 text-[12px] font-medium transition";

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label="Canvas edit tools"
    >
      <button
        type="button"
        onClick={onToggleSelect}
        className={cn(
          buttonClass,
          selectOn
            ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
            : "border-[var(--lovable-border)] bg-[var(--lovable-bg)] text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]",
        )}
        aria-label={
          selectOn ? "Turn off element pick mode" : "Turn on element pick mode"
        }
        aria-pressed={selectOn}
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        Edit
      </button>
      <button
        type="button"
        onClick={onToggleText}
        className={cn(
          buttonClass,
          textOn
            ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
            : "border-[var(--lovable-border)] bg-[var(--lovable-bg)] text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]",
        )}
        aria-label={
          textOn ? "Turn off text editing" : "Edit text on the page"
        }
        aria-pressed={textOn}
      >
        <Type className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Text</span>
      </button>
    </div>
  );
}
