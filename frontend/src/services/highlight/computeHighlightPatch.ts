/**
 * Feature 024: Playback & Display Performance Optimization
 * computeHighlightPatch - Pure diff function for highlight state transitions
 *
 * Computes the diff between previous and current highlighted note sets.
 * Used by updateHighlights() to touch only changed DOM elements.
 *
 * @see contracts/highlight-performance.ts ComputeHighlightPatch, HighlightPatch
 * @see data-model.md HighlightPatch entity
 */

/**
 * Diff between previous and current highlighted note sets.
 * Used by updateHighlights() to touch only changed DOM elements.
 */
export interface HighlightPatch {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly unchanged: boolean;
}

/**
 * Compute the diff between previous and current highlighted note sets.
 * Pure function, no side effects.
 *
 * @param prevIds - Set of note IDs highlighted in the previous frame
 * @param currentIds - Array of note IDs highlighted in the current frame
 * @returns HighlightPatch with added, removed, and unchanged
 */
export function computeHighlightPatch(
  prevIds: ReadonlySet<string>,
  currentIds: readonly string[],
): HighlightPatch {
  // Fast path: both empty
  if (prevIds.size === 0 && currentIds.length === 0) {
    return { added: [], removed: [], unchanged: true };
  }

  const currentSet = new Set(currentIds);

  // Find removed: in prev but not in current
  const removed: string[] = [];
  for (const id of prevIds) {
    if (!currentSet.has(id)) {
      removed.push(id);
    }
  }

  // Find added: in current but not in prev
  const added: string[] = [];
  for (const id of currentIds) {
    if (!prevIds.has(id)) {
      added.push(id);
    }
  }

  const unchanged = added.length === 0 && removed.length === 0;

  return { added, removed, unchanged };
}
