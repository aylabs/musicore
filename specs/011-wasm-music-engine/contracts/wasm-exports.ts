/**
 * WASM Exports Contract
 * 
 * Defines the TypeScript interface for all functions exported from the Rust WASM module.
 * These signatures match the wasm-bindgen exports defined in backend/src/adapters/wasm/
 * 
 * Feature: 011-wasm-music-engine
 * Date: 2026-02-09
 */

import type { Score, Instrument, Staff, Voice, Note } from './domain-types';
import type { WasmError } from './error-handling';

/**
 * WASM Module Interface
 * 
 * All functions return Promises because WASM operations are asynchronous.
 * Errors are thrown as WasmError objects (structured exceptions).
 */
export interface MusicEngineWasm {
  // ============================================================================
  // Score Management
  // ============================================================================
  
  /**
   * Create a new empty score with default structural events
   * 
   * @param title - Optional score title (defaults to "Untitled")
   * @returns New Score with default tempo (120 BPM) and time signature (4/4)
   * 
   * @example
   * const score = await wasm.create_score("My Symphony");
   */
  create_score(title?: string): Promise<Score>;
  
  // ============================================================================
  // MusicXML Import
  // ============================================================================
  
  /**
   * Parse MusicXML file bytes into a Score domain object
   * 
   * @param xmlBytes - Raw MusicXML file content (UTF-8 encoded)
   * @returns Parsed score with all instruments, staves, voices, notes, and events
   * 
   * @throws {WasmError} ParseError - Invalid MusicXML structure
   * @throws {WasmError} ValidationError - Content violates domain rules
   * 
   * @example
   * const xmlBytes = new Uint8Array(await file.arrayBuffer());
   * const score = await wasm.parse_musicxml(xmlBytes);
   */
  parse_musicxml(xmlBytes: Uint8Array): Promise<Score>;
  
  // ============================================================================
  // Domain Entity Operations
  // ============================================================================
  
  /**
   * Add an instrument to a score
   * 
   * @param score - Current score (will not be mutated)
   * @param name - Instrument name (e.g., "Piano", "Violin")
   * @returns New score with added instrument (contains default staff and voice)
   * 
   * @throws {WasmError} ValidationError - Invalid instrument name
   * 
   * @example
   * const updatedScore = await wasm.add_instrument(score, "Piano");
   */
  add_instrument(score: Score, name: string): Promise<Score>;
  
  /**
   * Add a staff to an instrument
   * 
   * @param score - Current score
   * @param instrumentId - UUID of the target instrument
   * @returns New score with added staff (contains default clef and voice)
   * 
   * @throws {WasmError} InstrumentNotFoundError - Instrument ID doesn't exist
   * 
   * @example
   * const updatedScore = await wasm.add_staff(score, instrumentId);
   */
  add_staff(score: Score, instrumentId: string): Promise<Score>;
  
  /**
   * Add a voice to a staff
   * 
   * @param score - Current score
   * @param staffId - UUID of the target staff
   * @returns New score with added voice
   * 
   * @throws {WasmError} StaffNotFoundError - Staff ID doesn't exist
   * 
   * @example
   * const updatedScore = await wasm.add_voice(score, staffId);
   */
  add_voice(score: Score, staffId: string): Promise<Score>;
  
  /**
   * Add a note to a voice with domain validation
   * 
   * @param score - Current score
   * @param voiceId - UUID of the target voice
   * @param note - Note to add (must have tick, duration, pitch)
   * @returns New score with added note
   * 
   * @throws {WasmError} NoteOverlapError - Note overlaps with existing note of same pitch
   * @throws {WasmError} InvalidPitchError - MIDI pitch outside valid range (0-127)
   * @throws {WasmError} VoiceNotFoundError - Voice ID doesn't exist
   * @throws {WasmError} InvalidTickError - Negative tick or duration
   * 
   * @example
   * const note = { id: uuid(), tick: 0, duration: 960, pitch: 60 };
   * const updatedScore = await wasm.add_note(score, voiceId, note);
   */
  add_note(score: Score, voiceId: string, note: Note): Promise<Score>;
  
  // ============================================================================
  // Structural Events
  // ============================================================================
  
  /**
   * Add a tempo change event
   * 
   * @param score - Current score
   * @param tick - Absolute position in score timeline (960 PPQ resolution)
   * @param bpm - Beats per minute
   * @returns New score with added tempo event
   * 
   * @throws {WasmError} InvalidTickError - Negative tick
   * @throws {WasmError} InvalidTempoError - BPM <= 0
   * 
   * @example
   * const updatedScore = await wasm.add_tempo_event(score, 0, 120);
   */
  add_tempo_event(score: Score, tick: number, bpm: number): Promise<Score>;
  
  /**
   * Add a time signature change event
   * 
   * @param score - Current score
   * @param tick - Absolute position in score timeline
   * @param numerator - Top number (e.g., 4 in 4/4)
   * @param denominator - Bottom number (e.g., 4 in 4/4, must be power of 2)
   * @returns New score with added time signature event
   * 
   * @throws {WasmError} InvalidTickError - Negative tick
   * @throws {WasmError} InvalidTimeSignatureError - Invalid numerator/denominator
   * 
   * @example
   * const updatedScore = await wasm.add_time_signature_event(score, 0, 4, 4);
   */
  add_time_signature_event(
    score: Score,
    tick: number,
    numerator: number,
    denominator: number
  ): Promise<Score>;
  
  /**
   * Add a clef change event to a staff
   * 
   * @param score - Current score
   * @param staffId - UUID of the target staff
   * @param tick - Absolute position in score timeline
   * @param clefType - Clef type (treble, bass, alto, tenor)
   * @returns New score with added clef event
   * 
   * @throws {WasmError} StaffNotFoundError - Staff ID doesn't exist
   * @throws {WasmError} InvalidClefError - Invalid clef type
   * 
   * @example
   * const updatedScore = await wasm.add_clef_event(score, staffId, 0, "treble");
   */
  add_clef_event(
    score: Score,
    staffId: string,
    tick: number,
    clefType: 'treble' | 'bass' | 'alto' | 'tenor'
  ): Promise<Score>;
  
  /**
   * Add a key signature change event to a staff
   * 
   * @param score - Current score
   * @param staffId - UUID of the target staff
   * @param tick - Absolute position in score timeline
   * @param key - Key signature (e.g., "C", "G", "Dm", "F#")
   * @returns New score with added key signature event
   * 
   * @throws {WasmError} StaffNotFoundError - Staff ID doesn't exist
   * @throws {WasmError} InvalidKeyError - Invalid key signature format
   * 
   * @example
   * const updatedScore = await wasm.add_key_signature_event(score, staffId, 0, "C");
   */
  add_key_signature_event(
    score: Score,
    staffId: string,
    tick: number,
    key: string
  ): Promise<Score>;
}

/**
 * WASM Module Initialization
 * 
 * Function signature for the WASM module initializer generated by wasm-pack.
 * Must be called before any WASM functions can be used.
 * 
 * @param wasmPath - Path to the .wasm binary file
 * @returns Initialized WASM module with all exported functions
 * 
 * @example
 * import init from '/wasm/musiccore.js';
 * const wasm = await init('/wasm/musiccore_bg.wasm');
 * const score = await wasm.create_score("My Score");
 */
export type WasmInit = (wasmPath: string) => Promise<MusicEngineWasm>;

/**
 * Type guard to check if WASM is initialized
 */
export function isWasmInitialized(wasm: any): wasm is MusicEngineWasm {
  return (
    typeof wasm === 'object' &&
    typeof wasm.create_score === 'function' &&
    typeof wasm.parse_musicxml === 'function'
  );
}
