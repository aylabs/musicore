/**
 * RenderConfig - Configuration for SVG music notation renderer
 * 
 * Controls visual appearance (colors, fonts, sizing) for LayoutRenderer component.
 */

/**
 * Configuration for music notation rendering
 */
export interface RenderConfig {
  /** Font size for SMuFL glyphs in logical units (typically 40 = 2 staff spaces) */
  fontSize: number;
  
  /** Font family for SMuFL glyphs (typically "Bravura") */
  fontFamily: string;
  
  /** Background color (CSS color string, e.g., "#FFFFFF" or "#1E1E1E" for dark mode) */
  backgroundColor: string;
  
  /** Staff line color (CSS color string, e.g., "#000000" or "#CCCCCC" for dark mode) */
  staffLineColor: string;
  
  /** Glyph color (CSS color string, e.g., "#000000" or "#FFFFFF" for dark mode) */
  glyphColor: string;
}
