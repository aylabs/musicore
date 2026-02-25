/**
 * Musicore Plugin API — Types (v1)
 * Feature 030: Plugin Architecture
 *
 * Defines all public types for the Musicore Plugin API.
 * See specs/030-plugin-architecture/contracts/plugin-api.ts for the canonical contract.
 *
 * Constitution Principle VI: PluginNoteEvent carries ONLY musical data (midiNote,
 * timestamp, velocity). No coordinate or layout geometry is permitted here — the
 * WASM engine is the sole authority over all spatial layout.
 */

import type { ComponentType } from 'react';

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
  /** Set by the host: 'builtin' for repo plugins, 'imported' for user-installed. */
  readonly origin: 'builtin' | 'imported';
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
export const PLUGIN_API_VERSION = '1' as const;
