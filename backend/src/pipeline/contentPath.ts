/**
 * Reads/writes dotted section content paths such as `items.0.name`.
 * Simple keys (`headline`) stay top-level.
 */

const PATH_RE = /^[A-Za-z_][\w]*(\.(?:\d+|[A-Za-z_][\w]*))*$/;

/**
 * Splits a safe dotted path into segments, or null when the string is unsafe.
 */
export function contentPathSegments(path: string): string[] | null {
  const trimmed = path.trim();
  if (!trimmed || !PATH_RE.test(trimmed)) return null;
  return trimmed.split(".");
}

/**
 * Reads a (possibly nested) value from section content JSON.
 */
export function getContentAtPath(
  content: Record<string, unknown>,
  path: string,
): unknown {
  const parts = contentPathSegments(path);
  if (!parts) return content[path];
  let current: unknown = content;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Returns a shallow-cloned tree with one path set to `value`.
 */
export function setContentAtPath(
  content: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const parts = contentPathSegments(path);
  if (!parts || parts.length === 1) {
    return { ...content, [path]: value };
  }
  return setDeep(content, parts, value) as Record<string, unknown>;
}

/**
 * Immutable deep set used by {@link setContentAtPath}.
 */
function setDeep(current: unknown, parts: string[], value: unknown): unknown {
  const [head, ...rest] = parts;
  if (head == null) return value;

  if (/^\d+$/.test(head)) {
    const index = Number(head);
    const arr = Array.isArray(current) ? [...current] : [];
    const existing = arr[index];
    arr[index] =
      rest.length === 0
        ? value
        : setDeep(
            existing && typeof existing === "object" ? existing : {},
            rest,
            value,
          );
    return arr;
  }

  const obj =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
  obj[head] =
    rest.length === 0 ? value : setDeep(obj[head], rest, value);
  return obj;
}
