/**
 * TypeScript Contracts: Rust Layout Engine WASM Bindings
 * 
 * These interfaces define the contract between Rust WASM module and TypeScript frontend.
 * Generated from Rust structs via wasm-bindgen with manual TypeScript definitions.
 * 
 * Convention: Rust snake_case → TypeScript camelCase for fields
 * Rust types: f32 → number, u32 → number, String → string, Vec<T> → T[]
 */

/**
 * Root container for entire score layout.
 * Single instance per score returned by compute_layout().
 */
export interface GlobalLayout {
  /** Ordered array of systems from top to bottom */
  systems: System[];
  
  /** Width of widest system in logical units */
  totalWidth: number;
  
  /** Sum of all system heights + inter-system spacing in logical units */
  totalHeight: number;
  
  /** Scaling factor: how many logical units = 1 staff space (default: 10.0) */
  unitsPerSpace: number;
}

/**
 * System containing 1-N measures of music arranged horizontally.
 * Primary virtualization boundary for efficient rendering.
 */
export interface System {
  /** 0-based system number (sequential: 0, 1, 2, ...) */
  index: number;
  
  /** Screen region occupied by system (for viewport intersection checks) */
  boundingBox: BoundingBox;
  
  /** Instruments/staff groups in this system (piano = 1, orchestra = 8+) */
  staffGroups: StaffGroup[];
  
  /** Musical time span covered by system (in 960 PPQ ticks) */
  tickRange: TickRange;
}

/**
 * Groups related staves for multi-staff instruments.
 * Piano has 2 staves (treble + bass), solo instruments have 1.
 */
export interface StaffGroup {
  /** Links to CompiledScore.Instrument.id */
  instrumentId: string;
  
  /** 1-2 staves per group (MVP limit) */
  staves: Staff[];
  
  /** Visual grouping indicator (Brace, Bracket, or None) */
  bracketType: BracketType;
}

/**
 * Single 5-line staff with positioned glyphs.
 */
export interface Staff {
  /** Exactly 5 horizontal lines (standard music staff) */
  staffLines: [StaffLine, StaffLine, StaffLine, StaffLine, StaffLine];
  
  /** Batched glyphs for efficient rendering (may be empty for whole rest measures) */
  glyphRuns: GlyphRun[];
  
  /** Clefs, key signatures, time signatures at staff start (drawn before glyphRuns) */
  structuralGlyphs: Glyph[];
}

/**
 * Single horizontal line in a staff.
 */
export interface StaffLine {
  /** Vertical position in logical units (system-relative, increases downward) */
  yPosition: number;
  
  /** Left edge of line in logical units */
  startX: number;
  
  /** Right edge of line in logical units */
  endX: number;
}

/**
 * Batches consecutive glyphs with identical drawing properties.
 * Enables single Canvas fillText() or WebGL draw call per run.
 */
export interface GlyphRun {
  /** All glyphs in this batch (non-empty) */
  glyphs: Glyph[];
  
  /** Font name (typically "Bravura" for SMuFL) */
  fontFamily: string;
  
  /** Font size in logical units (typically 40.0 = 4 staff spaces) */
  fontSize: number;
  
  /** RGBA color for all glyphs */
  color: Color;
  
  /** Additional opacity multiplier (range [0.0, 1.0]) */
  opacity: number;
}

/**
 * Single drawable musical symbol with position and source linkage.
 */
export interface Glyph {
  /** (x, y) coordinates in logical units (system-relative) */
  position: Point;
  
  /** Hit-testing rectangle including ledger lines */
  boundingBox: BoundingBox;
  
  /** SMuFL Unicode codepoint (e.g., "\uE0A4" = quarter notehead) */
  codepoint: string;
  
  /** Link back to CompiledScore element for interaction */
  sourceReference: SourceReference;
}

/**
 * Rectangular hit-testing and clipping region.
 */
export interface BoundingBox {
  /** X-coordinate of top-left corner in logical units */
  x: number;
  
  /** Y-coordinate of top-left corner in logical units */
  y: number;
  
  /** Width in logical units */
  width: number;
  
  /** Height in logical units */
  height: number;
}

/**
 * 2D coordinate in logical units.
 */
export interface Point {
  /** X-coordinate (left-to-right, positive = rightward) */
  x: number;
  
  /** Y-coordinate (top-to-bottom, positive = downward) */
  y: number;
}

/**
 * Musical time span using 960 PPQ resolution.
 */
export interface TickRange {
  /** First tick in range (inclusive, 960 PPQ) */
  startTick: number;
  
  /** Last tick in range (exclusive, 960 PPQ) */
  endTick: number;
}

/**
 * Links layout glyphs back to CompiledScore domain entities.
 */
export interface SourceReference {
  /** CompiledScore instrument identifier */
  instrumentId: string;
  
  /** Staff number within instrument (0 = treble, 1 = bass for piano) */
  staffIndex: number;
  
  /** Voice number within staff (0-3 for polyphonic notation) */
  voiceIndex: number;
  
  /** Index into voice's event array */
  eventIndex: number;
}

/**
 * Visual grouping indicator for multi-staff instruments.
 */
export enum BracketType {
  /** Curved bracket (piano, harp) */
  Brace = "Brace",
  
  /** Square bracket (choir, strings) */
  Bracket = "Bracket",
  
  /** No bracket (solo instruments) */
  None = "None",
}

/**
 * RGBA color representation.
 */
export interface Color {
  /** Red component (0-255) */
  r: number;
  
  /** Green component (0-255) */
  g: number;
  
  /** Blue component (0-255) */
  b: number;
  
  /** Alpha component (0-255, 255 = opaque) */
  a: number;
}

/**
 * Color constants for common use cases.
 */
export const Colors = {
  BLACK: { r: 0, g: 0, b: 0, a: 255 } as Color,
  GRAY: { r: 128, g: 128, b: 128, a: 255 } as Color,
  WHITE: { r: 255, g: 255, b: 255, a: 255 } as Color,
} as const;
