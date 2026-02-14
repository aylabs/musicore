/**
 * Rendering Configuration
 * Feature 017 - Display settings for LayoutRenderer
 * 
 * Centralizes rendering parameters (colors, scaling, fonts)
 * independent of layout computation.
 */

/**
 * Rendering configuration for LayoutRenderer.
 * Immutable value object, validated on construction.
 * 
 * @example Default configuration (tablet, 10" display):
 * ```typescript
 * const config: RenderConfig = {
 *   fontSize: 20,
 *   fontFamily: 'Bravura',
 *   backgroundColor: '#FFFFFF',
 *   staffLineColor: '#000000',
 *   glyphColor: '#000000'
 * };
 * ```
 * 
 * @example Zoomed in (2x magnification):
 * ```typescript
 * const zoomed: RenderConfig = {
 *   fontSize: 40, // 2x font size
 *   fontFamily: 'Bravura',
 *   backgroundColor: '#FFFFFF',
 *   staffLineColor: '#000000',
 *   glyphColor: '#000000'
 * };
 * ```
 * 
 * @example Dark mode:
 * ```typescript
 * const darkMode: RenderConfig = {
 *   fontSize: 20,
 *   fontFamily: 'Bravura',
 *   backgroundColor: '#1E1E1E',
 *   staffLineColor: '#CCCCCC',
 *   glyphColor: '#FFFFFF'
 * };
 * ```
 */
export interface RenderConfig {
  /**
   * Font size for SMuFL text elements (logical units).
   * 
   * - Default: 20 (matches staff space logical units)
   * - Range: 16-40 (zoom levels)
   * - Used directly in SVG viewBox coordinate system
   * 
   * @validation Must be > 0
   * 
   * @example
   * ```typescript
   * // Normal zoom (20 logical units per staff space)
   * fontSize: 20
   * 
   * // Zoomed in 2x (40 logical units)
   * fontSize: 40
   * 
   * // Zoomed out (16 logical units)
   * fontSize: 16
   * ```
   */
  fontSize: number;
  
  /**
   * Font family for SMuFL glyphs.
   * 
   * - Default: "Bravura" (Steinberg's reference font)
   * - Must be loaded via @font-face before use
   * - Alternative: "Petaluma", "Leland" (other SMuFL fonts)
   * 
   * @validation Must be non-empty string
   * 
   * @see https://www.smufl.org/fonts/ for SMuFL font list
   */
  fontFamily: string;
  
  /**
   * SVG background color (CSS color string).
   * 
   * - Default: "#FFFFFF" (white)
   * - Supports hex, rgb(), hsl(), named colors
   * 
   * @validation Must be valid CSS color
   * 
   * @example
   * ```typescript
   * backgroundColor: '#FFFFFF'  // Hex
   * backgroundColor: 'white'    // Named
   * backgroundColor: 'rgb(255, 255, 255)'  // RGB
   * backgroundColor: '#1E1E1E'  // Dark mode
   * ```
   */
  backgroundColor: string;
  
  /**
   * Staff line stroke color (CSS color string).
   * 
   * - Default: "#000000" (black)
   * - Used for 5-line staff via SVG <line> elements
   * 
   * @validation Must be valid CSS color
   * 
   * @example
   * ```typescript
   * staffLineColor: '#000000'  // Black (default)
   * staffLineColor: '#CCCCCC'  // Light gray (dark mode)
   * ```
   */
  staffLineColor: string;
  
  /**
   * Glyph fill color (CSS color string).
   * 
   * - Default: "#000000" (black)
   * - Used for noteheads, clefs, accidentals via SVG <text> elements
   * 
   * @validation Must be valid CSS color
   * 
   * @example
   * ```typescript
   * glyphColor: '#000000'  // Black (default)
   * glyphColor: '#FFFFFF'  // White (dark mode)
   * glyphColor: '#FF0000'  // Red (debugging)
   * ```
   */
  glyphColor: string;
}

/**
 * Validates RenderConfig for correctness.
 * Throws Error if validation fails.
 * 
 * @param config - Configuration to validate
 * 
 * @throws Error if fontSize <= 0
 * @throws Error if fontFamily is empty
 * @throws Error if any color is invalid CSS
 * 
 * @example
 * ```typescript
 * const config: RenderConfig = {
 *   fontSize: 20,
 *   fontFamily: 'Bravura',
 *   backgroundColor: '#FFFFFF',
 *   staffLineColor: '#000000',
 *   glyphColor: '#000000'
 * };
 * 
 * validateRenderConfig(config); // OK
 * 
 * const invalid: RenderConfig = {
 *   fontSize: -5, // Invalid!
 *   fontFamily: '',
 *   backgroundColor: 'invalid-color',
 *   staffLineColor: '#000000',
 *   glyphColor: '#000000'
 * };
 * 
 * validateRenderConfig(invalid); // Throws Error
 * ```
 */
export function validateRenderConfig(config: RenderConfig): void;

/**
 * Creates default RenderConfig for typical tablet display.
 * 
 * @returns RenderConfig with standard values
 * 
 * @example
 * ```typescript
 * const renderer = new LayoutRenderer(svg, createDefaultConfig());
 * ```
 */
export function createDefaultConfig(): RenderConfig;

/**
 * Creates dark mode RenderConfig variant.
 * 
 * @param fontSize - Optional zoom level (default: 20)
 * @returns RenderConfig with dark mode colors
 * 
 * @example
 * ```typescript
 * const darkConfig = createDarkModeConfig(24); // Dark mode + 1.2x zoom
 * const renderer = new LayoutRenderer(svg, darkConfig);
 * ```
 */
export function createDarkModeConfig(fontSize?: number): RenderConfig;
