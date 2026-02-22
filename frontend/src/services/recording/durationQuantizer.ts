/**
 * durationQuantizer — Convert held-note duration in milliseconds to a
 * quantized tick value that matches the nearest rhythmic division.
 *
 * Uses a standard convention of 960 ticks per quarter-note (TICKS_PER_QUARTER).
 * The quantization grid spans [sixteenth … whole], which covers the durations
 * a live performer is likely to produce at any reasonable tempo.
 */

/** Standard tick resolution (quarter-note = 960 ticks) */
export const TICKS_PER_QUARTER = 960;

/** Named rhythmic durations in ticks (whole → thirty-second) */
export const RHYTHMIC_VALUES_TICKS = [
  3840, // whole    (4 quarters)
  1920, // half     (2 quarters)
  960,  // quarter
  480,  // eighth
  240,  // sixteenth
  120,  // thirty-second (minimum)
] as const;

/** Milli-seconds per quarter note at the given BPM */
function msPerQuarter(bpm: number): number {
  return 60_000 / bpm;
}

/**
 * Convert a held-note duration (milliseconds) to the nearest rhythmic tick
 * value at the given BPM.
 *
 * @param durationMs - How long the note was held in milliseconds.
 * @param bpm        - Tempo in beats per minute (default 120).
 * @returns          - The tick-count of the nearest rhythmic value.
 *
 * @example
 * // At 120 BPM: quarter = 500 ms = 960 ticks
 * quantizeDurationMs(480)  // → 960  (rounds to quarter)
 * quantizeDurationMs(1200) // → 1920 (rounds to half)
 */
export function quantizeDurationMs(durationMs: number, bpm = 120): number {
  if (durationMs <= 0) return RHYTHMIC_VALUES_TICKS[RHYTHMIC_VALUES_TICKS.length - 1];

  const msPerQ = msPerQuarter(bpm);
  const rawTicks = (durationMs / msPerQ) * TICKS_PER_QUARTER;

  // Find the rhythmic value whose tick count is closest to rawTicks
  let bestTicks: number = RHYTHMIC_VALUES_TICKS[0];
  let bestDist = Math.abs(rawTicks - bestTicks);

  for (const ticks of RHYTHMIC_VALUES_TICKS) {
    const dist = Math.abs(rawTicks - ticks);
    if (dist < bestDist) {
      bestDist = dist;
      bestTicks = ticks;
    }
  }

  return bestTicks;
}

/**
 * Convert a MIDI pitch and a duration in ticks to a label like "quarter at 120 BPM".
 * Useful for debugging and aria labels.
 */
export function durationTicksToName(ticks: number): string {
  switch (ticks) {
    case 3840: return 'whole';
    case 1920: return 'half';
    case 960:  return 'quarter';
    case 480:  return 'eighth';
    case 240:  return 'sixteenth';
    case 120:  return 'thirty-second';
    default:   return `${ticks}ticks`;
  }
}
