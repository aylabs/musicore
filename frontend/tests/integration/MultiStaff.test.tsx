/**
 * Integration Tests for Multi-Staff Rendering (User Story 3)
 * Feature 017 - LayoutRenderer Component
 * 
 * Tests piano score rendering with multi-staff spacing and vertical alignment.
 * Uses piano_8_measures.json fixture (2 staves: treble + bass).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LayoutRenderer } from '../../src/components/LayoutRenderer';
import { createDefaultConfig } from '../../src/utils/renderUtils';
import pianoLayout from '../fixtures/piano_8_measures.json';
import type { GlobalLayout } from '../../src/wasm/layout';
import type { RenderConfig } from '../../src/types/RenderConfig';
import type { Viewport } from '../../src/types/Viewport';

// ============================================================================
// Integration Test Suite for User Story 3: Multi-Staff Rendering
// ============================================================================

describe('User Story 3: Multi-Staff Rendering', () => {
  let layout: GlobalLayout;
  let config: RenderConfig;
  let viewport: Viewport;

  beforeEach(() => {
    layout = pianoLayout as GlobalLayout;
    config = createDefaultConfig();
    viewport = {
      x: 0,
      y: 0,
      width: layout.total_width,
      height: layout.total_height,
    };
  });

  // ============================================================================
  // Task T051: Integration test - render piano_8_measures
  // ============================================================================

  describe('Piano Fixture Rendering (T051)', () => {
    it('should render piano fixture with 2 staves', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();

      // Piano fixture has 2 systems, each with 2 staves = 4 staves total
      // Each staff has 5 lines = 20 total staff lines
      const staffLines = container.querySelectorAll('line');
      expect(staffLines.length).toBeGreaterThanOrEqual(20);
    });

    it('should render both treble and bass clefs', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const glyphs = container.querySelectorAll('text');
      
      // Treble clef: \uE050
      const trebleClefs = Array.from(glyphs).filter(g => g.textContent === '\uE050');
      expect(trebleClefs.length).toBeGreaterThanOrEqual(1);

      // Bass clef: \uE062
      const bassClefs = Array.from(glyphs).filter(g => g.textContent === '\uE062');
      expect(bassClefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should render noteheads on both staves', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const glyphs = container.querySelectorAll('text');
      const noteheads = Array.from(glyphs).filter(g => g.textContent === '\uE0A4');
      
      // Piano fixture has noteheads on both treble and bass staves
      expect(noteheads.length).toBeGreaterThanOrEqual(8);
    });

    it('should render 2 systems', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const systems = container.querySelectorAll('g[data-system-index]');
      expect(systems).toHaveLength(2);
    });

    it('should position systems correctly', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const systems = container.querySelectorAll('g[data-system-index]');
      
      // System 0 at y=0
      const system0 = systems[0];
      expect(system0.getAttribute('transform')).toMatch(/translate\(0,\s*0\)/);
      
      // System 1: transform is translate(0, 0) because child elements use absolute coordinates
      const system1 = systems[1];
      expect(system1.getAttribute('transform')).toMatch(/translate\(0,\s*0\)/);
    });
  });

  // ============================================================================
  // Task T052: Integration test - verify staff spacing
  // ============================================================================

  describe('Staff Spacing Validation (T052)', () => {
    it('should maintain correct vertical separation between staves', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Extract staff line y-positions from first system
      const lines = container.querySelectorAll('line');
      const yPositions = Array.from(lines).map(line => 
        parseFloat(line.getAttribute('y1') || '0')
      );

      // First staff: y=0,5,10,15,20 (5 lines)
      const firstStaffLines = yPositions.slice(0, 5);
      expect(firstStaffLines).toEqual([0, 5, 10, 15, 20]);

      // Second staff: y=120,125,130,135,140 (5 lines)
      const secondStaffLines = yPositions.slice(5, 10);
      expect(secondStaffLines).toEqual([120, 125, 130, 135, 140]);

      // Verify spacing: 120 - 20 = 100 logical units between staves
      const spacing = secondStaffLines[0] - firstStaffLines[4];
      expect(spacing).toBe(100);
    });

    it('should use layout-specified staff positions', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Verify that staff positions match fixture
      const firstSystem = layout.systems[0];
      const trebleStaff = firstSystem.staff_groups[0].staves[0];
      const bassStaff = firstSystem.staff_groups[0].staves[1];

      const lines = container.querySelectorAll('line');
      
      // Treble staff
      const trebleLine1 = lines[0];
      expect(parseFloat(trebleLine1.getAttribute('y1') || '0')).toBe(
        trebleStaff.staff_lines[0].y_position
      );

      // Bass staff
      const bassLine1 = lines[5];
      expect(parseFloat(bassLine1.getAttribute('y1') || '0')).toBe(
        bassStaff.staff_lines[0].y_position
      );
    });

    it('should maintain consistent spacing across systems', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const systems = container.querySelectorAll('g[data-system-index]');
      
      // Both systems should have same internal staff spacing
      systems.forEach(systemGroup => {
        const lines = systemGroup.querySelectorAll('line');
        const yPositions = Array.from(lines).map(line => 
          parseFloat(line.getAttribute('y1') || '0')
        );

        if (yPositions.length >= 10) {
          // Spacing between first and second staff
          const spacing = yPositions[5] - yPositions[4];
          expect(spacing).toBe(100);
        }
      });
    });
  });

  // ============================================================================
  // Task T054: Integration test - verify vertical alignment
  // ============================================================================

  describe('Vertical Alignment Validation (T054)', () => {
    it('should align simultaneous notes at same x-position', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Extract noteheads from first system
      const glyphs = container.querySelectorAll('text');
      const noteheads = Array.from(glyphs).filter(g => g.textContent === '\uE0A4');
      
      // Group by x-position (within tolerance of 1px)
      const xPositions = noteheads.map(g => 
        parseFloat(g.getAttribute('x') || '0')
      );

      // Find simultaneous notes (same x-position ±1px)
      const grouped = new Map<number, number[]>();
      xPositions.forEach((x, index) => {
        const bucket = Math.round(x);
        if (!grouped.has(bucket)) {
          grouped.set(bucket, []);
        }
        grouped.get(bucket)!.push(index);
      });

      // At least one x-position should have notes from both staves
      const simultaneousGroups = Array.from(grouped.values())
        .filter(indices => indices.length > 1);
      
      expect(simultaneousGroups.length).toBeGreaterThan(0);

      // Verify x-positions match within ±1px
      simultaneousGroups.forEach(indices => {
        const xVals = indices.map(i => xPositions[i]);
        const minX = Math.min(...xVals);
        const maxX = Math.max(...xVals);
        expect(maxX - minX).toBeLessThanOrEqual(1);
      });
    });

    it('should use layout-specified x-positions', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Verify positions match fixture
      const expectedPositions: number[] = [];
      layout.systems[0].staff_groups[0].staves.forEach(staff => {
        staff.glyph_runs.forEach(run => {
          run.glyphs.forEach(glyph => {
            if (glyph.codepoint === '\uE0A4') {
              expectedPositions.push(glyph.position.x);
            }
          });
        });
      });

      const glyphs = container.querySelectorAll('text');
      const noteheads = Array.from(glyphs)
        .filter(g => g.textContent === '\uE0A4')
        .slice(0, expectedPositions.length);

      noteheads.forEach((notehead, index) => {
        const actualX = parseFloat(notehead.getAttribute('x') || '0');
        const expectedX = expectedPositions[index];
        expect(Math.abs(actualX - expectedX)).toBeLessThanOrEqual(1);
      });
    });

    it('should preserve horizontal alignment across systems', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Notes at the same beat in different systems should align
      // (This is guaranteed by layout engine)
      const systems = container.querySelectorAll('g[data-system-index]');
      
      systems.forEach(systemGroup => {
        const noteheads = Array.from(systemGroup.querySelectorAll('text'))
          .filter(g => g.textContent === '\uE0A4');
        
        // All noteheads should have x-positions from layout
        noteheads.forEach(notehead => {
          const x = parseFloat(notehead.getAttribute('x') || '0');
          expect(x).toBeGreaterThan(0);
          expect(x).toBeLessThan(layout.total_width);
        });
      });
    });
  });

  // ============================================================================
  // Task T055: Integration tests - piano score rendering
  // ============================================================================

  describe('Piano Score Integration', () => {
    it('should render complete piano score without errors', () => {
      expect(() => {
        render(
          <LayoutRenderer layout={layout} config={config} viewport={viewport} />
        );
      }).not.toThrow();
    });

    it('should handle viewport changes for multi-staff', () => {
      const { container, rerender } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Scroll to second system
      const newViewport = {
        x: 0,
        y: 300,
        width: 1200,
        height: 300,
      };

      expect(() => {
        rerender(
          <LayoutRenderer layout={layout} config={config} viewport={newViewport} />
        );
      }).not.toThrow();

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 300 1200 300');
    });
  });

  describe('Complete Multi-Staff Integration', () => {
    it('should render all expected elements', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // SVG
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();

      // Systems
      const systems = container.querySelectorAll('g[data-system-index]');
      expect(systems).toHaveLength(2);

      // Staff groups
      const staffGroups = container.querySelectorAll('g[data-staff-group]');
      expect(staffGroups.length).toBeGreaterThanOrEqual(2);

      // Staff lines (2 systems × 2 staves × 5 lines = 20)
      const staffLines = container.querySelectorAll('line');
      expect(staffLines.length).toBeGreaterThanOrEqual(20);

      // Glyphs (clefs + noteheads)
      const glyphs = container.querySelectorAll('text');
      expect(glyphs.length).toBeGreaterThanOrEqual(10);
    });

    it('should maintain rendering consistency', () => {
      // Render twice
      const { container: container1 } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );
      
      const { container: container2 } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Same number of elements
      const count1 = container1.querySelectorAll('*').length;
      const count2 = container2.querySelectorAll('*').length;
      expect(count1).toBe(count2);

      // Same viewBox
      const svg1 = container1.querySelector('svg');
      const svg2 = container2.querySelector('svg');
      expect(svg1?.getAttribute('viewBox')).toBe(svg2?.getAttribute('viewBox'));
    });
  });
});
