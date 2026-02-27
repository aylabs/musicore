/**
 * Practice View plugin — entry point (T019)
 * Feature 031: Practice View Plugin
 *
 * Default export satisfies the MusicorePlugin interface.
 * Only imports from ../../src/plugin-api are permitted (enforced by ESLint).
 *
 * This plugin is registered as a built-in in builtinPlugins.ts (T020).
 *
 * Note: react-refresh/only-export-components is silenced here because plugin
 * entry points export a MusicorePlugin object (not a React component) by design.
 * HMR for plugins is not required.
 */
/* eslint-disable react-refresh/only-export-components */

import type { MusicorePlugin, PluginContext } from '../../src/plugin-api/index';
import { PracticePlugin } from './PracticePlugin';

let _context: PluginContext | null = null;

/**
 * Wrapper component that provides the stored PluginContext to PracticePlugin.
 * Context is injected via init() before the component is first rendered.
 */
function PracticePluginWithContext() {
  if (!_context) {
    // Should never happen in practice — init() is called before Component renders.
    return <div className="practice-plugin">Practice: context not initialised</div>;
  }
  return <PracticePlugin context={_context} />;
}

const practiceViewPlugin: MusicorePlugin = {
  init(context: PluginContext) {
    _context = context;
    console.log('[PracticeView] init', context.manifest.version);
  },

  dispose() {
    _context = null;
  },

  Component: PracticePluginWithContext,
};

export default practiceViewPlugin;
