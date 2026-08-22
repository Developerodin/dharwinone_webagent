/**
 * Deterministic 32-bit string hash.
 *
 * Every seeded choice in the generation engine routes through this so the same
 * brief always produces the same website. Lives on its own because it is a
 * plain utility with no relationship to component selection.
 */
export function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}
