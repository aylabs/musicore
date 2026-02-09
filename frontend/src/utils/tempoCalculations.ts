/**
 * Tempo Calculation Utilities
 * 
 * Feature 008 - Tempo Change: Utility functions for tempo multiplier calculations
 */

/**
 * Minimum tempo multiplier: 50% (half speed)
 */
export const MIN_TEMPO_MULTIPLIER = 0.5;

/**
 * Maximum tempo multiplier: 200% (double speed)
 */
export const MAX_TEMPO_MULTIPLIER = 2.0;

/**
 * Default tempo multiplier: 100% (no change)
 */
export const DEFAULT_TEMPO_MULTIPLIER = 1.0;

/**
 * Clamp tempo multiplier to valid range (0.5 to 2.0)
 * 
 * @param multiplier - Tempo multiplier to clamp
 * @returns Clamped value between 0.5 and 2.0
 * 
 * @example
 * clampTempoMultiplier(0.3);  // Returns 0.5
 * clampTempoMultiplier(1.5);  // Returns 1.5
 * clampTempoMultiplier(3.0);  // Returns 2.0
 */
export function clampTempoMultiplier(multiplier: number): number {
  return Math.max(MIN_TEMPO_MULTIPLIER, Math.min(MAX_TEMPO_MULTIPLIER, multiplier));
}

/**
 * Convert tempo multiplier to percentage
 * 
 * @param multiplier - Tempo multiplier (0.5 to 2.0)
 * @returns Percentage (50 to 200)
 * 
 * @example
 * multiplierToPercentage(1.0);  // Returns 100
 * multiplierToPercentage(0.8);  // Returns 80
 * multiplierToPercentage(1.5);  // Returns 150
 */
export function multiplierToPercentage(multiplier: number): number {
  return Math.round(multiplier * 100);
}

/**
 * Convert percentage to tempo multiplier
 * 
 * @param percentage - Percentage (50 to 200)
 * @returns Tempo multiplier (0.5 to 2.0)
 * 
 * @example
 * percentageToMultiplier(100);  // Returns 1.0
 * percentageToMultiplier(80);   // Returns 0.8
 * percentageToMultiplier(150);  // Returns 1.5
 */
export function percentageToMultiplier(percentage: number): number {
  return percentage / 100;
}

/**
 * Calculate effective tempo from original tempo and multiplier
 * 
 * @param originalTempo - Original tempo in BPM
 * @param multiplier - Tempo multiplier (0.5 to 2.0)
 * @returns Effective tempo in BPM (rounded)
 * 
 * @example
 * calculateEffectiveTempo(120, 1.0);  // Returns 120
 * calculateEffectiveTempo(120, 0.8);  // Returns 96
 * calculateEffectiveTempo(120, 1.5);  // Returns 180
 */
export function calculateEffectiveTempo(originalTempo: number, multiplier: number): number {
  return Math.round(originalTempo * multiplier);
}
