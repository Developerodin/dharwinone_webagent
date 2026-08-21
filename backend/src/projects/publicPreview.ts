import { parsePageFamily, type PageFamily } from "../config/pageFamily.js";
import { prisma } from "../db/client.js";
import { notFound } from "../lib/httpError.js";

export type PublicPreview = {
  projectId: string;
  page: unknown;
  pageFamily: PageFamily;
  businessName?: string;
};

/**
 * Reads a business name out of a stored brief JSON blob.
 */
function readBusinessName(brief: unknown): string | undefined {
  if (!brief || typeof brief !== "object") return undefined;
  const name = (brief as { businessName?: unknown }).businessName;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

/**
 * Loads the live page for a shareable public preview.
 *
 * Intentionally unscoped: anyone with the project id can render the site.
 * Returns 404 for missing, trashed, or not-yet-built projects so those cases
 * are indistinguishable.
 */
export async function getPublicPreview(
  projectId: string,
): Promise<PublicPreview> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      pageFamily: true,
      brief: true,
      currentVersionId: true,
    },
  });

  if (!project?.currentVersionId) {
    throw notFound("PROJECT_NOT_FOUND", "That preview could not be found.");
  }

  const version = await prisma.projectVersion.findUnique({
    where: { id: project.currentVersionId },
    select: { page: true, pageFamily: true, brief: true },
  });

  if (!version?.page) {
    throw notFound("PROJECT_NOT_FOUND", "That preview could not be found.");
  }

  const pageFamily =
    parsePageFamily(version.pageFamily) ??
    parsePageFamily(project.pageFamily) ??
    "premium";

  return {
    projectId: project.id,
    page: version.page,
    pageFamily,
    businessName:
      readBusinessName(version.brief) ?? readBusinessName(project.brief),
  };
}
