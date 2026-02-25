/**
 * Musicore Plugin API — v1
 *
 * This is the ONLY module that plugin code may import from the host application.
 * ESLint enforces this boundary via `no-restricted-imports` scoped to `plugins/**`.
 *
 * @module plugin-api
 */

// ---------------------------------------------------------------------------
// Domain events
// ---------------------------------------------------------------------------

/**
 * Emitted by a plugin when a note input event occurs (e.g. virtual key press).
 * Plugins produce this event; the host consumes it and passes it to the WASM
 * layout engine. Plugins must NOT include any coordinate or layout data here —
 * all spatial geometry is the exclusive domain of the WASM engine.
 */
export interface PluginNoteEvent {
  /** MIDI note number (0–127). Middle C = 60. */
  readonly midiNote: number;
  /** Millisecond timestamp (Date.now()) at the moment of input. */
  readonly timestamp: number;
  /**
   * MIDI velocity (1–127). Defaults to 64 (mezzo-forte) if not provided by
   * the plugin.
   */
  readonly velocity?: number;
}

// ---------------------------------------------------------------------------
// Manifest (read-only view available to plugins at runtime)
// ---------------------------------------------------------------------------

/**
 * Read-only descriptor provided to a plugin's `init()` call.
 * Plugins must not mutate this object.
 */
export interface PluginManifest {
  /** Unique plugin identifier (URL-safe lowercase string). */
  readonly id: string;
  /** Human-readable display name. */
  readonly name: string;
  /** Plugin version (SemVer). */
  readonly version: string;
  /** Minimum Musicore Plugin API major version this plugin requires. */
  readonly pluginApiVersion: string;
  /** Entry point path (informational; already resolved by the time init() runs). */
  readonly entryPoint: string;
  /** Optional display description. */
  readonly description?: string;
  /** Set by the host; not present in plugin.json. */
  readonly origin: 'builtin' | 'imported';
}

// ---------------------------------------------------------------------------
// Plugin context
// ---------------------------------------------------------------------------

/**
 * Host-provided context object injected into a plugin's `init()` call.
 * Provides the only communication channel from plugin to host.
 */
export interface PluginContext {
  /**
   * Emit a note event to the host. The host forwards it to the WASM layout
   * engine which renders the note on the staff.
   *
   * @param event - The note event to emit.
   */
  emitNote(event: PluginNoteEvent): void;

  /**
   * The read-only manifest for this plugin instance.
   * Useful for plugins that display their own name/version.
   */
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
 * // frontend/plugins/my-plugin/index.ts
 * import type { MusicorePlugin } from '../../src/plugin-api';
 *
 * const plugin: MusicorePlugin = {
 *   init(context) { ... },
 *   Component: () => <div>My Plugin</div>,
 * };
 * export default plugin;
 * ```
 */
export interface MusicorePlugin {
  /**
   * Called once by the host when the plugin is activated for the first time.
   * Plugins should register any listeners and store the `context` reference.
   *
   * @param context - Host-provided context for emitting events.
   */
  init(context: PluginContext): void;

  /**
   * Optional cleanup hook called when the plugin is deactivated or unloaded.
   * Plugins should remove event listeners and release resources.
   */
  dispose?(): void;

  /**
   * The root React component the host renders when the plugin's navigation
   * entry is active.
   */
  Component: React.ComponentType;
}

// ---------------------------------------------------------------------------
// Current API version (exported as const for import-time checks)
// ---------------------------------------------------------------------------

/** Major version of the currently running Musicore Plugin API. */
export const PLUGIN_API_VERSION = '1' as const;
