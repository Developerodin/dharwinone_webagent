import { useEffect, useRef } from "react";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProjectRowMenuProps = {
  projectName: string;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Disables every item while an action is in flight. */
  busy?: boolean;
  /**
   * Open state, owned by the list.
   *
   * Controlled rather than local because the row only reveals this control on
   * hover: the dropdown hangs below the row, so moving the pointer onto it
   * leaves the row's hover box. The list needs to know a menu is open to keep
   * the whole control visible while it is.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MenuItem = {
  id: string;
  label: string;
  icon: typeof Pencil;
  onSelect: () => void;
  danger?: boolean;
};

/**
 * Per-project actions in the recents list.
 *
 * Kept to the three that exist server-side — rename, duplicate, move to trash
 * — rather than showing a fuller menu where half the items do nothing.
 */
export function ProjectRowMenu({
  projectName,
  onRename,
  onDuplicate,
  onDelete,
  busy = false,
  open,
  onOpenChange,
}: ProjectRowMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const setOpen = onOpenChange;

  // Closing on outside click and on Escape, because a menu that can only be
  // dismissed by picking something traps whoever opened it by accident.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const items: MenuItem[] = [
    { id: "rename", label: "Rename", icon: Pencil, onSelect: onRename },
    { id: "duplicate", label: "Duplicate", icon: Copy, onSelect: onDuplicate },
    {
      id: "delete",
      label: "Move to trash",
      icon: Trash2,
      onSelect: onDelete,
      danger: true,
    },
  ];

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
        disabled={busy}
        className="inline-flex size-6 items-center justify-center rounded-md text-[var(--lovable-text-faint)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 disabled:opacity-40"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${projectName}`}
      >
        <MoreHorizontal className="size-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`${projectName} actions`}
          className="absolute right-0 z-30 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--lovable-border)] bg-[var(--lovable-panel)] py-1 shadow-xl shadow-black/40"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] transition",
                  item.danger
                    ? "text-red-300 hover:bg-red-500/10"
                    : "text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
