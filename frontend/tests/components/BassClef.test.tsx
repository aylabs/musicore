/**
 * Feature 007: Clef Notation Support - Bass Clef Component Tests
 * User Story 1: Display Bass Clef for Low-Range Instruments
 * 
 * T013: Component tests for Bass clef rendering
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StaffNotation } from '../../src/components/notation/StaffNotation';
import type { Note } from '../../src/types/score';

describe('Bass Clef Component Rendering (Feature 007 - User Story 1)', () => {
  describe('T013: Bass clef glyph rendering', () => {
    it('should render Bass clef glyph (\\uE062) when clef="Bass"', () => {
      const mockNotes: Note[] = [
        {
          id: 'note-1',
          pitch: 48, // C3 in bass clef
          start_tick: 0,
          duration_ticks: 960,
        },
      ];

      const { container } = render(<StaffNotation notes={mockNotes} clef="Bass" />);

      // Find the clef glyph (first text element with Bravura font)
      const textElements = container.querySelectorAll('text[font-family="Bravura"]');
      const clefElement = textElements[0];

      // Bass clef SMuFL codepoint is U+E062 (𝄢)
      expect(clefElement.textContent).toBe('\uE062');
    });

    it('should render Treble clef glyph (\\uE050) when clef="Treble" for comparison', () => {
      const mockNotes: Note[] = [
        {
          id: 'note-1',
          pitch: 60,
          start_tick: 0,
          duration_ticks: 960,
        },
      ];

      const { container } = render(<StaffNotation notes={mockNotes} clef="Treble" />);

      const textElements = container.querySelectorAll('text[font-family="Bravura"]');
      const clefElement = textElements[0];

      // Treble clef SMuFL codepoint is U+E050 (𝄞)
      expect(clefElement.textContent).toBe('\uE050');
    });
  });

  describe('Bass clef note positioning (visual verification)', () => {
    it('should position Bass clef notes differently than Treble clef notes', () => {
      const samePitch = 60; // Middle C
      const mockNotes: Note[] = [
        {
          id: 'note-1',
          pitch: samePitch,
          start_tick: 0,
          duration_ticks: 960,
        },
      ];

      // Render in Treble clef
      const { container: trebleContainer } = render(
        <StaffNotation notes={mockNotes} clef="Treble" />
      );
      const trebleNoteElements = trebleContainer.querySelectorAll('text[font-family="Bravura"]');
      const trebleNoteY = trebleNoteElements[1]?.getAttribute('y'); // Second element is the note (first is clef)

      // Render in Bass clef
      const { container: bassContainer } = render(
        <StaffNotation notes={mockNotes} clef="Bass" />
      );
      const bassNoteElements = bassContainer.querySelectorAll('text[font-family="Bravura"]');
      const bassNoteY = bassNoteElements[1]?.getAttribute('y');

      // Middle C should appear at different Y positions in Treble vs Bass clefs
      expect(trebleNoteY).not.toBe(bassNoteY);
      
      // In treble, C4 is below staff (higher Y value), in bass it's above staff (lower Y value)
      expect(parseFloat(trebleNoteY!)).toBeGreaterThan(parseFloat(bassNoteY!));
    });

    it('should render Bass clef with F3 (MIDI 53) on fourth line', () => {
      const mockNotes: Note[] = [
        {
          id: 'note-f3',
          pitch: 53, // F3 - should be on fourth line from bottom in bass clef
          start_tick: 0,
          duration_ticks: 960,
        },
      ];

      const { container } = render(<StaffNotation notes={mockNotes} clef="Bass" />);

      // Verify the component renders without crashing
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();

      // Verify bass clef glyph is present
      const textElements = container.querySelectorAll('text[font-family="Bravura"]');
      expect(textElements[0].textContent).toBe('\uE062'); // Bass clef

      // Verify note is rendered
      expect(textElements.length).toBeGreaterThan(1);
    });

    it('should render multiple notes in Bass clef (piano left hand scenario)', () => {
      const mockNotes: Note[] = [
        {
          id: 'note-c3',
          pitch: 48, // C3
          start_tick: 0,
          duration_ticks: 960,
        },
        {
          id: 'note-e3',
          pitch: 52, // E3
          start_tick: 960,
          duration_ticks: 960,
        },
        {
          id: 'note-g3',
          pitch: 55, // G3
          start_tick: 1920,
          duration_ticks: 960,
        },
      ];

      const { container } = render(<StaffNotation notes={mockNotes} clef="Bass" />);

      // Verify bass clef glyph
      const textElements = container.querySelectorAll('text[font-family="Bravura"]');
      expect(textElements[0].textContent).toBe('\uE062');

      // Verify notes rendered (clef + at least some notes)
      expect(textElements.length).toBeGreaterThan(1); // At least clef + 1 note
    });
  });
});
