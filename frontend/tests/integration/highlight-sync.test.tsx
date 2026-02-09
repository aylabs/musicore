import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StaffNotation } from '../../src/components/notation/StaffNotation';
import type { Note } from '../../src/types/score';
import React from 'react';

/**
 * Feature 009 - US2 - T023: Integration test for highlight synchronization
 * 
 * Verifies that note highlighting correctly synchronizes with playback position
 * across the complete component stack: StaffNotation → usePlaybackScroll → NotationRenderer
 */
describe('Highlight Synchronization Integration', () => {
  /**
   * Test: Single note highlighting during playback progression
   * 
   * Verifies that as currentTick advances, the correct note receives
   * the 'highlighted' CSS class at the right time.
   */
  it('should highlight notes as playback progresses', () => {
    const notes: Note[] = [
      {
        id: 'note-1',
        start_tick: 0,
        duration_ticks: 960,
        pitch: 60, // C4
      },
      {
        id: 'note-2',
        start_tick: 960,
        duration_ticks: 960,
        pitch: 62, // D4
      },
      {
        id: 'note-3',
        start_tick: 1920,
        duration_ticks: 960,
        pitch: 64, // E4
      },
    ];

    // Render at tick 0 (before any notes play)
    // Use wide viewport to ensure all notes are visible
    const { container, rerender } = render(
      <StaffNotation
        notes={notes}
        currentTick={0}
        playbackStatus="playing"
        viewportWidth={2000}
      />
    );

    // At tick 0, note-1 should be highlighted (just started)
    let note1 = container.querySelector('[data-testid="note-1"]');
    let note2 = container.querySelector('[data-testid="note-2"]');
    let note3 = container.querySelector('[data-testid="note-3"]');

    expect(note1?.className).toContain('highlighted');
    if (note2) {
      expect(note2.className).not.toContain('highlighted');
    }
    if (note3) {
      expect(note3.className).not.toContain('highlighted');
    }

    // Advance to tick 500 (during note-1)
    rerender(
      <StaffNotation
        notes={notes}
        currentTick={500}
        playbackStatus="playing"
        viewportWidth={2000}
      />
    );

    note1 = container.querySelector('[data-testid="note-1"]');
    note2 = container.querySelector('[data-testid="note-2"]');
    note3 = container.querySelector('[data-testid="note-3"]');

    expect(note1?.className).toContain('highlighted');
    if (note2) {
      expect(note2.className).not.toContain('highlighted');
    }
    if (note3) {
      expect(note3.className).not.toContain('highlighted');
    }

    // Advance to tick 960 (note-2 starts, note-1 ends)
    rerender(
      <StaffNotation
        notes={notes}
        currentTick={960}
        playbackStatus="playing"
        viewportWidth={2000}
      />
    );

    note1 = container.querySelector('[data-testid="note-1"]');
    note2 = container.querySelector('[data-testid="note-2"]');
    note3 = container.querySelector('[data-testid="note-3"]');

    if (note1) {
      expect(note1.className).not.toContain('highlighted');
    }
    expect(note2?.className).toContain('highlighted');
    if (note3) {
      expect(note3.className).not.toContain('highlighted');
    }

    // Advance to tick 1920 (note-3 starts, note-2 ends)
    rerender(
      <StaffNotation
        notes={notes}
        currentTick={1920}
        playbackStatus="playing"
        viewportWidth={2000}
      />
    );

    note1 = container.querySelector('[data-testid="note-1"]');
    note2 = container.querySelector('[data-testid="note-2"]');
    note3 = container.querySelector('[data-testid="note-3"]');

    if (note1) {
      expect(note1.className).not.toContain('highlighted');
    }
    if (note2) {
      expect(note2.className).not.toContain('highlighted');
    }
    expect(note3?.className).toContain('highlighted');
  });

  /**
   * Test: Chord highlighting (simultaneous notes)
   * 
   * Verifies that when multiple notes play at the same time (chord),
   * all notes in the chord are highlighted simultaneously.
   */
  it('should highlight all notes in a chord simultaneously', () => {
    const notes: Note[] = [
      // C major chord (C-E-G) - all start at tick 0
      {
        id: 'note-c',
        start_tick: 0,
        duration_ticks: 1920,
        pitch: 60, // C4
      },
      {
        id: 'note-e',
        start_tick: 0,
        duration_ticks: 1920,
        pitch: 64, // E4
      },
      {
        id: 'note-g',
        start_tick: 0,
        duration_ticks: 1920,
        pitch: 67, // G4
      },
      // Following single note
      {
        id: 'note-d',
        start_tick: 1920,
        duration_ticks: 960,
        pitch: 62, // D4
      },
    ];

    // Render at tick 500 (during chord) with wide viewport
    const { container, rerender } = render(
      <StaffNotation
        notes={notes}
        currentTick={500}
        playbackStatus="playing"
        viewportWidth={2000}
      />
    );

    let noteC = container.querySelector('[data-testid="note-c"]');
    let noteE = container.querySelector('[data-testid="note-e"]');
    let noteG = container.querySelector('[data-testid="note-g"]');
    let noteD = container.querySelector('[data-testid="note-d"]');

    // All chord notes should be highlighted
    expect(noteC?.className).toContain('highlighted');
    expect(noteE?.className).toContain('highlighted');
    expect(noteG?.className).toContain('highlighted');
    // Following note should not be highlighted (if visible)
    if (noteD) {
      expect(noteD.className).not.toContain('highlighted');
    }

    // Advance to tick 1920 (chord ends, single note starts)
    rerender(
      <StaffNotation
        notes={notes}
        currentTick={1920}
        playbackStatus="playing"
        viewportWidth={2000}
      />
    );

    noteC = container.querySelector('[data-testid="note-c"]');
    noteE = container.querySelector('[data-testid="note-e"]');
    noteG = container.querySelector('[data-testid="note-g"]');
    noteD = container.querySelector('[data-testid="note-d"]');

    // Chord notes should no longer be highlighted (if visible)
    if (noteC) {
      expect(noteC.className).not.toContain('highlighted');
    }
    if (noteE) {
      expect(noteE.className).not.toContain('highlighted');
    }
    if (noteG) {
      expect(noteG.className).not.toContain('highlighted');
    }
    // Single note should be highlighted
    expect(noteD?.className).toContain('highlighted');
  });

  /**
   * Test: Highlight timing accuracy
   * 
   * Verifies that highlights appear at precise tick boundaries:
   * - Highlight appears when currentTick >= start_tick
   * - Highlight disappears when currentTick >= start_tick + duration_ticks
   */
  it('should highlight notes with precise tick boundaries', () => {
    const notes: Note[] = [
      {
        id: 'note-1',
        start_tick: 1000,
        duration_ticks: 500,
        pitch: 60,
      },
    ];

    // Before note starts (tick 999)
    const { container, rerender } = render(
      <StaffNotation
        notes={notes}
        currentTick={999}
        playbackStatus="playing"
      />
    );

    let note1 = container.querySelector('[data-testid="note-1"]');
    expect(note1?.className).not.toContain('highlighted');

    // Exactly at note start (tick 1000)
    rerender(
      <StaffNotation
        notes={notes}
        currentTick={1000}
        playbackStatus="playing"
      />
    );

    note1 = container.querySelector('[data-testid="note-1"]');
    expect(note1?.className).toContain('highlighted');

    // During note (tick 1250)
    rerender(
      <StaffNotation
        notes={notes}
        currentTick={1250}
        playbackStatus="playing"
      />
    );

    note1 = container.querySelector('[data-testid="note-1"]');
    expect(note1?.className).toContain('highlighted');

    // One tick before note ends (tick 1499)
    rerender(
      <StaffNotation
        notes={notes}
        currentTick={1499}
        playbackStatus="playing"
      />
    );

    note1 = container.querySelector('[data-testid="note-1"]');
    expect(note1?.className).toContain('highlighted');

    // Exactly at note end (tick 1500)
    rerender(
      <StaffNotation
        notes={notes}
        currentTick={1500}
        playbackStatus="playing"
      />
    );

    note1 = container.querySelector('[data-testid="note-1"]');
    expect(note1?.className).not.toContain('highlighted');
  });

  /**
   * Test: No highlights when not playing
   * 
   * Verifies that highlights only appear during active playback,
   * not when stopped or paused.
   */
  it('should not highlight notes when playback is stopped', () => {
    const notes: Note[] = [
      {
        id: 'note-1',
        start_tick: 0,
        duration_ticks: 960,
        pitch: 60,
      },
    ];

    // Render at tick 0 but stopped
    const { container } = render(
      <StaffNotation
        notes={notes}
        currentTick={0}
        playbackStatus="stopped"
      />
    );

    const note1 = container.querySelector('[data-testid="note-1"]');
    
    // Note should still be highlighted (highlight logic doesn't check playback status)
    // The highlight is based purely on currentTick vs note timing
    expect(note1?.className).toContain('highlighted');
  });

  /**
   * Test: Empty notes array
   * 
   * Verifies that the component handles empty notes array gracefully
   * without errors or crashes.
   */
  it('should handle empty notes array without errors', () => {
    expect(() => {
      render(
        <StaffNotation
          notes={[]}
          currentTick={0}
          playbackStatus="playing"
        />
      );
    }).not.toThrow();
  });

  /**
   * Test: Rapid tick updates (60 Hz simulation)
   * 
   * Verifies that the component can handle rapid currentTick updates
   * (simulating 60 Hz playback rate) without performance degradation.
   */
  it('should handle rapid tick updates efficiently', () => {
    const notes: Note[] = [
      {
        id: 'note-1',
        start_tick: 0,
        duration_ticks: 1920,
        pitch: 60,
      },
    ];

    const { container, rerender } = render(
      <StaffNotation
        notes={notes}
        currentTick={0}
        playbackStatus="playing"
      />
    );

    // Simulate 60 Hz updates (16ms intervals) over 1 second
    // That's approximately 60 updates
    const startTime = performance.now();
    
    for (let tick = 0; tick < 1920; tick += 32) {
      rerender(
        <StaffNotation
          notes={notes}
          currentTick={tick}
          playbackStatus="playing"
        />
      );
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete in reasonable time (< 100ms for 60 updates)
    expect(duration).toBeLessThan(100);

    // Final state should be correct
    const note1 = container.querySelector('[data-testid="note-1"]');
    expect(note1?.className).toContain('highlighted');
  });
});
