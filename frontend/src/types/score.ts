// TypeScript types mirroring backend domain entities

// ============================================================================
// Value Objects
// ============================================================================

/** Tick represents a time position at 960 PPQ (Pulses Per Quarter note) */
export type Tick = number;

/** BPM (Beats Per Minute) - valid range: 20-400 */
export type BPM = number;

/** MIDI pitch - valid range: 0-127 */
export type Pitch = number;

/** Clef types */
export type ClefType = "Treble" | "Bass" | "Alto" | "Tenor";

/** Key signature types */
export type KeySignature =
  | "CMajor"
  | "GMajor"
  | "DMajor"
  | "AMajor"
  | "EMajor"
  | "BMajor"
  | "FSharpMajor"
  | "CSharpMajor"
  | "FMajor"
  | "BFlatMajor"
  | "EFlatMajor"
  | "AFlatMajor"
  | "DFlatMajor"
  | "GFlatMajor"
  | "CFlatMajor"
  | "AMinor"
  | "EMinor"
  | "BMinor"
  | "FSharpMinor"
  | "CSharpMinor"
  | "GSharpMinor"
  | "DSharpMinor"
  | "ASharpMinor"
  | "DMinor"
  | "GMinor"
  | "CMinor"
  | "FMinor"
  | "BFlatMinor"
  | "EFlatMinor"
  | "AFlatMinor";

// ============================================================================
// Events
// ============================================================================

/** Tempo change event */
export interface TempoEvent {
  tick: Tick;
  bpm: BPM;
}

/** Time signature change event */
export interface TimeSignatureEvent {
  tick: Tick;
  numerator: number;
  denominator: number;
}

/** Clef change event */
export interface ClefEvent {
  tick: Tick;
  clef_type: ClefType;
}

/** Key signature change event */
export interface KeySignatureEvent {
  tick: Tick;
  key: KeySignature;
}

/** Global structural events (tempo, time signature) */
export type GlobalStructuralEvent =
  | { Tempo: TempoEvent }
  | { TimeSignature: TimeSignatureEvent };

/** Staff-scoped structural events (clef, key signature) */
export type StaffStructuralEvent =
  | { Clef: ClefEvent }
  | { KeySignature: KeySignatureEvent };

/** Note event */
export interface Note {
  id: string; // UUID
  start_tick: Tick;
  duration_ticks: number;
  pitch: Pitch;
}

// ============================================================================
// Domain Entities
// ============================================================================

/** Voice contains notes with overlap validation */
export interface Voice {
  id: string; // UUID
  interval_events: Note[];
}

/** Staff contains voices and staff-scoped structural events */
export interface Staff {
  id: string; // UUID
  active_clef: ClefType; // Feature 007: Active clef derived from first ClefEvent
  staff_structural_events: StaffStructuralEvent[];
  voices: Voice[];
}

/** Instrument contains staves */
export interface Instrument {
  id: string; // UUID
  name: string;
  /** Type of instrument for playback (e.g., "piano", "guitar") - Feature 003: Music Playback */
  instrument_type: string;
  staves: Staff[];
}

/** Score is the aggregate root containing all musical elements */
export interface Score {
  id: string; // UUID
  global_structural_events: GlobalStructuralEvent[];
  instruments: Instrument[];
}

/**
 * Get the instrument for playback from a score
 * Feature 003: Music Playback - MVP uses first instrument only
 * Provides backward compatibility for scores without instruments
 */
export function getScoreInstrument(score: Score): Instrument {
  if (score.instruments.length === 0) {
    // Backward compatibility: no instruments → default piano
    return {
      id: 'default',
      name: 'Default Piano',
      instrument_type: 'piano',
      staves: [],
    };
  }
  return score.instruments[0]; // MVP: Use first instrument only
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/** Request to create a new score */
export interface CreateScoreRequest {
  title?: string;
}

/** Request to add an instrument */
export interface AddInstrumentRequest {
  name: string;
}

/** Request to add a note */
export interface AddNoteRequest {
  start_tick: Tick;
  duration_ticks: number;
  pitch: Pitch;
}

/** Request to add a tempo event */
export interface AddTempoEventRequest {
  tick: Tick;
  bpm: BPM;
}

/** Request to add a time signature event */
export interface AddTimeSignatureEventRequest {
  tick: Tick;
  numerator: number;
  denominator: number;
}

/** Request to add a clef event */
export interface AddClefEventRequest {
  tick: Tick;
  clef_type: ClefType;
}

/** Request to add a key signature event */
export interface AddKeySignatureEventRequest {
  tick: Tick;
  key: KeySignature;
}

/** API error response */
export interface ApiError {
  error: string;
  message: string;
}

/** API response wrapper for async operations */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}
