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
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 40 },
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
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 40 },
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
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 40 },
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
            fontSize: 40,
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
            fontSize: 40,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 40 },
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
            fontSize: 40,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 40 },
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
            fontSize: 40,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 40 },
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
            fontSize: 40,
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
            fontSize: 40,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 40 },
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
            fontSize: 40,
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
            fontSize: 40,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 40 },
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
            fontSize: 40,
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
            fontSize: 40,
          },
        ],
        staffLines: [{ y: 100, x1: 0, x2: 500, lineNumber: 1, strokeWidth: 1 }],
        barlines: [],
        ledgerLines: [],
        clef: { type: 'Treble', x: 30, y: 100, glyphCodepoint: '\uE050', fontSize: 40 },
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
});
