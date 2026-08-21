import {
  ChevronDown,
  Compass,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Network,
  RotateCcw,
  Search,
  Star,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { userDisplayName, userInitials } from "@/auth/displayName";
import type { AppView } from "@/lib/appView";
import { BRAND_WORKSPACE } from "@/lib/brand";
import type { StoredProject } from "@/lib/projectStorage";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/BrandMark";
import { ProjectRowMenu } from "@/components/shell/ProjectRowMenu";

export type ProjectFilter =
  | "all"
  | "starred"
  | "owned"
  | "shared"
  | "trash";

export type DashboardSidebarProps = {
  projects: StoredProject[];
  activeFilter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
  onSelectProject: (projectId: string) => void;
  /** Soft-return to the home dashboard (keeps in-memory session). */
  onGoDashboard?: () => void;
  /** Highlights Dashboard when the hidden gallery route is not active. */
  activeView?: Extract<AppView, "home" | "gallery">;
  onSearch?: () => void;
  activeProjectId?: string | null;
  /** Optional class overrides (e.g. full-width inside a mobile drawer). */
  className?: string;
  /** When set, shows a close control for the mobile drawer. */
  onCloseMobile?: () => void;
  /** Renames a project. Absent while the handlers are not wired. */
  onRenameProject?: (projectId: string, name: string) => Promise<void> | void;
  onDuplicateProject?: (projectId: string) => Promise<void> | void;
  onDeleteProject?: (projectId: string) => Promise<void> | void;
  /**
   * Restores a trashed project.
   *
   * Only meaningful in the trash view, where the row actions are replaced by a
   * single Restore — renaming or duplicating something already deleted would
   * be a way to lose track of it, not a feature.
   */
  onRestoreProject?: (projectId: string) => Promise<void> | void;
  /** Renders the recents list as the trash. */
  trashView?: boolean;
};

type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

/**
 * Formats a relative timestamp for the recents list.
 */
function formatRecentTime(timestamp: number): string {
  const deltaSec = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (deltaSec < 60) return "just now";
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h`;
  return `${Math.floor(deltaSec / 86400)}d`;
}

/**
 * Dark Lovable-style dashboard sidebar with nav, project filters, and recents.
 */
export function DashboardSidebar({
  projects,
  activeFilter,
  onFilterChange,
  onSelectProject,
  onGoDashboard,
  activeView = "home",
  onSearch,
  activeProjectId = null,
  className,
  onCloseMobile,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
  onRestoreProject,
  trashView = false,
}: DashboardSidebarProps) {
  const { user, signOut } = useAuth();
  const displayName = userDisplayName(user);
  const initials = userInitials(user);

  /**
   * Clears the client session. AuthProvider already swallows API failures so
   * a dead network cannot trap someone in a signed-in shell.
   */
  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  }

  /** Project whose name is being edited inline, and the draft value. */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  /** Project whose row menu is open, so the row keeps it visible off-hover. */
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  /**
   * Commits an inline rename.
   *
   * An unchanged or empty name just closes the field — sending it would burn a
   * request to set the name to what it already is.
   */
  async function commitRename(projectId: string, currentName: string) {
    const next = renameDraft.trim();
    setRenamingId(null);

    if (!next || next === currentName || !onRenameProject) return;

    setPendingProjectId(projectId);
    try {
      await onRenameProject(projectId, next);
    } finally {
      setPendingProjectId(null);
    }
  }

  /**
   * Runs a project action, keeping the row disabled while it is in flight.
   */
  async function runProjectAction(
    projectId: string,
    action?: (id: string) => Promise<void> | void,
  ) {
    if (!action) return;
    setPendingProjectId(projectId);
    try {
      await action(projectId);
    } finally {
      setPendingProjectId(null);
    }
  }

  const primaryNav: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: activeView === "home",
      onClick: onGoDashboard,
    },
    {
      id: "search",
      label: "Search",
      icon: Search,
      shortcut: "⌘K",
      onClick: onSearch,
    },
    {
      id: "resources",
      label: "Resources",
      icon: Compass,
      disabled: true,
    },
    {
      id: "connectors",
      label: "Connectors",
      icon: Network,
      disabled: true,
    },
  ];

  const projectFilters: {
    id: ProjectFilter;
    label: string;
    icon: typeof LayoutGrid;
  }[] = [
    { id: "all", label: "All projects", icon: LayoutGrid },
    { id: "starred", label: "Starred", icon: Star },
    { id: "owned", label: "Owned by me", icon: User },
    { id: "shared", label: "Shared with me", icon: Users },
    { id: "trash", label: "Trash", icon: Trash2 },
  ];

  // Recents is a shortcut, so it stays short. The trash is a place you go to
  // find one specific thing, so truncating it to six would hide exactly what
  // someone came looking for.
  const recents = trashView ? projects : projects.slice(0, 6);

  return (
    <aside
      className={cn(
        "flex h-full w-[var(--lovable-sidebar-w)] shrink-0 flex-col border-r border-[var(--lovable-border)] bg-[var(--lovable-bg)]",
        className,
      )}
      aria-label="Workspace navigation"
    >
      <div className="flex items-center gap-2.5 px-3 pt-3.5 pb-2">
        <BrandMark className="size-7" />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-[var(--lovable-hover)]"
          aria-label="Workspace switcher"
          aria-haspopup="listbox"
        >
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--lovable-text)]">
            {BRAND_WORKSPACE}
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 text-[var(--lovable-text-faint)]"
            aria-hidden="true"
          />
        </button>
        {onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
            aria-label="Close workspace navigation"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav className="px-2 pt-1" aria-label="Primary">
        <ul className="space-y-0.5" role="list">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={item.disabled ? undefined : item.onClick}
                  disabled={item.disabled}
                  title={item.disabled ? "Coming soon" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition",
                    item.disabled &&
                      "cursor-not-allowed text-[var(--lovable-text-faint)] opacity-45",
                    !item.disabled &&
                      item.active &&
                      "bg-[var(--lovable-active)] font-medium text-[var(--lovable-text)]",
                    !item.disabled &&
                      !item.active &&
                      "text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]",
                  )}
                  aria-current={item.active ? "page" : undefined}
                  aria-disabled={item.disabled || undefined}
                >
                  <Icon className="size-4 shrink-0 opacity-80" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-left">{item.label}</span>
                  {item.shortcut ? (
                    <kbd className="rounded border border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--lovable-text-faint)]">
                      {item.shortcut}
                    </kbd>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-5 px-4">
        <p className="text-[11px] font-medium tracking-wide text-[var(--lovable-text-faint)] uppercase">
          Projects
        </p>
      </div>
      <nav className="mt-1.5 px-2" aria-label="Project filters">
        <ul className="space-y-0.5" role="list">
          {projectFilters.map((item) => {
            const Icon = item.icon;
            const isActive = activeFilter === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onFilterChange(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition",
                    isActive
                      ? "bg-[var(--lovable-active)] font-medium text-[var(--lovable-text)]"
                      : "text-[var(--lovable-text-muted)] hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)]",
                  )}
                  aria-pressed={isActive}
                >
                  <Icon className="size-4 shrink-0 opacity-80" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-left">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-5 px-4">
        <p className="text-[11px] font-medium tracking-wide text-[var(--lovable-text-faint)] uppercase">
          {trashView ? "Trash" : "Recents"}
        </p>
      </div>
      <div className="chat-scrollbar mt-1.5 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {recents.length === 0 ? (
          <div className="rounded-lg px-2.5 py-3 text-[12px] text-[var(--lovable-text-faint)]">
            {trashView
              ? "Nothing in the trash."
              : "No projects yet — start building below."}
          </div>
        ) : (
          <ul className="space-y-0.5" role="list">
            {recents.map((project) => {
              const isActive = project.id === activeProjectId;
              const isRenaming = renamingId === project.id && !trashView;
              const isPending = pendingProjectId === project.id;
              const isMenuOpen = menuOpenId === project.id;
              const hasActions =
                !trashView &&
                Boolean(onRenameProject || onDuplicateProject || onDeleteProject);

              return (
                <li key={project.id}>
                  <div
                    className={cn(
                      "group/project flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition",
                      isActive
                        ? "bg-[var(--lovable-active)]"
                        : "hover:bg-[var(--lovable-hover)]",
                      isPending && "opacity-60",
                    )}
                  >
                    <FolderKanban
                      className="size-3.5 shrink-0 text-[var(--lovable-text-faint)]"
                      aria-hidden="true"
                    />

                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        autoFocus
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onBlur={() =>
                          void commitRename(project.id, project.businessName)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void commitRename(project.id, project.businessName);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            // Reset the draft first: unmounting the focused
                            // input can still fire onBlur, and a blur that
                            // commits would apply the rename Escape rejected.
                            setRenameDraft(project.businessName);
                            setRenamingId(null);
                          }
                        }}
                        className="min-w-0 flex-1 rounded border border-[var(--lovable-border)] bg-[var(--lovable-panel)] px-1.5 py-0.5 text-[13px] text-[var(--lovable-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                        aria-label={`Rename ${project.businessName}`}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectProject(project.id)}
                        disabled={isPending || trashView}
                        className="min-w-0 flex-1 truncate text-left text-[13px] text-[var(--lovable-text-muted)] transition hover:text-[var(--lovable-text)] focus-visible:outline-none disabled:hover:text-[var(--lovable-text-muted)]"
                        aria-label={
                          trashView
                            ? `${project.businessName} (in trash)`
                            : `Open recent project ${project.businessName}`
                        }
                        aria-current={isActive ? "true" : undefined}
                      >
                        {project.businessName}
                      </button>
                    )}

                    {trashView ? (
                      <button
                        type="button"
                        onClick={() =>
                          void runProjectAction(project.id, onRestoreProject)
                        }
                        disabled={isPending || !onRestoreProject}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 disabled:opacity-40"
                      >
                        <RotateCcw className="size-3" aria-hidden="true" />
                        Restore
                      </button>
                    ) : isRenaming ? null : hasActions ? (
                      <>
                        <span
                          className={cn(
                            "shrink-0 text-[10px] text-[var(--lovable-text-faint)] tabular-nums group-hover/project:hidden",
                            isMenuOpen && "hidden",
                          )}
                        >
                          {formatRecentTime(project.updatedAt)}
                        </span>
                        <span
                          className={cn(
                            // Focus-within keeps it reachable by keyboard, and
                            // the open case keeps it mounted once the pointer
                            // moves onto the dropdown — which hangs below the
                            // row and so leaves the row's hover box.
                            "hidden group-hover/project:block focus-within:block",
                            isMenuOpen && "block",
                          )}
                        >
                          <ProjectRowMenu
                            projectName={project.businessName}
                            busy={isPending}
                            open={isMenuOpen}
                            onOpenChange={(next) =>
                              setMenuOpenId(next ? project.id : null)
                            }
                            onRename={() => {
                              setRenameDraft(project.businessName);
                              setRenamingId(project.id);
                            }}
                            onDuplicate={() =>
                              void runProjectAction(
                                project.id,
                                onDuplicateProject,
                              )
                            }
                            onDelete={() =>
                              void runProjectAction(project.id, onDeleteProject)
                            }
                          />
                        </span>
                      </>
                    ) : (
                      <span className="shrink-0 text-[10px] text-[var(--lovable-text-faint)] tabular-nums">
                        {formatRecentTime(project.updatedAt)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto border-t border-[var(--lovable-border)] px-3 py-3">
        <div
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1"
          aria-label={
            displayName
              ? `Signed in as ${displayName}`
              : "Account"
          }
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="size-7 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[11px] font-semibold text-white"
              aria-hidden="true"
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-[var(--lovable-text)]">
              {displayName || user?.email || "Account"}
            </p>
            <p className="truncate text-[10px] text-[var(--lovable-text-faint)]">
              Free plan
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--lovable-text-faint)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
            aria-label="Log out"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
