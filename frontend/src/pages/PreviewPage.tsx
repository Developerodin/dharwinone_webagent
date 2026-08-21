import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Spinner } from "@/components/auth/fields";
import { PageRenderer } from "@/render/PageRenderer";
import { PreviewInspector } from "@/components/PreviewInspector";
import {
  loadPreviewPayload,
  loadPublicPreview,
} from "@/lib/previewStorage";
import { getPageFamilyLabel } from "@/lib/pageFamilyLabel";
import { loadProject } from "@/lib/projectStorage";
import type { Page } from "@/types/page";
import type { PageFamily } from "@/lib/pageFamily";

type ResolvedPreview = {
  page: Page;
  pageFamily: PageFamily;
  businessName?: string;
  projectId?: string;
  source: "public" | "project" | "latest";
};

/**
 * Resolves a same-browser fallback from ?project=id or the latest payload.
 */
function resolveLocalPreview(): ResolvedPreview | null {
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
 * Reads the project id from the shareable preview query string.
 */
function readProjectId(): string | null {
  const id = new URLSearchParams(window.location.search).get("project");
  return id?.trim() ? id.trim() : null;
}

/**
 * Full-screen preview page — public URL when ?project=id is present.
 */
export function PreviewPage() {
  const projectId = readProjectId();
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [pageOverride, setPageOverride] = useState<Page | null>(null);
  const [preview, setPreview] = useState<ResolvedPreview | null>(() =>
    projectId ? null : resolveLocalPreview(),
  );
  const [loading, setLoading] = useState(Boolean(projectId));

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    /**
     * Fetches the live page for anyone with the URL; falls back to this
     * browser's cache so the owner's tab still works offline.
     */
    async function load() {
      setLoading(true);
      try {
        const payload = await loadPublicPreview(projectId!);
        if (cancelled) return;
        setPreview({
          page: payload.page,
          pageFamily: payload.pageFamily,
          businessName: payload.businessName,
          projectId: payload.projectId,
          source: "public",
        });
      } catch (error) {
        console.error("Public preview failed", error);
        if (cancelled) return;
        setPreview(resolveLocalPreview());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!preview) return;
    const previous = document.title;
    document.title = preview.businessName
      ? `${preview.businessName} · Preview`
      : "Site preview";
    return () => {
      document.title = previous;
    };
  }, [preview]);

  const page = pageOverride ?? preview?.page ?? null;
  const isPublic = preview?.source === "public";

  if (loading) {
    return (
      <div className="builder-shell flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <BrandMark className="size-12" labelled />
        <Spinner size={22} />
        <p className="text-sm text-[var(--muted)]">Loading preview…</p>
      </div>
    );
  }

  if (!preview || !page) {
    return (
      <div className="builder-shell flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <BrandMark className="size-12" labelled />
        <h1
          className="text-3xl text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Preview unavailable
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
          This preview link is invalid, or the site has not been built yet.
        </p>
      </div>
    );
  }

  if (isPublic) {
    return (
      <div className="min-h-screen bg-[var(--paper)]">
        <a
          href="#page-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to page content
        </a>
        <div id="page-content">
          <PageRenderer page={page} animate />
        </div>
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
          <BrandMark className="size-6" />
          <span className="truncate text-[var(--muted)]">
            Preview · {getPageFamilyLabel(preview.pageFamily)}
            {preview.businessName ? ` · ${preview.businessName}` : ""}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
