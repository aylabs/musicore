/**
 * Utility helpers for PluginStaffViewer.
 * Kept in a separate file so that the component file only exports the React
 * component (required by the react-refresh/only-export-components rule).
 */

/**
 * Maps a tap/hold duration in milliseconds to a standard note value in ticks
 * (480 ticks per quarter note at any tempo).
 *
 * Touch-intuitive mapping — NOT BPM-proportional:
 *   < 300 ms → quarter  (480 ticks)  — normal tap
 *   < 800 ms → half     (960 ticks)  — deliberate hold
 *   ≥ 800 ms → whole    (1920 ticks) — long hold
 */
export function msToDurationTicks(ms: number): number {
  if (ms < 300) return 480;  // quarter
  if (ms < 800) return 960;  // half
  return 1920;               // whole
}
