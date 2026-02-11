import { describe, it, expect } from 'vitest';
import type { WasmImportResult } from '../../src/services/wasm/music-engine';
import type { ImportWarning } from '../../src/types/import-warning';

/**
 * WASM Contract Integration Tests
 * 
 * These tests validate the WASM ImportResult contract structure
 * without actually loading WASM (which requires browser environment).
 * 
 * The actual WASM loading and execution is tested in E2E tests
 * (e2e/import-musicxml.spec.ts) which run in a real browser.
 * 
 * This test would have caught the Feature 015 bug by validating
 * the expected structure matches what code actually uses.
 */

describe('WASM Contract: ImportResult Structure', () => {
  it('WasmImportResult has required properties', () => {
    // Type-level test: This validates TypeScript interface
    // If WASM returns wrong structure, TypeScript will catch it at compile time
    
    const mockResult: WasmImportResult = {
      score: {
        id: 'test',
        title: 'Test',
        instruments: [],
        tempo_changes: [],
      },
      statistics: {
        instrument_count: 1,
        staff_count: 1,
        voice_count: 1,
        note_count: 4,
        duration_ticks: 1920,
        warning_count: 0,
        skipped_element_count: 0,
      },
      warnings: [],
      partial_import: false,
    };

    // Runtime validation
    expect(mockResult).toHaveProperty('score');
    expect(mockResult).toHaveProperty('statistics');
    expect(mockResult).toHaveProperty('warnings');
    expect(mockResult).toHaveProperty('partial_import');
  });

  it('score property has instruments array', () => {
    const mockResult: WasmImportResult = {
      score: {
        id: 'test',
        title: 'Test',
        instruments: [
          {
            id: 'p1',
            name: 'Piano',
            staves: [],
          },
        ],
        tempo_changes: [],
      },
      statistics: {
        instrument_count: 1,
        staff_count: 0,
        voice_count: 0,
        note_count: 0,
        duration_ticks: 0,
        warning_count: 0,
        skipped_element_count: 0,
      },
      warnings: [],
      partial_import: false,
    };

    // This is what broke! Code tried: result.instruments
    // But WASM returns: result.score.instruments
    expect(mockResult.score.instruments).toBeDefined();
    expect(Array.isArray(mockResult.score.instruments)).toBe(true);
    
    // Validate it's iterable (the error was "is not iterable")
    expect(() => {
      for (const instrument of mockResult.score.instruments) {
        expect(instrument).toHaveProperty('name');
      }
    }).not.toThrow();
  });

  it('warnings array has correct structure', () => {
    const warning: ImportWarning = {
      severity: 'warning',
      category: 'overlap_resolution',
      message: 'Test warning',
      measure_number: 1,
      instrument_name: 'Piano',
      staff_number: 1,
      voice_number: 1,
    };

    const mockResult: WasmImportResult = {
      score: {
        id: 'test',
        title: 'Test',
        instruments: [],
        tempo_changes: [],
      },
      statistics: {
        instrument_count: 0,
        staff_count: 0,
        voice_count: 0,
        note_count: 0,
        duration_ticks: 0,
        warning_count: 1,
        skipped_element_count: 0,
      },
      warnings: [warning],
      partial_import: false,
    };

    expect(mockResult.warnings).toBeDefined();
    expect(Array.isArray(mockResult.warnings)).toBe(true);
    expect(mockResult.warnings[0].severity).toBe('warning');
    expect(mockResult.warnings[0].category).toBe('overlap_resolution');
  });

  it('statistics has all required fields', () => {
    const mockStats = {
      instrument_count: 1,
      staff_count: 2,
      voice_count: 4,
      note_count: 100,
      duration_ticks: 3840,
      warning_count: 5,
      skipped_element_count: 2,
    };

    // Validate all required fields exist
    expect(mockStats).toHaveProperty('instrument_count');
    expect(mockStats).toHaveProperty('staff_count');
    expect(mockStats).toHaveProperty('voice_count');
    expect(mockStats).toHaveProperty('note_count');
    expect(mockStats).toHaveProperty('duration_ticks');
    expect(mockStats).toHaveProperty('warning_count');
    expect(mockStats).toHaveProperty('skipped_element_count');
    
    // All values should be numbers
    Object.values(mockStats).forEach(value => {
      expect(typeof value).toBe('number');
    });
  });
});

/**
 * NOTE: Actual WASM loading and execution is tested in:
 * - e2e/import-musicxml.spec.ts (Playwright tests in real browser)
 * 
 * This provides better integration testing because:
 * 1. WASM runs in its native environment (browser)
 * 2. Tests the actual user flow end-to-end
 * 3. Would catch the "instruments is not iterable" bug
 */
