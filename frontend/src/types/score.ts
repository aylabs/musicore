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
export enum ClefType {
  Treble = "Treble",
  Bass = "Bass",
  Alto = "Alto",
  Tenor = "Tenor",
}

/** Key signature types */
export enum KeySignature {
  CMajor = "CMajor",
  GMajor = "GMajor",
  DMajor = "DMajor",
  AMajor = "AMajor",
  EMajor = "EMajor",
  BMajor = "BMajor",
  FSharpMajor = "FSharpMajor",
  CSharpMajor = "CSharpMajor",
  FMajor = "FMajor",
  BFlatMajor = "BFlatMajor",
  EFlatMajor = "EFlatMajor",
  AFlatMajor = "AFlatMajor",
  DFlatMajor = "DFlatMajor",
  GFlatMajor = "GFlatMajor",
  CFlatMajor = "CFlatMajor",
  AMinor = "AMinor",
  EMinor = "EMinor",
  BMinor = "BMinor",
  FSharpMinor = "FSharpMinor",
  CSharpMinor = "CSharpMinor",
  GSharpMinor = "GSharpMinor",
  DSharpMinor = "DSharpMinor",
  ASharpMinor = "ASharpMinor",
  DMinor = "DMinor",
  GMinor = "GMinor",
  CMinor = "CMinor",
  FMinor = "FMinor",
  BFlatMinor = "BFlatMinor",
  EFlatMinor = "EFlatMinor",
  AFlatMinor = "AFlatMinor",
}

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
  tick: Tick;
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
  staff_structural_events: StaffStructuralEvent[];
  voices: Voice[];
}

/** Instrument contains staves */
export interface Instrument {
  id: string; // UUID
  name: string;
  staves: Staff[];
}

/** Score is the aggregate root containing all musical elements */
export interface Score {
  id: string; // UUID
  global_structural_events: GlobalStructuralEvent[];
  instruments: Instrument[];
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
  tick: Tick;
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
