import { useEffect } from "react";
import {
  DashboardSidebar,
  type ProjectFilter,
} from "@/components/shell/DashboardSidebar";
import type { StoredProject } from "@/lib/projectStorage";

type MobileSidebarDrawerProps = {
  open: boolean;
  onClose: () => void;
  projects: StoredProject[];
  activeFilter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
  onSelectProject: (projectId: string) => void;
  onGoDashboard?: () => void;
  onSearch?: () => void;
  activeProjectId?: string | null;
};

/**
 * Slide-over workspace nav for viewports below the md sidebar breakpoint.
 */
export function MobileSidebarDrawer({
  open,
  onClose,
  projects,
  activeFilter,
  onFilterChange,
  onSelectProject,
  onGoDashboard,
  onSearch,
  activeProjectId = null,
}: MobileSidebarDrawerProps) {
  useEffect(() => {
    if (!open) return;

    /**
     * Closes the drawer when Escape is pressed.
     */
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  /**
   * Selects a project and dismisses the drawer.
   */
  function handleSelectProject(projectId: string) {
    onSelectProject(projectId);
    onClose();
  }

  /**
   * Returns to the dashboard and dismisses the drawer.
   */
  function handleGoDashboard() {
    onGoDashboard?.();
    onClose();
  }

  /**
   * Focuses search on the home composer and closes the drawer.
   */
  function handleSearch() {
    onSearch?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close navigation drawer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Workspace navigation"
        className="absolute inset-y-0 left-0 flex w-[min(100%,18.5rem)] max-w-[85vw] animate-shell-in flex-col shadow-[8px_0_40px_rgba(0,0,0,0.45)]"
      >
        <DashboardSidebar
          className="h-full w-full border-r-0"
          projects={projects}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          onSelectProject={handleSelectProject}
          onGoDashboard={handleGoDashboard}
          onSearch={handleSearch}
          activeProjectId={activeProjectId}
          onCloseMobile={onClose}
        />
      </div>
    </div>
  );
}
