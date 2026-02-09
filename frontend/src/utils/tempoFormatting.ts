/**
 * Tempo Display Formatting Utilities
 * 
 * Feature 008 - Tempo Change: User Story 2
 * Utilities for formatting tempo values for display in the UI
 */

/**
 * Format tempo as "XXX BPM"
 * 
 * @param tempo - Tempo in beats per minute
 * @returns Formatted tempo string (e.g., "120 BPM")
 * 
 * @example
 * formatTempo(120);    // "120 BPM"
 * formatTempo(96.5);   // "97 BPM" (rounded)
 */
export function formatTempo(tempo: number): string {
  const roundedTempo = Math.round(tempo);
  return `${roundedTempo} BPM`;
}

/**
 * Format tempo multiplier as percentage
 * 
 * @param multiplier - Tempo multiplier (0.5 to 2.0)
 * @returns Formatted percentage string (e.g., "100%")
 * 
 * @example
 * formatPercentage(1.0);   // "100%"
 * formatPercentage(0.75);  // "75%"
 * formatPercentage(1.5);   // "150%"
 */
export function formatPercentage(multiplier: number): string {
  const percentage = Math.round(multiplier * 100);
  return `${percentage}%`;
}

/**
 * Format tempo with percentage adjustment
 * 
 * Displays effective tempo (originalTempo * multiplier) and percentage
 * 
 * @param originalTempo - Original score tempo in BPM
 * @param multiplier - Tempo multiplier (0.5 to 2.0)
 * @returns Formatted string (e.g., "96 BPM (80%)")
 * 
 * @example
 * formatTempoWithPercentage(120, 1.0);   // "120 BPM (100%)"
 * formatTempoWithPercentage(120, 0.8);   // "96 BPM (80%)"
 * formatTempoWithPercentage(120, 1.5);   // "180 BPM (150%)"
 */
export function formatTempoWithPercentage(originalTempo: number, multiplier: number): string {
  const effectiveTempo = originalTempo * multiplier;
  const roundedEffective = Math.round(effectiveTempo);
  const percentage = Math.round(multiplier * 100);
  
  return `${roundedEffective} BPM (${percentage}%)`;
}
