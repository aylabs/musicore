/**
 * Musicore Plugin API — Canonical Contract (v4 patch)
 * Feature 034: Practice from Score
 *
 * This file is the canonical API contract. Implementation target:
 *   frontend/src/plugin-api/types.ts
 *
 * Changes from v3:
 *   + PluginScorePitches         — flat note list result from extractPracticeNotes()
 *   + PluginScoreSelectorProps   — props for new context.components.ScoreSelector component
 *   + PluginScorePlayerContext.extractPracticeNotes()  — new method
 *   + PluginContext.components.ScoreSelector           — new host component
 *   ~ PLUGIN_API_VERSION: "3" → "4"
 *
 * Backward compatibility:
 *   v2 and v3 plugins remain fully functional.
 *   The no-op stub for v2/v3 plugins gains a no-op extractPracticeNotes() that returns null.
 *   No existing types are modified.
 *
 * Constitution compliance:
 *   Principle VI: PluginScorePitches carries only MIDI integers, a clef string,
 *   a count, and a title. No coordinates, bounding boxes, or spatial data cross
 *   the plugin API boundary.
 *   FR-003: Host owns dialog, loading, parsing, note extraction — plugin only receives pitches.
 */

import type { ComponentType } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export all v3 types (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  PluginStaffViewerProps,
  PluginNoteEvent,
  PluginPitchEvent,
  PluginRecordingContext,
  PluginManifest,
  PluginPreloadedScore,
  ScoreLoadSource,
  PluginPlaybackStatus,
  ScorePlayerState,
  PluginScorePlayerContext as PluginScorePlayerContextV3,
  PluginScoreRendererProps,
  PluginContext as PluginContextV3,
  MusicorePlugin,
} from './plugin-api-v3';

// ─────────────────────────────────────────────────────────────────────────────
// v4 additions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flat pitch list returned by context.scorePlayer.extractPracticeNotes().
 *
 * The host derives this from the currently-loaded score by:
 *   1. Reading parts[0].staves[0].voices[0] (first part, topmost staff, first voice).
 *   2. Skipping rests (events with no pitch).
 *   3. For chords: keeping only the highest pitch (max midiNote).
 *   4. Discarding note durations (caller will treat all as quarter notes).
 *   5. Capping to `maxCount`; reporting `totalAvailable` before the cap.
 *
 * GEOMETRY CONSTRAINT (Principle VI): Contains only MIDI integers and a clef
 * string — no coordinates or spatial data cross the plugin API boundary.
 */
export interface PluginScorePitches {
  /**
   * Ordered MIDI pitches extracted from the score.
   * Length: min(maxCount, totalAvailable).
   */
  readonly notes: ReadonlyArray<{ readonly midiPitch: number }>;
  /**
   * Total pitched notes available in the source voice, before the maxCount cap.
   * Use this to cap the exercise Notes slider maximum (FR-006):
   *   <input max={scorePitches.totalAvailable} />
   */
  readonly totalAvailable: number;
  /**
   * Clef of the source score's topmost staff.
   * Normalised to 'Treble' | 'Bass'; unusual clefs (Alto, Tenor) map to 'Treble'.
   */
  readonly clef: 'Treble' | 'Bass';
  /** Display title from score metadata; null if absent in the file. */
  readonly title: string | null;
}

/**
 * Props for the host-provided ScoreSelector component.
 * Available to plugins via context.components.ScoreSelector.
 *
 * Renders a score selection UI consisting of a preloaded catalogue list
 * and a "Load from file" option. The host owns all file-picking, error
 * display, and loading state; the plugin receives resolved events only.
 *
 * Typical usage in Practice plugin:
 * ```tsx
 * {showScoreSelector && (
 *   <context.components.ScoreSelector
 *     catalogue={context.scorePlayer.getCatalogue()}
 *     isLoading={scorePlayerState.status === 'loading'}
 *     error={scorePlayerState.error}
 *     onSelectScore={id => context.scorePlayer.loadScore({ kind: 'catalogue', catalogueId: id })}
 *     onLoadFile={file => context.scorePlayer.loadScore({ kind: 'file', file })}
 *     onCancel={handleSelectorCancel}
 *   />
 * )}
 * ```
 */
export interface PluginScoreSelectorProps {
  /** Catalogue entries from context.scorePlayer.getCatalogue(). */
  catalogue: ReadonlyArray<import('./plugin-api-v3').PluginPreloadedScore>;
  /**
   * When true, shows a loading indicator inside the dialog.
   * Set this while scorePlayerState.status === 'loading'.
   */
  isLoading?: boolean;
  /**
   * Error message to display inside the dialog.
   * Set this from scorePlayerState.error when status === 'error'.
   * Cleared on the next successful load.
   */
  error?: string | null;
  /**
   * Called when the user selects a preloaded score.
   * Plugin should call context.scorePlayer.loadScore({ kind: 'catalogue', catalogueId }).
   */
  onSelectScore: (catalogueId: string) => void;
  /**
   * Called with the user-selected File when they choose "Load from file".
   * Plugin should call context.scorePlayer.loadScore({ kind: 'file', file }).
   */
  onLoadFile: (file: File) => void;
  /**
   * Called when the user explicitly cancels the dialog without selecting a score.
   * Plugin is responsible for reverting preset or keeping the existing score
   * depending on whether a score is already loaded (FR-011).
   */
  onCancel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// v4 PluginScorePlayerContext (extends v3)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PluginPreloadedScore,
  ScoreLoadSource,
  ScorePlayerState,
} from './plugin-api-v3';

export interface PluginScorePlayerContext {
  // ─── All v3 methods (unchanged) ────────────────────────────────────────────
  getCatalogue(): ReadonlyArray<PluginPreloadedScore>;
  loadScore(source: ScoreLoadSource): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seekToTick(tick: number): void;
  setPinnedStart(tick: number | null): void;
  setLoopEnd(tick: number | null): void;
  setTempoMultiplier(multiplier: number): void;
  subscribe(handler: (state: ScorePlayerState) => void): () => void;
  getCurrentTickLive(): number;

  // ─── v4 addition ───────────────────────────────────────────────────────────

  /**
   * Extract a flat ordered list of MIDI pitches from the currently-loaded score.
   *
   * MUST only be called when scorePlayerState.status === 'ready'.
   * Returns null if status is not 'ready' (no score loaded, loading, or error).
   *
   * Extraction rules (applied by host — plugin receives results only):
   *   - Source: parts[0].staves[0].voices[0]
   *   - Rests skipped (only pitched events count)
   *   - Chords: only the highest pitch (max midiNote) is retained
   *   - Note durations discarded (all notes treated as quarter notes)
   *   - Result is capped to `maxCount`; `totalAvailable` reflects pre-cap count
   *   - Clef is derived from parts[0].staves[0].clef
   *
   * @param maxCount  Maximum number of pitches to include in `notes`.
   *                  Typically config.noteCount from the practice sidebar.
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   if (scorePlayerState.status === 'ready') {
   *     const pitches = context.scorePlayer.extractPracticeNotes(config.noteCount);
   *     if (pitches) setScorePitches(pitches);
   *   }
   * }, [scorePlayerState.status]);
   * ```
   */
  extractPracticeNotes(maxCount: number): PluginScorePitches | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// v4 PluginContext (extends v3)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PluginNoteEvent,
  PluginRecordingContext,
  PluginManifest,
  PluginStaffViewerProps,
  PluginScoreRendererProps,
} from './plugin-api-v3';

/**
 * Host-provided context injected into a plugin's `init()` call — v4.
 *
 * v4 adds:
 *   - context.scorePlayer.extractPracticeNotes()  — pitch extraction from loaded score
 *   - context.components.ScoreSelector            — reusable score selection UI
 *
 * All v3 fields are preserved unchanged for backward compatibility.
 * v2 and v3 plugins receive no-op stubs for the new capabilities.
 */
export interface PluginContext {
  // ─── v2 fields (unchanged) ─────────────────────────────────────────────────
  emitNote(event: PluginNoteEvent): void;
  playNote(event: PluginNoteEvent): void;
  readonly midi: {
    readonly subscribe: (handler: (event: PluginNoteEvent) => void) => () => void;
  };
  readonly recording: PluginRecordingContext;
  stopPlayback(): void;
  close(): void;
  readonly manifest: Readonly<PluginManifest>;
  readonly components: {
    readonly StaffViewer: ComponentType<PluginStaffViewerProps>;
    // ─── v3 addition (unchanged) ───────────────────────────────────────────
    readonly ScoreRenderer: ComponentType<PluginScoreRendererProps>;
    // ─── v4 addition ──────────────────────────────────────────────────────
    /**
     * Host-provided React component that renders a score selection dialog.
     * Shows the preloaded catalogue and a "Load from file" option.
     *
     * Handles internally:
     *  - Preloaded catalogue list rendering
     *  - File picker via <input type="file"> (accept=".mxl,.musicxml,.xml")
     *  - Loading spinner (isLoading prop)
     *  - Error display (error prop)
     *
     * The plugin calls context.scorePlayer.loadScore() in response to the
     * onSelectScore / onLoadFile callbacks; the component mirrors loading
     * state back via isLoading.
     */
    readonly ScoreSelector: ComponentType<PluginScoreSelectorProps>;
  };

  // ─── v3 / v4 score player (v4 adds extractPracticeNotes) ──────────────────
  readonly scorePlayer: PluginScorePlayerContext;
}

// ─────────────────────────────────────────────────────────────────────────────
// MusicorePlugin (unchanged from v2/v3)
// ─────────────────────────────────────────────────────────────────────────────

export interface MusicorePlugin {
  init(context: PluginContext): void;
  dispose?(): void;
  Component: ComponentType;
}

// ─────────────────────────────────────────────────────────────────────────────
// API version
// ─────────────────────────────────────────────────────────────────────────────

/** Major version of the currently running Musicore Plugin API. */
export const PLUGIN_API_VERSION = '4' as const;
