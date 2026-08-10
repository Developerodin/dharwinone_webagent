import {
  ChevronDown,
  Compass,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  Network,
  Search,
  Share2,
  Star,
  User,
  Users,
} from "lucide-react";
import type { StoredProject } from "@/lib/projectStorage";
import { cn } from "@/lib/utils";

export type ProjectFilter =
  | "all"
  | "starred"
  | "owned"
  | "shared";

type DashboardSidebarProps = {
  projects: StoredProject[];
  activeFilter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
  onSelectProject: (projectId: string) => void;
  /** Soft-return to the home dashboard (keeps in-memory session). */
  onGoDashboard?: () => void;
  onSearch?: () => void;
  activeProjectId?: string | null;
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
  onSearch,
  activeProjectId = null,
}: DashboardSidebarProps) {
  const primaryNav: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: true,
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
  ];

  const recents = projects.slice(0, 6);

  return (
    <aside
      className="flex h-full w-[var(--lovable-sidebar-w)] shrink-0 flex-col border-r border-[var(--lovable-border)] bg-[var(--lovable-bg)]"
      aria-label="Workspace navigation"
    >
      <div className="flex items-center gap-2.5 px-3 pt-3.5 pb-2">
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-violet-500 to-blue-500 text-[10px] font-bold text-white shadow-sm"
          aria-hidden="true"
        >
          P+
        </div>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-[var(--lovable-hover)]"
          aria-label="Workspace switcher"
          aria-haspopup="listbox"
        >
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded bg-sky-500/90 text-[9px] font-bold text-white"
            aria-hidden="true"
          >
            M
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--lovable-text)]">
            My ProwPlus
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 text-[var(--lovable-text-faint)]"
            aria-hidden="true"
          />
        </button>
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
          Recents
        </p>
      </div>
      <div className="chat-scrollbar mt-1.5 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {recents.length === 0 ? (
          <div className="rounded-lg px-2.5 py-3 text-[12px] text-[var(--lovable-text-faint)]">
            No projects yet — start building below.
          </div>
        ) : (
          <ul className="space-y-0.5" role="list">
            {recents.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => onSelectProject(project.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                      isActive
                        ? "bg-[var(--lovable-active)]"
                        : "hover:bg-[var(--lovable-hover)]",
                    )}
                    aria-label={`Open recent project ${project.businessName}`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <FolderKanban
                      className="size-3.5 shrink-0 text-[var(--lovable-text-faint)]"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--lovable-text-muted)]">
                      {project.businessName}
                    </span>
                    <span className="shrink-0 text-[10px] text-[var(--lovable-text-faint)] tabular-nums">
                      {formatRecentTime(project.updatedAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto border-t border-[var(--lovable-border)] px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <div
            className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-[11px] font-semibold text-white"
            aria-hidden="true"
          >
            J
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-[var(--lovable-text)]">
              John
            </p>
            <p className="truncate text-[10px] text-[var(--lovable-text-faint)]">
              Free plan
            </p>
          </div>
          <Share2
            className="size-3.5 text-[var(--lovable-text-faint)]"
            aria-hidden="true"
          />
        </div>
      </div>
    </aside>
  );
}
