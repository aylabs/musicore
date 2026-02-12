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
 * Coordinates in logical units, origin at top-left (SVG viewBox coordinate system).
 * Used for virtualization: only render systems intersecting viewport.
 * 
 * @example Tablet landscape (iPad Pro 12.9"):
 * ```typescript
 * const viewport: Viewport = {
 *   x: 0,
 *   y: 0,
 *   width: 1600,  // viewBox width in logical units
 *   height: 1200
 * };
 * renderer.render(layout, viewport);
 * ```
 * 
 * @example Scrolled 500 logical units down:
 * ```typescript
 * const viewport: Viewport = {
 *   x: 0,
 *   y: 500,  // Scroll position in logical units
 *   width: 1600,
 *   height: 1200
 * };
 * renderer.render(layout, viewport);
 * ```
 * 
 * @example Tablet portrait (iPad Pro 12.9"):
 * ```typescript
 * const viewport: Viewport = {
 *   x: 0,
 *   y: 0,
 *   width: 1200,
 *   height: 1600
 * };
 * renderer.render(layout, viewport);
 * ```
 */
export interface Viewport {
  /**
   * Left edge of visible region (logical units).
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
   * Top edge of visible region (logical units).
   * 
   * - 0 at top of score
   * - Increases as user scrolls down
   * - Maps to SVG viewBox y coordinate
   * 
   * @validation Must be >= 0
   * 
   * @example
   * ```typescript
   * y: 0    // Top of score visible
   * y: 500  // Scrolled 500 logical units down
   * y: 1500 // Scrolled to 3rd system group
   * ```
   */
  y: number;
  
  /**
   * Viewport width (logical units).
   * 
   * - Typically from SVG viewBox width
   * - Matches layout engine coordinate system
   * 
   * @validation Must be > 0
   * 
   * @example
   * ```typescript
   * width: 1600  // Standard viewBox width
   * width: 1200  // Narrower viewport
   * width: 800   // Compact view
   * ```
   */
  width: number;
  
  /**
   * Viewport height (logical units).
   * 
   * - Typically from SVG viewBox height
   * - Matches layout engine coordinate system
   * 
   * @validation Must be > 0
   * 
   * @example
   * ```typescript
   * height: 1200  // Standard viewBox height
   * height: 1600  // Taller viewport
   * height: 600   // Short view
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
 * Creates viewport from SVG element viewBox dimensions.
 * 
 * @param svg - SVG element to measure viewBox
 * @param scrollY - Current scroll position in logical units (default: 0)
 * @returns Viewport matching SVG viewBox at scroll position
 * 
 * @example
 * ```typescript
 * const svg = document.getElementById('score-svg') as SVGSVGElement;
 * const viewport = createViewportFromSVG(svg, currentScrollY);
 * renderer.render(layout, viewport);
 * ```
 */
export function createViewportFromSVG(
  svg: SVGSVGElement,
  scrollY?: number
): Viewport;

/**
 * Checks if system bounding box intersects viewport.
 * Used internally by getVisibleSystems() for binary search.
 * 
 * @param systemY - System top Y coordinate (logical units)
 * @param systemHeight - System height (logical units)
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
 * Calculates total viewport area in square logical units.
 * Used for performance metrics (logical units/sec throughput).
 * 
 * @param viewport - Viewport to measure
 * @returns Area in square logical units
 * 
 * @example
 * ```typescript
 * const viewport = { x: 0, y: 0, width: 800, height: 600 };
 * const area = getViewportArea(viewport); // 480000 square logical units
 * ```
 */
export function getViewportArea(viewport: Viewport): number;
