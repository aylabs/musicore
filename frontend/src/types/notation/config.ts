/**
 * Configuration for staff notation rendering
 */
export interface StaffConfig {
  /** Distance between staff lines in pixels (default: 10) */
  staffSpace: number;
  
  /** Horizontal scaling: pixels per tick (default: 0.1 = 1px per 10 ticks) */
  pixelsPerTick: number;
  
  /** Minimum horizontal spacing between note centers in pixels (default: 15) */
  minNoteSpacing: number;
  
  /** Viewport width in pixels for windowing calculations */
  viewportWidth: number;
  
  /** Viewport height in pixels */
  viewportHeight: number;
  
  /** Current horizontal scroll position in pixels */
  scrollX: number;
  
  /** Fixed left margin width for clef and key signature (default: 60) */
  marginLeft: number;
  
  /** Width allocated for clef symbol (default: 40) */
  clefWidth: number;
  
  /** Width per accidental in key signature (default: 15) */
  keySignatureWidthPerAccidental: number;
  
  /** Width of barline stroke (default: 2) */
  barlineWidth: number;
  
  /** Buffer region outside viewport to render (default: 200px on each side) */
  renderBuffer: number;
  
  /** Font size for SMuFL glyphs relative to staff space (default: 4.0) */
  glyphFontSizeMultiplier: number;
}

/** Default configuration values */
export const DEFAULT_STAFF_CONFIG: StaffConfig = {
  staffSpace: 10,
  pixelsPerTick: 0.1,
  minNoteSpacing: 15,
  viewportWidth: 1200,
  viewportHeight: 200,
  scrollX: 0,
  marginLeft: 60,
  clefWidth: 40,
  keySignatureWidthPerAccidental: 15,
  barlineWidth: 2,
  renderBuffer: 200,
  glyphFontSizeMultiplier: 4.0
};
