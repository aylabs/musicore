/**
 * Feature 024: Playback & Display Performance Optimization
 * HighlightIndex - Pre-sorted note index with O(log n + k) binary search
 *
 * Replaces O(n) linear scan in computeHighlightedNotes and NoteHighlightService.
 * Built once per score load; read-only during playback.
 *
 * @see contracts/highlight-performance.ts IHighlightIndex
 * @see data-model.md HighlightIndex entity
 * @see research.md Topic 2: Binary Search for Interval Overlap Queries
 */

/**
 * Lightweight projection of a Note for the sorted index.
 * Contains only fields needed for highlight queries.
 */
export interface IndexedNote {
  readonly id: string;
  readonly startTick: number;
  readonly endTick: number;
}

export class HighlightIndex {
  private sortedNotes: IndexedNote[] = [];
  private _maxDuration = 0;

  get noteCount(): number {
    return this.sortedNotes.length;
  }

  get maxDuration(): number {
    return this._maxDuration;
  }

  /**
   * Build the index from a notes array.
   * Sorts by startTick ascending and precomputes maxDuration.
   * O(n log n) — called once per score load.
   */
  build(
    notes: ReadonlyArray<{
      id: string;
      start_tick: number;
      duration_ticks: number;
    }>,
  ): void {
    this.sortedNotes = notes
      .map((n) => ({
        id: n.id,
        startTick: n.start_tick,
        endTick: n.start_tick + n.duration_ticks,
      }))
      .sort((a, b) => a.startTick - b.startTick);

    this._maxDuration = this.sortedNotes.reduce(
      (max, n) => Math.max(max, n.endTick - n.startTick),
      0,
    );
  }

  /**
   * Find all note IDs that are playing at the given tick.
   * Uses binary search + bounded backward scan.
   * O(log n + k) where k = number of active notes.
   */
  findPlayingNoteIds(currentTick: number): string[] {
    const result: string[] = [];
    const notes = this.sortedNotes;
    const len = notes.length;
    if (len === 0) return result;

    // Binary search: find first index where startTick > currentTick (upper bound)
    let lo = 0;
    let hi = len;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (notes[mid].startTick <= currentTick) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    // Scan backward: check notes with startTick <= currentTick
    // Stop when startTick < currentTick - maxDuration (no note can still be playing)
    const earliest = currentTick - this._maxDuration;
    for (let i = lo - 1; i >= 0 && notes[i].startTick >= earliest; i--) {
      if (currentTick < notes[i].endTick) {
        result.push(notes[i].id);
      }
    }

    return result;
  }

  /** Release internal arrays for garbage collection */
  clear(): void {
    this.sortedNotes = [];
    this._maxDuration = 0;
  }
}
