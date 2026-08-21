import { apiRequest } from "@/lib/apiClient";
import { parsePageFamily, type PageFamily } from "./pageFamily";
import type { Page } from "@/types/page";

const PREVIEW_KEY = "prowplus-preview-payload";

export type PreviewPayload = {
  page: Page;
  pageFamily: PageFamily;
  businessName?: string;
  projectId?: string;
};

/**
 * Persists the last built page for full-screen preview in a new tab.
 * Uses localStorage so data is readable from noopener tabs.
 */
export function savePreviewPayload(payload: PreviewPayload): void {
  localStorage.setItem(PREVIEW_KEY, JSON.stringify(payload));
}

/**
 * Reads the stored preview payload, if any.
 */
export function loadPreviewPayload(): PreviewPayload | null {
  const raw = localStorage.getItem(PREVIEW_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PreviewPayload>;
    if (!parsed.page || typeof parsed.pageFamily !== "string") return null;

    const pageFamily = parsePageFamily(parsed.pageFamily);
    if (!pageFamily) return null;

    return {
      page: parsed.page,
      pageFamily,
      businessName:
        typeof parsed.businessName === "string"
          ? parsed.businessName
          : undefined,
      projectId:
        typeof parsed.projectId === "string" ? parsed.projectId : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Absolute public preview URL anyone can open without signing in.
 */
export function publicPreviewUrl(projectId: string): string {
  return `${window.location.origin}/preview.html?project=${encodeURIComponent(projectId)}`;
}

/**
 * Loads the live page for a public preview. No session required.
 */
export async function loadPublicPreview(
  projectId: string,
): Promise<PreviewPayload> {
  const data = await apiRequest<{
    projectId: string;
    page: Page;
    pageFamily: string;
    businessName?: string;
  }>(`/api/preview/${encodeURIComponent(projectId)}`, { anonymous: true });

  const pageFamily = parsePageFamily(data.pageFamily);
  if (!data.page || !pageFamily) {
    throw new Error("Invalid preview payload");
  }

  return {
    page: data.page,
    pageFamily,
    businessName: data.businessName,
    projectId: data.projectId,
  };
}

/**
 * Saves the preview payload and opens the full-screen preview in a new tab.
 */
export function saveAndOpenPreview(payload: PreviewPayload): void {
  savePreviewPayload(payload);
  const query = payload.projectId
    ? `?project=${encodeURIComponent(payload.projectId)}`
    : "";
  window.open(`/preview.html${query}`, "_blank", "noopener,noreferrer");
}

/**
 * Opens the full-screen preview route in a new browser tab.
 */
export function openPreviewInNewTab(projectId?: string): void {
  const query = projectId ? `?project=${encodeURIComponent(projectId)}` : "";
  window.open(`/preview.html${query}`, "_blank", "noopener,noreferrer");
}
