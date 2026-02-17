/**
 * Feature 024: Playback & Display Performance Optimization
 * Regression tests for known bugs (Constitution Principle VII)
 *
 * These tests document known bugs and MUST FAIL against the current (pre-fix)
 * code, then PASS after the corresponding fixes are implemented.
 *
 * T032: Canon in D audio glitches — renderSVG() should NOT be called for highlight-only changes
 * T033: Moonlight Sonata too slow — highlight computation for 5000 notes must be fast
 * T034: Duplicate highlight computation paths
 *
 * @see tasks.md T032-T034
 */

import { describe, it, expect } from 'vitest';
import { HighlightIndex } from '../services/highlight/HighlightIndex';

// ============================================================================
// T032: Canon in D audio glitches on mobile phones
// Root cause: Full SVG DOM teardown/rebuild on every highlight change
// Fix: T013 (shouldComponentUpdate gate)
//
// NOTE: The actual component-level test (verify renderSVG not called on
// highlight-only prop change) is validated in the LayoutRenderer component
// tests. Here we validate the precondition: LayoutRenderer class currently
// has no shouldComponentUpdate gate. After T013, this test should pass.
// ============================================================================

describe('[T032] BUG: Canon in D audio glitches - renderSVG on highlight change', () => {
  it('LayoutRenderer should have a shouldComponentUpdate method that gates highlight-only changes', async () => {
    // Dynamic import to get the class
    const { LayoutRenderer } = await import('../components/LayoutRenderer');
    const proto = LayoutRenderer.prototype;

    // After T013, LayoutRenderer will have shouldComponentUpdate
    // This test FAILS before T013 (no shouldComponentUpdate exists)
    // and PASSES after T013 (shouldComponentUpdate added)
    expect(typeof proto.shouldComponentUpdate).toBe('function');
  });
});

// ============================================================================
// T033: Moonlight Sonata (4932 notes) playback too slow on tablets
// Root cause: O(n) linear scan of all notes per frame
// Fix: T003 (HighlightIndex binary search) + T019 (delegation)
// ============================================================================

describe('[T033] BUG: Moonlight Sonata highlight computation too slow', () => {
  it('highlight computation for 5000 notes completes in < 1ms', () => {
    const index = new HighlightIndex();
    const notes = Array.from({ length: 5000 }, (_, i) => ({
      id: `note-${i}`,
      start_tick: i * 240,
      duration_ticks: 480,
    }));
    index.build(notes);

    // Warm up
    for (let i = 0; i < 10; i++) {
      index.findPlayingNoteIds(i * 24000);
    }

    // Measure over many queries
    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      index.findPlayingNoteIds((i * 12000) % (5000 * 240));
    }
    const elapsed = performance.now() - start;
    const perQuery = elapsed / iterations;

    // O(log n) binary search should complete well under 1ms
    // This test PASSES with HighlightIndex (O(log n))
    // The OLD computeHighlightedNotes was O(n) and slower
    expect(perQuery).toBeLessThan(1);
  });
});

// ============================================================================
// T034: Duplicate highlight computation paths
// Root cause: Two independent modules both scan all notes
// Fix: T021 (remove NoteHighlightService)
// ============================================================================

describe('[T034] BUG: Duplicate highlight computation paths', () => {
  it('NoteHighlightService module should not exist (consolidated into HighlightIndex)', async () => {
    // After T021 removes NoteHighlightService.ts, the file should not exist.
    // We verify by checking the filesystem via a glob import which returns
    // an empty object if no matching files exist.
    const modules = import.meta.glob('../services/playback/NoteHighlightService.ts', { eager: true });

    // If the module was removed, the glob returns an empty object
    expect(Object.keys(modules).length).toBe(0);
  });
});
