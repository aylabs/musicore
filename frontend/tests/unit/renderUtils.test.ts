/**
 * Unit Tests for Rendering Utilities
 * Feature 017 - Tests for RenderConfig, Viewport, and virtualization
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDefaultConfig,
  createDarkModeConfig,
  validateRenderConfig,
  createViewportFromSVG,
  intersectsViewport,
  getViewportArea,
  validateViewport,
  getVisibleSystems,
  svgNS,
  createSVGElement,
  createSVGGroup,
} from '../../src/utils/renderUtils';
import type { RenderConfig } from '../../src/types/RenderConfig';
import type { Viewport } from '../../src/types/Viewport';
import type { System, BoundingBox } from '../../src/wasm/layout';

// ============================================================================
// Task T011: Unit tests for RenderConfig validation
// ============================================================================

describe('RenderConfig Factories', () => {
  describe('createDefaultConfig', () => {
    it('should create config with standard values', () => {
      const config = createDefaultConfig();

      expect(config).toEqual({
        fontSize: 20,
        fontFamily: 'Bravura',
        backgroundColor: '#FFFFFF',
        staffLineColor: '#000000',
        glyphColor: '#000000',
      });
    });

    it('should pass validation', () => {
      const config = createDefaultConfig();
      expect(() => validateRenderConfig(config)).not.toThrow();
    });
  });

  describe('createDarkModeConfig', () => {
    it('should create dark mode config with default fontSize', () => {
      const config = createDarkModeConfig();

      expect(config).toEqual({
        fontSize: 20,
        fontFamily: 'Bravura',
        backgroundColor: '#1E1E1E',
        staffLineColor: '#CCCCCC',
        glyphColor: '#FFFFFF',
      });
    });

    it('should create dark mode config with custom fontSize', () => {
      const config = createDarkModeConfig(24);

      expect(config.fontSize).toBe(24);
      expect(config.backgroundColor).toBe('#1E1E1E');
    });

    it('should pass validation', () => {
      const config = createDarkModeConfig();
      expect(() => validateRenderConfig(config)).not.toThrow();
    });
  });

  describe('validateRenderConfig', () => {
    it('should accept valid config', () => {
      const validConfig: RenderConfig = {
        fontSize: 20,
        fontFamily: 'Bravura',
        backgroundColor: '#FFFFFF',
        staffLineColor: '#000000',
        glyphColor: '#000000',
      };

      expect(() => validateRenderConfig(validConfig)).not.toThrow();
    });

    it('should throw if fontSize is zero', () => {
      const invalidConfig: RenderConfig = {
        fontSize: 0,
        fontFamily: 'Bravura',
        backgroundColor: '#FFFFFF',
        staffLineColor: '#000000',
        glyphColor: '#000000',
      };

      expect(() => validateRenderConfig(invalidConfig)).toThrow(
        'RenderConfig.fontSize must be > 0'
      );
    });

    it('should throw if fontSize is negative', () => {
      const invalidConfig: RenderConfig = {
        fontSize: -5,
        fontFamily: 'Bravura',
        backgroundColor: '#FFFFFF',
        staffLineColor: '#000000',
        glyphColor: '#000000',
      };

      expect(() => validateRenderConfig(invalidConfig)).toThrow(
        'RenderConfig.fontSize must be > 0'
      );
    });

    it('should throw if fontFamily is empty', () => {
      const invalidConfig: RenderConfig = {
        fontSize: 20,
        fontFamily: '',
        backgroundColor: '#FFFFFF',
        staffLineColor: '#000000',
        glyphColor: '#000000',
      };

      expect(() => validateRenderConfig(invalidConfig)).toThrow(
        'RenderConfig.fontFamily must be non-empty'
      );
    });

    it('should throw if fontFamily is whitespace only', () => {
      const invalidConfig: RenderConfig = {
        fontSize: 20,
        fontFamily: '   ',
        backgroundColor: '#FFFFFF',
        staffLineColor: '#000000',
        glyphColor: '#000000',
      };

      expect(() => validateRenderConfig(invalidConfig)).toThrow(
        'RenderConfig.fontFamily must be non-empty'
      );
    });

    it('should throw if backgroundColor is invalid', () => {
      const invalidConfig: RenderConfig = {
        fontSize: 20,
        fontFamily: 'Bravura',
        backgroundColor: 'not-a-color',
        staffLineColor: '#000000',
        glyphColor: '#000000',
      };

      expect(() => validateRenderConfig(invalidConfig)).toThrow(
        'RenderConfig.backgroundColor must be valid CSS color'
      );
    });

    it('should throw if staffLineColor is invalid', () => {
      const invalidConfig: RenderConfig = {
        fontSize: 20,
        fontFamily: 'Bravura',
        backgroundColor: '#FFFFFF',
        staffLineColor: 'invalid',
        glyphColor: '#000000',
      };

      expect(() => validateRenderConfig(invalidConfig)).toThrow(
        'RenderConfig.staffLineColor must be valid CSS color'
      );
    });

    it('should throw if glyphColor is invalid', () => {
      const invalidConfig: RenderConfig = {
        fontSize: 20,
        fontFamily: 'Bravura',
        backgroundColor: '#FFFFFF',
        staffLineColor: '#000000',
        glyphColor: '#GGGGGG',
      };

      expect(() => validateRenderConfig(invalidConfig)).toThrow(
        'RenderConfig.glyphColor must be valid CSS color'
      );
    });

    it('should accept named colors', () => {
      const config: RenderConfig = {
        fontSize: 20,
        fontFamily: 'Bravura',
        backgroundColor: 'white',
        staffLineColor: 'black',
        glyphColor: 'red',
      };

      expect(() => validateRenderConfig(config)).not.toThrow();
    });

    it('should accept rgb() colors', () => {
      const config: RenderConfig = {
        fontSize: 20,
        fontFamily: 'Bravura',
        backgroundColor: 'rgb(255, 255, 255)',
        staffLineColor: 'rgb(0, 0, 0)',
        glyphColor: 'rgb(255, 0, 0)',
      };

      expect(() => validateRenderConfig(config)).not.toThrow();
    });

    it('should accept rgba() colors', () => {
      const config: RenderConfig = {
        fontSize: 20,
        fontFamily: 'Bravura',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        staffLineColor: 'rgba(0, 0, 0, 1)',
        glyphColor: 'rgba(255, 0, 0, 0.8)',
      };

      expect(() => validateRenderConfig(config)).not.toThrow();
    });
  });
});

// ============================================================================
// Task T013: Unit tests for Viewport utilities
// ============================================================================

describe('Viewport Utilities', () => {
  describe('createViewportFromSVG', () => {
    let svg: SVGSVGElement;

    beforeEach(() => {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 800 600');
    });

    it('should create viewport from SVG viewBox', () => {
      const viewport = createViewportFromSVG(svg);

      expect(viewport).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });
    });

    it('should apply scrollY to viewport y position', () => {
      const viewport = createViewportFromSVG(svg, 500);

      expect(viewport).toEqual({
        x: 0,
        y: 500,
        width: 800,
        height: 600,
      });
    });

    it('should default scrollY to 0', () => {
      const viewport = createViewportFromSVG(svg);
      expect(viewport.y).toBe(0);
    });
  });

  describe('intersectsViewport', () => {
    const viewport: Viewport = { x: 0, y: 500, width: 800, height: 600 };

    it('should return true for system within viewport', () => {
      // System at y=500-700, viewport is y=500-1100
      const result = intersectsViewport(500, 200, viewport);
      expect(result).toBe(true);
    });

    it('should return true for system partially above viewport', () => {
      // System at y=400-600, viewport starts at y=500
      const result = intersectsViewport(400, 200, viewport);
      expect(result).toBe(true);
    });

    it('should return true for system partially below viewport', () => {
      // System at y=1000-1200, viewport ends at y=1100
      const result = intersectsViewport(1000, 200, viewport);
      expect(result).toBe(true);
    });

    it('should return false for system above viewport', () => {
      // System at y=0-200, viewport starts at y=500
      const result = intersectsViewport(0, 200, viewport);
      expect(result).toBe(false);
    });

    it('should return false for system below viewport', () => {
      // System at y=1200-1400, viewport ends at y=1100
      const result = intersectsViewport(1200, 200, viewport);
      expect(result).toBe(false);
    });

    it('should return true for system that exactly matches viewport top', () => {
      // System top at viewport top (y=500)
      const result = intersectsViewport(500, 200, viewport);
      expect(result).toBe(true);
    });

    it('should return true for system that exactly matches viewport bottom', () => {
      // System bottom at viewport bottom (y=1100)
      const result = intersectsViewport(900, 200, viewport);
      expect(result).toBe(true);
    });
  });

  describe('getViewportArea', () => {
    it('should calculate area correctly', () => {
      const viewport: Viewport = { x: 0, y: 0, width: 800, height: 600 };
      const area = getViewportArea(viewport);
      expect(area).toBe(480000);
    });

    it('should work with different dimensions', () => {
      const viewport: Viewport = { x: 0, y: 0, width: 1024, height: 768 };
      const area = getViewportArea(viewport);
      expect(area).toBe(786432);
    });
  });

  describe('validateViewport', () => {
    it('should accept valid viewport', () => {
      const viewport: Viewport = { x: 0, y: 0, width: 800, height: 600 };
      expect(() => validateViewport(viewport)).not.toThrow();
    });

    it('should accept viewport with y > 0 (scrolled)', () => {
      const viewport: Viewport = { x: 0, y: 500, width: 800, height: 600 };
      expect(() => validateViewport(viewport)).not.toThrow();
    });

    it('should throw if x is negative', () => {
      const viewport: Viewport = { x: -10, y: 0, width: 800, height: 600 };
      expect(() => validateViewport(viewport)).toThrow(
        'Viewport.x must be >= 0'
      );
    });

    it('should throw if y is negative', () => {
      const viewport: Viewport = { x: 0, y: -10, width: 800, height: 600 };
      expect(() => validateViewport(viewport)).toThrow(
        'Viewport.y must be >= 0'
      );
    });

    it('should throw if width is zero', () => {
      const viewport: Viewport = { x: 0, y: 0, width: 0, height: 600 };
      expect(() => validateViewport(viewport)).toThrow(
        'Viewport.width must be > 0'
      );
    });

    it('should throw if width is negative', () => {
      const viewport: Viewport = { x: 0, y: 0, width: -800, height: 600 };
      expect(() => validateViewport(viewport)).toThrow(
        'Viewport.width must be > 0'
      );
    });

    it('should throw if height is zero', () => {
      const viewport: Viewport = { x: 0, y: 0, width: 800, height: 0 };
      expect(() => validateViewport(viewport)).toThrow(
        'Viewport.height must be > 0'
      );
    });

    it('should throw if height is negative', () => {
      const viewport: Viewport = { x: 0, y: 0, width: 800, height: -600 };
      expect(() => validateViewport(viewport)).toThrow(
        'Viewport.height must be > 0'
      );
    });
  });
});

// ============================================================================
// Task T012: Unit tests for getVisibleSystems
// ============================================================================

describe('System Virtualization', () => {
  describe('getVisibleSystems', () => {
    // Helper to create a mock system at given y position and height
    function createMockSystem(index: number, y: number, height: number): System {
      return {
        index,
        bounding_box: {
          x_position: 0,
          y_position: y,
          width: 800,
          height,
        } as BoundingBox,
        staff_groups: [],
        tick_range: { start_tick: 0, end_tick: 960 },
      } as System;
    }

    it('should return empty array for empty systems', () => {
      const viewport: Viewport = { x: 0, y: 0, width: 800, height: 600 };
      const result = getVisibleSystems([], viewport);
      expect(result).toEqual([]);
    });

    it('should return all systems when all are visible', () => {
      const systems: System[] = [
        createMockSystem(0, 0, 200),
        createMockSystem(1, 220, 200),
        createMockSystem(2, 440, 200),
      ];
      const viewport: Viewport = { x: 0, y: 0, width: 800, height: 700 };

      const result = getVisibleSystems(systems, viewport);
      expect(result).toHaveLength(3);
      expect(result.map(s => s.index)).toEqual([0, 1, 2]);
    });

    it('should return subset of systems intersecting viewport', () => {
      const systems: System[] = [
        createMockSystem(0, 0, 200),      // Above viewport
        createMockSystem(1, 220, 200),    // Above viewport
        createMockSystem(2, 440, 200),    // Visible (partially)
        createMockSystem(3, 660, 200),    // Visible (fully)
        createMockSystem(4, 880, 200),    // Visible (partially)
        createMockSystem(5, 1100, 200),   // Below viewport
      ];
      const viewport: Viewport = { x: 0, y: 500, width: 800, height: 600 };

      const result = getVisibleSystems(systems, viewport);
      expect(result).toHaveLength(3);
      expect(result.map(s => s.index)).toEqual([2, 3, 4]);
    });

    it('should return empty array when all systems are above viewport', () => {
      const systems: System[] = [
        createMockSystem(0, 0, 200),
        createMockSystem(1, 220, 200),
      ];
      const viewport: Viewport = { x: 0, y: 500, width: 800, height: 600 };

      const result = getVisibleSystems(systems, viewport);
      expect(result).toEqual([]);
    });

    it('should return empty array when all systems are below viewport', () => {
      const systems: System[] = [
        createMockSystem(0, 1200, 200),
        createMockSystem(1, 1420, 200),
      ];
      const viewport: Viewport = { x: 0, y: 500, width: 800, height: 600 };

      const result = getVisibleSystems(systems, viewport);
      expect(result).toEqual([]);
    });

    it('should handle single system', () => {
      const systems: System[] = [createMockSystem(0, 500, 200)];
      const viewport: Viewport = { x: 0, y: 500, width: 800, height: 600 };

      const result = getVisibleSystems(systems, viewport);
      expect(result).toHaveLength(1);
      expect(result[0].index).toBe(0);
    });

    it('should handle large number of systems efficiently', () => {
      // Create 200 systems
      const systems: System[] = [];
      for (let i = 0; i < 200; i++) {
        systems.push(createMockSystem(i, i * 220, 200));
      }

      const viewport: Viewport = { x: 0, y: 10000, width: 800, height: 600 };

      const startTime = performance.now();
      const result = getVisibleSystems(systems, viewport);
      const endTime = performance.now();

      // Should complete in <1ms (task requirement)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1);

      // Should return systems around y=10000
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(s => {
        const y = s.bounding_box.y;
        const height = s.bounding_box.height;
        return intersectsViewport(y, height, viewport);
      })).toBe(true);
    });

    it('should use binary search (O(log n) complexity)', () => {
      // Create 1000 systems to test performance
      const systems: System[] = [];
      for (let i = 0; i < 1000; i++) {
        systems.push(createMockSystem(i, i * 220, 200));
      }

      const viewport: Viewport = { x: 0, y: 100000, width: 800, height: 600 };

      const startTime = performance.now();
      getVisibleSystems(systems, viewport);
      const endTime = performance.now();

      // With O(log n) binary search, should still complete in <1ms
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1);
    });
  });
});

// ============================================================================
// SVG Helper Functions Tests
// ============================================================================

describe('SVG Helpers', () => {
  describe('svgNS', () => {
    it('should export correct SVG namespace', () => {
      expect(svgNS).toBe('http://www.w3.org/2000/svg');
    });
  });

  describe('createSVGElement', () => {
    it('should create line element', () => {
      const line = createSVGElement('line');
      expect(line.tagName).toBe('line');
      expect(line.namespaceURI).toBe(svgNS);
    });

    it('should create text element', () => {
      const text = createSVGElement('text');
      expect(text.tagName).toBe('text');
      expect(text.namespaceURI).toBe(svgNS);
    });

    it('should create g element', () => {
      const g = createSVGElement('g');
      expect(g.tagName).toBe('g');
      expect(g.namespaceURI).toBe(svgNS);
    });
  });

  describe('createSVGGroup', () => {
    it('should create SVG g element', () => {
      const group = createSVGGroup();
      expect(group.tagName).toBe('g');
      expect(group.namespaceURI).toBe(svgNS);
    });

    it('should create element that accepts children', () => {
      const group = createSVGGroup();
      const line = createSVGElement('line');
      group.appendChild(line);
      expect(group.children).toHaveLength(1);
    });
  });
});
