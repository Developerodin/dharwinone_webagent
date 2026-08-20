import { MousePointer2, X } from "lucide-react";
import {
  fieldLabelFor,
  type PreviewPick,
} from "@/lib/resolvePreviewPick";

type ComposerTargetChipProps = {
  pick: PreviewPick;
  onClear: () => void;
};

/**
 * Cursor-style attached-target chip shown above the chat composer.
 */
export function ComposerTargetChip({ pick, onClear }: ComposerTargetChipProps) {
  const fieldPart = pick.field
    ? `${pick.section} · ${fieldLabelFor(pick.field)}`
    : pick.section;
  const label = `Editing ${fieldPart}`;

  return (
    <div
      className="flex min-w-0 items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2 py-1.5"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <MousePointer2
        className="size-3.5 shrink-0 text-blue-300"
        aria-hidden="true"
      />
      <span className="font-mono text-[11px] text-blue-100">
        {`<${pick.tag}>`}
      </span>
      <span className="truncate text-[11px] font-medium capitalize text-blue-300">
        {fieldPart}
      </span>
      {pick.snippet ? (
        <span className="hidden min-w-0 truncate text-[11px] text-blue-300/70 sm:inline">
          {pick.snippet}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded text-blue-300 transition hover:text-blue-100"
        aria-label="Clear attached target"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
