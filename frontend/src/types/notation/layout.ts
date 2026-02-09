import type { StaffConfig } from './config';

/**
 * Positioned note head with geometry and metadata
 */
export interface NotePosition {
  /** Note ID from domain model */
  id: string;
  
  /** X coordinate (horizontal position) in pixels */
  x: number;
  
  /** Y coordinate (vertical position) in pixels, relative to top of staff */
  y: number;
  
  /** MIDI pitch number */
  pitch: number;
  
  /** Start tick position (for hover/selection tooltip) */
  start_tick: number;
  
  /** Duration in ticks (for future stem rendering) */
  duration_ticks: number;
  
  /** Staff position (for ledger line calculation) */
  staffPosition: number;
  
  /** SMuFL codepoint for note head glyph (default: U+E0A4 quarter note) */
  glyphCodepoint: string;
  
  /** Font size for this glyph in pixels */
  fontSize: number;
  
  /** Accidental type if this note needs one (sharp/flat/natural) */
  accidental?: 'sharp' | 'flat' | 'natural';
}

/**
 * Horizontal staff line
 */
export interface StaffLine {
  /** Y coordinate in pixels */
  y: number;
  
  /** X start coordinate (usually 0 or marginLeft) */
  x1: number;
  
  /** X end coordinate (full width) */
  x2: number;
  
  /** Line number (0=bottom, 4=top for 5-line staff) */
  lineNumber: number;
  
  /** Stroke width in pixels (default: 1) */
  strokeWidth: number;
}

/**
 * Vertical barline at measure boundary
 */
export interface Barline {
  /** Unique key for React rendering */
  id: string;
  
  /** X coordinate in pixels */
  x: number;
  
  /** Tick position in timeline */
  tick: number;
  
  /** Y start coordinate (top of staff) */
  y1: number;
  
  /** Y end coordinate (bottom of staff) */
  y2: number;
  
  /** Measure number (1-indexed) */
  measureNumber: number;
  
  /** Stroke width in pixels */
  strokeWidth: number;
}

/**
 * Short horizontal line for notes outside staff range
 */
export interface LedgerLine {
  /** Unique key for React rendering */
  id: string;
  
  /** X start coordinate (centered on note) */
  x1: number;
  
  /** X end coordinate */
  x2: number;
  
  /** Y coordinate in pixels */
  y: number;
  
  /** Associated note ID */
  noteId: string;
  
  /** Stroke width in pixels (default: 1) */
  strokeWidth: number;
}

/**
 * Clef symbol position (rendered in fixed margin)
 */
export interface ClefPosition {
  /** Clef type */
  type: 'Treble' | 'Bass' | 'Alto' | 'Tenor';
  
  /** X coordinate in pixels (within fixed margin) */
  x: number;
  
  /** Y coordinate in pixels (baseline for glyph) */
  y: number;
  
  /** SMuFL codepoint (U+E050 for treble, U+E062 for bass) */
  glyphCodepoint: string;
  
  /** Font size in pixels */
  fontSize: number;
}

/**
 * Accidental symbol in key signature
 */
export interface AccidentalPosition {
  /** Accidental type */
  type: 'sharp' | 'flat';
  
  /** X coordinate in pixels */
  x: number;
  
  /** Y coordinate in pixels */
  y: number;
  
  /** Staff line/space number where accidental appears */
  staffPosition: number;
  
  /** SMuFL codepoint (U+E262 sharp, U+E260 flat) */
  glyphCodepoint: string;
  
  /** Font size in pixels */
  fontSize: number;
}

/**
 * Complete layout geometry for rendering
 */
export interface LayoutGeometry {
  /** Positioned note elements */
  notes: NotePosition[];
  
  /** Staff line positions */
  staffLines: StaffLine[];
  
  /** Barline positions */
  barlines: Barline[];
  
  /** Ledger line positions */
  ledgerLines: LedgerLine[];
  
  /** Clef symbol position and type */
  clef: ClefPosition;
  
  /** Key signature accidentals */
  keySignatureAccidentals: AccidentalPosition[];
  
  /** Total width of rendered content (for scrollbar sizing) */
  totalWidth: number;
  
  /** Total height of staff system */
  totalHeight: number;
  
  /** Left margin width (fixed region) */
  marginLeft: number;
  
  /** Indices of notes currently visible in viewport */
  visibleNoteIndices: {startIdx: number; endIdx: number};
}

/**
 * Input data for layout calculation
 */
export interface LayoutInput {
  /** Notes to render (from Voice.interval_events) */
  notes: any[]; // Will use actual Note type from score.ts
  
  /** Current clef type */
  clef: string; // Will use actual ClefType from score.ts
  
  /** Current key signature */
  keySignature?: any;
  
  /** Current time signature for barline calculation */
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  
  /** Configuration parameters */
  config: StaffConfig;
}

/**
 * Feature 009: Playback Scroll and Highlight
 * Note highlight state during playback
 */

/**
 * Highlight state for a note during playback
 */
export interface NoteHighlight {
  /** Note ID being highlighted */
  noteId: string;
  
  /** Start tick of the note */
  startTick: number;
  
  /** End tick of the note (start + duration) */
  endTick: number;
  
  /** Whether the note is currently playing */
  isPlaying: boolean;
}

/**
 * Highlight calculation result
 */
export interface HighlightResult {
  /** Array of note IDs currently playing */
  playingNoteIds: string[];
  
  /** Map of note ID to highlight state (for additional metadata if needed) */
  highlightMap: Map<string, NoteHighlight>;
}
