/**
 * Integration Tests for Single Voice Rendering (User Story 1)
 * Feature 017 - LayoutRenderer Component
 * \n * Tests end-to-end rendering with realistic layout data.
 * Uses violin_10_measures.json fixture (3 systems, 10 glyphs, 1 treble clef).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LayoutRenderer } from '../../src/components/LayoutRenderer';
import { createDefaultConfig } from '../../src/utils/renderUtils';
import violinLayout from '../fixtures/violin_10_measures.json';
import type { GlobalLayout } from '../../src/wasm/layout';
import type { RenderConfig } from '../../src/types/RenderConfig';
import type { Viewport } from '../../src/types/Viewport';

// ============================================================================
// Integration Test Suite for User Story 1: Render Single Voice
// ============================================================================

describe('User Story 1: Single Voice Rendering', () => {
  let layout: GlobalLayout;
  let config: RenderConfig;
  let viewport: Viewport;

  beforeEach(() => {
    layout = violinLayout as GlobalLayout;
    config = createDefaultConfig();
    viewport = {
      x: 0,
      y: 0,
      width: layout.total_width,
      height: layout.total_height,
    };
  });

  // ============================================================================
  // Task T027: Verify SVG structure (systems, staff groups, staves, glyphs)
  // ============================================================================

  describe('SVG Structure Validation (T027)', () => {
    it('should render all 3 systems from fixture', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Look for system groups (should have data-system-index attribute or specific structure)
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();

      const systemGroups = svg?.querySelectorAll('g[data-system-index]');
      expect(systemGroups).toHaveLength(3);

      // Verify system indices
      const systemIndices = Array.from(systemGroups || []).map(g =>
        parseInt(g.getAttribute('data-system-index') || '-1')
      );
      expect(systemIndices).toEqual([0, 1, 2]);
    });

    it('should render staff groups with correct structure', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Each system has 1 staff group in the fixture
      const staffGroups = container.querySelectorAll('g[data-staff-group]');
      expect(staffGroups.length).toBeGreaterThanOrEqual(3);
    });

    it('should render 5 staff lines per staff', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Fixture has 3 systems × 1 staff each = 3 staves
      // Each staff has 5 lines = 15 total staff lines
      const staffLines = container.querySelectorAll('line');
      expect(staffLines.length).toBeGreaterThanOrEqual(15);
    });

    it('should render all glyphs from fixture', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Fixture has:
      // - 1 treble clef (\uE050)
      // - 10 quarter note heads (\uE0A4)
      // Total: 11 glyphs
      const glyphs = container.querySelectorAll('text');
      
      // Filter out any error messages
      const musicGlyphs = Array.from(glyphs).filter(g => 
        g.textContent !== 'No layout available'
      );
      
      expect(musicGlyphs.length).toBeGreaterThanOrEqual(11);
    });

    it('should render treble clef structural glyph', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const glyphs = container.querySelectorAll('text');
      const trebleClefs = Array.from(glyphs).filter(g => 
        g.textContent === '\uE050'
      );
      
      expect(trebleClefs.length).toBeGreaterThanOrEqual(1);
    });

    it('should render quarter notehead glyphs', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const glyphs = container.querySelectorAll('text');
      const noteheads = Array.from(glyphs).filter(g => 
        g.textContent === '\uE0A4'
      );
      
      // Fixture has 10 quarter noteheads
      expect(noteheads).toHaveLength(10);
    });
  });

  // ============================================================================
  // Task T028: Verify notehead positions within ±2px of layout
  // ============================================================================

  describe('Notehead Position Accuracy (T028)', () => {
    it('should position all noteheads within ±2px of layout positions', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Extract expected positions from fixture
      const expectedPositions: Array<{ x: number; y: number }> = [];
      layout.systems.forEach(system => {
        system.staff_groups.forEach(staffGroup => {
          staffGroup.staves.forEach(staff => {
            staff.glyph_runs.forEach(run => {
              run.glyphs.forEach(glyph => {
                if (glyph.codepoint === '\uE0A4') {
                  expectedPositions.push({
                    x: glyph.position.x,
                    y: glyph.position.y,
                  });
                }
              });
            });
          });
        });
      });

      expect(expectedPositions.length).toBe(10); // Fixture has 10 noteheads

      // Extract actual positions from rendered SVG
      const glyphs = container.querySelectorAll('text');
      const noteheads = Array.from(glyphs).filter(g => 
        g.textContent === '\uE0A4'
      );

      expect(noteheads).toHaveLength(10);

      // Verify each notehead is within ±2px
      noteheads.forEach((notehead, index) => {
        const actualX = parseFloat(notehead.getAttribute('x') || '0');
        const actualY = parseFloat(notehead.getAttribute('y') || '0');
        
        const expected = expectedPositions[index];
        
        const deltaX = Math.abs(actualX - expected.x);
        const deltaY = Math.abs(actualY - expected.y);
        
        expect(deltaX).toBeLessThanOrEqual(2);
        expect(deltaY).toBeLessThanOrEqual(2);
      });
    });

    it('should position noteheads in System 0 correctly', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // System 0 noteheads from fixture:
      // { x: 100, y: 10 }, { x: 150, y: 15 }, { x: 200, y: 5 }, { x: 250, y: 10 }
      const expectedSystem0 = [
        { x: 100, y: 10 },
        { x: 150, y: 15 },
        { x: 200, y: 5 },
        { x: 250, y: 10 },
      ];

      const glyphs = container.querySelectorAll('text');
      const noteheads = Array.from(glyphs).filter(g => 
        g.textContent === '\uE0A4'
      );

      // Verify first 4 noteheads (System 0)
      expectedSystem0.forEach((expected, index) => {
        const notehead = noteheads[index];
        const actualX = parseFloat(notehead.getAttribute('x') || '0');
        const actualY = parseFloat(notehead.getAttribute('y') || '0');
        
        expect(Math.abs(actualX - expected.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(actualY - expected.y)).toBeLessThanOrEqual(2);
      });
    });

    it('should position noteheads in System 1 correctly', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // System 1 noteheads from fixture (adjusted for system y-offset of 220):
      // { x: 100, y: 15 }, { x: 150, y: 10 }, { x: 200, y: 5 }
      const expectedSystem1 = [
        { x: 100, y: 15 },
        { x: 150, y: 10 },
        { x: 200, y: 5 },
      ];

      const glyphs = container.querySelectorAll('text');
      const noteheads = Array.from(glyphs).filter(g => 
        g.textContent === '\uE0A4'
      );

      // Verify noteheads 4-6 (System 1, 0-indexed)
      expectedSystem1.forEach((expected, index) => {
        const notehead = noteheads[4 + index]; // Skip first 4 from System 0
        const actualX = parseFloat(notehead.getAttribute('x') || '0');
        const actualY = parseFloat(notehead.getAttribute('y') || '0');
        
        expect(Math.abs(actualX - expected.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(actualY - expected.y)).toBeLessThanOrEqual(2);
      });
    });

    it('should position noteheads in System 2 correctly', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // System 2 noteheads from fixture (adjusted for system y-offset of 440):
      // { x: 100, y: 10 }, { x: 150, y: 15 }, { x: 200, y: 20 }
      const expectedSystem2 = [
        { x: 100, y: 10 },
        { x: 150, y: 15 },
        { x: 200, y: 20 },
      ];

      const glyphs = container.querySelectorAll('text');
      const noteheads = Array.from(glyphs).filter(g => 
        g.textContent === '\uE0A4'
      );

      // Verify noteheads 7-9 (System 2, 0-indexed)
      expectedSystem2.forEach((expected, index) => {
        const notehead = noteheads[7 + index]; // Skip first 7 from Systems 0-1
        const actualX = parseFloat(notehead.getAttribute('x') || '0');
        const actualY = parseFloat(notehead.getAttribute('y') || '0');
        
        expect(Math.abs(actualX - expected.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(actualY - expected.y)).toBeLessThanOrEqual(2);
      });
    });
  });

  // ============================================================================
  // Task T029: Verify staff line positions match layout
  // ============================================================================

  describe('Staff Line Position Validation (T029)', () => {
    it('should render staff lines at correct y-positions', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Fixture has staff lines at y: 0, 5, 10, 15, 20 for each staff
      const lines = container.querySelectorAll('line');
      
      // Extract y-positions
      const yPositions = Array.from(lines).map(line => 
        parseFloat(line.getAttribute('y1') || '0')
      );

      // Each system has 1 staff with 5 lines
      // Expected: [0, 5, 10, 15, 20] repeated 3 times for 3 systems
      expect(yPositions.length).toBeGreaterThanOrEqual(15);

      // Verify first staff (System 0)
      const system0Lines = yPositions.slice(0, 5);
      expect(system0Lines).toEqual([0, 5, 10, 15, 20]);
    });

    it('should set staff line x-coordinates correctly', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const lines = container.querySelectorAll('line');
      
      lines.forEach(line => {
        const x1 = parseFloat(line.getAttribute('x1') || '0');
        const x2 = parseFloat(line.getAttribute('x2') || '0');
        
        // Staff lines should span from start_x to end_x
        expect(x1).toBeGreaterThanOrEqual(0);
        expect(x2).toBeLessThanOrEqual(layout.total_width);
        expect(x2).toBeGreaterThan(x1);
      });
    });

    it('should apply correct stroke color to staff lines', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const lines = container.querySelectorAll('line');
      
      lines.forEach(line => {
        const stroke = line.getAttribute('stroke');
        expect(stroke).toBe(config.staffLineColor);
      });
    });

    it('should render horizontal staff lines (y1 === y2)', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const lines = container.querySelectorAll('line');
      
      lines.forEach(line => {
        const y1 = parseFloat(line.getAttribute('y1') || '0');
        const y2 = parseFloat(line.getAttribute('y2') || '0');
        expect(y1).toBe(y2);
      });
    });
  });

  // ============================================================================
  // Task T030: Verify system boundaries match bounding boxes
  // ============================================================================

  describe('System Boundary Validation (T030)', () => {
    it('should apply correct transform to system groups', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const systemGroups = container.querySelectorAll('g[data-system-index]');
      expect(systemGroups).toHaveLength(3);

      // Verify each system has a transform attribute
      systemGroups.forEach(group => {
        const transform = group.getAttribute('transform');
        expect(transform).toBeTruthy();
        expect(transform).toMatch(/^translate\(/);
      });
    });

    it('should set correct system indices', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const systemGroups = container.querySelectorAll('g[data-system-index]');
      
      const indices = Array.from(systemGroups).map(g =>
        parseInt(g.getAttribute('data-system-index') || '-1')
      );
      
      expect(indices).toEqual([0, 1, 2]);
    });

    it('should position System 0 at y=0', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // System 0 should have transform="translate(0, 0)"
      const system0 = container.querySelector('g[data-system-index="0"]');
      expect(system0).toBeTruthy();
      
      const transform = system0?.getAttribute('transform');
      expect(transform).toMatch(/translate\(0,\s*0\)/);
    });

    it('should position System 1 at y=220', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // System 1 bounding box y_position from fixture: 220
      const system1 = container.querySelector('g[data-system-index="1"]');
      expect(system1).toBeTruthy();
      
      const transform = system1?.getAttribute('transform');
      expect(transform).toMatch(/translate\(0,\s*220\)/);
    });

    it('should position System 2 at y=440', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // System 2 bounding box y_position from fixture: 440
      const system2 = container.querySelector('g[data-system-index="2"]');
      expect(system2).toBeTruthy();
      
      const transform = system2?.getAttribute('transform');
      expect(transform).toMatch(/translate\(0,\s*440\)/);
    });

    it('should respect system bounding box dimensions', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Verify at least that systems are positioned within total layout bounds
      const systemGroups = container.querySelectorAll('g[data-system-index]');
      
      systemGroups.forEach((group, index) => {
        const expectedY = layout.systems[index].bounding_box.y_position;
        const transform = group.getAttribute('transform');
        
        // Extract y from transform="translate(x, y)"
        const match = transform?.match(/translate\(\s*[\d.]+,\s*([\d.]+)\s*\)/);
        if (match) {
          const actualY = parseFloat(match[1]);
          expect(actualY).toBe(expectedY);
        }
      });
    });
  });

  // ============================================================================
  // Additional Integration Tests
  // ============================================================================

  describe('Full Pipeline Integration', () => {
    it('should render complete layout without errors', () => {
      expect(() => {
        render(
          <LayoutRenderer layout={layout} config={config} viewport={viewport} />
        );
      }).not.toThrow();
    });

    it('should use correct viewBox for entire layout', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const svg = container.querySelector('svg');
      const viewBox = svg?.getAttribute('viewBox');
      
      // Viewport covers entire layout
      const expected = `0 0 ${layout.total_width} ${layout.total_height}`;
      expect(viewBox).toBe(expected);
    });

    it('should apply background color from config', () => {
      const { container } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      const svg = container.querySelector('svg') as SVGSVGElement;
      expect(svg?.style.backgroundColor).toBeTruthy();
    });

    it('should render with partial viewport (virtualization)', () => {
      // Only show System 1 (y: 220-420)
      const partialViewport = {
        x: 0,
        y: 220,
        width: 1200,
        height: 200,
      };

      const { container } = render(
        <LayoutRenderer 
          layout={layout} 
          config={config} 
          viewport={partialViewport} 
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();

      // ViewBox should match partial viewport
      const viewBox = svg?.getAttribute('viewBox');
      expect(viewBox).toBe('0 220 1200 200');
    });

    it('should handle viewport scrolling (dynamic viewport)', () => {
      const { container, rerender } = render(
        <LayoutRenderer layout={layout} config={config} viewport={viewport} />
      );

      // Scroll down to System 2
      const scrolledViewport = {
        x: 0,
        y: 400,
        width: 1200,
        height: 300,
      };

      rerender(
        <LayoutRenderer 
          layout={layout} 
          config={config} 
          viewport={scrolledViewport} 
        />
      );

      const svg = container.querySelector('svg');
      const viewBox = svg?.getAttribute('viewBox');
      expect(viewBox).toBe('0 400 1200 300');
    });
  });
});
