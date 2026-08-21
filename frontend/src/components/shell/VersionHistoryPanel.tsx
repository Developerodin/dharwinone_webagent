import { useCallback, useEffect, useState } from "react";
import { History, RotateCcw, X } from "lucide-react";
import { ApiError } from "@/auth/types";
import {
  listServerVersions,
  revertServerProject,
  newIntentKey,
  type ServerVersion,
} from "@/lib/projectApi";
import { cn } from "@/lib/utils";

export type VersionHistoryPanelProps = {
  open: boolean;
  projectId: string | null;
  /** Version the builder is currently showing. */
  currentVersion: number;
  onClose: () => void;
  /** Called after a successful revert with the new head version. */
  onReverted: (version: number) => Promise<void> | void;
};

/** How a version came to exist, in words a user recognises. */
const SOURCE_LABELS: Record<ServerVersion["source"], string> = {
  BUILD: "Built",
  EDIT: "Edited",
  REVERT: "Restored",
  DUPLICATE: "Copied",
  IMPORT: "Imported",
  MANUAL: "Saved",
};

/**
 * Formats a version timestamp as a short relative age.
 */
function formatAge(iso: string): string {
  const deltaSec = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (deltaSec < 60) return "just now";
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86400) return `${Math.floor(deltaSec / 3600)}h ago`;
  return `${Math.floor(deltaSec / 86400)}d ago`;
}

/**
 * Version history for the open project.
 *
 * Restoring never deletes: reverting from v9 to v4 appends v10 carrying v4's
 * document, so the way back is simply restoring v9 again. The panel says so
 * rather than asking for a confirmation nobody can evaluate.
 */
export function VersionHistoryPanel({
  open,
  projectId,
  currentVersion,
  onClose,
  onReverted,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<ServerVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      setVersions(await listServerVersions(projectId));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load this project's history.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  /**
   * Restores a version, then hands the new head back to the builder.
   */
  async function restore(version: number) {
    if (!projectId) return;
    setRestoringVersion(version);
    setError(null);

    try {
      const result = await revertServerProject({
        projectId,
        toVersion: version,
        expectedVersion: currentVersion,
        idempotencyKey: newIntentKey(),
      });
      await onReverted(result.version);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === "VERSION_CONFLICT"
            ? "This project changed in another tab. Reopen it and try again."
            : err.message
          : "Could not restore that version.",
      );
    } finally {
      setRestoringVersion(null);
    }
  }

  if (!open) return null;

  return (
    <aside
      className="absolute inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-[var(--lovable-border)] bg-[var(--lovable-panel)] shadow-2xl shadow-black/50"
      aria-label="Version history"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--lovable-border)] px-4 py-3">
        <History
          className="size-4 text-[var(--lovable-text-faint)]"
          aria-hidden="true"
        />
        <h2 className="flex-1 text-[13px] font-medium text-[var(--lovable-text)]">
          Version history
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-7 items-center justify-center rounded-lg text-[var(--lovable-text-faint)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          aria-label="Close version history"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200"
        >
          {error}
        </p>
      ) : null}

      <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading && versions.length === 0 ? (
          <p className="px-2.5 py-3 text-[12px] text-[var(--lovable-text-faint)]">
            Loading history…
          </p>
        ) : versions.length === 0 ? (
          <p className="px-2.5 py-3 text-[12px] text-[var(--lovable-text-faint)]">
            No saved versions yet. The first build creates one.
          </p>
        ) : (
          <ul className="space-y-0.5" role="list">
            {versions.map((version) => {
              const isCurrent = version.version === currentVersion;
              const isRestoring = restoringVersion === version.version;

              return (
                <li key={version.id}>
                  <div
                    className={cn(
                      "group/version rounded-lg px-2.5 py-2 transition",
                      isCurrent
                        ? "bg-[var(--lovable-active)]"
                        : "hover:bg-[var(--lovable-hover)]",
                    )}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 text-[11px] font-medium text-[var(--lovable-text-faint)] tabular-nums">
                        v{version.version}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--lovable-text)]">
                        {version.summary || SOURCE_LABELS[version.source]}
                      </span>
                      <span className="shrink-0 text-[10px] text-[var(--lovable-text-faint)]">
                        {formatAge(version.createdAt)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded border border-[var(--lovable-border)] px-1.5 py-0.5 text-[10px] text-[var(--lovable-text-faint)]">
                        {SOURCE_LABELS[version.source]}
                      </span>

                      {isCurrent ? (
                        <span className="text-[10px] text-[var(--lovable-text-faint)]">
                          Current
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void restore(version.version)}
                          disabled={restoringVersion !== null}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--lovable-text-muted)] transition hover:bg-[var(--lovable-hover)] hover:text-[var(--lovable-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 disabled:opacity-40"
                        >
                          <RotateCcw className="size-3" aria-hidden="true" />
                          {isRestoring ? "Restoring…" : "Restore"}
                        </button>
                      )}
                    </div>

                    {version.instruction ? (
                      <p className="mt-1 line-clamp-2 text-[11px] text-[var(--lovable-text-faint)]">
                        “{version.instruction}”
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="shrink-0 border-t border-[var(--lovable-border)] px-4 py-2.5">
        <p className="text-[11px] text-[var(--lovable-text-faint)]">
          Restoring keeps history — it adds a new version carrying the old page,
          so nothing is lost.
        </p>
      </footer>
    </aside>
  );
}
