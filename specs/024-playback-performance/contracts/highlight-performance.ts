/**
 * Contracts: Playback & Display Performance Optimization
 * Feature: 024-playback-performance
 *
 * TypeScript interfaces for the new performance-optimized highlight system.
 * These contracts define the API surface between components.
 */

// ─── HighlightIndex ─────────────────────────────────────────────────────

/**
 * Lightweight projection of a Note for the sorted index.
 * Contains only fields needed for highlight queries.
 */
export interface IndexedNote {
  /** Note UUID (matches Note.id from domain) */
  readonly id: string;
  /** Note start position in ticks (960 PPQ) */
  readonly startTick: number;
  /** Precomputed end tick: startTick + durationTicks */
  readonly endTick: number;
}

/**
 * Pre-sorted index over notes for O(log n + k) highlight queries.
 *
 * Built once when a score is loaded. Read-only during playback.
 * Replaces both `computeHighlightedNotes()` and `NoteHighlightService.getPlayingNoteIds()`.
 */
export interface IHighlightIndex {
  /** Number of notes in the index */
  readonly noteCount: number;

  /** Maximum note duration in ticks (bounds backward scan) */
  readonly maxDuration: number;

  /**
   * Build the index from a notes array.
   * Sorts by startTick ascending and precomputes maxDuration.
   * O(n log n) — called once per score load.
   *
   * @param notes - Array of notes with id, start_tick, duration_ticks fields
   */
  build(notes: ReadonlyArray<{ id: string; start_tick: number; duration_ticks: number }>): void;

  /**
   * Find all note IDs that are playing at the given tick.
   * Uses binary search + bounded backward scan.
   * O(log n + k) where k = number of active notes.
   *
   * @param currentTick - Current playback position in ticks
   * @returns Array of note IDs currently playing (may be empty)
   */
  findPlayingNoteIds(currentTick: number): string[];

  /** Release internal arrays for garbage collection */
  clear(): void;
}

// ─── HighlightPatch ─────────────────────────────────────────────────────

/**
 * Diff between previous and current highlighted note sets.
 * Used by updateHighlights() to touch only changed DOM elements.
 */
export interface HighlightPatch {
  /** Note IDs that became highlighted this frame */
  readonly added: readonly string[];
  /** Note IDs that stopped being highlighted this frame */
  readonly removed: readonly string[];
  /** True if no changes (added and removed are both empty) */
  readonly unchanged: boolean;
}

// ─── FrameBudgetMonitor ─────────────────────────────────────────────────

/**
 * Tracks per-frame rendering time and triggers graceful degradation.
 * Audio-first policy: visual updates are sacrificed before audio quality.
 */
export interface IFrameBudgetMonitor {
  /** Frame budget in milliseconds (8ms mobile, 12ms desktop) */
  readonly budgetMs: number;

  /** Whether currently in degraded mode (skipping frames) */
  readonly isDegraded: boolean;

  /**
   * Mark the start of a frame's work.
   * @returns Timestamp from performance.now()
   */
  startFrame(): number;

  /**
   * Mark the end of a frame's work.
   * Updates internal counters and degradation state.
   * @param startTime - Timestamp returned by startFrame()
   */
  endFrame(startTime: number): void;

  /**
   * Check if this frame should be skipped (degradation active).
   * When degraded, returns true on alternating frames.
   */
  shouldSkipFrame(): boolean;

  /** Reset all counters (e.g., on playback stop) */
  reset(): void;
}

// ─── DeviceProfile ──────────────────────────────────────────────────────

/**
 * Detected device characteristics for frame rate selection.
 */
export interface DeviceProfile {
  /** True if device is a phone/tablet in touch mode */
  readonly isMobile: boolean;

  /** Target interval between highlight updates in ms (33 for mobile, 16 for desktop) */
  readonly targetFrameIntervalMs: number;

  /** Per-frame time budget for highlight work in ms (8 for mobile, 12 for desktop) */
  readonly frameBudgetMs: number;
}

// ─── LayoutRenderer Highlight API ───────────────────────────────────────

/**
 * Contract for the highlight update method on LayoutRenderer.
 * Called by the rAF loop — never triggers React re-renders.
 */
export interface IHighlightUpdater {
  /**
   * Apply a highlight patch to the SVG DOM.
   * Toggles `.highlighted` CSS class on elements with matching `data-note-id` attributes.
   *
   * @param patch - Diff describing which notes to highlight/unhighlight
   */
  applyHighlightPatch(patch: HighlightPatch): void;
}

// ─── Tick Source ─────────────────────────────────────────────────────────

/**
 * Non-React mechanism for reading the current playback tick.
 * Used by the rAF highlight loop to avoid React state subscriptions.
 */
export interface ITickSource {
  /** Current playback position in ticks. Updated by the playback engine. */
  readonly currentTick: number;

  /** Current playback status */
  readonly status: 'stopped' | 'playing' | 'paused';
}

// ─── Device Detection ───────────────────────────────────────────────────

/**
 * Detect the device profile for frame rate selection.
 * Uses matchMedia queries with viewport width fallback.
 *
 * @returns DeviceProfile with isMobile, targetFrameIntervalMs, frameBudgetMs
 */
export type DetectDeviceProfile = () => DeviceProfile;

// ─── computeHighlightPatch ─────────────────────────────────────────────

/**
 * Compute the diff between previous and current highlighted note sets.
 * Pure function, no side effects.
 *
 * @param prevIds - Set of note IDs highlighted in the previous frame
 * @param currentIds - Array of note IDs highlighted in the current frame
 * @returns HighlightPatch with added, removed, and unchanged
 */
export type ComputeHighlightPatch = (
  prevIds: ReadonlySet<string>,
  currentIds: readonly string[]
) => HighlightPatch;
