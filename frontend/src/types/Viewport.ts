/**
 * Viewport - Visible region for virtualized rendering
 * 
 * Defines the rectangular area to render (in logical units).
 * Used for DOM virtualization - only systems within viewport are rendered.
 */

/**
 * Rectangular viewing region in logical units
 */
export interface Viewport {
  /** X-coordinate of top-left corner */
  x: number;
  
  /** Y-coordinate of top-left corner */
  y: number;
  
  /** Width of viewport */
  width: number;
  
  /** Height of viewport */
  height: number;
}
