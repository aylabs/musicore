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
  };  /**
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
  };  /** Read-only manifest for this plugin instance. */
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
