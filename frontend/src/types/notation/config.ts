/**
 * Configuration for staff notation rendering
 */

/**
 * SMuFL (Standard Music Font Layout) codepoint constants
 * Reference: https://www.smufl.org/
 */
export const SMUFL_CODEPOINTS = {
  // Clefs
  TREBLE_CLEF: '\uE050',
  BASS_CLEF: '\uE062',
  ALTO_CLEF: '\uE05C',
  TENOR_CLEF: '\uE05D',
  
  // Note heads (without stems)
  NOTEHEAD_BLACK: '\uE0A4',
  NOTEHEAD_HALF: '\uE0A3',
  NOTEHEAD_WHOLE: '\uE0A2',
  
  // Quarter notes (black notes with stems) - duration 960 ticks
  QUARTER_NOTE_UP: '\uE1D5',    // Stem up (for notes below middle line)
  QUARTER_NOTE_DOWN: '\uE1D6',  // Stem down (for notes on/above middle line)
  
  // Eighth notes (black notes with stems and 1 flag) - duration 480 ticks
  EIGHTH_NOTE_UP: '\uE1D7',     // Stem up with flag
  EIGHTH_NOTE_DOWN: '\uE1D8',   // Stem down with flag
  
  // Sixteenth notes (black notes with stems and 2 flags) - duration 240 ticks
  SIXTEENTH_NOTE_UP: '\uE1D9',  // Stem up with double flag
  SIXTEENTH_NOTE_DOWN: '\uE1DA', // Stem down with double flag
  
  // Half notes (white/hollow notes with stems) - duration 1920 ticks
  HALF_NOTE_UP: '\uE1D3',       // Stem up
  HALF_NOTE_DOWN: '\uE1D4',     // Stem down
  
  // Whole notes (white/hollow round notes, no stems) - duration 3840+ ticks
  WHOLE_NOTE: '\uE0A2',
  
  // Other notes
  EIGHTH_NOTE: '\uE0A5',
  SIXTEENTH_NOTE: '\uE0A6',
  
  // Accidentals
  SHARP: '\uE262',
  FLAT: '\uE260',
  NATURAL: '\uE261',
  DOUBLE_SHARP: '\uE263',
  DOUBLE_FLAT: '\uE264',
  
  // Time signatures
  TIME_SIG_0: '\uE080',
  TIME_SIG_1: '\uE081',
  TIME_SIG_2: '\uE082',
  TIME_SIG_3: '\uE083',
  TIME_SIG_4: '\uE084',
  TIME_SIG_5: '\uE085',
  TIME_SIG_6: '\uE086',
  TIME_SIG_7: '\uE087',
  TIME_SIG_8: '\uE088',
  TIME_SIG_9: '\uE089',
} as const;

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
