/**
 * Domain Types Contract
 * 
 * TypeScript interfaces for domain entities shared between frontend and WASM.
 * These types MUST remain unchanged - they are the contract between layers.
 * 
 * Rust structs in backend/src/domain/ serialize to JSON matching these interfaces exactly.
 * 
 * Feature: 011-wasm-music-engine
 * Date: 2026-02-09
 */

/**
 * Score - Aggregate root for music timeline
 * 
 * Represents a complete musical score with instruments, notes, and structural events.
 * Uses 960 PPQ (Pulses Per Quarter note) resolution for precise timing.
 */
export interface Score {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** Score title (e.g., "Symphony No. 5") */
  title: string;
  
  /** Pulses Per Quarter note - always 960 (immutable) */
  ppq: number;
  
  /** Collection of instruments in score order */
  instruments: Instrument[];
  
  /** Global structural events affecting entire score */
  structural_events: {
    /** Tempo changes throughout the score */
    tempo_changes: TempoEvent[];
    
    /** Time signature changes throughout the score */
    time_signatures: TimeSignatureEvent[];
  };
}

/**
 * Instrument - Represents a musical instrument (e.g., Piano, Violin)
 * 
 * Contains one or more staves (e.g., Piano has 2 staves: treble + bass)
 */
export interface Instrument {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** Instrument name (e.g., "Piano", "Violin") */
  name: string;
  
  /** Staves belonging to this instrument */
  staves: Staff[];
}

/**
 * Staff - Represents a musical staff (5-line grid for notation)
 * 
 * Contains voices (polyphonic layers) and staff-specific events (clef, key signature)
 */
export interface Staff {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** Voices on this staff (typically 1-4 for polyphonic music) */
  voices: Voice[];
  
  /** Staff-specific structural events */
  events: {
    /** Clef changes throughout the staff */
    clefs: ClefEvent[];
    
    /** Key signature changes throughout the staff */
    key_signatures: KeySignatureEvent[];
  };
}

/**
 * Voice - Represents a polyphonic voice within a staff
 * 
 * Contains notes that should not overlap (same pitch at same time).
 * Domain validation enforces no overlapping notes of the same pitch.
 */
export interface Voice {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** Notes in this voice (ordered by tick position) */
  notes: Note[];
}

/**
 * Note - Represents a musical note (interval event)
 * 
 * Uses absolute tick positioning (960 PPQ resolution) and MIDI pitch (0-127)
 */
export interface Note {
  /** Unique identifier (UUID v4) */
  id: string;
  
  /** Absolute position in score timeline (960 ticks = 1 quarter note) */
  tick: number;
  
  /** Duration in ticks (e.g., 960 = quarter note, 480 = eighth note) */
  duration: number;
  
  /** MIDI pitch number (0-127, where 60 = Middle C) */
  pitch: number;
}

/**
 * TempoEvent - Structural event for tempo changes
 * 
 * Applies to entire score starting at specified tick
 */
export interface TempoEvent {
  /** Absolute position where tempo change occurs */
  tick: number;
  
  /** Beats per minute (e.g., 120) */
  bpm: number;
}

/**
 * TimeSignatureEvent - Structural event for time signature changes
 * 
 * Applies to entire score starting at specified tick
 */
export interface TimeSignatureEvent {
  /** Absolute position where time signature change occurs */
  tick: number;
  
  /** Top number (e.g., 4 in 4/4) */
  numerator: number;
  
  /** Bottom number (e.g., 4 in 4/4, must be power of 2: 1, 2, 4, 8, 16) */
  denominator: number;
}

/**
 * ClefEvent - Staff-specific event for clef changes
 * 
 * Determines how pitches map to staff lines/spaces
 */
export interface ClefEvent {
  /** Absolute position where clef change occurs */
  tick: number;
  
  /** Clef type (affects pitch-to-position mapping) */
  clef_type: ClefType;
}

/**
 * ClefType - Supported clef types
 */
export type ClefType = 
  | 'treble'  // G clef (middle C is first ledger line below)
  | 'bass'    // F clef (middle C is first ledger line above)
  | 'alto'    // C clef (middle C is on middle line)
  | 'tenor';  // C clef (middle C is on fourth line)

/**
 * KeySignatureEvent - Staff-specific event for key signature changes
 * 
 * Determines which notes are sharp/flat by default
 */
export interface KeySignatureEvent {
  /** Absolute position where key signature change occurs */
  tick: number;
  
  /** Key signature string (e.g., "C", "G", "Dm", "F#") */
  key: string;
}

/**
 * Type guards for runtime type checking
 */

export function isScore(obj: any): obj is Score {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    obj.ppq === 960 &&
    Array.isArray(obj.instruments)
  );
}

export function isNote(obj: any): obj is Note {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.tick === 'number' &&
    typeof obj.duration === 'number' &&
    typeof obj.pitch === 'number' &&
    obj.pitch >= 0 &&
    obj.pitch <= 127
  );
}

/**
 * Constants
 */

/** Standard PPQ (Pulses Per Quarter note) resolution */
export const PPQ = 960;

/** MIDI pitch range */
export const MIDI_PITCH_MIN = 0;
export const MIDI_PITCH_MAX = 127;

/** Middle C (MIDI pitch 60) */
export const MIDDLE_C = 60;
