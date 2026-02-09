import { describe, it, expect } from 'vitest';
import { formatTempo, formatPercentage, formatTempoWithPercentage } from '../../src/utils/tempoFormatting';

/**
 * T018: Unit tests for tempo display formatting
 * 
 * Feature 008 - Tempo Change: User Story 2
 * Tests formatting utilities for tempo display (BPM + percentage)
 */
describe('Tempo Formatting Utilities', () => {
  describe('formatTempo', () => {
    /**
     * Test: Format tempo in BPM
     */
    it('should format tempo as "XXX BPM"', () => {
      expect(formatTempo(120)).toBe('120 BPM');
      expect(formatTempo(60)).toBe('60 BPM');
      expect(formatTempo(200)).toBe('200 BPM');
    });

    /**
     * Test: Handle decimal tempos (round to nearest integer)
     */
    it('should round decimal tempos to nearest integer', () => {
      expect(formatTempo(96.5)).toBe('97 BPM');
      expect(formatTempo(96.4)).toBe('96 BPM');
      expect(formatTempo(119.9)).toBe('120 BPM');
    });

    /**
     * Test: Handle edge cases
     */
    it('should handle edge case tempos', () => {
      expect(formatTempo(20)).toBe('20 BPM'); // Minimum valid tempo
      expect(formatTempo(400)).toBe('400 BPM'); // Maximum valid tempo
    });
  });

  describe('formatPercentage', () => {
    /**
     * Test: Format multiplier as percentage
     */
    it('should format tempo multiplier as percentage', () => {
      expect(formatPercentage(1.0)).toBe('100%');
      expect(formatPercentage(0.5)).toBe('50%');
      expect(formatPercentage(2.0)).toBe('200%');
      expect(formatPercentage(0.75)).toBe('75%');
      expect(formatPercentage(1.5)).toBe('150%');
    });

    /**
     * Test: Round to nearest integer percentage
     */
    it('should round to nearest integer percentage', () => {
      expect(formatPercentage(0.847)).toBe('85%');
      expect(formatPercentage(0.843)).toBe('84%');
      expect(formatPercentage(1.336)).toBe('134%');
    });

    /**
     * Test: Handle edge cases
     */
    it('should handle edge case multipliers', () => {
      expect(formatPercentage(0.5)).toBe('50%'); // Minimum (50%)
      expect(formatPercentage(2.0)).toBe('200%'); // Maximum (200%)
    });
  });

  describe('formatTempoWithPercentage', () => {
    /**
     * Test: Format at 100% (no adjustment)
     */
    it('should show only BPM when at 100%', () => {
      const result = formatTempoWithPercentage(120, 1.0);
      expect(result).toBe('120 BPM (100%)');
    });

    /**
     * Test: Format with tempo adjustment
     */
    it('should show effective BPM and percentage when adjusted', () => {
      // 120 BPM at 80% = 96 BPM
      expect(formatTempoWithPercentage(120, 0.8)).toBe('96 BPM (80%)');
      
      // 120 BPM at 50% = 60 BPM
      expect(formatTempoWithPercentage(120, 0.5)).toBe('60 BPM (50%)');
      
      // 120 BPM at 150% = 180 BPM
      expect(formatTempoWithPercentage(120, 1.5)).toBe('180 BPM (150%)');
    });

    /**
     * Test: Round effective tempo to nearest integer
     */
    it('should round effective tempo to nearest integer', () => {
      // 120 BPM at 85% = 102 BPM (not 102.0)
      expect(formatTempoWithPercentage(120, 0.85)).toBe('102 BPM (85%)');
      
      // 100 BPM at 77% = 77 BPM
      expect(formatTempoWithPercentage(100, 0.77)).toBe('77 BPM (77%)');
    });

    /**
     * Test: Edge cases with extreme tempos
     */
    it('should handle edge case combinations', () => {
      // Minimum tempo at minimum multiplier
      expect(formatTempoWithPercentage(20, 0.5)).toBe('10 BPM (50%)');
      
      // Maximum tempo at maximum multiplier
      expect(formatTempoWithPercentage(400, 2.0)).toBe('800 BPM (200%)');
      
      // Typical practice tempo
      expect(formatTempoWithPercentage(120, 0.6)).toBe('72 BPM (60%)');
    });
  });
});
