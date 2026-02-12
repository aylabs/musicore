/**
 * Viewport Definition
 * Feature 017 - Visible region for rendering virtualization
 * 
 * Defines scroll position and screen dimensions for efficient
 * system querying (only render visible systems).
 */

/**
 * Viewport defining visible region of score.
 * 
 * Coordinates in pixels, origin at top-left (standard Canvas coordinate system).
 * Used for virtualization: only render systems intersecting viewport.
 * 
 * @example Tablet landscape (iPad Pro 12.9"):
 * ```typescript
 * const viewport: Viewport = {
 *   x: 0,
 *   y: 0,
 *   width: 1366,
 *   height: 1024
 * };
 * renderer.render(layout, viewport);
 * ```
 * 
 * @example Scrolled 500px down:
 * ```typescript
 * const viewport: Viewport = {
 *   x: 0,
 *   y: 500,  // Scroll position
 *   width: 1366,
 *   height: 1024
 * };
 * renderer.render(layout, viewport);
 * ```
 * 
 * @example Tablet portrait (iPad Pro 12.9"):
 * ```typescript
 * const viewport: Viewport = {
 *   x: 0,
 *   y: 0,
 *   width: 1024,
 *   height: 1366
 * };
 * renderer.render(layout, viewport);
 * ```
 */
export interface Viewport {
  /**
   * Left edge of visible region (pixels).
   * 
   * - Always 0 for vertical scroll (full width visible)
   * - Non-zero for horizontal scroll (future support)
   * 
   * @validation Must be >= 0
   * 
   * @example
   * ```typescript
   * x: 0  // Full width visible
   * ```
   */
  x: number;
  
  /**
   * Top edge of visible region (pixels).
   * 
   * - 0 at top of score
   * - Increases as user scrolls down
   * - Maps to window.scrollY in ScoreViewer component
   * 
   * @validation Must be >= 0
   * 
   * @example
   * ```typescript
   * y: 0    // Top of score visible
   * y: 500  // Scrolled 500px down
   * y: 1500 // Scrolled to 3rd system group
   * ```
   */
  y: number;
  
  /**
   * Viewport width (pixels).
   * 
   * - Typically canvas.width
   * - Matches device screen width (minus margins)
   * 
   * @validation Must be > 0
   * 
   * @example
   * ```typescript
   * width: 1366  // iPad Pro 12.9" landscape
   * width: 1024  // iPad Pro 12.9" portrait
   * width: 800   // Desktop narrow window
   * ```
   */
  width: number;
  
  /**
   * Viewport height (pixels).
   * 
   * - Typically canvas.height
   * - Matches device screen height (minus UI chrome)
   * 
   * @validation Must be > 0
   * 
   * @example
   * ```typescript
   * height: 1024  // iPad Pro 12.9" landscape
   * height: 1366  // iPad Pro 12.9" portrait
   * height: 600   // Desktop short window
   * ```
   */
  height: number;
}

/**
 * Validates viewport for correctness.
 * Throws Error if validation fails.
 * 
 * @param viewport - Viewport to validate
 * 
 * @throws Error if x or y is negative
 * @throws Error if width or height is <= 0
 * 
 * @example
 * ```typescript
 * const viewport: Viewport = { x: 0, y: 0, width: 800, height: 600 };
 * validateViewport(viewport); // OK
 * 
 * const invalid: Viewport = { x: -10, y: 0, width: 0, height: 600 };
 * validateViewport(invalid); // Throws Error
 * ```
 */
export function validateViewport(viewport: Viewport): void;

/**
 * Creates viewport from canvas element dimensions.
 * 
 * @param canvas - Canvas element to measure
 * @param scrollY - Current scroll position (default: 0)
 * @returns Viewport matching canvas size at scroll position
 * 
 * @example
 * ```typescript
 * const canvas = document.getElementById('score-canvas') as HTMLCanvasElement;
 * const viewport = createViewportFromCanvas(canvas, window.scrollY);
 * renderer.render(layout, viewport);
 * ```
 */
export function createViewportFromCanvas(
  canvas: HTMLCanvasElement,
  scrollY?: number
): Viewport;

/**
 * Checks if system bounding box intersects viewport.
 * Used internally by getVisibleSystems() for binary search.
 * 
 * @param systemY - System top Y coordinate (pixels)
 * @param systemHeight - System height (pixels)
 * @param viewport - Viewport to test against
 * @returns True if system is visible within viewport
 * 
 * @example
 * ```typescript
 * const viewport = { x: 0, y: 500, width: 800, height: 600 };
 * 
 * // System 1: y=0, height=200 (top of score)
 * intersectsViewport(0, 200, viewport); // false (above viewport)
 * 
 * // System 2: y=500, height=200 (at scroll position)
 * intersectsViewport(500, 200, viewport); // true (visible)
 * 
 * // System 3: y=1200, height=200 (below viewport)
 * intersectsViewport(1200, 200, viewport); // false (below viewport)
 * ```
 */
export function intersectsViewport(
  systemY: number,
  systemHeight: number,
  viewport: Viewport
): boolean;

/**
 * Calculates total viewport area in square pixels.
 * Used for performance metrics (pixels/sec throughput).
 * 
 * @param viewport - Viewport to measure
 * @returns Area in square pixels
 * 
 * @example
 * ```typescript
 * const viewport = { x: 0, y: 0, width: 800, height: 600 };
 * const area = getViewportArea(viewport); // 480000 square pixels
 * ```
 */
export function getViewportArea(viewport: Viewport): number;
