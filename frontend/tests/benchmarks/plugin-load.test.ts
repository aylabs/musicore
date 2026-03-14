/**
 * Plugin Load Test — Architecture Review Spike (049)
 *
 * Measures initialization time for 5, 10, 15, and 20 simultaneous synthetic
 * plugin stubs to validate SC-006: ≤2s init for 20+ plugins.
 *
 * Each stub mimics a minimal GraditonePlugin with init() and Component.
 */

import { describe, it, expect } from 'vitest';

interface StubManifest {
  id: string;
  name: string;
  version: string;
  pluginApiVersion: string;
  entryPoint: string;
  type: string;
  origin: string;
}

interface StubPlugin {
  init: (ctx: unknown) => void;
  Component: () => null;
}

interface StubEntry {
  manifest: StubManifest;
  plugin: StubPlugin;
}

function createSyntheticPlugin(index: number): StubEntry {
  return {
    manifest: {
      id: `synthetic-plugin-${String(index).padStart(3, '0')}`,
      name: `Synthetic Plugin ${index}`,
      version: '1.0.0',
      pluginApiVersion: '7',
      entryPoint: 'index.js',
      type: 'common',
      origin: 'imported',
    },
    plugin: {
      init: (_ctx: unknown) => {
        // Simulate minimal init work (~1ms of synchronous processing)
        const start = performance.now();
        while (performance.now() - start < 1) {
          /* busy wait to simulate real plugin init overhead */
        }
      },
      Component: () => null,
    },
  };
}

function createPluginContext(pluginId: string) {
  return {
    manifest: { id: pluginId },
    emitNote: () => {},
    playNote: () => {},
    stopPlayback: () => {},
    close: () => {},
    midi: {
      subscribe: () => () => {},
    },
    recording: {
      subscribe: () => () => {},
      onError: () => () => {},
      stop: () => {},
    },
    components: {
      StaffViewer: () => null,
      ScoreRenderer: () => null,
      ScoreSelector: () => null,
    },
  };
}

/**
 * Simulates the current sequential loading pattern from App.tsx.
 * Each plugin is initialized one after another — no parallelism.
 */
async function loadPluginsSequential(count: number): Promise<{ durationMs: number }> {
  const plugins: StubEntry[] = [];
  for (let i = 0; i < count; i++) {
    plugins.push(createSyntheticPlugin(i));
  }

  const start = performance.now();

  for (const entry of plugins) {
    const ctx = createPluginContext(entry.manifest.id);
    entry.plugin.init(ctx);
  }

  const durationMs = performance.now() - start;
  return { durationMs };
}

/**
 * Simulates a parallel loading pattern using Promise.all.
 * This is the proposed improvement from research.md.
 */
async function loadPluginsParallel(count: number): Promise<{ durationMs: number }> {
  const plugins: StubEntry[] = [];
  for (let i = 0; i < count; i++) {
    plugins.push(createSyntheticPlugin(i));
  }

  const start = performance.now();

  await Promise.all(
    plugins.map(async (entry) => {
      const ctx = createPluginContext(entry.manifest.id);
      entry.plugin.init(ctx);
    }),
  );

  const durationMs = performance.now() - start;
  return { durationMs };
}

describe('Plugin Load Performance (Architecture Review Spike)', () => {
  const pluginCounts = [5, 10, 15, 20];

  describe('Sequential Loading (current pattern)', () => {
    for (const count of pluginCounts) {
      it(`initializes ${count} plugins sequentially`, async () => {
        const result = await loadPluginsSequential(count);

        // Log for ADR evidence
        console.log(
          `Sequential ${count} plugins: ${result.durationMs.toFixed(2)}ms`,
        );

        // SC-006: ≤2000ms for 20 plugins
        expect(result.durationMs).toBeLessThan(2000);
      });
    }
  });

  describe('Parallel Loading (proposed improvement)', () => {
    for (const count of pluginCounts) {
      it(`initializes ${count} plugins in parallel`, async () => {
        const result = await loadPluginsParallel(count);

        console.log(
          `Parallel ${count} plugins: ${result.durationMs.toFixed(2)}ms`,
        );

        expect(result.durationMs).toBeLessThan(2000);
      });
    }
  });

  describe('Error isolation (fan-out fragility)', () => {
    it('demonstrates that one throwing handler blocks subsequent handlers', () => {
      const handlers = new Set<(e: unknown) => void>();
      const callLog: string[] = [];

      handlers.add(() => callLog.push('handler-1'));
      handlers.add(() => {
        throw new Error('handler-2 crashes');
      });
      handlers.add(() => callLog.push('handler-3'));

      // Current pattern: no try/catch
      expect(() => {
        handlers.forEach((h) => h({ type: 'attack', midiNote: 60 }));
      }).toThrow('handler-2 crashes');

      // handler-3 was never called
      expect(callLog).toContain('handler-1');
      expect(callLog).not.toContain('handler-3');
    });

    it('demonstrates that try/catch per handler isolates errors', () => {
      const handlers = new Set<(e: unknown) => void>();
      const callLog: string[] = [];
      const errors: Error[] = [];

      handlers.add(() => callLog.push('handler-1'));
      handlers.add(() => {
        throw new Error('handler-2 crashes');
      });
      handlers.add(() => callLog.push('handler-3'));

      // Proposed pattern: wrap each handler
      handlers.forEach((h) => {
        try {
          h({ type: 'attack', midiNote: 60 });
        } catch (err) {
          errors.push(err as Error);
        }
      });

      // All handlers were called, error was captured
      expect(callLog).toContain('handler-1');
      expect(callLog).toContain('handler-3');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('handler-2 crashes');
    });
  });
});
