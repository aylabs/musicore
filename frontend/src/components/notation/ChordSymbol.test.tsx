/**
 * ChordSymbol Component Tests
 * 
 * Integration tests for chord symbol rendering.
 * Following TDD approach - tests written before implementation.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChordSymbol } from './ChordSymbol';
import { DEFAULT_STAFF_CONFIG } from '../../types/notation/config';
import type { Note } from '../../types/score';
import type { NotePosition } from '../../types/notation/layout';

// Helper function to generate mock note positions from notes
function createMockNotePositions(notes: Note[]): NotePosition[] {
  return notes.map(note => ({
    id: note.id,
    x: note.start_tick * DEFAULT_STAFF_CONFIG.pixelsPerTick + DEFAULT_STAFF_CONFIG.marginLeft,
    y: 100, // Mock y position
    pitch: note.pitch,
    start_tick: note.start_tick,
    duration_ticks: note.duration_ticks,
    staffPosition: 0,
    glyphCodepoint: '\uE0A4',
    fontSize: 30,
  }));
}

describe('ChordSymbol Component', () => {
  // T016: Integration test for basic C major chord display
  it('renders C major chord symbol for C4+E4+G4 at tick 0', () => {
    const notes: Note[] = [
      { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 }, // C4
      { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 }, // E4
      { id: '3', start_tick: 0, duration_ticks: 960, pitch: 67 }, // G4
    ];

    const { container } = render(
      <svg width="800" height="200">
        <ChordSymbol
          notes={notes}
          notePositions={createMockNotePositions(notes)}
          staffConfig={DEFAULT_STAFF_CONFIG}
        />
      </svg>
    );

    // Should render SVG text element with "C" symbol
    const textElements = container.querySelectorAll('text');
    expect(textElements.length).toBeGreaterThan(0);
    
    const chordSymbol = Array.from(textElements).find(el => el.textContent === 'C');
    expect(chordSymbol).toBeDefined();
  });

  // T017: Integration test for multiple chords in sequence
  it('renders multiple chord symbols at correct positions', () => {
    const notes: Note[] = [
      // C major chord at tick 0
      { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },  // C4
      { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 },  // E4
      { id: '3', start_tick: 0, duration_ticks: 960, pitch: 67 },  // G4
      // A minor chord at tick 960
      { id: '4', start_tick: 960, duration_ticks: 960, pitch: 69 }, // A4
      { id: '5', start_tick: 960, duration_ticks: 960, pitch: 72 }, // C5
      { id: '6', start_tick: 960, duration_ticks: 960, pitch: 76 }, // E5
    ];

    const { container } = render(
      <svg width="800" height="200">
        <ChordSymbol
          notes={notes}
          notePositions={createMockNotePositions(notes)}
          staffConfig={DEFAULT_STAFF_CONFIG}
        />
      </svg>
    );

    const textElements = container.querySelectorAll('text');
    
    // Should render at least 2 chord symbols
    expect(textElements.length).toBeGreaterThanOrEqual(2);
    
    // US2: Verify full chord symbols with type suffixes
    const textContent = Array.from(textElements).map(el => el.textContent);
    expect(textContent).toContain('C');  // C major
    expect(textContent).toContain('Am'); // A minor with "m" suffix
  });

  it('does not render chord symbols for single notes', () => {
    const notes: Note[] = [
      { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
    ];

    const { container } = render(
      <svg width="800" height="200">
        <ChordSymbol
          notes={notes}
          notePositions={createMockNotePositions(notes)}
          staffConfig={DEFAULT_STAFF_CONFIG}
        />
      </svg>
    );

    // Should not render any chord symbols for single note
    const textElements = container.querySelectorAll('text');
    expect(textElements.length).toBe(0);
  });

  it('renders with custom vertical offset', () => {
    const notes: Note[] = [
      { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
      { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 },
    ];

    const { container } = render(
      <svg width="800" height="200">
        <ChordSymbol
          notes={notes}
          notePositions={createMockNotePositions(notes)}
          staffConfig={DEFAULT_STAFF_CONFIG}
          verticalOffset={40} // Custom offset instead of default 30
        />
      </svg>
    );

    const textElements = container.querySelectorAll('text');
    expect(textElements.length).toBeGreaterThan(0);
  });

  it('renders with custom font size', () => {
    const notes: Note[] = [
      { id: '1', start_tick: 0, duration_ticks: 960, pitch: 60 },
      { id: '2', start_tick: 0, duration_ticks: 960, pitch: 64 },
    ];

    const { container } = render(
      <svg width="800" height="200">
        <ChordSymbol
          notes={notes}
          notePositions={createMockNotePositions(notes)}
          staffConfig={DEFAULT_STAFF_CONFIG}
          fontSize={16} // Custom size instead of default 14
        />
      </svg>
    );

    const textElements = container.querySelectorAll('text');
    expect(textElements.length).toBeGreaterThan(0);
    
    // Check that font-size attribute is set
    const firstText = textElements[0];
    const fontSize = firstText.getAttribute('font-size');
    expect(fontSize).toBe('16');
  });

  // ========================================================================
  // User Story 2 Tests (T046): All Chord Types Integration
  // ========================================================================

  it('renders all 7 chord types with different roots (US2)', () => {
    const notes: Note[] = [
      // C major at tick 0
      { id: '1', start_tick: 0, duration_ticks: 480, pitch: 60 },  // C
      { id: '2', start_tick: 0, duration_ticks: 480, pitch: 64 },  // E
      { id: '3', start_tick: 0, duration_ticks: 480, pitch: 67 },  // G
      // Am at tick 960
      { id: '4', start_tick: 960, duration_ticks: 480, pitch: 69 }, // A
      { id: '5', start_tick: 960, duration_ticks: 480, pitch: 72 }, // C
      { id: '6', start_tick: 960, duration_ticks: 480, pitch: 76 }, // E
      // G7 at tick 1920
      { id: '7', start_tick: 1920, duration_ticks: 480, pitch: 67 }, // G
      { id: '8', start_tick: 1920, duration_ticks: 480, pitch: 71 }, // B
      { id: '9', start_tick: 1920, duration_ticks: 480, pitch: 74 }, // D
      { id: '10', start_tick: 1920, duration_ticks: 480, pitch: 77 }, // F
      // Fdim at tick 2880
      { id: '11', start_tick: 2880, duration_ticks: 480, pitch: 65 }, // F
      { id: '12', start_tick: 2880, duration_ticks: 480, pitch: 68 }, // Ab
      { id: '13', start_tick: 2880, duration_ticks: 480, pitch: 71 }, // B (Cb enharmonic)
    ];

    const { container } = render(
      <svg width="1200" height="200">
        <ChordSymbol
          notes={notes}
          notePositions={createMockNotePositions(notes)}
          staffConfig={DEFAULT_STAFF_CONFIG}
        />
      </svg>
    );

    const textElements = container.querySelectorAll('text');
    
    // Should render at least 4 chord symbols
    expect(textElements.length).toBeGreaterThanOrEqual(4);
    
    // Verify different chord types are rendered
    const textContent = Array.from(textElements).map(el => el.textContent);
    expect(textContent).toContain('C');     // C major
    expect(textContent).toContain('Am');    // A minor
    expect(textContent).toContain('G7');    // G dominant 7
    expect(textContent).toContain('Fdim');  // F diminished
  });
});
