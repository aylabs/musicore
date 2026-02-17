/**
 * Feature 024: Playback & Display Performance Optimization
 * Unit tests for computeHighlightPatch
 *
 * @see tasks.md T010
 */

import { describe, it, expect } from 'vitest';
import { computeHighlightPatch } from './computeHighlightPatch';

describe('computeHighlightPatch', () => {
  it('returns unchanged=true when both sets are empty', () => {
    const patch = computeHighlightPatch(new Set(), []);
    expect(patch.unchanged).toBe(true);
    expect(patch.added).toEqual([]);
    expect(patch.removed).toEqual([]);
  });

  it('returns unchanged=true when sets are identical', () => {
    const prev = new Set(['n1', 'n2', 'n3']);
    const current = ['n1', 'n2', 'n3'];
    const patch = computeHighlightPatch(prev, current);
    expect(patch.unchanged).toBe(true);
    expect(patch.added).toEqual([]);
    expect(patch.removed).toEqual([]);
  });

  it('detects all added when prev is empty', () => {
    const patch = computeHighlightPatch(new Set(), ['n1', 'n2']);
    expect(patch.unchanged).toBe(false);
    expect(patch.added).toEqual(['n1', 'n2']);
    expect(patch.removed).toEqual([]);
  });

  it('detects all removed when current is empty', () => {
    const prev = new Set(['n1', 'n2']);
    const patch = computeHighlightPatch(prev, []);
    expect(patch.unchanged).toBe(false);
    expect(patch.added).toEqual([]);
    expect(new Set(patch.removed)).toEqual(new Set(['n1', 'n2']));
  });

  it('detects partial overlap correctly', () => {
    const prev = new Set(['n1', 'n2', 'n3']);
    const current = ['n2', 'n3', 'n4'];
    const patch = computeHighlightPatch(prev, current);
    expect(patch.unchanged).toBe(false);
    expect(patch.added).toEqual(['n4']);
    expect(patch.removed).toEqual(['n1']);
  });

  it('handles complete replacement', () => {
    const prev = new Set(['n1', 'n2']);
    const current = ['n3', 'n4'];
    const patch = computeHighlightPatch(prev, current);
    expect(patch.unchanged).toBe(false);
    expect(new Set(patch.added)).toEqual(new Set(['n3', 'n4']));
    expect(new Set(patch.removed)).toEqual(new Set(['n1', 'n2']));
  });

  it('handles single note transition', () => {
    const prev = new Set(['n1']);
    const current = ['n2'];
    const patch = computeHighlightPatch(prev, current);
    expect(patch.unchanged).toBe(false);
    expect(patch.added).toEqual(['n2']);
    expect(patch.removed).toEqual(['n1']);
  });

  it('handles duplicate IDs in current array', () => {
    const prev = new Set<string>();
    const current = ['n1', 'n1', 'n2'];
    const patch = computeHighlightPatch(prev, current);
    // n1 appears twice in current but only once in added (via Set dedup)
    expect(patch.added).toContain('n1');
    expect(patch.added).toContain('n2');
  });
});
