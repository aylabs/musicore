/**
 * Feature 024: Playback & Display Performance Optimization
 * deviceDetection - Mobile detection utility for frame rate selection
 *
 * Uses matchMedia queries with viewport width fallback.
 *
 * @see contracts/highlight-performance.ts DeviceProfile, DetectDeviceProfile
 * @see research.md Topic 4: Mobile Device Detection
 */

/**
 * Detected device characteristics for frame rate selection.
 */
export interface DeviceProfile {
  readonly isMobile: boolean;
  readonly targetFrameIntervalMs: number;
  readonly frameBudgetMs: number;
}

/**
 * Detect the device profile for frame rate selection.
 *
 * Detection heuristic:
 * - `matchMedia('(pointer: coarse)')` + `matchMedia('(hover: none)')` → mobile
 * - `window.innerWidth <= 768` → mobile (fallback)
 * - Otherwise → desktop
 *
 * @returns DeviceProfile with isMobile, targetFrameIntervalMs, frameBudgetMs
 */
export function detectDeviceProfile(): DeviceProfile {
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const hasNoHover = window.matchMedia('(hover: none)').matches;
  const isSmallViewport = window.innerWidth <= 768;

  const isMobile = (hasCoarsePointer && hasNoHover) || isSmallViewport;

  return {
    isMobile,
    targetFrameIntervalMs: isMobile ? 33 : 16,
    frameBudgetMs: isMobile ? 8 : 12,
  };
}
