import { describe, it, expect } from 'vitest';
import { validateScoreFile } from './validation';

/**
 * Test suite for JSON score file validation
 * Tests 3-layer validation: Syntax → Structure → Domain
 * All tests should FAIL until validation.ts is implemented (TDD approach)
 */
describe('validateScoreFile', () => {
  // ============================================================================
  // Layer 1: Syntax Validation (JSON parsing)
  // ============================================================================

  describe('Syntax Validation (Layer 1)', () => {
    it('should pass for valid JSON', () => {
      const validJson = JSON.stringify({
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [],
        instruments: [],
      });

      const result = validateScoreFile(validJson);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for invalid JSON', () => {
      const invalidJson = '{ "id": "123", invalid }';

      const result = validateScoreFile(invalidJson);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid JSON file format');
    });

    it('should fail for empty string', () => {
      const result = validateScoreFile('');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid JSON file format');
    });

    it('should fail for non-object JSON', () => {
      const result = validateScoreFile('"just a string"');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid JSON file format');
    });
  });

  // ============================================================================
  // Layer 2: Structure Validation (required fields and types)
  // ============================================================================

  describe('Structure Validation (Layer 2)', () => {
    it('should fail when id field is missing', () => {
      const json = JSON.stringify({
        global_structural_events: [],
        instruments: [],
      });

      const result = validateScoreFile(json);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('id'))).toBe(true);
    });

    it('should fail when global_structural_events field is missing', () => {
      const json = JSON.stringify({
        id: '550e8400-e29b-41d4-a716-446655440000',
        instruments: [],
      });

      const result = validateScoreFile(json);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('global_structural_events'))).toBe(true);
    });

    it('should fail when instruments field is missing', () => {
      const json = JSON.stringify({
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [],
      });

      const result = validateScoreFile(json);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('instruments'))).toBe(true);
    });

    it('should fail when id is not a string', () => {
      const json = JSON.stringify({
        id: 12345,
        global_structural_events: [],
        instruments: [],
      });

      const result = validateScoreFile(json);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('id') && err.includes('string'))).toBe(true);
    });

    it('should fail when global_structural_events is not an array', () => {
      const json = JSON.stringify({
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: 'not an array',
        instruments: [],
      });

      const result = validateScoreFile(json);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('global_structural_events') && err.includes('array'))).toBe(true);
    });

    it('should fail when instruments is not an array', () => {
      const json = JSON.stringify({
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [],
        instruments: 'not an array',
      });

      const result = validateScoreFile(json);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('instruments') && err.includes('array'))).toBe(true);
    });

    it('should pass for minimal valid score structure', () => {
      const validScore = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [],
        instruments: [],
      };

      const result = validateScoreFile(JSON.stringify(validScore));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when instrument is missing required fields', () => {
      const json = JSON.stringify({
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [],
        instruments: [
          {
            id: '660e8400-e29b-41d4-a716-446655440001',
            // Missing name, instrument_type, staves
          },
        ],
      });

      const result = validateScoreFile(json);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate nested structure - staff requires id, staff_structural_events, voices', () => {
      const json = JSON.stringify({
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [],
        instruments: [
          {
            id: '660e8400-e29b-41d4-a716-446655440001',
            name: 'Piano',
            instrument_type: 'piano',
            staves: [
              {
                id: '770e8400-e29b-41d4-a716-446655440002',
                // Missing staff_structural_events, voices
              },
            ],
          },
        ],
      });

      const result = validateScoreFile(json);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('staff_structural_events') || err.includes('voices'))).toBe(true);
    });
  });

  // ============================================================================
  // Layer 3: Domain Validation (musical constraints)
  // ============================================================================

  describe('Domain Validation (Layer 3)', () => {
    /**
     * Helper to create a valid score with test notes
     */
    const createScoreWithNotes = (notes: any[]) => ({
      id: '550e8400-e29b-41d4-a716-446655440000',
      global_structural_events: [],
      instruments: [
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Piano',
          instrument_type: 'piano',
          staves: [
            {
              id: '770e8400-e29b-41d4-a716-446655440002',
              staff_structural_events: [],
              voices: [
                {
                  id: '880e8400-e29b-41d4-a716-446655440003',
                  interval_events: notes,
                },
              ],
            },
          ],
        },
      ],
    });

    it('should fail for MIDI pitch below valid range (< 21)', () => {
      const score = createScoreWithNotes([
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          start_tick: 0,
          duration_ticks: 960,
          pitch: 20, // Below minimum (21)
        },
      ]);

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('pitch') && err.includes('21'))).toBe(true);
    });

    it('should fail for MIDI pitch above valid range (> 108)', () => {
      const score = createScoreWithNotes([
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          start_tick: 0,
          duration_ticks: 960,
          pitch: 109, // Above maximum (108)
        },
      ]);

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('pitch') && err.includes('108'))).toBe(true);
    });

    it('should fail for negative tick values', () => {
      const score = createScoreWithNotes([
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          start_tick: -100, // Negative tick
          duration_ticks: 960,
          pitch: 60,
        },
      ]);

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('tick') && err.includes('negative'))).toBe(true);
    });

    it('should fail for zero duration', () => {
      const score = createScoreWithNotes([
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          start_tick: 0,
          duration_ticks: 0, // Zero duration
          pitch: 60,
        },
      ]);

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('duration') && err.includes('positive'))).toBe(true);
    });

    it('should fail for negative duration', () => {
      const score = createScoreWithNotes([
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          start_tick: 0,
          duration_ticks: -960, // Negative duration
          pitch: 60,
        },
      ]);

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('duration'))).toBe(true);
    });

    it('should fail for BPM below valid range (< 20)', () => {
      const score = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [
          {
            Tempo: {
              tick: 0,
              bpm: 19, // Below minimum (20)
            },
          },
        ],
        instruments: [],
      };

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('bpm') || err.includes('BPM'))).toBe(true);
    });

    it('should fail for BPM above valid range (> 300)', () => {
      const score = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [
          {
            Tempo: {
              tick: 0,
              bpm: 301, // Above maximum (300)
            },
          },
        ],
        instruments: [],
      };

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('bpm') || err.includes('BPM'))).toBe(true);
    });

    it('should fail for invalid time signature numerator', () => {
      const score = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [
          {
            TimeSignature: {
              tick: 0,
              numerator: 0, // Invalid (must be > 0)
              denominator: 4,
            },
          },
        ],
        instruments: [],
      };

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('numerator'))).toBe(true);
    });

    it('should fail for invalid time signature denominator', () => {
      const score = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [
          {
            TimeSignature: {
              tick: 0,
              numerator: 4,
              denominator: 3, // Invalid (must be power of 2: 1, 2, 4, 8, 16, 32)
            },
          },
        ],
        instruments: [],
      };

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('denominator'))).toBe(true);
    });

    it('should pass for valid musical data within constraints', () => {
      const score = createScoreWithNotes([
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          start_tick: 0,
          duration_ticks: 960,
          pitch: 60, // Middle C - valid range
        },
        {
          id: '990e8400-e29b-41d4-a716-446655440005',
          start_tick: 960,
          duration_ticks: 480,
          pitch: 67, // G4 - valid range
        },
      ]);

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for valid tempo and time signature events', () => {
      const score = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [
          {
            Tempo: {
              tick: 0,
              bpm: 120, // Valid range (20-300)
            },
          },
          {
            TimeSignature: {
              tick: 0,
              numerator: 4,
              denominator: 4, // Valid power of 2
            },
          },
        ],
        instruments: [],
      };

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accumulate multiple validation errors', () => {
      const score = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        global_structural_events: [
          {
            Tempo: {
              tick: -10, // Invalid: negative tick
              bpm: 500, // Invalid: BPM > 300
            },
          },
        ],
        instruments: [
          {
            id: '660e8400-e29b-41d4-a716-446655440001',
            name: 'Piano',
            instrument_type: 'piano',
            staves: [
              {
                id: '770e8400-e29b-41d4-a716-446655440002',
                staff_structural_events: [],
                voices: [
                  {
                    id: '880e8400-e29b-41d4-a716-446655440003',
                    interval_events: [
                      {
                        id: '990e8400-e29b-41d4-a716-446655440004',
                        start_tick: 0,
                        duration_ticks: 0, // Invalid: zero duration
                        pitch: 200, // Invalid: pitch > 108
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = validateScoreFile(JSON.stringify(score));
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1); // Multiple errors
    });
  });
});
