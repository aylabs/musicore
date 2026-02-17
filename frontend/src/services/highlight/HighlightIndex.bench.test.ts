/**
 * Feature 024: Playback & Display Performance Optimization
 * Performance benchmark for HighlightIndex — CI regression check (SC-003)
 *
 * Validates:
 * - findPlayingNoteIds() < 0.1ms for 10,000 notes
 * - Full updateHighlights loop < 4ms for 10,000 notes
 *
 * Run with: npx vitest run src/services/highlight/HighlightIndex.bench.ts
 *
 * @see tasks.md T028
 */

import { describe, it, expect } from 'vitest';
import { HighlightIndex } from './HighlightIndex';
import { computeHighlightPatch } from './computeHighlightPatch';

/**
 * Generate a dense score fixture with the specified number of notes.
 * Notes are sequential with slight overlap to simulate realistic scores.
 */
function generateNotes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `note-${i}`,
    start_tick: i * 120, // ~32nd notes at 480 ticks/beat
    duration_ticks: 480,
  }));
}

describe('HighlightIndex Performance Benchmarks (T028)', () => {
  const NOTES_10K = generateNotes(10_000);

  it('findPlayingNoteIds < 0.1ms for 10K notes', () => {
    const index = new HighlightIndex();
    index.build(NOTES_10K);

    // Warm up JIT
    for (let i = 0; i < 50; i++) {
      index.findPlayingNoteIds(i * 24000);
    }

    // Measure over many iterations for statistical reliability
    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const tick = (i * 1200) % (10_000 * 120);
      index.findPlayingNoteIds(tick);
    }
    const elapsed = performance.now() - start;
    const perQuery = elapsed / iterations;

    // SC-003: findPlayingNoteIds < 0.1ms per query
    expect(perQuery).toBeLessThan(0.1);
  });

  it('full highlight update loop < 4ms for 10K notes', () => {
    const index = new HighlightIndex();
    index.build(NOTES_10K);

    // Simulate a full updateHighlights() cycle:
    // 1. findPlayingNoteIds()
    // 2. computeHighlightPatch()
    // 3. DOM operations (simulated with string ops since no real DOM)

    // Warm up
    let prevIds = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const ids = index.findPlayingNoteIds(i * 12000);
      computeHighlightPatch(prevIds, ids);
      prevIds = new Set(ids);
    }

    // Measure a representative transition (notes changing)
    const iterations = 100;
    prevIds = new Set<string>();
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const tick = i * 480; // Advance by a beat each iteration
      const ids = index.findPlayingNoteIds(tick);
      const patch = computeHighlightPatch(prevIds, ids);

      // Simulate DOM class toggling (string operations instead of real DOM)
      for (const id of patch.removed) {
        void id.length; // minimal work per element
      }
      for (const id of patch.added) {
        void id.length;
      }

      prevIds = new Set(ids);
    }
    const elapsed = performance.now() - start;
    const perFrame = elapsed / iterations;

    // SC-003: Full highlight update < 4ms per frame
    expect(perFrame).toBeLessThan(4);
  });

  it('build() completes in < 50ms for 10K notes', () => {
    const index = new HighlightIndex();

    // Warm up
    index.build(NOTES_10K);
    index.build(NOTES_10K);

    const iterations = 10;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      index.build(NOTES_10K);
    }
    const elapsed = performance.now() - start;
    const perBuild = elapsed / iterations;

    // build() is O(n log n) — should complete quickly for 10K notes
    expect(perBuild).toBeLessThan(50);
  });
});
