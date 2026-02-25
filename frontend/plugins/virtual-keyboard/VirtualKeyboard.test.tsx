/**
 * VirtualKeyboard component tests — T010
 * Feature 030: Plugin Architecture (US1 — Play Virtual Keyboard)
 *
 * Constitution Principle V: tests written and verified failing before
 * VirtualKeyboard.tsx implementation is committed.
 *
 * Covers (per tasks.md T010):
 * - Renders 14+ white keys and 10 black keys per octave
 * - Key press applies .key--pressed CSS class
 * - Key press calls context.emitNote() and context.playNote() with correct midiNote
 * - White key C4 emits midiNote: 60
 * - Black key C#4 emits midiNote: 61
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualKeyboard } from './VirtualKeyboard';
import type { PluginContext, PluginManifest } from '../../src/plugin-api/index';

const makeManifest = (): PluginManifest => ({
  id: 'virtual-keyboard',
  name: 'Virtual Keyboard',
  version: '1.0.0',
  pluginApiVersion: '1',
  entryPoint: 'index.js',
  origin: 'builtin',
});

function makeContext(emitNote = vi.fn(), playNote = vi.fn()): PluginContext {
  return {
    emitNote,
    playNote,
    manifest: makeManifest(),
  };
}

describe('VirtualKeyboard', () => {
  let emitNote: ReturnType<typeof vi.fn>;
  let playNote: ReturnType<typeof vi.fn>;
  let context: PluginContext;

  beforeEach(() => {
    emitNote = vi.fn();
    playNote = vi.fn();
    context = makeContext(emitNote, playNote);
  });

  describe('keyboard layout', () => {
    it('renders at least 14 white keys', () => {
      render(<VirtualKeyboard context={context} />);
      const whiteKeys = document.querySelectorAll('.key--white');
      expect(whiteKeys.length).toBeGreaterThanOrEqual(14);
    });

    it('renders at least 10 black keys', () => {
      render(<VirtualKeyboard context={context} />);
      const blackKeys = document.querySelectorAll('.key--black');
      expect(blackKeys.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('key interactions', () => {
    it('calls context.emitNote when a white key is pressed', () => {
      render(<VirtualKeyboard context={context} />);
      const whiteKeys = document.querySelectorAll('.key--white');
      fireEvent.mouseDown(whiteKeys[0]);
      expect(emitNote).toHaveBeenCalledTimes(1);
    });

    it('calls context.emitNote when a black key is pressed', () => {
      render(<VirtualKeyboard context={context} />);
      const blackKeys = document.querySelectorAll('.key--black');
      fireEvent.mouseDown(blackKeys[0]);
      expect(emitNote).toHaveBeenCalledTimes(1);
    });

    it('calls context.playNote with type:attack on mousedown', () => {
      render(<VirtualKeyboard context={context} />);
      const c4 = document.querySelector('[data-midi="60"]');
      fireEvent.mouseDown(c4!);
      expect(playNote).toHaveBeenCalledWith(
        expect.objectContaining({ midiNote: 60, type: 'attack' })
      );
    });

    it('calls context.playNote with type:release on mouseup', () => {
      render(<VirtualKeyboard context={context} />);
      const c4 = document.querySelector('[data-midi="60"]');
      fireEvent.mouseDown(c4!);
      fireEvent.mouseUp(c4!);
      expect(playNote).toHaveBeenCalledWith(
        expect.objectContaining({ midiNote: 60, type: 'release' })
      );
    });

    it('emits a PluginNoteEvent with midiNote and timestamp', () => {
      render(<VirtualKeyboard context={context} />);
      const before = Date.now();
      const whiteKeys = document.querySelectorAll('.key--white');
      fireEvent.mouseDown(whiteKeys[0]);
      const after = Date.now();

      const event = emitNote.mock.calls[0][0];
      expect(typeof event.midiNote).toBe('number');
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('MIDI note mapping', () => {
    it('middle C (C4) emits midiNote: 60', () => {
      render(<VirtualKeyboard context={context} />);
      // C4 is middle C — find the key with data-midi="60"
      const c4 = document.querySelector('[data-midi="60"]');
      expect(c4).not.toBeNull();
      fireEvent.mouseDown(c4!);
      expect(emitNote).toHaveBeenCalledWith(
        expect.objectContaining({ midiNote: 60 })
      );
    });

    it('C#4 (black key) emits midiNote: 61', () => {
      render(<VirtualKeyboard context={context} />);
      const cSharp4 = document.querySelector('[data-midi="61"]');
      expect(cSharp4).not.toBeNull();
      fireEvent.mouseDown(cSharp4!);
      expect(emitNote).toHaveBeenCalledWith(
        expect.objectContaining({ midiNote: 61 })
      );
    });
  });

  describe('visual pressed state', () => {
    it('adds key--pressed class on mousedown', () => {
      render(<VirtualKeyboard context={context} />);
      const c4 = document.querySelector('[data-midi="60"]') as HTMLElement;
      expect(c4.classList.contains('key--pressed')).toBe(false);
      fireEvent.mouseDown(c4);
      expect(c4.classList.contains('key--pressed')).toBe(true);
    });

    it('removes key--pressed class on mouseup', () => {
      render(<VirtualKeyboard context={context} />);
      const c4 = document.querySelector('[data-midi="60"]') as HTMLElement;
      fireEvent.mouseDown(c4);
      fireEvent.mouseUp(c4);
      expect(c4.classList.contains('key--pressed')).toBe(false);
    });

    it('removes key--pressed class on mouseleave', () => {
      render(<VirtualKeyboard context={context} />);
      const c4 = document.querySelector('[data-midi="60"]') as HTMLElement;
      fireEvent.mouseDown(c4);
      fireEvent.mouseLeave(c4);
      expect(c4.classList.contains('key--pressed')).toBe(false);
    });
  });
});
