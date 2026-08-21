import { useCallback, useEffect, useRef, useState } from "react";
import {
  readAppViewFromHash,
  writeAppViewHash,
  type AppView,
} from "@/lib/appView";
import { getActiveProjectId } from "@/lib/projectStorage";

type UseAppViewSyncArgs = {
  restoreProject: (id: string) => boolean;
  refreshProjects: () => void;
  /**
   * Reattaches to a build still running for the restored project.
   *
   * Reloading during a build restores the page as it was before it started, so
   * without this the tab shows a stale document and no sign that the pipeline
   * the user is paying for is still working.
   */
  onProjectRestored?: (id: string) => void;
};

/**
 * Owns `#home` / `#builder` / `#gallery` hash routing and first-load restore.
 */
export function useAppViewSync({
  restoreProject,
  refreshProjects,
  onProjectRestored,
}: UseAppViewSyncArgs): {
  view: AppView;
  navigateView: (next: AppView) => void;
} {
  const [view, setView] = useState<AppView>(() => readAppViewFromHash());
  const didBootstrapRef = useRef(false);

  /**
   * Switches the active shell view and keeps the URL hash in sync.
   */
  const navigateView = useCallback((next: AppView) => {
    setView(next);
    writeAppViewHash(next);
  }, []);

  useEffect(() => {
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;

    const desired = readAppViewFromHash();
    if (desired === "gallery") {
      writeAppViewHash("gallery");
      setView("gallery");
      return;
    }
    if (desired !== "builder") {
      writeAppViewHash("home");
      setView("home");
      return;
    }

    const activeId = getActiveProjectId();
    if (activeId && restoreProject(activeId)) {
      setView("builder");
      writeAppViewHash("builder");
      refreshProjects();
      onProjectRestored?.(activeId);
      return;
    }

    writeAppViewHash("home");
    setView("home");
  }, [onProjectRestored, refreshProjects, restoreProject]);

  useEffect(() => {
    /**
     * Handles hash changes for home ↔ builder ↔ gallery without remounting.
     */
    function onHashChange() {
      const next = readAppViewFromHash();
      if (next === "builder") {
        const activeId = getActiveProjectId();
        if (activeId && restoreProject(activeId)) {
          setView("builder");
          refreshProjects();
          onProjectRestored?.(activeId);
          return;
        }
        if (view === "builder") return;
        writeAppViewHash("home");
        setView("home");
        return;
      }
      if (next === "gallery") {
        setView("gallery");
        return;
      }
      setView("home");
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [onProjectRestored, refreshProjects, restoreProject, view]);

  return { view, navigateView };
}
