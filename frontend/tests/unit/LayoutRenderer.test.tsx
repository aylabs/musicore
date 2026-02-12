/**
 * Unit Tests for LayoutRenderer Component
 * Feature 017 - Tests for US1: Render Single Voice
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { LayoutRenderer } from '../../src/components/LayoutRenderer';
import { createDefaultConfig } from '../../src/utils/renderUtils';
import type { GlobalLayout, System, Staff, GlyphRun } from '../../src/wasm/layout';
import type { RenderConfig } from '../../src/types/RenderConfig';
import type { Viewport } from '../../src/types/Viewport';

// ============================================================================
// Task T024: Unit test for LayoutRenderer instantiation
// ============================================================================

describe('LayoutRenderer Component', () => {
  let validLayout: GlobalLayout;
  let validConfig: RenderConfig;
  let validViewport: Viewport;

  beforeEach(() => {
    validLayout = {
      systems: [],
      total_width: 1200,
      total_height: 800,
      units_per_space: 20.0,
    };

    validConfig = createDefaultConfig();

    validViewport = {
      x: 0,
      y: 0,
      width: 1200,
      height: 800,
    };
  });

  describe('Constructor and Validation (T024)', () => {
    it('should instantiate with valid config', () => {
      expect(() => {
        render(
          <LayoutRenderer
            layout={validLayout}
            config={validConfig}
            viewport={validViewport}
          />
        );
      }).not.toThrow();
    });

    it('should throw if config fontSize is invalid', () => {
      const invalidConfig = { ...validConfig, fontSize: -5 };
      
      expect(() => {
        render(
          <LayoutRenderer
            layout={validLayout}
            config={invalidConfig}
            viewport={validViewport}
          />
        );
      }).toThrow('RenderConfig.fontSize must be > 0');
    });

    it('should throw if config fontFamily is empty', () => {
      const invalidConfig = { ...validConfig, fontFamily: '' };
      
      expect(() => {
        render(
          <LayoutRenderer
            layout={validLayout}
            config={invalidConfig}
            viewport={validViewport}
          />
        );
      }).toThrow('RenderConfig.fontFamily must be non-empty');
    });

    it('should throw if viewport dimensions are invalid', () => {
      const invalidViewport = { ...validViewport, width: 0 };
      
      expect(() => {
        render(
          <LayoutRenderer
            layout={validLayout}
            config={validConfig}
            viewport={invalidViewport}
          />
        );
      }).toThrow('Viewport.width must be > 0');
    });

    it('should accept className prop', () => {
      const { container } = render(
        <LayoutRenderer
          layout={validLayout}
          config={validConfig}
          viewport={validViewport}
          className="test-class"
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.className.baseVal).toBe('test-class');
    });

    it('should render SVG element', () => {
      const { container } = render(
        <LayoutRenderer
          layout={validLayout}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.tagName).toBe('svg');
    });
  });

  describe('Error Handling (T022)', () => {
    it('should display error message when layout is null', () => {
      const { container } = render(
        <LayoutRenderer
          layout={null}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();

      const errorText = svg?.querySelector('text');
      expect(errorText).toBeTruthy();
      expect(errorText?.textContent).toBe('No layout available');
    });

    it('should set error text color to gray', () => {
      const { container } = render(
        <LayoutRenderer
          layout={null}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const errorText = container.querySelector('text');
      expect(errorText?.getAttribute('fill')).toBe('#999999');
    });

    it('should center error text', () => {
      const { container } = render(
        <LayoutRenderer
          layout={null}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const errorText = container.querySelector('text');
      expect(errorText?.getAttribute('text-anchor')).toBe('middle');
      expect(errorText?.getAttribute('x')).toBe('50%');
      expect(errorText?.getAttribute('y')).toBe('50%');
    });
  });

  // ============================================================================
  // Task T025: Unit test for renderStaff() - 5 lines at correct y-positions
  // ============================================================================

  describe('Staff Rendering (T025)', () => {
    it('should render 5 staff lines at correct y-positions', () => {
      const layoutWithStaff: GlobalLayout = {
        systems: [
          {
            index: 0,
            bounding_box: {
              x_position: 0,
              y_position: 0,
              width: 1200,
              height: 200,
            },
            staff_groups: [
              {
                instrument_id: 'test-instrument',
                staves: [
                  {
                    staff_lines: [
                      { y_position: 0, start_x: 0, end_x: 1200 },
                      { y_position: 5, start_x: 0, end_x: 1200 },
                      { y_position: 10, start_x: 0, end_x: 1200 },
                      { y_position: 15, start_x: 0, end_x: 1200 },
                      { y_position: 20, start_x: 0, end_x: 1200 },
                    ],
                    glyph_runs: [],
                    structural_glyphs: [],
                  } as Staff,
                ],
                bracket_type: 'None',
              },
            ],
            tick_range: { start_tick: 0, end_tick: 960 },
          } as System,
        ],
        total_width: 1200,
        total_height: 200,
        units_per_space: 20.0,
      };

      const { container } = render(
        <LayoutRenderer
          layout={layoutWithStaff}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const lines = container.querySelectorAll('line');
      expect(lines).toHaveLength(5);

      // Verify y-positions
      const yPositions = Array.from(lines).map(line => 
        parseFloat(line.getAttribute('y1') || '0')
      );
      expect(yPositions).toEqual([0, 5, 10, 15, 20]);
    });

    it('should set staff line stroke color from config', () => {
      const layoutWithStaff: GlobalLayout = {
        systems: [
          {
            index: 0,
            bounding_box: {
              x_position: 0,
              y_position: 0,
              width: 1200,
              height: 200,
            },
            staff_groups: [
              {
                instrument_id: 'test-instrument',
                staves: [
                  {
                    staff_lines: [
                      { y_position: 0, start_x: 0, end_x: 1200 },
                      { y_position: 5, start_x: 0, end_x: 1200 },
                      { y_position: 10, start_x: 0, end_x: 1200 },
                      { y_position: 15, start_x: 0, end_x: 1200 },
                      { y_position: 20, start_x: 0, end_x: 1200 },
                    ],
                    glyph_runs: [],
                    structural_glyphs: [],
                  } as Staff,
                ],
                bracket_type: 'None',
              },
            ],
            tick_range: { start_tick: 0, end_tick: 960 },
          } as System,
        ],
        total_width: 1200,
        total_height: 200,
        units_per_space: 20.0,
      };

      const customConfig = { ...validConfig, staffLineColor: '#FF0000' };

      const { container } = render(
        <LayoutRenderer
          layout={layoutWithStaff}
          config={customConfig}
          viewport={validViewport}
        />
      );

      const lines = container.querySelectorAll('line');
      lines.forEach(line => {
        expect(line.getAttribute('stroke')).toBe('#FF0000');
      });
    });

    it('should set staff line coordinates correctly', () => {
      const layoutWithStaff: GlobalLayout = {
        systems: [
          {
            index: 0,
            bounding_box: {
              x_position: 0,
              y_position: 0,
              width: 1200,
              height: 200,
            },
            staff_groups: [
              {
                instrument_id: 'test-instrument',
                staves: [
                  {
                    staff_lines: [
                      { y_position: 10, start_x: 50, end_x: 1150 },
                    ],
                    glyph_runs: [],
                    structural_glyphs: [],
                  } as Staff,
                ],
                bracket_type: 'None',
              },
            ],
            tick_range: { start_tick: 0, end_tick: 960 },
          } as System,
        ],
        total_width: 1200,
        total_height: 200,
        units_per_space: 20.0,
      };

      const { container } = render(
        <LayoutRenderer
          layout={layoutWithStaff}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const line = container.querySelector('line');
      expect(line?.getAttribute('x1')).toBe('50');
      expect(line?.getAttribute('y1')).toBe('10');
      expect(line?.getAttribute('x2')).toBe('1150');
      expect(line?.getAttribute('y2')).toBe('10');
    });
  });

  // ============================================================================
  // Task T026: Unit test for renderGlyphRun() - SVG <text> with x, y, codepoint
  // ============================================================================

  describe('Glyph Rendering (T026)', () => {
    it('should render glyph with correct position', () => {
      const layoutWithGlyphs: GlobalLayout = {
        systems: [
          {
            index: 0,
            bounding_box: {
              x_position: 0,
              y_position: 0,
              width: 1200,
              height: 200,
            },
            staff_groups: [
              {
                instrument_id: 'test-instrument',
                staves: [
                  {
                    staff_lines: [],
                    glyph_runs: [
                      {
                        glyphs: [
                          {
                            position: { x: 100, y: 10 },
                            bounding_box: { x_position: 95, y_position: 5, width: 10, height: 10 },
                            codepoint: '\uE0A4',
                            source_reference: {
                              instrument_id: 'test-instrument',
                              staff_index: 0,
                              voice_index: 0,
                              event_index: 0,
                            },
                          },
                        ],
                        font_family: 'Bravura',
                        font_size: 40.0,
                        color: { r: 0, g: 0, b: 0, a: 255 },
                        opacity: 1.0,
                      } as GlyphRun,
                    ],
                    structural_glyphs: [],
                  } as Staff,
                ],
                bracket_type: 'None',
              },
            ],
            tick_range: { start_tick: 0, end_tick: 960 },
          } as System,
        ],
        total_width: 1200,
        total_height: 200,
        units_per_space: 20.0,
      };

      const { container } = render(
        <LayoutRenderer
          layout={layoutWithGlyphs}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const text = container.querySelector('text');
      expect(text).toBeTruthy();
      expect(text?.getAttribute('x')).toBe('100');
      expect(text?.getAttribute('y')).toBe('10');
    });

    it('should render glyph with correct SMuFL codepoint', () => {
      const layoutWithGlyphs: GlobalLayout = {
        systems: [
          {
            index: 0,
            bounding_box: {
              x_position: 0,
              y_position: 0,
              width: 1200,
              height: 200,
            },
            staff_groups: [
              {
                instrument_id: 'test-instrument',
                staves: [
                  {
                    staff_lines: [],
                    glyph_runs: [
                      {
                        glyphs: [
                          {
                            position: { x: 100, y: 10 },
                            bounding_box: { x_position: 95, y_position: 5, width: 10, height: 10 },
                            codepoint: '\uE0A4',
                            source_reference: {
                              instrument_id: 'test-instrument',
                              staff_index: 0,
                              voice_index: 0,
                              event_index: 0,
                            },
                          },
                        ],
                        font_family: 'Bravura',
                        font_size: 40.0,
                        color: { r: 0, g: 0, b: 0, a: 255 },
                        opacity: 1.0,
                      } as GlyphRun,
                    ],
                    structural_glyphs: [],
                  } as Staff,
                ],
                bracket_type: 'None',
              },
            ],
            tick_range: { start_tick: 0, end_tick: 960 },
          } as System,
        ],
        total_width: 1200,
        total_height: 200,
        units_per_space: 20.0,
      };

      const { container } = render(
        <LayoutRenderer
          layout={layoutWithGlyphs}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const text = container.querySelector('text');
      expect(text?.textContent).toBe('\uE0A4');
    });

    it('should set font properties from config', () => {
      const layoutWithGlyphs: GlobalLayout = {
        systems: [
          {
            index: 0,
            bounding_box: {
              x_position: 0,
              y_position: 0,
              width: 1200,
              height: 200,
            },
            staff_groups: [
              {
                instrument_id: 'test-instrument',
                staves: [
                  {
                    staff_lines: [],
                    glyph_runs: [
                      {
                        glyphs: [
                          {
                            position: { x: 100, y: 10 },
                            bounding_box: { x_position: 95, y_position: 5, width: 10, height: 10 },
                            codepoint: '\uE0A4',
                            source_reference: {
                              instrument_id: 'test-instrument',
                              staff_index: 0,
                              voice_index: 0,
                              event_index: 0,
                            },
                          },
                        ],
                        font_family: 'Bravura',
                        font_size: 40.0,
                        color: { r: 0, g: 0, b: 0, a: 255 },
                        opacity: 1.0,
                      } as GlyphRun,
                    ],
                    structural_glyphs: [],
                  } as Staff,
                ],
                bracket_type: 'None',
              },
            ],
            tick_range: { start_tick: 0, end_tick: 960 },
          } as System,
        ],
        total_width: 1200,
        total_height: 200,
        units_per_space: 20.0,
      };

      const customConfig = {
        ...validConfig,
        fontSize: 24,
        fontFamily: 'Petaluma',
        glyphColor: '#0000FF',
      };

      const { container } = render(
        <LayoutRenderer
          layout={layoutWithGlyphs}
          config={customConfig}
          viewport={validViewport}
        />
      );

      const text = container.querySelector('text');
      expect(text?.getAttribute('font-size')).toBe('24');
      expect(text?.getAttribute('font-family')).toBe('Petaluma');
      expect(text?.getAttribute('fill')).toBe('#0000FF');
    });

    it('should render multiple glyphs in a run', () => {
      const layoutWithGlyphs: GlobalLayout = {
        systems: [
          {
            index: 0,
            bounding_box: {
              x_position: 0,
              y_position: 0,
              width: 1200,
              height: 200,
            },
            staff_groups: [
              {
                instrument_id: 'test-instrument',
                staves: [
                  {
                    staff_lines: [],
                    glyph_runs: [
                      {
                        glyphs: [
                          {
                            position: { x: 100, y: 10 },
                            bounding_box: { x_position: 95, y_position: 5, width: 10, height: 10 },
                            codepoint: '\uE0A4',
                            source_reference: {
                              instrument_id: 'test-instrument',
                              staff_index: 0,
                              voice_index: 0,
                              event_index: 0,
                            },
                          },
                          {
                            position: { x: 150, y: 15 },
                            bounding_box: { x_position: 145, y_position: 10, width: 10, height: 10 },
                            codepoint: '\uE0A4',
                            source_reference: {
                              instrument_id: 'test-instrument',
                              staff_index: 0,
                              voice_index: 0,
                              event_index: 1,
                            },
                          },
                          {
                            position: { x: 200, y: 5 },
                            bounding_box: { x_position: 195, y_position: 0, width: 10, height: 10 },
                            codepoint: '\uE0A4',
                            source_reference: {
                              instrument_id: 'test-instrument',
                              staff_index: 0,
                              voice_index: 0,
                              event_index: 2,
                            },
                          },
                        ],
                        font_family: 'Bravura',
                        font_size: 40.0,
                        color: { r: 0, g: 0, b: 0, a: 255 },
                        opacity: 1.0,
                      } as GlyphRun,
                    ],
                    structural_glyphs: [],
                  } as Staff,
                ],
                bracket_type: 'None',
              },
            ],
            tick_range: { start_tick: 0, end_tick: 960 },
          } as System,
        ],
        total_width: 1200,
        total_height: 200,
        units_per_space: 20.0,
      };

      const { container } = render(
        <LayoutRenderer
          layout={layoutWithGlyphs}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const texts = container.querySelectorAll('text');
      expect(texts).toHaveLength(3);

      // Verify positions
      const positions = Array.from(texts).map(text => ({
        x: parseFloat(text.getAttribute('x') || '0'),
        y: parseFloat(text.getAttribute('y') || '0'),
      }));
      expect(positions).toEqual([
        { x: 100, y: 10 },
        { x: 150, y: 15 },
        { x: 200, y: 5 },
      ]);
    });
  });

  describe('ViewBox Configuration (T021)', () => {
    it('should set viewBox to match viewport', () => {
      const { container } = render(
        <LayoutRenderer
          layout={validLayout}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 1200 800');
    });

    it('should update viewBox when viewport changes', () => {
      const { container, rerender } = render(
        <LayoutRenderer
          layout={validLayout}
          config={validConfig}
          viewport={validViewport}
        />
      );

      // Change viewport (scrolled down)
      const newViewport = { ...validViewport, y: 500 };
      rerender(
        <LayoutRenderer
          layout={validLayout}
          config={validConfig}
          viewport={newViewport}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 500 1200 800');
    });
  });

  describe('Background Color (T021)', () => {
    it('should set background color from config', () => {
      const { container } = render(
        <LayoutRenderer
          layout={validLayout}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const svg = container.querySelector('svg') as SVGSVGElement;
      expect(svg?.style.backgroundColor).toBe('rgb(255, 255, 255)');
    });

    it('should update background color when config changes', () => {
      const { container, rerender } = render(
        <LayoutRenderer
          layout={validLayout}
          config={validConfig}
          viewport={validViewport}
        />
      );

      const darkConfig = { ...validConfig, backgroundColor: '#1E1E1E' };
      rerender(
        <LayoutRenderer
          layout={validLayout}
          config={darkConfig}
          viewport={validViewport}
        />
      );

      const svg = container.querySelector('svg') as SVGSVGElement;
      expect(svg?.style.backgroundColor).toBe('rgb(30, 30, 30)');
    });
  });
});
