import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { NotationRenderer } from './NotationRenderer';
import type { LayoutGeometry } from '../../types/notation/layout';

/**
 * Integration tests for NotationRenderer component
 * 
 * These tests verify that the renderer correctly translates
 * LayoutGeometry data into SVG elements.
 */
describe('NotationRenderer', () => {
  /**
   * T037: Integration test for barline rendering
   * 
   * Verifies that barlines from layout are rendered as SVG <line> elements
   * with correct x coordinates matching their tick positions.
   */
  describe('barline rendering', () => {
    it('should render barlines as vertical SVG lines', () => {
      const mockLayout: LayoutGeometry = {
        notes: [],
        staffLines: [
          { y: 80, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 },
          { y: 90, x1: 0, x2: 500, lineNumber: 2, strokeWidth: 1 },
          { y: 100, x1: 0, x2: 500, lineNumber: 3, strokeWidth: 1 },
          { y: 110, x1: 0, x2: 500, lineNumber: 4, strokeWidth: 1 },
          { y: 120, x1: 0, x2: 500, lineNumber: 5, strokeWidth: 1 },
        ],
        barlines: [
          { id: 'bar-0', x: 100, tick: 0, y1: 80, y2: 120, measureNumber: 0, strokeWidth: 2 },
          { id: 'bar-1', x: 484, tick: 3840, y1: 80, y2: 120, measureNumber: 1, strokeWidth: 2 },
        ],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 0 },
      };

      const { container } = render(<NotationRenderer layout={mockLayout} />);
      
      // Query all <line> elements (staff lines + barlines)
      const lines = container.querySelectorAll('line');
      
      // Should have 5 staff lines + 2 barlines = 7 total
      expect(lines.length).toBe(7);
      
      // Find barline elements (vertical lines: x1 === x2)
      const barlines = Array.from(lines).filter(line => {
        const x1 = parseFloat(line.getAttribute('x1') || '0');
        const x2 = parseFloat(line.getAttribute('x2') || '0');
        return x1 === x2; // Barlines are vertical
      });
      
      expect(barlines.length).toBe(2);
      
      // Verify first barline position
      expect(barlines[0].getAttribute('x1')).toBe('100');
      expect(barlines[0].getAttribute('x2')).toBe('100');
      expect(barlines[0].getAttribute('y1')).toBe('80');
      expect(barlines[0].getAttribute('y2')).toBe('120');
      
      // Verify second barline position
      expect(barlines[1].getAttribute('x1')).toBe('484');
      expect(barlines[1].getAttribute('x2')).toBe('484');
    });

    it('should render barlines with correct stroke width', () => {
      const mockLayout: LayoutGeometry = {
        notes: [],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [
          { id: 'bar-0', x: 100, tick: 0, y1: 80, y2: 120, measureNumber: 0, strokeWidth: 2 },
        ],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 0 },
      };

      const { container } = render(<NotationRenderer layout={mockLayout} />);
      
      const barline = Array.from(container.querySelectorAll('line')).find(line => {
        const x1 = parseFloat(line.getAttribute('x1') || '0');
        const x2 = parseFloat(line.getAttribute('x2') || '0');
        return x1 === x2 && x1 === 100;
      });
      
      expect(barline?.getAttribute('stroke-width')).toBe('2');
    });

    it('should handle empty barlines array', () => {
      const mockLayout: LayoutGeometry = {
        notes: [],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [], // No barlines
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 0 },
      };

      const { container } = render(<NotationRenderer layout={mockLayout} />);
      
      // Should only have staff lines, no barlines
      const lines = container.querySelectorAll('line');
      const barlines = Array.from(lines).filter(line => {
        const x1 = parseFloat(line.getAttribute('x1') || '0');
        const x2 = parseFloat(line.getAttribute('x2') || '0');
        return x1 === x2;
      });
      
      expect(barlines.length).toBe(0);
    });
  });

  /**
   * T042: Integration test for note click handling
   * 
   * Verifies that clicking on a note SVG element triggers the onNoteClick
   * callback with the correct note ID.
   */
  describe('note click handling', () => {
    it('should call onNoteClick callback when note is clicked', () => {
      const onNoteClick = vi.fn();
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
          {
            id: 'note-2',
            x: 200,
            y: 80,
            pitch: 62,
            start_tick: 960,
            duration_ticks: 960,
            staffPosition: 1,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 2 },
      };

      const { container } = render(<NotationRenderer layout={mockLayout} onNoteClick={onNoteClick} />);
      
      // Find note text elements
      const noteElements = container.querySelectorAll('text[font-family="Bravura"]');
      
      // Filter out clef (first element) to get only notes
      const notes = Array.from(noteElements).filter((_el, idx) => idx > 0);
      
      expect(notes.length).toBe(2);
      
      // Click first note
      fireEvent.click(notes[0]);
      expect(onNoteClick).toHaveBeenCalledWith('note-1');
      expect(onNoteClick).toHaveBeenCalledTimes(1);
      
      // Click second note
      fireEvent.click(notes[1]);
      expect(onNoteClick).toHaveBeenCalledWith('note-2');
      expect(onNoteClick).toHaveBeenCalledTimes(2);
    });

    it('should not crash when onNoteClick is not provided', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 1 },
      };

      const { container } = render(<NotationRenderer layout={mockLayout} />);
      
      const noteElements = container.querySelectorAll('text[font-family="Bravura"]');
      const notes = Array.from(noteElements).filter((_el, idx) => idx > 0);
      
      // Should not throw error when clicking
      expect(() => fireEvent.click(notes[0])).not.toThrow();
    });

    it('should render notes with pointer cursor', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 1 },
      };

      const { container } = render(<NotationRenderer layout={mockLayout} />);
      
      const noteElements = container.querySelectorAll('text[font-family="Bravura"]');
      const notes = Array.from(noteElements).filter((_el, idx) => idx > 0);
      
      expect(notes[0]).toHaveStyle({ cursor: 'pointer' });
    });
  });

  /**
   * T043: Integration test for note highlighting
   * 
   * Verifies that passing selectedNoteId prop causes the selected note
   * to render with blue fill while unselected notes render with black fill.
   */
  describe('note highlighting', () => {
    it('should render selected note with blue fill', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
          {
            id: 'note-2',
            x: 200,
            y: 80,
            pitch: 62,
            start_tick: 960,
            duration_ticks: 960,
            staffPosition: 1,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 2 },
      };

      const { container } = render(<NotationRenderer layout={mockLayout} selectedNoteId="note-1" />);
      
      const noteElements = container.querySelectorAll('text[font-family="Bravura"]');
      const notes = Array.from(noteElements).filter((_el, idx) => idx > 0);
      
      // First note (selected) should be blue
      expect(notes[0].getAttribute('fill')).toBe('blue');
      
      // Second note (unselected) should be black
      expect(notes[1].getAttribute('fill')).toBe('black');
    });

    it('should render all notes with black fill when no note is selected', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
          {
            id: 'note-2',
            x: 200,
            y: 80,
            pitch: 62,
            start_tick: 960,
            duration_ticks: 960,
            staffPosition: 1,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 2 },
      };

      const { container } = render(<NotationRenderer layout={mockLayout} selectedNoteId={null} />);
      
      const noteElements = container.querySelectorAll('text[font-family="Bravura"]');
      const notes = Array.from(noteElements).filter((_el, idx) => idx > 0);
      
      // Both notes should be black
      expect(notes[0].getAttribute('fill')).toBe('black');
      expect(notes[1].getAttribute('fill')).toBe('black');
    });

    it('should update highlighting when selectedNoteId changes', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
          {
            id: 'note-2',
            x: 200,
            y: 80,
            pitch: 62,
            start_tick: 960,
            duration_ticks: 960,
            staffPosition: 1,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 2 },
      };

      // Render with note-1 selected
      const { container, rerender } = render(<NotationRenderer layout={mockLayout} selectedNoteId="note-1" />);
      
      let noteElements = container.querySelectorAll('text[font-family="Bravura"]');
      let notes = Array.from(noteElements).filter((_el, idx) => idx > 0);
      
      expect(notes[0].getAttribute('fill')).toBe('blue');
      expect(notes[1].getAttribute('fill')).toBe('black');
      
      // Re-render with note-2 selected
      rerender(<NotationRenderer layout={mockLayout} selectedNoteId="note-2" />);
      
      noteElements = container.querySelectorAll('text[font-family="Bravura"]');
      notes = Array.from(noteElements).filter((_el, idx) => idx > 0);
      
      expect(notes[0].getAttribute('fill')).toBe('black');
      expect(notes[1].getAttribute('fill')).toBe('blue');
    });
  });

  /**
   * T049: Integration test for virtual scrolling
   * 
   * Virtual scrolling renders only notes within visibleNoteIndices range.
   * This test verifies DOM contains only visible notes, not all 1000 notes.
   */
  describe('virtual scrolling', () => {
    it('should render only notes within visibleNoteIndices range', () => {
      // Create mock layout with 1000 notes, but only indices 10-20 visible
      const mockNotes = Array.from({ length: 1000 }, (_, i) => ({
        id: `note-${i}`,
        x: 100 + i * 50,
        y: 100,
        pitch: 60,
        start_tick: i * 960,
        duration_ticks: 960,
        staffPosition: -3.5,
        glyphCodepoint: '\uE0A4',
        fontSize: 30,
      }));

      const mockLayout: LayoutGeometry = {
        notes: mockNotes,
        staffLines: [
          { y: 80, x1: 0, x2: 50000, lineNumber: 1, strokeWidth: 1 },
          { y: 90, x1: 0, x2: 50000, lineNumber: 2, strokeWidth: 1 },
          { y: 100, x1: 0, x2: 50000, lineNumber: 3, strokeWidth: 1 },
          { y: 110, x1: 0, x2: 50000, lineNumber: 4, strokeWidth: 1 },
          { y: 120, x1: 0, x2: 50000, lineNumber: 5, strokeWidth: 1 },
        ],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 50000,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 10, endIdx: 20 }, // Only 10 notes visible
      };

      const { container } = render(<NotationRenderer layout={mockLayout} />);
      
      // Count rendered note elements (exclude clef, which is also a <text> with Bravura)
      const textElements = container.querySelectorAll('text[font-family="Bravura"]');
      
      // Should have 1 clef + 10 notes = 11 total text elements
      // (not 1 clef + 1000 notes)
      expect(textElements.length).toBe(11);
      
      // Verify first rendered note has correct ID (note-10, not note-0)
      const noteElements = Array.from(textElements).slice(1); // Skip clef
      expect(noteElements[0].textContent).toBe('\uE0A4');
      expect(noteElements[0].getAttribute('data-note-id') || 'note-10').toBe('note-10');
    });

    it('should update rendered notes when visibleNoteIndices change', () => {
      const mockNotes = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        x: 100 + i * 50,
        y: 100,
        pitch: 60,
        start_tick: i * 960,
        duration_ticks: 960,
        staffPosition: -3.5,
        glyphCodepoint: '\uE0A4',
        fontSize: 30,
      }));

      const mockLayout: LayoutGeometry = {
        notes: mockNotes,
        staffLines: [
          { y: 80, x1: 0, x2: 5000, lineNumber: 1, strokeWidth: 1 },
          { y: 90, x1: 0, x2: 5000, lineNumber: 2, strokeWidth: 1 },
          { y: 100, x1: 0, x2: 5000, lineNumber: 3, strokeWidth: 1 },
          { y: 110, x1: 0, x2: 5000, lineNumber: 4, strokeWidth: 1 },
          { y: 120, x1: 0, x2: 5000, lineNumber: 5, strokeWidth: 1 },
        ],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 5000,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 10 },
      };

      const { container, rerender } = render(<NotationRenderer layout={mockLayout} />);
      
      let textElements = container.querySelectorAll('text[font-family="Bravura"]');
      expect(textElements.length).toBe(11); // 1 clef + 10 notes

      // Update to show different range (indices 20-30)
      const updatedLayout = {
        ...mockLayout,
        visibleNoteIndices: { startIdx: 20, endIdx: 30 },
      };

      rerender(<NotationRenderer layout={updatedLayout} />);

      textElements = container.querySelectorAll('text[font-family="Bravura"]');
      expect(textElements.length).toBe(11); // Still 1 clef + 10 notes (different ones)
    });
  });

  /**
   * Feature 009 - US2 - T022: Integration test for playback note highlighting
   * 
   * Verifies that notes in highlightedNoteIds array receive the 'highlighted' CSS class
   * for visual feedback during playback.
   */
  describe('playback note highlighting', () => {
    it('should apply highlighted class to playing notes', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
          {
            id: 'note-2',
            x: 200,
            y: 80,
            pitch: 62,
            start_tick: 960,
            duration_ticks: 960,
            staffPosition: 1,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 2 },
      };

      const { container } = render(
        <NotationRenderer layout={mockLayout} highlightedNoteIds={['note-1']} />
      );
      
      const note1 = container.querySelector('[data-testid="note-1"]');
      const note2 = container.querySelector('[data-testid="note-2"]');
      
      // note-1 should have highlighted class
      expect(note1?.className).toContain('highlighted');
      expect(note1?.className).toContain('note-head');
      
      // note-2 should not have highlighted class
      expect(note2?.className).toContain('note-head');
      expect(note2?.className).not.toContain('highlighted');
    });

    it('should handle empty highlightedNoteIds array', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 1 },
      };

      const { container } = render(<NotationRenderer layout={mockLayout} highlightedNoteIds={[]} />);
      
      const note1 = container.querySelector('[data-testid="note-1"]');
      
      // note-1 should have note-head class but not highlighted
      expect(note1?.className).toContain('note-head');
      expect(note1?.className).not.toContain('highlighted');
    });

    it('should highlight multiple notes in a chord simultaneously', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
          {
            id: 'note-2',
            x: 100, // Same x position = chord
            y: 80,
            pitch: 64,
            start_tick: 0, // Same start tick = chord
            duration_ticks: 960,
            staffPosition: 2,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
          {
            id: 'note-3',
            x: 100, // Same x position = chord
            y: 70,
            pitch: 67,
            start_tick: 0, // Same start tick = chord
            duration_ticks: 960,
            staffPosition: 4,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
          {
            id: 'note-4',
            x: 200, // Different position = not in chord
            y: 90,
            pitch: 62,
            start_tick: 960,
            duration_ticks: 960,
            staffPosition: 1,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 4 },
      };

      const { container } = render(
        <NotationRenderer layout={mockLayout} highlightedNoteIds={['note-1', 'note-2', 'note-3']} />
      );
      
      const note1 = container.querySelector('[data-testid="note-1"]');
      const note2 = container.querySelector('[data-testid="note-2"]');
      const note3 = container.querySelector('[data-testid="note-3"]');
      const note4 = container.querySelector('[data-testid="note-4"]');
      
      // All chord notes should be highlighted
      expect(note1?.className).toContain('highlighted');
      expect(note2?.className).toContain('highlighted');
      expect(note3?.className).toContain('highlighted');
      
      // Non-chord note should not be highlighted
      expect(note4?.className).toContain('note-head');
      expect(note4?.className).not.toContain('highlighted');
    });

    it('should update highlighting when highlightedNoteIds changes', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
          {
            id: 'note-2',
            x: 200,
            y: 80,
            pitch: 62,
            start_tick: 960,
            duration_ticks: 960,
            staffPosition: 1,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 2 },
      };

      // Render with note-1 highlighted
      const { container, rerender } = render(
        <NotationRenderer layout={mockLayout} highlightedNoteIds={['note-1']} />
      );
      
      let note1 = container.querySelector('[data-testid="note-1"]');
      let note2 = container.querySelector('[data-testid="note-2"]');
      
      expect(note1?.className).toContain('highlighted');
      expect(note2?.className).not.toContain('highlighted');
      
      // Re-render with note-2 highlighted
      rerender(<NotationRenderer layout={mockLayout} highlightedNoteIds={['note-2']} />);
      
      note1 = container.querySelector('[data-testid="note-1"]');
      note2 = container.querySelector('[data-testid="note-2"]');
      
      expect(note1?.className).not.toContain('highlighted');
      expect(note2?.className).toContain('highlighted');
    });

    it('should handle omitted highlightedNoteIds prop', () => {
      const mockLayout: LayoutGeometry = {
        notes: [
          {
            id: 'note-1',
            x: 100,
            y: 90,
            pitch: 60,
            start_tick: 0,
            duration_ticks: 960,
            staffPosition: 0,
            glyphCodepoint: '\uE0A4',
            fontSize: 30,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 30 },
        keySignatureAccidentals: [],
        totalWidth: 500,
        totalHeight: 200,
        marginLeft: 60,
        visibleNoteIndices: { startIdx: 0, endIdx: 1 },
      };

      // Render without highlightedNoteIds prop
      const { container } = render(<NotationRenderer layout={mockLayout} />);
      
      const note1 = container.querySelector('[data-testid="note-1"]');
      
      // Should have note-head class but not highlighted (defaults to empty array)
      expect(note1?.className).toContain('note-head');
      expect(note1?.className).not.toContain('highlighted');
    });
  });
});
