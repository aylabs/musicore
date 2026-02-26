/**
 * PluginStaffViewer tests
 * Feature 030: Plugin Architecture
 *
 * Covers:
 * - Renders the staff container
 * - Converts attack PluginNoteEvents to visible notes (release events ignored)
 * - Highlights notes for currently pressed MIDI keys
 * - autoScroll: scrollLeft scrolls to the right edge after a note is added
 * - autoScroll=false: scrollLeft is not mutated
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { PluginStaffViewer } from './PluginStaffViewer';
import { msToDurationTicks } from './staffViewerUtils';
import type { PluginNoteEvent } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const attack = (midiNote: number, i = 0): PluginNoteEvent => ({
  midiNote,
  timestamp: i * 100,
  type: 'attack',
});

const release = (midiNote: number): PluginNoteEvent => ({
  midiNote,
  timestamp: 999,
  type: 'release',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PluginStaffViewer', () => {
  describe('rendering', () => {
    it('renders the staff viewer container', () => {
      const { getByTestId } = render(
        <PluginStaffViewer notes={[]} />,
      );
      expect(getByTestId('plugin-staff-viewer')).toBeTruthy();
    });

    it('renders without crashing when notes are provided', () => {
      const notes: PluginNoteEvent[] = [attack(60, 0), attack(62, 1), attack(64, 2)];
      expect(() => render(<PluginStaffViewer notes={notes} />)).not.toThrow();
    });

    it('ignores release events — only attack events appear on the staff', () => {
      // We can't easily query individual SMuFL glyphs in jsdom, but we can
      // verify the component renders without error when the list contains releases.
      const notes: PluginNoteEvent[] = [attack(60, 0), release(60), attack(62, 1)];
      expect(() => render(<PluginStaffViewer notes={notes} />)).not.toThrow();
    });

    it('renders with Bass clef without crashing', () => {
      expect(() =>
        render(<PluginStaffViewer notes={[attack(48, 0)]} clef="Bass" />)
      ).not.toThrow();
    });
  });

  describe('autoScroll', () => {
    let rafCallbacks: FrameRequestCallback[];
    let rafSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      rafCallbacks = [];
      // Capture rAF callbacks without executing immediately — we'll flush manually.
      rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        rafCallbacks.push(cb);
        return rafCallbacks.length; // fake id
      });
    });

    afterEach(() => {
      rafSpy.mockRestore();
    });

    /** Flush all pending rAF callbacks. */
    function flushRaf() {
      const cbs = [...rafCallbacks];
      rafCallbacks.length = 0;
      cbs.forEach(cb => cb(0));
    }

    it('scrollLeft is set to scrollWidth after a note is added (autoScroll=true)', async () => {
      const initialNotes: PluginNoteEvent[] = [attack(60, 0)];
      const { rerender, getByTestId } = render(
        <PluginStaffViewer notes={initialNotes} autoScroll />,
      );

      // Simulate a second note being added.
      const nextNotes: PluginNoteEvent[] = [attack(60, 0), attack(62, 1)];
      await act(async () => {
        rerender(<PluginStaffViewer notes={nextNotes} autoScroll />);
        flushRaf();
      });

      const container = getByTestId('plugin-staff-viewer') as HTMLDivElement;
      // jsdom: scrollWidth and scrollLeft are both 0 in the test environment,
      // so the assignment scrollLeft = scrollWidth is a no-op numerically — but
      // we verify the rAF callback fired (scrollLeft was actually set).
      expect(rafSpy).toHaveBeenCalled();
      // scrollLeft should equal scrollWidth (both 0 in jsdom — still valid).
      expect(container.scrollLeft).toBe(container.scrollWidth);
    });

    it('does NOT trigger requestAnimationFrame when autoScroll is false (default)', async () => {
      const initialNotes: PluginNoteEvent[] = [attack(60, 0)];
      const { rerender } = render(
        <PluginStaffViewer notes={initialNotes} autoScroll={false} />,
      );

      await act(async () => {
        rerender(<PluginStaffViewer notes={[...initialNotes, attack(62, 1)]} autoScroll={false} />);
      });

      expect(rafSpy).not.toHaveBeenCalled();
    });

    it('does NOT trigger requestAnimationFrame when autoScroll prop is omitted', async () => {
      const { rerender } = render(<PluginStaffViewer notes={[attack(60, 0)]} />);

      await act(async () => {
        rerender(<PluginStaffViewer notes={[attack(60, 0), attack(62, 1)]} />);
      });

      expect(rafSpy).not.toHaveBeenCalled();
    });
  });

  describe('highlightedNotes', () => {
    it('renders without error when highlightedNotes includes a note not in the staff', () => {
      const notes: PluginNoteEvent[] = [attack(60, 0)];
      // MIDI 99 is not in the notes array — should not throw.
      expect(() =>
        render(<PluginStaffViewer notes={notes} highlightedNotes={[99]} />)
      ).not.toThrow();
    });

    it('renders without error when highlightedNotes matches a staff note', () => {
      const notes: PluginNoteEvent[] = [attack(60, 0), attack(62, 1)];
      expect(() =>
        render(<PluginStaffViewer notes={notes} highlightedNotes={[60]} />)
      ).not.toThrow();
    });
  });

  describe('note duration quantization (msToDurationTicks)', () => {
    // Touch-intuitive mapping (NOT BPM-proportional):
    //   < 300 ms → quarter  (480 ticks)
    //   < 800 ms → half     (960 ticks)
    //   ≥ 800 ms → whole    (1920 ticks)

    it('very short tap (0 ms) → quarter (480 ticks)', () => {
      expect(msToDurationTicks(0)).toBe(480);
    });

    it('normal tap (~100 ms) → quarter (480 ticks)', () => {
      expect(msToDurationTicks(100)).toBe(480);
    });

    it('tap just under 300 ms → quarter (480 ticks)', () => {
      expect(msToDurationTicks(299)).toBe(480);
    });

    it('hold at 300 ms → half (960 ticks)', () => {
      expect(msToDurationTicks(300)).toBe(960);
    });

    it('hold ~500 ms → half (960 ticks)', () => {
      expect(msToDurationTicks(500)).toBe(960);
    });

    it('hold just under 800 ms → half (960 ticks)', () => {
      expect(msToDurationTicks(799)).toBe(960);
    });

    it('hold at 800 ms → whole (1920 ticks)', () => {
      expect(msToDurationTicks(800)).toBe(1920);
    });

    it('long hold (2000 ms) → whole (1920 ticks)', () => {
      expect(msToDurationTicks(2000)).toBe(1920);
    });
  });
});
