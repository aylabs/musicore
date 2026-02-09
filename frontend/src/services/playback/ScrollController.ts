import type { ScrollConfig, ScrollCalculation } from '../../types/playback';

/**
 * Feature 009: Playback Scroll and Highlight - T010
 * ScrollController - Calculate scroll position from playback tick
 * 
 * Pure service with no React dependencies - testable in isolation
 * Implements scroll position calculation algorithm for auto-scroll during playback
 */
export class ScrollController {
  /**
   * Calculate target scroll position for given playback tick
   * 
   * Algorithm:
   * 1. Convert currentTick to pixel position (noteX = currentTick * pixelsPerTick)
   * 2. Calculate target scroll to position note at targetPositionRatio from left edge
   * 3. Clamp scroll position to valid range [0, totalWidth - viewportWidth]
   * 4. Handle edge cases: short scores, near end, negative scroll
   * 
   * @param currentTick - Current playback position in ticks
   * @param config - Scroll configuration (viewport, scaling, etc.)
   * @returns Scroll calculation result with target position and flags
   * 
   * @example
   * ```typescript
   * const result = ScrollController.calculateScrollPosition(1920, {
   *   targetPositionRatio: 0.3,
   *   pixelsPerTick: 0.1,
   *   viewportWidth: 1200,
   *   totalWidth: 5000,
   *   currentScrollX: 0
   * });
   * 
   * if (result.shouldScroll) {
   *   container.scrollLeft = result.scrollX;
   * }
   * // result.scrollX = 1920*0.1 - 1200*0.3 = 192 - 360 = -168 → clamped to 0
   * ```
   */
  public static calculateScrollPosition(
    currentTick: number,
    config: ScrollConfig
  ): ScrollCalculation {
    const {
      targetPositionRatio,
      pixelsPerTick,
      viewportWidth,
      totalWidth,
    } = config;
    
    // Edge case: Score fits entirely in viewport (no scrolling needed)
    if (totalWidth <= viewportWidth) {
      return {
        scrollX: 0,
        shouldScroll: false,
        nearEnd: false,
      };
    }
    
    // Calculate pixel position of current note
    const noteX = currentTick * pixelsPerTick;
    
    // Calculate target scroll position (note at targetPositionRatio from left)
    // Example: targetPositionRatio = 0.3 means note should be 30% from left edge
    // If noteX = 500px and viewportWidth = 1200px, scroll to 500 - 360 = 140px
    const targetScrollX = noteX - (viewportWidth * targetPositionRatio);
    
    // Clamp to valid scroll range [0, totalWidth - viewportWidth]
    const maxScrollX = totalWidth - viewportWidth;
    const clampedScrollX = Math.max(0, Math.min(targetScrollX, maxScrollX));
    
    // Determine if we're near the end of the score
    // "Near end" means less than 70% of viewport width remaining
    const remainingWidth = totalWidth - noteX;
    const nearEnd = remainingWidth < (viewportWidth * 0.7);
    
    return {
      scrollX: clampedScrollX,
      shouldScroll: true,
      nearEnd,
    };
  }
  
  /**
   * Detect if scroll event was user-initiated (not auto-scroll)
   * 
   * Uses timestamp comparison to distinguish between programmatic scrolls
   * (from auto-scroll) and manual scrolls (from user interaction).
   * 
   * If time since last auto-scroll > threshold, assume user scrolled manually.
   * 
   * @param lastAutoScrollTime - Timestamp of last programmatic scroll (Date.now())
   * @param threshold - Time threshold in ms to consider scroll as manual (default: 100ms)
   * @returns True if scroll was likely manual (user-initiated)
   * 
   * @example
   * ```typescript
   * // In scroll event handler:
   * const isManual = ScrollController.isManualScroll(lastAutoScrollTime);
   * if (isManual) {
   *   setAutoScrollEnabled(false); // User took control
   * }
   * ```
   */
  public static isManualScroll(
    lastAutoScrollTime: number,
    threshold: number = 100
  ): boolean {
    const timeSinceLastAuto = Date.now() - lastAutoScrollTime;
    return timeSinceLastAuto > threshold;
  }
}
