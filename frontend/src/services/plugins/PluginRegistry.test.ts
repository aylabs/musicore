/**
 * PluginRegistry tests — T008
 * Feature 030: Plugin Architecture
 *
 * Tests for the PluginRegistry IndexedDB persistence layer.
 * Uses fake-indexeddb to run in happy-dom / Vitest without a real browser.
 *
 * Constitution Principle V: written before PluginRegistry.ts implementation.
 * Constitution Principle VII: any regression must yield a failing test.
 *
 * Covers (per tasks.md T008):
 * - register() persists manifest + assets atomically
 * - list() returns all entries
 * - get(id) returns stored entry
 * - duplicate id overwrites existing entry
 * - removed entry is absent from list()
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { PluginRegistry } from './PluginRegistry';
import type { PluginManifest } from '../plugin-api/index';

/** Helper: build a minimal valid PluginManifest */
function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    pluginApiVersion: '1',
    entryPoint: 'index.js',
    origin: 'imported',
    ...overrides,
  };
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(async () => {
    // Create a fresh registry instance using a unique DB name per test
    // fake-indexeddb/auto patches global indexedDB, IDBKeyRange etc.
    registry = new PluginRegistry(`plugin-registry-test-${Math.random()}`);
  });

  describe('register()', () => {
    it('stores a manifest and makes it retrievable via get()', async () => {
      const manifest = makeManifest();
      await registry.register(manifest, []);

      const result = await registry.get('test-plugin');
      expect(result).toBeDefined();
      expect(result!.manifest.id).toBe('test-plugin');
      expect(result!.manifest.name).toBe('Test Plugin');
    });

    it('stores assets alongside the manifest', async () => {
      const manifest = makeManifest();
      const asset = { pluginId: 'test-plugin', name: 'bundle.js', data: new ArrayBuffer(8) };
      await registry.register(manifest, [asset]);

      const assets = await registry.getAssets('test-plugin');
      expect(assets).toHaveLength(1);
      expect(assets[0].name).toBe('bundle.js');
    });

    it('overwrites an existing plugin with the same id without error', async () => {
      const v1 = makeManifest({ version: '1.0.0' });
      const v2 = makeManifest({ version: '2.0.0' });

      await registry.register(v1, []);
      await registry.register(v2, []);

      const result = await registry.get('test-plugin');
      expect(result!.manifest.version).toBe('2.0.0');
    });
  });

  describe('list()', () => {
    it('returns an empty array when no plugins are registered', async () => {
      const plugins = await registry.list();
      expect(plugins).toEqual([]);
    });

    it('returns all registered plugins', async () => {
      await registry.register(makeManifest({ id: 'plugin-a', name: 'A' }), []);
      await registry.register(makeManifest({ id: 'plugin-b', name: 'B' }), []);

      const plugins = await registry.list();
      expect(plugins).toHaveLength(2);
      const ids = plugins.map(p => p.manifest.id).sort();
      expect(ids).toEqual(['plugin-a', 'plugin-b']);
    });
  });

  describe('get()', () => {
    it('returns undefined for an unknown plugin id', async () => {
      const result = await registry.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('returns the exact manifest that was registered', async () => {
      const manifest = makeManifest({ description: 'A test plugin' });
      await registry.register(manifest, []);

      const result = await registry.get('test-plugin');
      expect(result!.manifest.description).toBe('A test plugin');
      expect(result!.manifest.origin).toBe('imported');
    });

    it('includes an installedAt date', async () => {
      const before = new Date();
      await registry.register(makeManifest(), []);
      const after = new Date();

      const result = await registry.get('test-plugin');
      expect(result!.installedAt).toBeInstanceOf(Date);
      expect(result!.installedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result!.installedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('remove()', () => {
    it('removes a registered plugin so it no longer appears in list()', async () => {
      await registry.register(makeManifest(), []);
      await registry.remove('test-plugin');

      const plugins = await registry.list();
      expect(plugins).toHaveLength(0);
    });

    it('removes associated assets', async () => {
      const asset = { pluginId: 'test-plugin', name: 'index.js', data: new ArrayBuffer(4) };
      await registry.register(makeManifest(), [asset]);
      await registry.remove('test-plugin');

      const assets = await registry.getAssets('test-plugin');
      expect(assets).toHaveLength(0);
    });

    it('is a no-op for an unregistered id', async () => {
      // Should not throw
      await expect(registry.remove('never-existed')).resolves.toBeUndefined();
    });
  });
});
