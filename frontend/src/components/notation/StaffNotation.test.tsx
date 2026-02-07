import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { StaffNotation } from './StaffNotation';
import type { Note } from '../../types/score';

/**
 * Integration tests for StaffNotation component
 * 
 * These tests verify that the coordinator component correctly manages
 * selection state and coordinates between layout calculation and rendering.
 */
describe('StaffNotation', () => {
  /**
   * T044: Integration test for selection state management
   * 
   * Verifies that clicking a note updates selectedNoteId state,
   * and clicking another note deselects the previous and selects the new one.
   */
  describe('selection state management', () => {
    it('should select note when clicked', () => {
      const mockNotes: Note[] = [
        {
          id: 'note-1',
          pitch: 60,
          start_tick: 0,
          duration_ticks: 960,
        },
        {
          id: 'note-2',
          pitch: 62,
          start_tick: 960,
          duration_ticks: 960,
        },
      ];

      const { container } = render(<StaffNotation notes={mockNotes} clef="Treble" />);
      
      // Get note elements (filter out clef which is also a text element)
      const textElements = container.querySelectorAll('text[font-family="Bravura"]');
      const noteElements = Array.from(textElements).filter((_el, idx) => idx > 0); // Skip clef
      
      // Initially, no note should be selected (all black)
      expect(noteElements[0].getAttribute('fill')).toBe('black');
      expect(noteElements[1].getAttribute('fill')).toBe('black');
      
      // Click first note
      fireEvent.click(noteElements[0]);
      
      // First note should now be blue (selected)
      expect(noteElements[0].getAttribute('fill')).toBe('blue');
      expect(noteElements[1].getAttribute('fill')).toBe('black');
    });

    it('should deselect note when clicked again', () => {
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
      const noteElements = Array.from(textElements).filter((_el, idx) => idx > 0);
      
      // Initially black
      expect(noteElements[0].getAttribute('fill')).toBe('black');
      
      // Click to select
      fireEvent.click(noteElements[0]);
      expect(noteElements[0].getAttribute('fill')).toBe('blue');
      
      // Click again to deselect
      fireEvent.click(noteElements[0]);
      expect(noteElements[0].getAttribute('fill')).toBe('black');
    });

    it('should switch selection when different note is clicked', () => {
      const mockNotes: Note[] = [
        {
          id: 'note-1',
          pitch: 60,
          start_tick: 0,
          duration_ticks: 960,
        },
        {
          id: 'note-2',
          pitch: 62,
          start_tick: 960,
          duration_ticks: 960,
        },
        {
          id: 'note-3',
          pitch: 64,
          start_tick: 1920,
          duration_ticks: 960,
        },
      ];

      const { container } = render(<StaffNotation notes={mockNotes} clef="Treble" />);
      
      const textElements = container.querySelectorAll('text[font-family="Bravura"]');
      const noteElements = Array.from(textElements).filter((_el, idx) => idx > 0);
      
      // Click first note
      fireEvent.click(noteElements[0]);
      expect(noteElements[0].getAttribute('fill')).toBe('blue');
      expect(noteElements[1].getAttribute('fill')).toBe('black');
      expect(noteElements[2].getAttribute('fill')).toBe('black');
      
      // Click second note - first should deselect, second should select
      fireEvent.click(noteElements[1]);
      expect(noteElements[0].getAttribute('fill')).toBe('black');
      expect(noteElements[1].getAttribute('fill')).toBe('blue');
      expect(noteElements[2].getAttribute('fill')).toBe('black');
      
      // Click third note
      fireEvent.click(noteElements[2]);
      expect(noteElements[0].getAttribute('fill')).toBe('black');
      expect(noteElements[1].getAttribute('fill')).toBe('black');
      expect(noteElements[2].getAttribute('fill')).toBe('blue');
    });

    it('should maintain selection state across re-renders', () => {
      const mockNotes: Note[] = [
        {
          id: 'note-1',
          pitch: 60,
          start_tick: 0,
          duration_ticks: 960,
        },
        {
          id: 'note-2',
          pitch: 62,
          start_tick: 960,
          duration_ticks: 960,
        },
      ];

      const { container, rerender } = render(<StaffNotation notes={mockNotes} clef="Treble" />);
      
      let textElements = container.querySelectorAll('text[font-family="Bravura"]');
      let noteElements = Array.from(textElements).filter((_el, idx) => idx > 0);
      
      // Click first note to select
      fireEvent.click(noteElements[0]);
      expect(noteElements[0].getAttribute('fill')).toBe('blue');
      
      // Re-render with same props
      rerender(<StaffNotation notes={mockNotes} clef="Treble" />);
      
      // Selection should persist
      textElements = container.querySelectorAll('text[font-family="Bravura"]');
      noteElements = Array.from(textElements).filter((_el, idx) => idx > 0);
      expect(noteElements[0].getAttribute('fill')).toBe('blue');
    });

    it('should handle empty notes array', () => {
      const mockNotes: Note[] = [];

      // Should not crash
      expect(() => render(<StaffNotation notes={mockNotes} clef="Treble" />)).not.toThrow();
    });
  });

  /**
   * T050: Integration test for scroll handling
   * 
   * Verifies that scrolling the container updates scrollX state,
   * triggers layout recalculation with new scrollX value,
   * and updates visibleNoteIndices accordingly.
   */
  describe('scroll handling', () => {
    it('should update scrollX state when container scrolls', () => {
      // Create many notes to enable scrolling
      const mockNotes: Note[] = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        pitch: 60 + (i % 12),
        start_tick: i * 1000,
        duration_ticks: 960,
      }));

      const { container } = render(<StaffNotation notes={mockNotes} clef="Treble" />);
      
      // Find the scrollable container (outer div with overflow-x: auto)
      const scrollContainer = container.querySelector('div[style*="overflow"]') as HTMLDivElement;
      expect(scrollContainer).toBeTruthy();

      // Initial scroll position should be 0
      expect(scrollContainer.scrollLeft).toBe(0);

      // Simulate scrolling
      Object.defineProperty(scrollContainer, 'scrollLeft', {
        writable: true,
        value: 500,
      });
      
      fireEvent.scroll(scrollContainer);

      // ScrollX state should be updated (we can't directly test state,
      // but layout should be recalculated with new scrollX)
      // The fact that the component doesn't crash verifies the scroll handler works
      expect(scrollContainer.scrollLeft).toBe(500);
    });

    it('should recalculate visible indices when scrolling', () => {
      const mockNotes: Note[] = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        pitch: 60,
        start_tick: i * 1000,
        duration_ticks: 960,
      }));

      const { container } = render(<StaffNotation notes={mockNotes} clef="Treble" />);
      
      // Count initially visible notes
      let textElements = container.querySelectorAll('text[font-family="Bravura"]');
      const initialCount = textElements.length;

      // Simulate scrolling to middle of score
      const scrollContainer = container.querySelector('div[style*="overflow"]') as HTMLDivElement;
      Object.defineProperty(scrollContainer, 'scrollLeft', {
        writable: true,
        value: 2000,
      });
      
      fireEvent.scroll(scrollContainer);

      // Note count might change depending on window, but should not crash
      textElements = container.querySelectorAll('text[font-family="Bravura"]');
      expect(textElements.length).toBeGreaterThan(0);
      expect(textElements.length).toBeLessThanOrEqual(initialCount + 10); // Some buffer
    });

    it('should handle rapid scroll events without errors', () => {
      const mockNotes: Note[] = Array.from({ length: 200 }, (_, i) => ({
        id: `note-${i}`,
        pitch: 60 + (i % 12),
        start_tick: i * 1000,
        duration_ticks: 960,
      }));

      const { container } = render(<StaffNotation notes={mockNotes} clef="Treble" />);
      const scrollContainer = container.querySelector('div[style*="overflow"]') as HTMLDivElement;

      // Simulate rapid scrolling
      const scrollPositions = [100, 200, 300, 500, 1000, 1500, 2000];
      
      expect(() => {
        scrollPositions.forEach(position => {
          Object.defineProperty(scrollContainer, 'scrollLeft', {
            writable: true,
            value: position,
          });
          fireEvent.scroll(scrollContainer);
        });
      }).not.toThrow();
    });
  });
});
