import { cn } from "@/lib/utils";

export type PickOverlayRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
};

type ElementPickOverlayProps = {
  rect: PickOverlayRect | null;
};

/**
 * Cursor-style inspect box over the hovered preview element.
 */
export function ElementPickOverlay({ rect }: ElementPickOverlayProps) {
  if (!rect || rect.width < 1 || rect.height < 1) return null;

  const labelOnTop = rect.top > 22;

  return (
    <div
      data-pick-overlay=""
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute border-2 border-blue-500 bg-blue-500/10"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
      <div
        className={cn(
          "absolute rounded-sm bg-blue-600 px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-white",
          labelOnTop ? "-translate-y-full" : "translate-y-0",
        )}
        style={{
          top: labelOnTop ? rect.top : rect.top + 4,
          left: rect.left,
        }}
      >
        {rect.label}
      </div>
    </div>
  );
}
