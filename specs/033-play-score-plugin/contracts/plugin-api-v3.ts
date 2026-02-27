/**
 * Musicore Plugin API — Canonical Contract (v3)
 * Feature 033: Play Score Plugin & Plugin API Score Player Extension
 *
 * This file is the canonical API contract. Implementation target:
 *   frontend/src/plugin-api/types.ts
 *
 * Changes from v2:
 *   + PluginPreloadedScore      — catalogue entry (id + displayName; path hidden from plugin)
 *   + ScoreLoadSource           — discriminated union for loadScore() input
 *   + PluginPlaybackStatus      — lifecycle states including 'idle' | 'loading' | 'ready'
 *   + ScorePlayerState          — full playback snapshot delivered to subscribers
 *   + PluginScorePlayerContext  — new context.scorePlayer namespace
 *   + PluginScoreRendererProps  — props for context.components.ScoreRenderer
 *   + PluginContext.scorePlayer — new namespace
 *   + PluginContext.components.ScoreRenderer — new host-provided component
 *   ~ PLUGIN_API_VERSION: "2" → "3"
 *
 * Backward compatibility:
 *   v2 plugins (practice-view, virtual-keyboard) remain fully functional.
 *   The host injects a no-op stub context.scorePlayer for v2 plugins.
 *   No existing types are modified.
 *
 * Constitution compliance:
 *   Principle VI: PluginScoreRendererProps carries ONLY tick positions and
 *   note ID sets. No coordinates, bounding boxes, or spatial data cross
 *   the plugin boundary — the WASM engine remains sole layout authority.
 *   FR-016: plugins access all host capabilities via context.* only.
 */

import type { ComponentType } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export all v2 types (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  PluginStaffViewerProps,
  PluginNoteEvent,
  PluginPitchEvent,
  PluginRecordingContext,
  PluginManifest,
  PluginContext as PluginContextV2,
  MusicorePlugin,
} from './plugin-api-v2';

// ─────────────────────────────────────────────────────────────────────────────
// v3 additions — Score Player namespace
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A score entry from the app's bundled preloaded catalogue.
 * Returned by context.scorePlayer.getCatalogue().
 *
 * Note: `path` is intentionally absent. The host resolves file paths
 * internally from the PRELOADED_SCORES manifest so that plugins cannot
 * hardcode score paths (FR-013).
 */
export interface PluginPreloadedScore {
  /** Stable string identifier — e.g. "bach-invention-1" */
  readonly id: string;
  /** User-visible display name — e.g. "Bach — Invention No. 1" */
  readonly displayName: string;
}

/**
 * Input to context.scorePlayer.loadScore().
 * Either a catalogue entry (by id) or a user-provided File object.
 */
export type ScoreLoadSource =
  | { readonly kind: 'catalogue'; readonly catalogueId: string }
  | { readonly kind: 'file';      readonly file: File };

/**
 * Lifecycle states of the score player.
 *
 * Transitions:
 *   idle ──[loadScore]──► loading ──[success]──► ready ──[play]──► playing
 *                                   └──[error]──► error
 *   playing ──[pause]──► paused ──[play]──► playing
 *   playing │
 *   paused  ├──[stop]──► ready
 *   ready   └──[loadScore]──► loading  (reload)
 */
export type PluginPlaybackStatus =
  | 'idle'     // no score loaded
  | 'loading'  // loadScore() in flight (WASM parse + host setup)
  | 'ready'    // score loaded, stopped at tick 0 (or pinned start)
  | 'playing'  // audio running
  | 'paused'   // audio frozen at currentTick
  | 'error';   // load or playback failure — see ScorePlayerState.error

/**
 * Snapshot of playback state pushed to plugin subscribers.
 * Delivered by context.scorePlayer.subscribe() whenever fields change.
 *
 * Update frequency: ~10 Hz during playback (React re-render cadence).
 * For per-frame tick reading, use context.scorePlayer.getCurrentTickLive().
 */
export interface ScorePlayerState {
  readonly status: PluginPlaybackStatus;
  /**
   * Current playback position in 960-PPQ integer ticks.
   * Resets to 0 (or pinnedStartTick) on stop.
   */
  readonly currentTick: number;
  /** Total score duration in ticks; 0 when status is 'idle' or 'loading'. */
  readonly totalDurationTicks: number;
  /**
   * Set of note IDs that should visually be highlighted.
   * Computed by host's useNoteHighlight hook; stable reference when unchanged.
   *
   * GEOMETRY CONSTRAINT: These are opaque string IDs only — no coordinates,
   * bounding boxes, or spatial data are included (Principle VI).
   */
  readonly highlightedNoteIds: ReadonlySet<string>;
  /**
   * Effective playback tempo in BPM (originalBpm × tempoMultiplier).
   * 0 when no score is loaded.
   */
  readonly bpm: number;
  /** Display title from score metadata; null until a score is loaded. */
  readonly title: string | null;
  /** Error message; non-null when status === 'error'. */
  readonly error: string | null;
}

/**
 * Score player context injected into plugins via context.scorePlayer.
 *
 * The score player is the v3 extension that enables the Play Score Plugin
 * (and future score-rendering plugins) to load, display, and control
 * playback of full musical scores without importing host internals.
 */
export interface PluginScorePlayerContext {
  // ─── Discovery ─────────────────────────────────────────────────────────────

  /**
   * Returns all scores in the app's bundled preloaded catalogue.
   * Derived from PRELOADED_SCORES; stable across renders.
   *
   * Render the list in the score selection screen (US1 / FR-003).
   */
  getCatalogue(): ReadonlyArray<PluginPreloadedScore>;

  // ─── Loading ────────────────────────────────────────────────────────────────

  /**
   * Load a score from the catalogue or a user-provided File.
   *
   * Triggers status transition: idle/ready/error → loading → ready|error.
   * On success the score is parsed via the Rust WASM engine and the
   * ScorePlayerState snapshot is updated.
   *
   * For catalogue scores the host resolves the file path internally
   * (FR-013: no paths in plugin code).
   *
   * @throws never — errors are surfaced via ScorePlayerState.error.
   */
  loadScore(source: ScoreLoadSource): Promise<void>;

  // ─── Playback controls ─────────────────────────────────────────────────────

  /** Start or resume playback. No-op if already playing. */
  play(): Promise<void>;
  /** Freeze playback at currentTick. No-op if already paused or stopped. */
  pause(): void;
  /**
   * Stop playback and reset position to pinnedStartTick (if set) or tick 0.
   * Status transitions to 'ready'.
   */
  stop(): void;
  /**
   * Seek to an absolute tick position.
   * If playing, playback continues from the new position immediately.
   * If paused or stopped, position updates but playback does not auto-start.
   */
  seekToTick(tick: number): void;

  // ─── Pin / loop control ────────────────────────────────────────────────────

  /**
   * Set the loop-start pin tick.
   * Pass null to unpin (clears the pin anchor; Stop then resets to tick 0).
   * The host's playback engine enforces the pinned start on Stop.
   */
  setPinnedStart(tick: number | null): void;

  /**
   * Set the loop-end tick.
   * When both pinnedStart and loopEnd are non-null, playback wraps to
   * pinnedStart upon reaching loopEnd (FR-009).
   * Pass null to remove the loop endpoint (single-pin mode).
   */
  setLoopEnd(tick: number | null): void;

  // ─── Tempo ─────────────────────────────────────────────────────────────────

  /**
   * Set the tempo multiplier in the range [0.5, 2.0].
   * Effective BPM = scoreBpm × multiplier; clamped by host.
   * Change takes effect from the next scheduled note (FR-015).
   *
   * Current effective BPM is available in ScorePlayerState.bpm.
   */
  setTempoMultiplier(multiplier: number): void;

  // ─── State subscription ────────────────────────────────────────────────────

  /**
   * Subscribe to ScorePlayerState snapshots.
   * The handler is called synchronously once with the current state on
   * subscription (to avoid a missed-first-render), then on each subsequent
   * state change.
   *
   * Returns an unsubscribe function — call it in cleanup:
   *
   * ```tsx
   * useEffect(() => context.scorePlayer.subscribe(setState), [context]);
   * ```
   */
  subscribe(handler: (state: ScorePlayerState) => void): () => void;

  /**
   * Read the current playback tick **without triggering re-renders**.
   * The returned value is sourced from the host's 60 Hz rAF loop.
   * Use this inside your own requestAnimationFrame callback when you need
   * sub-10 Hz tick resolution (e.g., a progress bar driven by rAF).
   *
   * For most plugin UI, ScorePlayerState.currentTick (via subscribe) is sufficient.
   */
  getCurrentTickLive(): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreRenderer component props (v3 — context.components.ScoreRenderer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the host-provided ScoreRenderer component available to plugins
 * via `context.components.ScoreRenderer`.
 *
 * The component renders a full interactive score in full-screen mode, wired to
 * the Rust WASM layout engine (FR-004). It handles all geometry, long-press
 * detection (≥500 ms, FR-008), hit-testing, and SVG rendering on the host side.
 * The plugin receives only resolved semantic events (tick positions and note IDs).
 *
 * GEOMETRY CONSTRAINT (Principle VI): Props and callbacks carry ONLY tick values
 * and opaque note ID strings. No coordinates, bounding boxes, or spatial
 * geometry cross the plugin API boundary.
 */
export interface PluginScoreRendererProps {
  // ─── State props (from ScorePlayerState + plugin pin state) ───────────────

  /**
   * Current playback tick for note cursor positioning.
   * Source: ScorePlayerState.currentTick from subscribe().
   */
  currentTick: number;

  /**
   * Set of note IDs to visually highlight (currently playing notes).
   * Source: ScorePlayerState.highlightedNoteIds from subscribe().
   */
  highlightedNoteIds: ReadonlySet<string>;

  /**
   * Active loop region to display as an overlay rectangle.
   * null when no loop region is set (no pins, or only one pin).
   * Source: derived from plugin's PinState pair (data-model.md).
   */
  loopRegion: { readonly startTick: number; readonly endTick: number } | null;

  /**
   * Note IDs that carry a pin marker (green indicator).
   * Contains 0, 1, or 2 note IDs (from PinState).
   */
  pinnedNoteIds: ReadonlySet<string>;

  // ─── Interaction callbacks (plugin implements) ────────────────────────────

  /**
   * Called when the user short-taps (< 500 ms, drift < 15 px) on a note.
   * Plugin should call context.scorePlayer.seekToTick(tick) in response.
   * Corresponds to FR-007 / US3.
   */
  onNoteShortTap: (tick: number, noteId: string) => void;

  /**
   * Called when the user long-presses (≥ 500 ms) on a note or within the
   * score canvas. Plugin implements the pin/loop state machine (FR-008 / US4).
   * noteId is null only when the press landed on the canvas with no nearby note.
   */
  onNoteLongPress: (tick: number, noteId: string | null) => void;

  /**
   * Called when the user short-taps the score canvas background (not on a note).
   * Plugin should toggle play/pause in response (FR-006 / US2 scenario 5).
   */
  onCanvasTap: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// v3 PluginContext (extends v2)
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PluginNoteEvent,
  PluginRecordingContext,
  PluginManifest,
  PluginStaffViewerProps,
} from './plugin-api-v2';

/**
 * Host-provided context injected into a plugin's `init()` call — v3.
 *
 * v3 adds:
 *   - context.scorePlayer  — score loading + playback control namespace
 *   - context.components.ScoreRenderer — full-score interactive renderer
 *
 * All v2 fields are preserved unchanged for backward compatibility.
 */
export interface PluginContext {
  // ─── v2 fields (unchanged) ──────────────────────────────────────────────
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
    // ─── v3 addition ──────────────────────────────────────────────────────
    /**
     * Host-provided React component that renders a full interactive score.
     * Wraps the WASM layout engine rendering pipeline and LayoutView.
     *
     * Handles internally:
     *  - Score layout via computeLayout() (Rust/WASM, Principle VI)
     *  - Long-press detection (500 ms timeout + 15 px drift guard)
     *  - Note hit-testing (nearest-note DOM scan)
     *  - Loop region overlay rendering
     *  - Pin marker rendering
     *  - Return-to-start button at the bottom of the score (FR-010)
     *  - Auto-scroll to keep current tick visible
     */
    readonly ScoreRenderer: ComponentType<PluginScoreRendererProps>;
  };

  // ─── v3 addition ─────────────────────────────────────────────────────────
  /**
   * Score player context — the primary v3 extension.
   * Provides score loading, playback control, pin/loop management,
   * tempo control, and state subscriptions for full-score plugins.
   *
   * For v2 plugins this namespace is injected as a no-op stub.
   */
  readonly scorePlayer: PluginScorePlayerContext;
}

// ─────────────────────────────────────────────────────────────────────────────
// MusicorePlugin (unchanged from v2)
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
export const PLUGIN_API_VERSION = '3' as const;
