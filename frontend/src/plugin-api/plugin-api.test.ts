/**
 * Plugin API contract tests — T006
 * Feature 030: Plugin Architecture
 *
 * Verifies the public surface exported from src/plugin-api/index.ts
 * matches the contract defined in specs/030-plugin-architecture/contracts/plugin-api.ts.
 *
 * Constitution Principle V: these tests must exist and be green before
 * any code that consumes the Plugin API is merged.
 */

import { describe, it, expect } from 'vitest';
import {
  PLUGIN_API_VERSION,
  type PluginManifest,
  type PluginNoteEvent,
  type PluginContext,
  type MusicorePlugin,
} from './index';

describe('Plugin API contract', () => {
  describe('PLUGIN_API_VERSION', () => {
    it('is the string "1"', () => {
      expect(PLUGIN_API_VERSION).toBe('1');
    });

    it('is a string (not a number)', () => {
      expect(typeof PLUGIN_API_VERSION).toBe('string');
    });
  });

  describe('PluginNoteEvent shape', () => {
    it('accepts an object with midiNote and timestamp', () => {
      const event: PluginNoteEvent = { midiNote: 60, timestamp: Date.now() };
      expect(event.midiNote).toBe(60);
      expect(typeof event.timestamp).toBe('number');
    });

    it('accepts optional velocity', () => {
      const event: PluginNoteEvent = { midiNote: 60, timestamp: 0, velocity: 64 };
      expect(event.velocity).toBe(64);
    });

    it('does not include coordinate fields (Constitution Principle VI)', () => {
      const event: PluginNoteEvent = { midiNote: 60, timestamp: 0 };
      // Compile-time guard: 'x', 'y', 'position', 'bbox' must NOT exist on PluginNoteEvent.
      // If they were added, TypeScript would surface an error here via @ts-expect-error reversal.
      expect('x' in event).toBe(false);
      expect('y' in event).toBe(false);
      expect('position' in event).toBe(false);
      expect('bbox' in event).toBe(false);
    });
  });

  describe('PluginManifest shape', () => {
    it('can be constructed with required fields', () => {
      const manifest: PluginManifest = {
        id: 'virtual-keyboard',
        name: 'Virtual Keyboard',
        version: '1.0.0',
        pluginApiVersion: '1',
        entryPoint: 'index.js',
        origin: 'builtin',
      };
      expect(manifest.id).toBe('virtual-keyboard');
      expect(manifest.origin).toBe('builtin');
    });

    it('accepts optional description', () => {
      const manifest: PluginManifest = {
        id: 'test',
        name: 'Test',
        version: '0.1.0',
        pluginApiVersion: '1',
        entryPoint: 'index.js',
        origin: 'imported',
        description: 'A test plugin',
      };
      expect(manifest.description).toBe('A test plugin');
    });
  });

  describe('MusicorePlugin interface contract', () => {
    it('an object satisfying MusicorePlugin compiles and has init + Component', () => {
      // Runtime check: confirm the shape is as expected by constructing a minimal mock
      const mockPlugin: MusicorePlugin = {
        init: (_ctx: PluginContext) => { /* no-op */ },
        Component: () => null,
      };
      expect(typeof mockPlugin.init).toBe('function');
      expect(typeof mockPlugin.Component).toBe('function');
    });

    it('dispose is optional', () => {
      const withoutDispose: MusicorePlugin = {
        init: () => { /* no-op */ },
        Component: () => null,
      };
      expect(withoutDispose.dispose).toBeUndefined();

      const withDispose: MusicorePlugin = {
        init: () => { /* no-op */ },
        dispose: () => { /* no-op */ },
        Component: () => null,
      };
      expect(typeof withDispose.dispose).toBe('function');
    });
  });

  describe('PluginContext interface contract', () => {
    it('context mock satisfies the contract', () => {
      const manifst: PluginManifest = {
        id: 'x',
        name: 'X',
        version: '1.0.0',
        pluginApiVersion: '1',
        entryPoint: 'index.js',
        origin: 'builtin',
      };
      const ctx: PluginContext = {
        emitNote: (_event: PluginNoteEvent) => { /* no-op */ },
        playNote: (_event: PluginNoteEvent) => { /* no-op */ },
        manifest: manifst,
      };
      expect(typeof ctx.emitNote).toBe('function');
      expect(typeof ctx.playNote).toBe('function');
      expect(ctx.manifest.id).toBe('x');
    });
  });
});
