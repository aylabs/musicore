/**
 * Musicore Plugin API — Canonical Contract (v2)
 * Feature 031: Practice View Plugin & Plugin API Recording Extension
 *
 * This file is the canonical API contract. Implementation in:
 *   frontend/src/plugin-api/types.ts
 *
 * Changes from v1:
 *   + PluginPitchEvent — new type for microphone pitch detection events
 *   + PluginRecordingContext — new namespace: recording, subscribe + onError
 *   + PluginNoteEvent.offsetMs — optional scheduled playback offset (backward-compatible)
 *   + PluginContext.recording — new namespace (always-on pitch events, pitch-only, no raw audio)
 *   + PluginContext.stopPlayback() — cancel all per-plugin pending scheduled notes
 *   ~ PLUGIN_API_VERSION: "1" → "2"
 *
 * Privacy constraint (FR-020):
 *   The recording namespace exposes ONLY musically-interpreted pitch data.
 *   Raw PCM, waveform data, and AudioWorklet output are NEVER accessible to plugins.
 */

import type { ComponentType } from 'react';

// ---------------------------------------------------------------------------
// Staff viewer (unchanged from v1)
// ---------------------------------------------------------------------------

export interface PluginStaffViewerProps {
  readonly notes: readonly PluginNoteEvent[];
  readonly highlightedNotes?: readonly number[];
  readonly clef?: 'Treble' | 'Bass';
  readonly autoScroll?: boolean;
}

// ---------------------------------------------------------------------------
// Domain events
// ---------------------------------------------------------------------------

/**
 * Input note event — emitted by a plugin (key press, MIDI note) or used to
 * schedule playback via context.playNote().
 *
 * v2 addition: optional `offsetMs` for scheduled playback.
 */
export interface PluginNoteEvent {
  readonly midiNote: number;
  readonly timestamp: number;
  readonly velocity?: number;
  readonly type?: 'attack' | 'release';
  /**
   * How long the key was held, in milliseconds (attack events only).
   * Used by StaffViewer to render the correct note value.
   */
  readonly durationMs?: number;
  /**
   * v2: Schedule this note to play `offsetMs` milliseconds after the call to
   * context.playNote(), rather than immediately.
   *
   * - Omit or set to 0 for immediate playback (existing v1 behaviour).
   * - Values > 0 schedule the note via the host's audio engine with the
   *   specified delay. The host use ToneAdapter.playNote() with an equivalent
   *   time offset.
   * - Backward-compatible: v1 plugins that omit this field are unaffected.
   */
  readonly offsetMs?: number;
}

/**
 * v2: Pitch detection event emitted to recording subscribers.
 *
 * PRIVACY: This type carries only musically interpreted data.
 * Raw audio buffers, PCM data, and waveform samples are NOT included and
 * MUST NOT be added to this type.
 */
export interface PluginPitchEvent {
  /** Nearest MIDI note number (integer, 0–127). Middle C = 60. */
  readonly midiNote: number;
  /** Raw detected frequency in Hz (before rounding to MIDI semitone). */
  readonly hz: number;
  /** Detection confidence: 0.0 = indeterminate / 1.0 = clean pitch. */
  readonly confidence: number;
  /** Epoch milliseconds (Date.now()) at the moment of detection. */
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// Manifest (unchanged from v1)
// ---------------------------------------------------------------------------

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly pluginApiVersion: string;
  readonly entryPoint: string;
  readonly description?: string;
  readonly origin: 'builtin' | 'imported';
}

// ---------------------------------------------------------------------------
// Recording context (v2 new namespace)
// ---------------------------------------------------------------------------

/**
 * v2: Microphone pitch capture API.
 *
 * Available via context.recording on PluginContext.
 *
 * Design rules:
 * - Always-on: subscribe() delivers pitch events continuously from the moment
 *   of subscription until unsubscribed. Plugins filter events by their own phase.
 * - Shared stream: the host opens at most one microphone stream regardless of
 *   how many plugins subscribe.
 * - Least privilege: only PluginPitchEvent data is delivered; no raw audio.
 */
export interface PluginRecordingContext {
  /**
   * Subscribe to real-time pitch detection events from the microphone.
   *
   * - Calling this triggers mic access (getUserMedia) if not already open.
   * - The first call may prompt the user for mic permission.
   * - Subsequent calls from other plugins share the already-open stream.
   *
   * Returns an unsubscribe function. Call it when the plugin unmounts:
   * ```tsx
   * useEffect(() => context.recording.subscribe(handler), [context]);
   * ```
   */
  subscribe(handler: (event: PluginPitchEvent) => void): () => void;

  /**
   * Register a handler to be called if microphone access is unavailable or revoked.
   *
   * - If mic is already in an error state, the handler fires on the next microtask.
   * - Error payload is a human-readable string describing the failure.
   *
   * Returns an unregister function.
   *
   * Note: Plugins MUST NOT call getUserMedia() or any Web Audio API directly.
   * This is the only authorised channel for mic error notifications.
   */
  onError(handler: (error: string) => void): () => void;
}

// ---------------------------------------------------------------------------
// Plugin context (v2 — two new members)
// ---------------------------------------------------------------------------

export interface PluginContext {
  /**
   * Emit a note event to the WASM layout pipeline (notation display).
   * Unchanged from v1.
   */
  emitNote(event: PluginNoteEvent): void;

  /**
   * Play a note through the host audio engine (Salamander Grand Piano samples).
   *
   * v2 change: if event.offsetMs is present and > 0, the note is scheduled
   * that many milliseconds in the future rather than playing immediately.
   * Omitting offsetMs preserves v1 immediate-playback behaviour.
   */
  playNote(event: PluginNoteEvent): void;

  /**
   * v2: Cancel all pending notes previously scheduled via context.playNote()
   * with offsetMs for this plugin.
   *
   * - Safe no-op when no notes are pending.
   * - Does NOT affect other plugins' scheduled notes.
   * - Completes within one audio processing frame (≤ 10 ms).
   */
  stopPlayback(): void;

  /**
   * MIDI hardware keyboard integration.
   * Unchanged from v1.
   */
  readonly midi: {
    readonly subscribe: (handler: (event: PluginNoteEvent) => void) => () => void;
  };

  /**
   * v2: Microphone pitch capture.
   * Always-on, pitch-events only. See PluginRecordingContext.
   */
  readonly recording: PluginRecordingContext;

  /**
   * Host-provided React components.
   * Unchanged from v1.
   */
  readonly components: {
    readonly StaffViewer: ComponentType<PluginStaffViewerProps>;
  };

  readonly manifest: Readonly<PluginManifest>;
}

// ---------------------------------------------------------------------------
// Plugin entry-point contract (unchanged from v1)
// ---------------------------------------------------------------------------

export interface MusicorePlugin {
  init(context: PluginContext): void;
  dispose?(): void;
  Component: ComponentType;
}

// ---------------------------------------------------------------------------
// API version
// ---------------------------------------------------------------------------

/** v2: bumped from "1" to "2" for the recording namespace + offsetMs additions. */
export const PLUGIN_API_VERSION = '2' as const;

// ---------------------------------------------------------------------------
// Compatibility matrix
// ---------------------------------------------------------------------------
//
//  Plugin declares pluginApiVersion | Host PLUGIN_API_VERSION | Result
//  -------------------------------- | ----------------------- | ------
//  "1"                              | "2"                     | ✅ Accepted (backward compatible)
//  "2"                              | "2"                     | ✅ Accepted
//  "2"                              | "1"                     | ❌ Rejected (plugin too new)
//  "3"                              | "2"                     | ❌ Rejected (plugin too new)
//
