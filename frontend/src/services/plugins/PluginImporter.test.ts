/**
 * PluginImporter tests — T020
 * Feature 030: Plugin Architecture (US2 — Import a Third-Party Plugin)
 *
 * Constitution Principle V: written before PluginImporter.ts implementation.
 *
 * Uses fflate.zipSync to create in-memory ZIPs, and fake-indexeddb via
 * PluginRegistry for persistence testing.
 *
 * Covers (per tasks.md T020):
 * - Rejects ZIP > 5 MB file size (FR-021)
 * - Rejects package whose pluginApiVersion > "1" (FR-019)
 * - Rejects missing/invalid plugin.json (FR-009)
 * - Rejects when entryPoint file is absent from ZIP
 * - Accepts valid package and calls PluginRegistry.register
 * - Returns { duplicate: true } when plugin id already exists
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { strToU8, zipSync } from 'fflate';
import { importPlugin } from './PluginImporter';
import { PluginRegistry } from './PluginRegistry';
import type { PluginManifest } from '../../plugin-api/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidManifest(overrides: Partial<PluginManifest> = {}): Omit<PluginManifest, 'origin'> {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    pluginApiVersion: '1',
    entryPoint: 'index.js',
    ...overrides,
  };
}

/** Build a valid ZIP File containing plugin.json + index.js. */
function makeValidZipFile(manifest = makeValidManifest()): File {
  const data = zipSync({
    'plugin.json': strToU8(JSON.stringify(manifest)),
    'index.js': strToU8('export default {};'),
  });
  return new File([data], `${manifest.id}.zip`, { type: 'application/zip' });
}

/** Build a ZIP File missing a specific file. */
function makeZipMissingEntry(
  manifest = makeValidManifest(),
  includeEntryPoint = true
): File {
  const files: Record<string, Uint8Array> = {
    'plugin.json': strToU8(JSON.stringify(manifest)),
  };
  if (includeEntryPoint) {
    files['index.js'] = strToU8('export default {};');
  }
  const data = zipSync(files);
  return new File([data], 'plugin.zip', { type: 'application/zip' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('importPlugin()', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry(`plugin-registry-importer-test-${Math.random()}`);
  });

  // ── Size guard (FR-021) ─────────────────────────────────────────────────

  describe('size validation (FR-021)', () => {
    it('rejects a file whose size exceeds 5 MB', async () => {
      // 6 MB of data — clearly over the limit even as compressed
      const bigFile = new File(
        [new Uint8Array(6 * 1024 * 1024)],
        'big-plugin.zip',
        { type: 'application/zip' }
      );

      const result = await importPlugin(bigFile, registry);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/5 MB|size/i);
      }
    });

    it('accepts a file small enough (< 5 MB)', async () => {
      const file = makeValidZipFile();
      const result = await importPlugin(file, registry);
      // Should not fail on size (may fail for other reasons in this test)
      if (!result.success) {
        expect(result.error).not.toMatch(/5 MB|size/i);
      }
    });
  });

  // ── Manifest validation (FR-009) ────────────────────────────────────────

  describe('manifest validation (FR-009)', () => {
    it('rejects a ZIP with no plugin.json', async () => {
      const data = zipSync({ 'index.js': strToU8('export default {};') });
      const file = new File([data], 'plugin.zip', { type: 'application/zip' });

      const result = await importPlugin(file, registry);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/plugin\.json/i);
      }
    });

    it('rejects a ZIP with invalid JSON in plugin.json', async () => {
      const data = zipSync({ 'plugin.json': strToU8('{ not valid json') });
      const file = new File([data], 'plugin.zip', { type: 'application/zip' });

      const result = await importPlugin(file, registry);
      expect(result.success).toBe(false);
    });

    it('rejects a manifest missing required field "id"', async () => {
      const badManifest = { name: 'No Id', version: '1.0.0', pluginApiVersion: '1', entryPoint: 'index.js' };
      const data = zipSync({
        'plugin.json': strToU8(JSON.stringify(badManifest)),
        'index.js': strToU8(''),
      });
      const file = new File([data], 'plugin.zip', { type: 'application/zip' });

      const result = await importPlugin(file, registry);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/id/i);
      }
    });

    it('rejects a manifest with invalid id pattern (uppercase)', async () => {
      const file = makeValidZipFile(makeValidManifest({ id: 'BadId' }));
      const result = await importPlugin(file, registry);
      expect(result.success).toBe(false);
    });

    it('rejects when the entryPoint file is absent from the ZIP (FR-009)', async () => {
      const file = makeZipMissingEntry(makeValidManifest(), false);
      const result = await importPlugin(file, registry);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/entryPoint|entry point|index\.js/i);
      }
    });
  });

  // ── API version check (FR-019) ───────────────────────────────────────────

  describe('Plugin API version check (FR-019)', () => {
    it('rejects a package requiring a newer Plugin API version', async () => {
      const file = makeValidZipFile(makeValidManifest({ pluginApiVersion: '99' }));
      const result = await importPlugin(file, registry);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/API version|pluginApiVersion/i);
      }
    });

    it('accepts a package with matching Plugin API version "1"', async () => {
      const file = makeValidZipFile(makeValidManifest({ pluginApiVersion: '1' }));
      const result = await importPlugin(file, registry);
      expect(result.success).toBe(true);
    });
  });

  // ── Successful import ────────────────────────────────────────────────────

  describe('successful import', () => {
    it('registers the manifest in the PluginRegistry on success', async () => {
      const file = makeValidZipFile();
      const result = await importPlugin(file, registry);

      expect(result.success).toBe(true);
      const stored = await registry.get('test-plugin');
      expect(stored).toBeDefined();
      expect(stored!.manifest.id).toBe('test-plugin');
    });

    it('returns the manifest in the success result', async () => {
      const file = makeValidZipFile();
      const result = await importPlugin(file, registry);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.manifest.id).toBe('test-plugin');
        expect(result.manifest.origin).toBe('imported');
      }
    });
  });

  // ── Duplicate detection (FR-018) ─────────────────────────────────────────

  describe('duplicate detection (FR-018)', () => {
    it('returns { success: false, duplicate: true } when id already exists', async () => {
      // Register first
      await importPlugin(makeValidZipFile(), registry);

      // Try again
      const result = await importPlugin(makeValidZipFile(), registry);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect((result as { duplicate?: boolean }).duplicate).toBe(true);
      }
    });

    it('overwrites when overwrite option is true', async () => {
      await importPlugin(makeValidZipFile(), registry);
      const result = await importPlugin(makeValidZipFile(), registry, { overwrite: true });

      expect(result.success).toBe(true);
    });
  });
});
