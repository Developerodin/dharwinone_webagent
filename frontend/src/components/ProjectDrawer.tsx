import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FolderKanban, Plus, X } from "lucide-react";
import { deleteProject, type StoredProject } from "@/lib/projectStorage";
import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";

type ProjectDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: StoredProject[];
  activeProjectId: string | null;
  onSelect: (projectId: string) => void;
  onDelete: (projectId: string) => void;
  onNew: () => void;
};

/**
 * Header trigger + full-viewport right drawer (portaled to body).
 */
export function ProjectDrawer({
  open,
  onOpenChange,
  projects,
  activeProjectId,
  onSelect,
  onDelete,
  onNew,
}: ProjectDrawerProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    /**
     * Closes the drawer on Escape.
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onOpenChange]);

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100] animate-shell-in" role="presentation">
            <button
              type="button"
              className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_35%,transparent)] backdrop-blur-[2px]"
              aria-label="Close projects drawer"
              onClick={() => onOpenChange(false)}
            />

            <aside
              id="projects-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="absolute top-0 right-0 flex h-full w-[min(100vw,22rem)] flex-col border-l border-[var(--line)] bg-[var(--surface)] shadow-[0_0_40px_rgba(10,14,23,0.12)]"
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
                <div className="min-w-0">
                  <p
                    id={titleId}
                    className="text-sm font-semibold text-[var(--ink)]"
                  >
                    Projects
                  </p>
                  <p className="truncate text-[11px] text-[var(--muted)]">
                    {projects.length === 0
                      ? "No saved builds yet"
                      : `${projects.length} saved`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onNew();
                      onOpenChange(false);
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 text-xs font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    aria-label="Start a new project"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    New
                  </button>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                    aria-label="Close projects drawer"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
                {projects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper)] px-3 py-8 text-center">
                    <p className="text-sm text-[var(--muted)]">
                      Build a page to save a project here.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1.5" role="list">
                    {projects.map((project) => {
                      const isActive = project.id === activeProjectId;
                      return (
                        <li key={project.id}>
                          <div
                            className={`flex items-stretch gap-0.5 rounded-xl p-1 transition ${
                              isActive
                                ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/40"
                                : "hover:bg-[var(--paper)]"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onSelect(project.id);
                                onOpenChange(false);
                              }}
                              className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-left"
                              aria-label={`Open project ${project.businessName}`}
                              aria-current={isActive ? "true" : undefined}
                            >
                              <p className="truncate text-sm font-medium text-[var(--ink)]">
                                {project.businessName}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                                {getPageFamilyLabel(project.pageFamily)} ·{" "}
                                {project.page ? "built" : project.phase} ·{" "}
                                {formatRelativeTime(project.updatedAt)}
                              </p>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete project “${project.businessName}”?`,
                                  )
                                ) {
                                  deleteProject(project.id);
                                  onDelete(project.id);
                                }
                              }}
                              className="shrink-0 self-center rounded-lg px-2.5 py-2 text-[11px] text-[var(--muted)] transition hover:bg-red-50 hover:text-[var(--danger)]"
                              aria-label={`Delete project ${project.businessName}`}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="projects-drawer"
        aria-label="Open projects drawer"
      >
        <FolderKanban className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Projects</span>
        {projects.length > 0 ? (
          <span className="rounded-md bg-[var(--paper)] px-1.5 text-[11px] text-[var(--muted)] tabular-nums">
            {projects.length}
          </span>
        ) : null}
      </button>
      {panel}
    </>
  );
}

/**
 * Formats a timestamp as a short relative label.
 */
function formatRelativeTime(timestamp: number): string {
  const deltaSec = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (deltaSec < 60) return "just now";
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  return `${Math.floor(deltaSec / 86400)}d ago`;
}
