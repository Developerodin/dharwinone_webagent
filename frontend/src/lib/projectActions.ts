import {
  deleteServerProject,
  duplicateServerProject,
  renameServerProject,
  restoreServerProject,
  type ServerProject,
} from "@/lib/projectApi";
import {
  deleteProject as deleteCachedProject,
  loadProject,
  saveProject,
  type StoredProject,
} from "@/lib/projectStorage";

/**
 * Project lifecycle actions.
 *
 * Each one writes to the server first and only then touches the local cache.
 * The other order looks faster and is wrong: a rename that fails server-side
 * would leave the dashboard showing a name the project does not have, and the
 * next sync would silently undo it in front of the user.
 */

/**
 * Renames a project.
 */
export async function renameProject(
  id: string,
  name: string,
): Promise<ServerProject> {
  const project = await renameServerProject(id, name);

  const cached = loadProject(id);
  if (cached) saveProject({ ...cached, businessName: project.name });

  return project;
}

/**
 * Moves a project to the trash.
 *
 * Soft delete: the server keeps it for the retention window, so this is
 * recoverable until the purge job runs.
 */
export async function trashProject(id: string): Promise<void> {
  await deleteServerProject(id);
  deleteCachedProject(id);
}

/**
 * Restores a project from the trash.
 */
export async function untrashProject(id: string): Promise<ServerProject> {
  return restoreServerProject(id);
}

/**
 * Copies a project, including its history.
 *
 * The copy is seeded into the cache from the summary the server returns so it
 * appears in the list immediately; its page is fetched when it is opened.
 */
export async function duplicateProject(
  id: string,
): Promise<{ project: ServerProject; cached: StoredProject | null }> {
  const project = await duplicateServerProject(id);
  const source = loadProject(id);

  const cached: StoredProject | null = source
    ? {
        ...source,
        id: project.id,
        businessName: project.name,
        messages: [],
        syncedMessageCount: 0,
        serverVersion: project.currentVersion,
        createdAt: Date.parse(project.createdAt) || Date.now(),
        updatedAt: Date.now(),
      }
    : null;

  if (cached) saveProject(cached);

  return { project, cached };
}
