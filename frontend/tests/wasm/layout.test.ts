/**
 * WASM Layout Engine Tests
 *
 * Validates Rust layout engine WASM integration and contract compliance.
 * Tests run in Node.js environment (Vitest), so they use JSON string API.
 *
 * Feature 016: Phase 4 - WASM Integration Tests (T062-T064)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { initLayoutEngine, computeLayout, type GlobalLayout } from '../../src/wasm/layout';
import * as fs from 'fs';
import * as path from 'path';

// Load test fixtures from backend tests
const BACKEND_FIXTURES_PATH = path.resolve(__dirname, '../../../backend/tests/fixtures');

/**
 * Helper: Load JSON fixture from backend tests
 */
function loadFixture(filename: string): any {
  const fixturePath = path.join(BACKEND_FIXTURES_PATH, filename);
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content);
}

// ============================================================================
// T062: Basic WASM invocation test
// ============================================================================

describe('WASM Layout Engine - Basic Invocation', () => {
  beforeAll(async () => {
    // Initialize WASM module before running tests
    await initLayoutEngine();
  });

  it('T062: WASM module loads and exports computeLayout function', () => {
    // Verify WASM module is initialized
    expect(computeLayout).toBeDefined();
    expect(typeof computeLayout).toBe('function');
  });

  it('T062: computeLayout accepts score and returns GlobalLayout', () => {
    // Minimal valid score for smoke test
    const minimalScore = {
      id: 'test-score',
      title: 'Test',
      instruments: [
        {
          id: 'piano',
          name: 'Piano',
          staves: [
            {
              staff_lines: 5,
              initial_clef: 'treble',
              voices: [
                {
                  events: [
                    {
                      tick: 0,
                      duration_ticks: 960, // Quarter note
                      note_type: 'note',
                      pitch: { step: 'C', octave: 4, alter: 0 },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      tempo_changes: [{ tick: 0, bpm: 120.0 }],
    };

    // Call layout engine
    const layout = computeLayout(minimalScore);

    // Verify basic structure
    expect(layout).toBeDefined();
    expect(layout).toHaveProperty('systems');
    expect(layout).toHaveProperty('total_width');
    expect(layout).toHaveProperty('total_height');
    expect(layout).toHaveProperty('units_per_space');
  });

  it('T062: computeLayout accepts optional config parameter', () => {
    const minimalScore = {
      id: 'test-score',
      title: 'Test',
      instruments: [
        {
          id: 'piano',
          name: 'Piano',
          staves: [
            {
              staff_lines: 5,
              initial_clef: 'treble',
              voices: [{ events: [] }],
            },
          ],
        },
      ],
      tempo_changes: [{ tick: 0, bpm: 120.0 }],
    };

    // Call with custom config
    const layout = computeLayout(minimalScore, {
      max_system_width: 1000,
      system_height: 150,
      system_spacing: 50,
      units_per_space: 10,
    });

    expect(layout).toBeDefined();
    expect(layout.units_per_space).toBe(10);
  });
});

// ============================================================================
// T063: Load fixture via WASM, verify GlobalLayout structure
// ============================================================================

describe('WASM Layout Engine - Fixture Loading', () => {
  beforeAll(async () => {
    await initLayoutEngine();
  });

  it('T063: Loads 50-measure piano fixture and computes layout', () => {
    // Load backend test fixture
    const score = loadFixture('piano_50_measures.json');

    // Compute layout
    const layout = computeLayout(score);

    // Verify GlobalLayout structure
    expect(layout).toHaveProperty('systems');
    expect(layout).toHaveProperty('total_width');
    expect(layout).toHaveProperty('total_height');
    expect(layout).toHaveProperty('units_per_space');

    // Verify systems array is non-empty
    expect(Array.isArray(layout.systems)).toBe(true);
    expect(layout.systems.length).toBeGreaterThan(0);
  });

  it('T063: Systems have correct structure with bounding boxes', () => {
    const score = loadFixture('piano_50_measures.json');
    const layout = computeLayout(score);

    // Verify first system structure
    const firstSystem = layout.systems[0];
    expect(firstSystem).toHaveProperty('index');
    expect(firstSystem).toHaveProperty('bounding_box');
    expect(firstSystem).toHaveProperty('staff_groups');
    expect(firstSystem).toHaveProperty('tick_range');

    // Verify bounding box properties
    expect(firstSystem.bounding_box).toHaveProperty('x');
    expect(firstSystem.bounding_box).toHaveProperty('y');
    expect(firstSystem.bounding_box).toHaveProperty('width');
    expect(firstSystem.bounding_box).toHaveProperty('height');

    // Verify tick range
    expect(firstSystem.tick_range).toHaveProperty('start_tick');
    expect(firstSystem.tick_range).toHaveProperty('end_tick');
  });

  it('T063: StaffGroups contain staves with glyphs', () => {
    const score = loadFixture('piano_50_measures.json');
    const layout = computeLayout(score);

    const firstSystem = layout.systems[0];
    expect(firstSystem.staff_groups.length).toBeGreaterThan(0);

    const firstStaffGroup = firstSystem.staff_groups[0];
    expect(firstStaffGroup).toHaveProperty('instrument_id');
    expect(firstStaffGroup).toHaveProperty('staves');
    expect(firstStaffGroup).toHaveProperty('bracket_type');

    // Verify staff structure
    expect(firstStaffGroup.staves.length).toBeGreaterThan(0);
    const firstStaff = firstStaffGroup.staves[0];
    expect(firstStaff).toHaveProperty('staff_lines');
    expect(firstStaff).toHaveProperty('glyph_runs');
    expect(firstStaff).toHaveProperty('structural_glyphs');

    // Verify staff has 5 lines
    expect(firstStaff.staff_lines.length).toBe(5);
  });

  it('T063: Glyphs have positions and bounding boxes', () => {
    const score = loadFixture('piano_50_measures.json');
    const layout = computeLayout(score);

    // Find first glyph run with glyphs
    const firstSystem = layout.systems[0];
    const firstStaffGroup = firstSystem.staff_groups[0];
    const firstStaff = firstStaffGroup.staves[0];

    let foundGlyph = false;

    // Check glyph runs
    for (const glyphRun of firstStaff.glyph_runs) {
      if (glyphRun.glyphs.length > 0) {
        const glyph = glyphRun.glyphs[0];

        // Verify glyph structure
        expect(glyph).toHaveProperty('position');
        expect(glyph).toHaveProperty('bounding_box');
        expect(glyph).toHaveProperty('codepoint');
        expect(glyph).toHaveProperty('source_reference');

        // Verify position
        expect(glyph.position).toHaveProperty('x');
        expect(glyph.position).toHaveProperty('y');

        // Verify source reference
        expect(glyph.source_reference).toHaveProperty('instrument_id');
        expect(glyph.source_reference).toHaveProperty('staff_index');
        expect(glyph.source_reference).toHaveProperty('voice_index');
        expect(glyph.source_reference).toHaveProperty('event_index');

        foundGlyph = true;
        break;
      }
    }

    expect(foundGlyph).toBe(true);
  });

  it('T063: 200-measure piano fixture produces multiple systems', () => {
    const score = loadFixture('piano_200_measures.json');
    const layout = computeLayout(score);

    // Verify multiple systems are created due to line breaking
    expect(layout.systems.length).toBeGreaterThan(1);

    // Verify systems are indexed sequentially
    layout.systems.forEach((system, index) => {
      expect(system.index).toBe(index);
    });
  });
});

// ============================================================================
// T064: Verify determinism across WASM calls
// ============================================================================

describe('WASM Layout Engine - Determinism', () => {
  beforeAll(async () => {
    await initLayoutEngine();
  });

  it('T064: Same input produces identical JSON output (determinism)', () => {
    const score = loadFixture('piano_50_measures.json');
    const config = {
      max_system_width: 1200,
      system_height: 200,
      system_spacing: 80,
      units_per_space: 10,
    };

    // Compute layout twice with identical inputs
    const layout1 = computeLayout(score, config);
    const layout2 = computeLayout(score, config);

    // Verify JSON serialization produces identical output
    const json1 = JSON.stringify(layout1);
    const json2 = JSON.stringify(layout2);

    expect(json1).toBe(json2);
  });

  it('T064: Determinism holds for 200-measure fixture', () => {
    const score = loadFixture('piano_200_measures.json');

    // Use default config (empty object)
    const layout1 = computeLayout(score);
    const layout2 = computeLayout(score);

    // Verify identical structure
    expect(layout1.systems.length).toBe(layout2.systems.length);
    expect(layout1.total_width).toBe(layout2.total_width);
    expect(layout1.total_height).toBe(layout2.total_height);

    // Verify first system is identical
    const system1 = layout1.systems[0];
    const system2 = layout2.systems[0];

    expect(system1.bounding_box).toEqual(system2.bounding_box);
    expect(system1.tick_range).toEqual(system2.tick_range);
  });

  it('T064: Floating-point values are deterministic (no artifacts)', () => {
    const score = loadFixture('piano_50_measures.json');

    // Compute layout 5 times
    const layouts = Array.from({ length: 5 }, () => computeLayout(score));

    // Extract all floating-point values from first system
    const extractFloats = (layout: GlobalLayout): number[] => {
      const floats: number[] = [];
      floats.push(layout.total_width, layout.total_height, layout.units_per_space);

      if (layout.systems.length > 0) {
        const system = layout.systems[0];
        floats.push(
          system.bounding_box.x,
          system.bounding_box.y,
          system.bounding_box.width,
          system.bounding_box.height
        );

        // Extract staff line positions
        if (system.staff_groups.length > 0 && system.staff_groups[0].staves.length > 0) {
          const staff = system.staff_groups[0].staves[0];
          staff.staff_lines.forEach((line) => {
            floats.push(line.y_position, line.start_x, line.end_x);
          });
        }
      }

      return floats;
    };

    const floatArrays = layouts.map(extractFloats);

    // Verify all float arrays are identical
    const referenceFloats = floatArrays[0];
    floatArrays.slice(1).forEach((floats) => {
      expect(floats).toEqual(referenceFloats);
    });
  });

  it('T064: Different configs produce different layouts (not hardcoded)', () => {
    const score = loadFixture('piano_50_measures.json');

    const layout1 = computeLayout(score, { max_system_width: 800 });
    const layout2 = computeLayout(score, { max_system_width: 1600 });

    // Narrower system width should produce more systems (more line breaks)
    expect(layout1.systems.length).toBeGreaterThanOrEqual(layout2.systems.length);

    // Total width should be different due to different system widths
    expect(layout1.total_width).not.toBe(layout2.total_width);
  });
});
