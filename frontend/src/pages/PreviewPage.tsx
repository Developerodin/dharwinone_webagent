import { useMemo, useState } from "react";
import { PageRenderer } from "@/render/PageRenderer";
import { PreviewInspector } from "@/components/PreviewInspector";
import { loadPreviewPayload } from "@/lib/previewStorage";
import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";
import { loadProject } from "@/lib/projectStorage";
import type { Page } from "@/types/page";
import type { PageFamily } from "@/lib/pageFamily";

type ResolvedPreview = {
  page: Page;
  pageFamily: PageFamily;
  businessName?: string;
  projectId?: string;
  source: "project" | "latest";
};

/**
 * Resolves preview data from ?project=id or the latest saved payload.
 */
function resolvePreview(): ResolvedPreview | null {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project");

  if (projectId) {
    const project = loadProject(projectId);
    if (project?.page) {
      return {
        page: project.page,
        pageFamily: project.pageFamily,
        businessName: project.businessName,
        projectId: project.id,
        source: "project",
      };
    }
  }

  const payload = loadPreviewPayload();
  if (!payload) return null;

  return {
    page: payload.page,
    pageFamily: payload.pageFamily,
    businessName: payload.businessName,
    projectId: payload.projectId,
    source: "latest",
  };
}

/**
 * Full-screen preview page — loads a saved project or the latest build.
 */
export function PreviewPage() {
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [tick, setTick] = useState(0);
  const [pageOverride, setPageOverride] = useState<Page | null>(null);
  const preview = useMemo(() => resolvePreview(), [tick]);
  const page = pageOverride ?? preview?.page ?? null;

  if (!preview || !page) {
    return (
      <div className="builder-shell flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div
          className="flex size-12 items-center justify-center rounded-xl bg-[var(--ink)] text-sm font-semibold text-white"
          aria-hidden="true"
        >
          P+
        </div>
        <h1
          className="text-3xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          No preview available
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
          Build a page from chat first, then use{" "}
          <strong className="font-medium text-[var(--ink)]">Open preview</strong>{" "}
          to open the full site here.
        </p>
        <a
          href="/#home"
          className="inline-flex min-h-10 items-center rounded-lg bg-[var(--ink)] px-4 text-sm font-medium text-white transition hover:bg-[var(--accent)]"
        >
          Back to dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to page content
      </a>
      <div
        className="builder-header fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-4 text-xs"
        role="banner"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--ink)] text-[9px] font-semibold text-white"
            aria-hidden="true"
          >
            P+
          </span>
          <span className="truncate text-[var(--muted)]">
            Preview · {getPageFamilyLabel(preview.pageFamily)}
            {preview.businessName ? ` · ${preview.businessName}` : ""}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPageOverride(null);
              setTick((value) => value + 1);
            }}
            className="inline-flex min-h-8 items-center rounded-lg px-2.5 font-medium text-[var(--muted)] transition hover:bg-[var(--paper)] hover:text-[var(--ink)]"
            aria-label="Reload preview from storage"
          >
            Reload
          </button>
          <a
            href="/#home"
            className="inline-flex min-h-8 items-center rounded-lg bg-[var(--accent)] px-3 font-medium text-white transition hover:opacity-90"
          >
            Back to dashboard
          </a>
        </div>
      </div>
      <div id="page-content" className="pt-[var(--shell-header-h)]">
        <PageRenderer page={page} animate />
      </div>
      <PreviewInspector
        page={page}
        pageFamily={preview.pageFamily}
        businessName={preview.businessName}
        projectId={preview.projectId}
        open={inspectorOpen}
        onToggle={() => setInspectorOpen((value) => !value)}
        onPageChange={setPageOverride}
      />
    </div>
  );
}
