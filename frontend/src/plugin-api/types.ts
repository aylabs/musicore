/**
 * Musicore Plugin API — Types (v2)
 * Feature 030: Plugin Architecture (v1 baseline)
 * Feature 031: Practice View Plugin — adds recording namespace and offsetMs (v2)
 *
 * Defines all public types for the Musicore Plugin API.
 * See specs/030-plugin-architecture/contracts/plugin-api.ts for the v1 canonical contract.
 * See specs/031-practice-view-plugin/contracts/plugin-api-v2.ts for the v2 contract.
 *
 * Constitution Principle VI: PluginNoteEvent carries ONLY musical data (midiNote,
 * timestamp, velocity). No coordinate or layout geometry is permitted here — the
 * WASM engine is the sole authority over all spatial layout.
 * Privacy constraint (FR-020): PluginPitchEvent carries only pitch metadata —
 * NO raw PCM, waveform, or audio buffer data may be included.
 */

import type { ComponentType } from 'react';

// ---------------------------------------------------------------------------
// Staff viewer component props (injected via PluginContext.components)
// ---------------------------------------------------------------------------

/**
 * Props for the host-provided StaffViewer component available to plugins via
 * `context.components.StaffViewer`.  Plugins receive a live React component
 * that renders a notation staff from their note events — no layout math needed
 * in plugin code.
 */
export interface PluginStaffViewerProps {
  /**
   * Ordered list of note events to display on the staff.
   * Only `type === 'attack'` (or events with no `type`) are shown as notes;
   * release events are ignored for display purposes.
   */
  readonly notes: readonly PluginNoteEvent[];
  /**
   * MIDI note numbers to accent on the staff.
   * Only the **most recent occurrence** of each pitch in the staff is highlighted,
   * so passing the just-released note cleanly accents the note that was just added.
   */
  readonly highlightedNotes?: readonly number[];
  /** Clef for the staff display (default: 'Treble'). */
  readonly clef?: 'Treble' | 'Bass';
  /**
   * When `true` the staff container scrolls to keep the most recently played
   * note visible whenever a new note is appended.  The user can still scroll
   * back manually; the next note event re-enables auto-scroll.
   * Defaults to `false`.
   */
  readonly autoScroll?: boolean;
  /**
   * Beats-per-minute of the content being displayed.
   * When provided, note `timestamp` values (in ms since exercise start) are
   * converted to tick positions and the staff is rendered via the Rust WASM
   * layout engine — producing a proper time signature, measure lines, and
   * engraved note heads.
   * When omitted (default), notes are laid out sequentially using the lighter
   * JavaScript layout engine (suitable for live-recorded response staves where
   * absolute timing is not meaningful).
   */
  readonly bpm?: number;
  /**
   * When provided, each note's `timestamp` is shifted by `-timestampOffset` before
   * converting to tick positions. Pass `playStartMs` here for live-recorded response
   * staves so that `timestamp - timestampOffset` equals the onset in ms from exercise
   * start (matching the WASM layout's time axis).
   * Defaults to `0`.
   */
  readonly timestampOffset?: number;
  /**
   * When provided, the attack-note at this zero-based index is highlighted on the
   * WASM layout staff. Use this instead of `highlightedNotes` for exercise staves
   * where the current slot index (not MIDI pitch) determines which note to accent,
   * avoiding false-positives when the same pitch appears multiple times.
   */
  readonly highlightedNoteIndex?: number;
}

// ---------------------------------------------------------------------------
// Domain events
// ---------------------------------------------------------------------------

/**
 * Emitted by a plugin when a note input event occurs (e.g. virtual key press).
 * Plugins produce this event; the host consumes it and passes it to the WASM
 * layout engine. Must NOT include coordinate or layout data.
 */
export interface PluginNoteEvent {
  /** MIDI note number (0–127). Middle C = 60. */
  readonly midiNote: number;
  /** Millisecond timestamp (Date.now()) at the moment of input. */
  readonly timestamp: number;
  /** MIDI velocity (1–127). Defaults to 64 (mezzo-forte) if omitted. */
  readonly velocity?: number;
  /**
   * Whether this is a key attack (note-on) or release (note-off).
   * Defaults to 'attack' when omitted.
   */
  readonly type?: 'attack' | 'release';
  /**
   * How long the key was held, in milliseconds.
   * Only present on attack events whose key has already been released.
   * `PluginStaffViewer` uses this to render the correct note value
   * (e.g. 250 ms ≈ eighth note at 120 BPM).
   */
  readonly durationMs?: number;
  /**
   * Scheduled playback offset in milliseconds from the moment `playNote` is called.
   * When > 0, the host defers note-on by this amount using a host-managed timer.
   * The timer is cancellable via `context.stopPlayback()` (see research.md R-002).
   * Defaults to 0 (immediate) when absent.
   *
   * v2 addition: Feature 031
   */
  readonly offsetMs?: number;
}

// ---------------------------------------------------------------------------
// Pitch event (v2 — Feature 031)
// ---------------------------------------------------------------------------

/**
 * A single microphone pitch detection event dispatched by the host to
 * subscribed plugins via `context.recording.subscribe`.
 *
 * Privacy constraint (FR-020): contains ONLY pitch metadata.
 * No PCM samples, audio buffers, or raw waveform data may be present.
 */
export interface PluginPitchEvent {
  /** Quantised MIDI note number (0–127). Middle C = 60. */
  readonly midiNote: number;
  /** Detected frequency in Hz (e.g. 261.63 for middle C). */
  readonly hz: number;
  /** Detection confidence in [0, 1] — values ≥ 0.9 are considered reliable. */
  readonly confidence: number;
  /** Epoch timestamp in milliseconds (Date.now()) at detection time. */
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// Recording context (v2 — Feature 031)
// ---------------------------------------------------------------------------

/**
 * Microphone pitch subscription API injected into plugins via
 * `context.recording`. The host manages a single shared AudioWorklet stream
 * (PluginMicBroadcaster) and multiplexes pitch events to all subscribers.
 *
 * Usage:
 * ```tsx
 * useEffect(() => {
 *   return context.recording.subscribe((event) => {
 *     if (phase !== 'playing') return;
 *     captureRef.current.push(event);
 *   });
 * }, [context, phase]);
 * ```
 */
export interface PluginRecordingContext {
  /**
   * Subscribe to microphone pitch events.
   * The host opens the mic on the first subscriber and keeps it warm for
   * subsequent subscribers (shared stream, one getUserMedia call).
   * Returns an unsubscribe function — call it in your cleanup.
   */
  subscribe(handler: (event: PluginPitchEvent) => void): () => void;
  /**
   * Subscribe to microphone error notifications.
   * If the mic is already in an error state when you subscribe, the handler
   * is invoked asynchronously (queued microtask) with the current error.
   * Returns an unsubscribe function.
   */
  onError(handler: (error: string) => void): () => void;
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

/**
 * Read-only plugin descriptor. Available to plugins at runtime via PluginContext.
 * The `origin` field is set by the host — it is NOT present in plugin.json.
 */
export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly pluginApiVersion: string;
  readonly entryPoint: string;
  readonly description?: string;
  /**
   * Plugin role:
   * - `'core'`   — first-class feature; shown as a launch button on the Landing
   *                Screen so users discover it without loading a score first.
   * - `'common'` — utility/tool; accessible via the plugin nav bar but not
   *                featured on the Landing Screen.
   * Defaults to `'common'` when omitted.
   */
  readonly type?: 'core' | 'common';
  /**
   * Display mode:
   * - `'full-screen'` — replaces the entire app viewport (no header, no nav bar).
   *                     The plugin must provide its own back/close button.
   * - `'window'`      — renders in a windowed overlay with the host's back-bar.
   * Defaults to `'window'` when omitted.
   */
  readonly view?: 'full-screen' | 'window';
  /**
   * Optional emoji or single character used as the plugin's icon.
   * Displayed on the Landing Screen launch button and any other plugin entry points.
   * Example: '𝄞' (treble clef), '🎹' (keyboard).
   */
  readonly icon?: string;
  /** Set by the host: 'builtin' for repo plugins, 'imported' for user-installed. */
  readonly origin: 'builtin' | 'imported';
}

// ---------------------------------------------------------------------------
// v3 types — Score Player namespace (Feature 033)
// ---------------------------------------------------------------------------

/**
 * A score entry from the app's bundled preloaded catalogue.
 * Returned by context.scorePlayer.getCatalogue().
 *
 * Note: `path` is intentionally absent. The host resolves file paths
 * internally so plugins cannot hardcode score paths (FR-013).
 */
export interface PluginPreloadedScore {
  /** Stable string identifier, e.g. "bach-invention-1" */
  readonly id: string;
  /** User-visible display name, e.g. "Bach — Invention No. 1" */
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
 */
export type PluginPlaybackStatus =
  | 'idle'     // no score loaded
  | 'loading'  // loadScore() in flight
  | 'ready'    // score loaded, stopped
  | 'playing'  // audio running
  | 'paused'   // audio frozen at currentTick
  | 'error';   // load or playback failure

/**
 * Snapshot of playback state pushed to plugin subscribers.
 * Delivered by context.scorePlayer.subscribe() whenever fields change.
 */
export interface ScorePlayerState {
  readonly status: PluginPlaybackStatus;
  /** Current playback position in 960-PPQ integer ticks. */
  readonly currentTick: number;
  /** Total score duration in ticks; 0 when idle or loading. */
  readonly totalDurationTicks: number;
  /**
   * Set of note IDs that should visually be highlighted.
   * Stable reference when content unchanged (Principle VI: opaque IDs only).
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
 * v3 extension enabling score loading, playback control, and subscriptions.
 * For v2 plugins this namespace is injected as a no-op stub.
 */
export interface PluginScorePlayerContext {
  // ─── Discovery ────────────────────────────────────────────────────────────

  /** Returns all scores in the app's bundled preloaded catalogue (stable). */
  getCatalogue(): ReadonlyArray<PluginPreloadedScore>;

  // ─── Loading ──────────────────────────────────────────────────────────────

  /**
   * Load a score from the catalogue or a user-provided File.
   * Errors are surfaced via ScorePlayerState.error; never throws.
   */
  loadScore(source: ScoreLoadSource): Promise<void>;

  // ─── Playback controls ────────────────────────────────────────────────────

  /** Start or resume playback. No-op if already playing. */
  play(): Promise<void>;
  /** Freeze playback at currentTick. No-op if already paused/stopped. */
  pause(): void;
  /**
   * Stop playback and reset position to pinnedStartTick (if set) or tick 0.
   * Status transitions to 'ready'.
   */
  stop(): void;
  /**
   * Seek to an absolute tick position.
   * If playing, continues from the new position immediately.
   */
  seekToTick(tick: number): void;

  // ─── Pin / loop control ───────────────────────────────────────────────────

  /** Set the loop-start pin tick. Pass null to unpin. */
  setPinnedStart(tick: number | null): void;

  /** Set the loop-end tick. Pass null to remove the loop end. */
  setLoopEnd(tick: number | null): void;

  // ─── Tempo ────────────────────────────────────────────────────────────────

  /**
   * Set the tempo multiplier in the range [0.5, 2.0].
   * Effective BPM = scoreBpm × multiplier; clamped by host.
   */
  setTempoMultiplier(multiplier: number): void;

  // ─── State subscription ───────────────────────────────────────────────────

  /**
   * Subscribe to ScorePlayerState snapshots.
   * Handler is called synchronously once with the current state, then on each change.
   * Returns an unsubscribe function.
   */
  subscribe(handler: (state: ScorePlayerState) => void): () => void;

  /**
   * Read the current playback tick WITHOUT triggering re-renders.
   * Sourced from the host's 60 Hz rAF loop.
   */
  getCurrentTickLive(): number;
}

/**
 * Props for the host-provided ScoreRenderer component (v3).
 * Available to plugins via `context.components.ScoreRenderer`.
 *
 * The component renders a full interactive score, handling all geometry,
 * long-press detection (≥500 ms), hit-testing, and SVG rendering.
 *
 * GEOMETRY CONSTRAINT (Principle VI): Props carry ONLY tick values and
 * opaque note ID strings — no coordinates cross the plugin API boundary.
 */
export interface PluginScoreRendererProps {
  /** Current playback tick for note cursor positioning. */
  currentTick: number;
  /** Set of note IDs to visually highlight (currently playing notes). */
  highlightedNoteIds: ReadonlySet<string>;
  /** Active loop region overlay; null when no loop region is set. */
  loopRegion: { readonly startTick: number; readonly endTick: number } | null;
  /** Note IDs carrying a pin marker (green indicator). 0–2 IDs. */
  pinnedNoteIds: ReadonlySet<string>;
  /** Short tap (< 500 ms, drift < 15 px) on a note — seek intent. */
  onNoteShortTap: (tick: number, noteId: string) => void;
  /** Long press (≥ 500 ms) on a note or canvas — pin/loop intent. */
  onNoteLongPress: (tick: number, noteId: string | null) => void;
  /** Short tap on canvas background — toggle play/pause intent. */
  onCanvasTap: () => void;
  /** "Back to start" button at the bottom of the score — seek-to-start intent. */
  onReturnToStart: () => void;
}

// ---------------------------------------------------------------------------
// Plugin context
// ---------------------------------------------------------------------------

/**
 * Host-provided context injected into a plugin's `init()` call.
 * The only communication channel from plugin → host.
 */
export interface PluginContext {
  /**
   * Emit a note event to the host. The host forwards it to the
   * WASM layout pipeline which renders the note on the staff.
   */
  emitNote(event: PluginNoteEvent): void;
  /**
   * Play a note through the host audio engine (Salamander Grand Piano samples).
   * The host resolves the MIDI note number to sample playback via ToneAdapter.
   *
   * - `event.type === 'attack'` (default): triggers note-on immediately.
   * - `event.type === 'release'`: releases a sustained note.
   *
   * This is the only authorised route for plugins to produce audio — plugins
   * must NOT import Tone.js or Web Audio API directly.
   */
  playNote(event: PluginNoteEvent): void;
  /**
   * MIDI hardware keyboard integration.
   * Subscribe to receive note events from any connected MIDI device.
   * The callback is invoked with `type: 'attack'` on note-on and
   * `type: 'release'` on note-off/note-on-with-velocity-0.
   * When no MIDI device is connected the handler is never called.
   *
   * Returns an unsubscribe function — call it in your cleanup:
   * ```tsx
   * useEffect(() => context.midi.subscribe(handler), [context]);
   * ```
   */
  readonly midi: {
    readonly subscribe: (handler: (event: PluginNoteEvent) => void) => () => void;
  };
  /**
   * Microphone pitch capture subscription API (v2 — Feature 031).
   * Allows plugins to subscribe to pitch detection events from the host's
   * shared AudioWorklet mic pipeline. The host opens the mic on first
   * subscription and releases it when all subscribers unsubscribe.
   *
   * Privacy constraint (FR-020): pitch events only — no raw PCM or audio data.
   */
  readonly recording: PluginRecordingContext;
  /**
   * Stop all scheduled notes for this plugin and silence any sustaining notes.
   * Cancels all pending `offsetMs` timers registered by this plugin's
   * `playNote` calls and calls `ToneAdapter.stopAll()` (v2 — Feature 031).
   *
   * Use this when the user stops an exercise, navigates away, or the plugin
   * is disposed.
   */
  stopPlayback(): void;
  /**
   * Closes (dismisses) this plugin and returns the user to the main app view.
   * Core plugins that own their full-screen UI should call this instead of
   * relying on the host's back-button bar, which is not rendered for 'core'
   * type plugins.
   */
  close(): void;
  /**
   * Host-provided React components that plugins can embed in their UI.
   * These components are pre-wired to the host's notation engine and audio
   * pipeline — plugins must use these instead of importing host internals.
   */
  readonly components: {
    /**
     * Renders a scrollable music staff from an array of `PluginNoteEvent`s.
     * Drop it anywhere in your plugin JSX:
     *
     * ```tsx
     * <context.components.StaffViewer
     *   notes={recordedNotes}
     *   highlightedNotes={[...pressedKeys]}
     * />
     * ```
     */
    readonly StaffViewer: ComponentType<PluginStaffViewerProps>;
    /**
     * Host-provided React component that renders a full interactive score (v3).
     * Wraps the WASM layout engine rendering pipeline.
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
  /**
   * Score player context — the primary v3 extension (Feature 033).
   * Provides score loading, playback control, pin/loop management,
   * tempo control, and state subscriptions.
   *
   * For v2 plugins this namespace is injected as a no-op stub.
   */
  readonly scorePlayer: PluginScorePlayerContext;
  /** Read-only manifest for this plugin instance. */
  readonly manifest: Readonly<PluginManifest>;
}

// ---------------------------------------------------------------------------
// Plugin entry-point contract
// ---------------------------------------------------------------------------

/**
 * The interface every plugin's default export must satisfy.
 *
 * @example
 * ```ts
 * import type { MusicorePlugin } from '../../src/plugin-api';
 *
 * const plugin: MusicorePlugin = {
 *   init(context) { ctx = context; },
 *   Component: () => <div>My Plugin</div>,
 * };
 * export default plugin;
 * ```
 */
export interface MusicorePlugin {
  /** Called once when the plugin is first activated. Store context for later use. */
  init(context: PluginContext): void;
  /** Optional cleanup: remove listeners and release resources. */
  dispose?(): void;
  /** Root React component rendered when this plugin's nav entry is active. */
  Component: ComponentType;
}

// ---------------------------------------------------------------------------
// Current API version
// ---------------------------------------------------------------------------

/** Major version of the currently running Musicore Plugin API. */
export const PLUGIN_API_VERSION = '3' as const;
