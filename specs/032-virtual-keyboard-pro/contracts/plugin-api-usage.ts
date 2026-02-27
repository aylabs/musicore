/**
 * Plugin API Usage Contract — Virtual Keyboard Pro
 * Feature: 032-virtual-keyboard-pro
 *
 * This file documents which Plugin API types and context methods the
 * Virtual Keyboard Pro plugin consumes. It is a read-only contract
 * reference; the canonical types live in frontend/src/plugin-api/types.ts.
 *
 * RULE (Constitution Principle VI): PluginNoteEvent carries musical data
 * only (midiNote, timestamp, velocity, type, durationMs). No coordinate
 * or layout fields may be added. The host WASM engine is the sole authority
 * over spatial geometry.
 *
 * RULE (Constitution Principle V): All context method calls must be covered
 * by Vitest tests using a mock PluginContext before implementation.
 */

// ─── Imported types ──────────────────────────────────────────────────────────
// The plugin imports ONLY from '../../src/plugin-api/index' (enforced by ESLint)

import type {
  MusicorePlugin,        // Satisfied by the default export of index.tsx
  PluginContext,          // Injected via init(context); stored at module scope
  PluginNoteEvent,        // Used for playNote(), emitNote(), and PlayedNotes state
  PluginStaffViewerProps, // Props for context.components.StaffViewer
  PluginManifest,         // Available as context.manifest (read-only)
} from '../../frontend/src/plugin-api/index';

// ─── Context methods used ─────────────────────────────────────────────────────

/**
 * context.playNote(event)
 *
 * Called on:
 *   - Key down (attack): { midiNote, timestamp: Date.now(), type: 'attack' }
 *   - Key up   (release): { midiNote, timestamp: Date.now(), type: 'release' }
 *   - Unmount cleanup: release all still-pressed keys
 *
 * NOT called with offsetMs (no scheduled playback in this plugin).
 */
declare function _playNote(event: PluginNoteEvent): void;

/**
 * context.emitNote(event)
 *
 * Called on key DOWN only (attack): { midiNote, timestamp: Date.now() }
 * Sends the note to the host WASM layout pipeline.
 * Does NOT include durationMs at attack time (duration unknown until release).
 *
 * Constitution Principle VI: Only midiNote and timestamp are set.
 * No coordinate fields. No layout data.
 */
declare function _emitNote(event: PluginNoteEvent): void;

/**
 * context.midi.subscribe(handler)
 *
 * Subscribes to hardware MIDI note events.
 * Handler:
 *   - attack  → handleKeyDown(note) if note is in current displayed range
 *   - release → handleKeyUp(midiNote) if note is in current displayed range
 *   - out-of-range events → silently ignored
 * Returns an unsubscribe function; called in useEffect cleanup.
 */
declare function _midiSubscribe(handler: (e: PluginNoteEvent) => void): () => void;

/**
 * context.components.StaffViewer
 *
 * Rendered inside VirtualKeyboardPro with:
 *   notes={playedNotes}                          — full history (≤20 events)
 *   highlightedNotes={lastReleasedMidi ? [lastReleasedMidi] : []}
 *   highlightedNoteIndex={highlightedNoteIndex}  — index of most recent note
 *   clef="Treble"
 *   bpm={120}                                     — DEFAULT_BPM constant
 *   timestampOffset={timestampOffset}             — origin of first note
 *   autoScroll
 *
 * When notes=[] → renders empty staff (clef + time signature, no notes).
 * This is the expected initial state (FR-015).
 */
declare const _StaffViewer: React.ComponentType<PluginStaffViewerProps>;

// ─── Methods NOT used ─────────────────────────────────────────────────────────

/**
 * context.stopPlayback()    — NOT used (no scheduled playback)
 * context.recording         — NOT used (no microphone input)
 * context.manifest          — NOT used in UI logic (available if needed for version display)
 */

// ─── Plugin entry point contract ─────────────────────────────────────────────

/**
 * index.tsx default export must satisfy MusicorePlugin:
 *
 * {
 *   init(context: PluginContext): void   — store context at module scope
 *   dispose(): void                      — clear stored context
 *   Component: () => JSX.Element         — renders VirtualKeyboardPro with stored context
 * }
 */
export type { MusicorePlugin, PluginContext, PluginNoteEvent, PluginStaffViewerProps, PluginManifest };
