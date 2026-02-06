import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
