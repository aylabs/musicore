/**
 * Unit tests for layout utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  containsPoint,
  intersects,
  getVisibleSystems,
  findGlyphAtPosition,
  findSystemAtTick,
  logicalToPixels,
  pixelsToLogical,
  containsTickRange,
  tickRangeDuration,
  formatTickRangeDuration,
  countGlyphs,
  countGlyphRuns,
  calculateBatchingEfficiency,
} from '../../src/utils/layoutUtils';
import type {
  BoundingBox,
  Point,
  GlobalLayout,
  System,
  Glyph,
  TickRange,
} from '../../src/wasm/layout';

describe('layoutUtils - Hit Testing', () => {
  describe('containsPoint', () => {
    const box: BoundingBox = { x: 10, y: 20, width: 100, height: 50 };

    it('should return true for point inside box', () => {
      expect(containsPoint(box, { x: 50, y: 40 })).toBe(true);
    });

    it('should return true for point on box boundary', () => {
      expect(containsPoint(box, { x: 10, y: 20 })).toBe(true);
      expect(containsPoint(box, { x: 110, y: 70 })).toBe(true);
    });

    it('should return false for point outside box', () => {
      expect(containsPoint(box, { x: 5, y: 40 })).toBe(false);
      expect(containsPoint(box, { x: 50, y: 15 })).toBe(false);
      expect(containsPoint(box, { x: 115, y: 40 })).toBe(false);
      expect(containsPoint(box, { x: 50, y: 75 })).toBe(false);
    });
  });

  describe('intersects', () => {
    const box1: BoundingBox = { x: 10, y: 10, width: 100, height: 100 };

    it('should return true for overlapping boxes', () => {
      const box2: BoundingBox = { x: 50, y: 50, width: 100, height: 100 };
      expect(intersects(box1, box2)).toBe(true);
    });

    it('should return true for fully contained box', () => {
      const box2: BoundingBox = { x: 20, y: 20, width: 50, height: 50 };
      expect(intersects(box1, box2)).toBe(true);
    });

    it('should return false for boxes just touching at edge', () => {
      const box2: BoundingBox = { x: 111, y: 10, width: 100, height: 100 };
      expect(intersects(box1, box2)).toBe(false); // Gap of 1 unit = no overlap
    });

    it('should return false for non-overlapping boxes', () => {
      const box2: BoundingBox = { x: 150, y: 150, width: 100, height: 100 };
      expect(intersects(box1, box2)).toBe(false);
    });

    it('should return true for box above', () => {
      const box2: BoundingBox = { x: 10, y: 0, width: 100, height: 50 };
      expect(intersects(box1, box2)).toBe(true);
    });
  });
});

describe('layoutUtils - System Queries', () => {
  const createTestLayout = (): GlobalLayout => ({
    systems: [
      {
        index: 0,
        bounding_box: { x: 0, y: 0, width: 800, height: 200 },
        staff_groups: [],
        tick_range: { start_tick: 0, end_tick: 7680 },
      },
      {
        index: 1,
        bounding_box: { x: 0, y: 350, width: 800, height: 200 },
        staff_groups: [],
        tick_range: { start_tick: 7680, end_tick: 15360 },
      },
      {
        index: 2,
        bounding_box: { x: 0, y: 700, width: 800, height: 200 },
        staff_groups: [],
        tick_range: { start_tick: 15360, end_tick: 23040 },
      },
    ],
    total_width: 800,
    total_height: 1050,
    units_per_space: 10,
  });

  describe('getVisibleSystems', () => {
    it('should return all systems when viewport covers entire layout', () => {
      const layout = createTestLayout();
      const viewport: BoundingBox = { x: 0, y: 0, width: 800, height: 1050 };
      const visible = getVisibleSystems(layout, viewport);
      expect(visible).toHaveLength(3);
    });

    it('should return only first system when viewport at top', () => {
      const layout = createTestLayout();
      const viewport: BoundingBox = { x: 0, y: 0, width: 800, height: 250 };
      const visible = getVisibleSystems(layout, viewport);
      expect(visible).toHaveLength(1);
      expect(visible[0].index).toBe(0);
    });

    it('should return middle system when viewport scrolled', () => {
      const layout = createTestLayout();
      const viewport: BoundingBox = { x: 0, y: 300, width: 800, height: 300 };
      const visible = getVisibleSystems(layout, viewport);
      expect(visible).toHaveLength(1);
      expect(visible[0].index).toBe(1);
      // System 1: y=350-550 overlaps viewport y=300-600
      // System 2: y=700-900 doesn't overlap (starts after viewport ends)
    });

    it('should return empty array when viewport outside layout', () => {
      const layout = createTestLayout();
      const viewport: BoundingBox = { x: 0, y: 2000, width: 800, height: 200 };
      const visible = getVisibleSystems(layout, viewport);
      expect(visible).toHaveLength(0);
    });
  });

  describe('findSystemAtTick', () => {
    it('should find first system for tick in first range', () => {
      const layout = createTestLayout();
      const system = findSystemAtTick(layout, 3840);
      expect(system).toBeDefined();
      expect(system!.index).toBe(0);
    });

    it('should find middle system for tick in middle range', () => {
      const layout = createTestLayout();
      const system = findSystemAtTick(layout, 10000);
      expect(system).toBeDefined();
      expect(system!.index).toBe(1);
    });

    it('should find last system for tick in last range', () => {
      const layout = createTestLayout();
      const system = findSystemAtTick(layout, 20000);
      expect(system).toBeDefined();
      expect(system!.index).toBe(2);
    });

    it('should return undefined for tick before first system', () => {
      const layout = createTestLayout();
      const system = findSystemAtTick(layout, -100);
      expect(system).toBeUndefined();
    });

    it('should return undefined for tick after last system', () => {
      const layout = createTestLayout();
      const system = findSystemAtTick(layout, 30000);
      expect(system).toBeUndefined();
    });

    it('should handle tick at exact system boundary', () => {
      const layout = createTestLayout();
      const system = findSystemAtTick(layout, 7680);
      expect(system).toBeDefined();
      expect(system!.index).toBe(1); // Should be in second system (start_tick is inclusive)
    });
  });

  describe('findGlyphAtPosition', () => {
    const createLayoutWithGlyphs = (): GlobalLayout => ({
      systems: [
        {
          index: 0,
          bounding_box: { x: 0, y: 0, width: 800, height: 200 },
          staff_groups: [
            {
              instrument_id: 'piano',
              staves: [
                {
                  staff_lines: [],
                  structural_glyphs: [],
                  glyph_runs: [
                    {
                      glyphs: [
                        {
                          position: { x: 100, y: 50 },
                          bounding_box: { x: 95, y: 45, width: 10, height: 10 },
                          codepoint: '\u{E0A4}',
                          source_reference: {
                            instrument_id: 'piano',
                            staff_index: 0,
                            voice_index: 0,
                            event_index: 0,
                          },
                        },
                        {
                          position: { x: 200, y: 60 },
                          bounding_box: { x: 195, y: 55, width: 10, height: 10 },
                          codepoint: '\u{E0A4}',
                          source_reference: {
                            instrument_id: 'piano',
                            staff_index: 0,
                            voice_index: 0,
                            event_index: 1,
                          },
                        },
                      ],
                      font_family: 'Bravura',
                      font_size: 40,
                      color: { r: 0, g: 0, b: 0, a: 255 },
                      opacity: 1.0,
                    },
                  ],
                },
              ],
              bracket_type: 'None',
            },
          ],
          tick_range: { start_tick: 0, end_tick: 7680 },
        },
      ],
      total_width: 800,
      total_height: 200,
      units_per_space: 10,
    });

    it('should find glyph at exact position', () => {
      const layout = createLayoutWithGlyphs();
      const glyph = findGlyphAtPosition(layout, { x: 100, y: 50 });
      expect(glyph).toBeDefined();
      expect(glyph!.source_reference.event_index).toBe(0);
    });

    it('should find glyph within bounding box', () => {
      const layout = createLayoutWithGlyphs();
      const glyph = findGlyphAtPosition(layout, { x: 98, y: 48 });
      expect(glyph).toBeDefined();
      expect(glyph!.source_reference.event_index).toBe(0);
    });

    it('should return undefined when no glyph at position', () => {
      const layout = createLayoutWithGlyphs();
      const glyph = findGlyphAtPosition(layout, { x: 50, y: 50 });
      expect(glyph).toBeUndefined();
    });

    it('should find second glyph when clicking on it', () => {
      const layout = createLayoutWithGlyphs();
      const glyph = findGlyphAtPosition(layout, { x: 200, y: 60 });
      expect(glyph).toBeDefined();
      expect(glyph!.source_reference.event_index).toBe(1);
    });
  });
});

describe('layoutUtils - Coordinate Conversion', () => {
  describe('logicalToPixels', () => {
    it('should convert logical units to pixels with default scale', () => {
      const result = logicalToPixels(100, 10, 12);
      expect(result).toBe(120); // 100 * 12 / 10 = 120
    });

    it('should handle zero logical units', () => {
      const result = logicalToPixels(0, 10, 12);
      expect(result).toBe(0);
    });

    it('should handle different zoom levels', () => {
      expect(logicalToPixels(100, 10, 8)).toBe(80); // Zoom out
      expect(logicalToPixels(100, 10, 16)).toBe(160); // Zoom in
    });

    it('should handle fractional results', () => {
      const result = logicalToPixels(50, 10, 12);
      expect(result).toBeCloseTo(60, 2);
    });
  });

  describe('pixelsToLogical', () => {
    it('should convert pixels to logical units with default scale', () => {
      const result = pixelsToLogical(120, 10, 12);
      expect(result).toBeCloseTo(100, 2); // 120 * 10 / 12 = 100
    });

    it('should handle zero pixels', () => {
      const result = pixelsToLogical(0, 10, 12);
      expect(result).toBe(0);
    });

    it('should be inverse of logicalToPixels', () => {
      const original = 150;
      const pixels = logicalToPixels(original, 10, 12);
      const backToLogical = pixelsToLogical(pixels, 10, 12);
      expect(backToLogical).toBeCloseTo(original, 2);
    });
  });
});

describe('layoutUtils - Tick Range Operations', () => {
  describe('containsTickRange', () => {
    const outer: TickRange = { start_tick: 0, end_tick: 10000 };

    it('should return true when inner is fully contained', () => {
      const inner: TickRange = { start_tick: 1000, end_tick: 5000 };
      expect(containsTickRange(outer, inner)).toBe(true);
    });

    it('should return true when ranges are identical', () => {
      const inner: TickRange = { start_tick: 0, end_tick: 10000 };
      expect(containsTickRange(outer, inner)).toBe(true);
    });

    it('should return false when inner extends beyond outer', () => {
      const inner: TickRange = { start_tick: 5000, end_tick: 15000 };
      expect(containsTickRange(outer, inner)).toBe(false);
    });

    it('should return false when inner starts before outer', () => {
      const inner: TickRange = { start_tick: -1000, end_tick: 5000 };
      expect(containsTickRange(outer, inner)).toBe(false);
    });
  });

  describe('tickRangeDuration', () => {
    it('should calculate duration correctly', () => {
      const range: TickRange = { start_tick: 0, end_tick: 3840 };
      expect(tickRangeDuration(range)).toBe(3840);
    });

    it('should handle zero duration', () => {
      const range: TickRange = { start_tick: 1000, end_tick: 1000 };
      expect(tickRangeDuration(range)).toBe(0);
    });
  });

  describe('formatTickRangeDuration', () => {
    it('should format single beat', () => {
      const range: TickRange = { start_tick: 0, end_tick: 960 };
      expect(formatTickRangeDuration(range)).toBe('1 beat');
    });

    it('should format multiple beats', () => {
      const range: TickRange = { start_tick: 0, end_tick: 1920 };
      expect(formatTickRangeDuration(range)).toBe('2 beats');
    });

    it('should format single measure (4/4)', () => {
      const range: TickRange = { start_tick: 0, end_tick: 3840 };
      expect(formatTickRangeDuration(range)).toBe('1 measure');
    });

    it('should format multiple measures', () => {
      const range: TickRange = { start_tick: 0, end_tick: 7680 };
      expect(formatTickRangeDuration(range)).toBe('2 measures');
    });

    it('should format partial measure as beats', () => {
      const range: TickRange = { start_tick: 0, end_tick: 2880 };
      expect(formatTickRangeDuration(range)).toBe('3 beats');
    });
  });
});

describe('layoutUtils - Statistics', () => {
  const createTestLayoutForStats = (): GlobalLayout => ({
    systems: [
      {
        index: 0,
        bounding_box: { x: 0, y: 0, width: 800, height: 200 },
        staff_groups: [
          {
            instrument_id: 'piano',
            staves: [
              {
                staff_lines: [],
                structural_glyphs: [
                  {
                    position: { x: 10, y: 50 },
                    bounding_box: { x: 5, y: 45, width: 10, height: 20 },
                    codepoint: '\u{E050}', // Clef
                    source_reference: {
                      instrument_id: 'piano',
                      staff_index: 0,
                      voice_index: 0,
                      event_index: 0,
                    },
                  },
                ],
                glyph_runs: [
                  {
                    glyphs: [
                      {
                        position: { x: 100, y: 50 },
                        bounding_box: { x: 95, y: 45, width: 10, height: 10 },
                        codepoint: '\u{E0A4}',
                        source_reference: {
                          instrument_id: 'piano',
                          staff_index: 0,
                          voice_index: 0,
                          event_index: 0,
                        },
                      },
                      {
                        position: { x: 200, y: 60 },
                        bounding_box: { x: 195, y: 55, width: 10, height: 10 },
                        codepoint: '\u{E0A4}',
                        source_reference: {
                          instrument_id: 'piano',
                          staff_index: 0,
                          voice_index: 0,
event_index: 1,
                        },
                      },
                    ],
                    font_family: 'Bravura',
                    font_size: 40,
                    color: { r: 0, g: 0, b: 0, a: 255 },
                    opacity: 1.0,
                  },
                  {
                    glyphs: [
                      {
                        position: { x: 300, y: 70 },
                        bounding_box: { x: 295, y: 65, width: 10, height: 10 },
                        codepoint: '\u{E262}', // Sharp
                        source_reference: {
                          instrument_id: 'piano',
                          staff_index: 0,
                          voice_index: 0,
                          event_index: 2,
                        },
                      },
                    ],
                    font_family: 'Bravura',
                    font_size: 40,
                    color: { r: 0, g: 0, b: 0, a: 255 },
                    opacity: 1.0,
                  },
                ],
              },
            ],
            bracket_type: 'None',
          },
        ],
        tick_range: { start_tick: 0, end_tick: 7680 },
      },
    ],
    total_width: 800,
    total_height: 200,
    units_per_space: 10,
  });

  describe('countGlyphs', () => {
    it('should count all glyphs including structural', () => {
      const layout = createTestLayoutForStats();
      const count = countGlyphs(layout);
      expect(count).toBe(4); // 1 structural + 2 in first run + 1 in second run
    });

    it('should return 0 for empty layout', () => {
      const layout: GlobalLayout = {
        systems: [],
        total_width: 0,
        total_height: 0,
        units_per_space: 10,
      };
      expect(countGlyphs(layout)).toBe(0);
    });
  });

  describe('countGlyphRuns', () => {
    it('should count all glyph runs', () => {
      const layout = createTestLayoutForStats();
      const count = countGlyphRuns(layout);
      expect(count).toBe(2);
    });

    it('should return 0 for empty layout', () => {
      const layout: GlobalLayout = {
        systems: [],
        total_width: 0,
        total_height: 0,
        units_per_space: 10,
      };
      expect(countGlyphRuns(layout)).toBe(0);
    });
  });

  describe('calculateBatchingEfficiency', () => {
    it('should calculate efficiency ratio correctly', () => {
      const layout = createTestLayoutForStats();
      const efficiency = calculateBatchingEfficiency(layout);
      // 4 glyphs / 2 runs = 2.0 glyphs per run
      expect(efficiency).toBeCloseTo(2.0, 2);
    });

    it('should return 0 for empty layout', () => {
      const layout: GlobalLayout = {
        systems: [],
        total_width: 0,
        total_height: 0,
        units_per_space: 10,
      };
      expect(calculateBatchingEfficiency(layout)).toBe(0);
    });

    it('should handle layout with only structural glyphs', () => {
      const layout: GlobalLayout = {
        systems: [
          {
            index: 0,
            bounding_box: { x: 0, y: 0, width: 800, height: 200 },
            staff_groups: [
              {
                instrument_id: 'piano',
                staves: [
                  {
                    staff_lines: [],
                    structural_glyphs: [
                      {
                        position: { x: 10, y: 50 },
                        bounding_box: { x: 5, y: 45, width: 10, height: 20 },
                        codepoint: '\u{E050}',
                        source_reference: {
                          instrument_id: 'piano',
                          staff_index: 0,
                          voice_index: 0,
                          event_index: 0,
                        },
                      },
                    ],
                    glyph_runs: [],
                  },
                ],
                bracket_type: 'None',
              },
            ],
            tick_range: { start_tick: 0, end_tick: 7680 },
          },
        ],
        total_width: 800,
        total_height: 200,
        units_per_space: 10,
      };
      expect(calculateBatchingEfficiency(layout)).toBe(0); // No runs = 0 efficiency
    });
  });
});
