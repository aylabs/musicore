/**
 * Musicore Plugin API — public barrel (v1)
 * Feature 030: Plugin Architecture
 *
 * THIS IS THE ONLY MODULE plugin code is permitted to import from the host.
 * ESLint enforces this boundary via `no-restricted-imports` scoped to plugins/**.
 *
 * Re-exports the complete public API surface from types.ts.
 * Nothing from src/ other than this barrel may be imported by plugins.
 */

export type {
  PluginNoteEvent,
  PluginManifest,
  PluginContext,
  MusicorePlugin,
} from './types';

export { PLUGIN_API_VERSION } from './types';
