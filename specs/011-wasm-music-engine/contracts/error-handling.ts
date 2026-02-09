/**
 * Error Handling Contract
 * 
 * Defines how Rust domain errors are propagated to TypeScript as structured exceptions.
 * Matches the error format from the previous REST API (ApiError) for compatibility.
 * 
 * Feature: 011-wasm-music-engine
 * Date: 2026-02-09
 */

/**
 * WasmError - Structured error thrown by WASM functions
 * 
 * Matches the ApiError format from REST API to minimize frontend changes.
 * Contains error type, human-readable message, and optional structured details.
 */
export interface WasmError {
  /** Error type identifier (e.g., "NoteOverlapError", "InvalidPitchError") */
  error: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Optional structured data for programmatic error handling */
  details?: {
    /** Voice ID where error occurred (for note errors) */
    voice_id?: string;
    
    /** Tick position where error occurred */
    tick?: number;
    
    /** Invalid pitch value (for pitch errors) */
    pitch?: number;
    
    /** Staff ID where error occurred (for staff errors) */
    staff_id?: string;
    
    /** Instrument ID where error occurred (for instrument errors) */
    instrument_id?: string;
    
    /** Additional context (varies by error type) */
    [key: string]: any;
  };
}

/**
 * Error Type Enumeration
 * 
 * All possible error types that can be thrown by WASM functions.
 * Maps to Rust DomainError enum variants in backend/src/domain/errors.rs
 */
export enum WasmErrorType {
  // ============================================================================
  // Domain Validation Errors
  // ============================================================================
  
  /** Note overlaps with existing note of same pitch in voice */
  NoteOverlapError = 'NoteOverlapError',
  
  /** MIDI pitch value outside valid range (0-127) */
  InvalidPitchError = 'InvalidPitchError',
  
  /** Tick value is negative or invalid */
  InvalidTickError = 'InvalidTickError',
  
  /** Duration value is negative or zero */
  InvalidDurationError = 'InvalidDurationError',
  
  /** Tempo BPM value is invalid (<= 0) */
  InvalidTempoError = 'InvalidTempoError',
  
  /** Time signature numerator/denominator is invalid */
  InvalidTimeSignatureError = 'InvalidTimeSignatureError',
  
  /** Clef type string is not recognized */
  InvalidClefError = 'InvalidClefError',
  
  /** Key signature string format is invalid */
  InvalidKeyError = 'InvalidKeyError',
  
  /** Instrument name is empty or invalid */
  InvalidInstrumentNameError = 'InvalidInstrumentNameError',
  
  // ============================================================================
  // Entity Not Found Errors
  // ============================================================================
  
  /** Voice ID does not exist in score */
  VoiceNotFoundError = 'VoiceNotFoundError',
  
  /** Staff ID does not exist in score */
  StaffNotFoundError = 'StaffNotFoundError',
  
  /** Instrument ID does not exist in score */
  InstrumentNotFoundError = 'InstrumentNotFoundError',
  
  /** Note ID does not exist in voice */
  NoteNotFoundError = 'NoteNotFoundError',
  
  // ============================================================================
  // MusicXML Import Errors
  // ============================================================================
  
  /** MusicXML parsing failed (invalid XML, missing elements) */
  ParseError = 'ParseError',
  
  /** MusicXML content is valid XML but violates domain rules */
  ValidationError = 'ValidationError',
  
  /** Unsupported MusicXML feature encountered */
  UnsupportedFeatureError = 'UnsupportedFeatureError',
  
  // ============================================================================
  // System Errors
  // ============================================================================
  
  /** WASM module failed to initialize */
  WasmInitializationError = 'WasmInitializationError',
  
  /** Serialization between JS and Rust failed */
  SerializationError = 'SerializationError',
  
  /** Unexpected internal error (should be rare) */
  InternalError = 'InternalError',
}

/**
 * Type guard to check if an error is a WasmError
 */
export function isWasmError(error: any): error is WasmError {
  return (
    typeof error === 'object' &&
    typeof error.error === 'string' &&
    typeof error.message === 'string'
  );
}

/**
 * Type guard to check if error is a specific type
 */
export function isErrorType(error: any, type: WasmErrorType): boolean {
  return isWasmError(error) && error.error === type;
}

/**
 * Error handling utilities
 */

/**
 * Format a WasmError for user display
 * 
 * @param error - WasmError object
 * @returns Human-readable error string
 */
export function formatWasmError(error: WasmError): string {
  if (error.details) {
    const detailsStr = Object.entries(error.details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    return `${error.message} (${detailsStr})`;
  }
  return error.message;
}

/**
 * Extract user-friendly message from error
 * 
 * @param error - Any error object (WasmError or generic Error)
 * @returns User-friendly error message
 */
export function getUserErrorMessage(error: any): string {
  if (isWasmError(error)) {
    // Map technical errors to user-friendly messages
    switch (error.error) {
      case WasmErrorType.NoteOverlapError:
        return 'Cannot add note: it overlaps with an existing note';
      case WasmErrorType.InvalidPitchError:
        return 'Invalid note pitch (must be between 0-127)';
      case WasmErrorType.ParseError:
        return 'Failed to parse MusicXML file. Please check the file format.';
      case WasmErrorType.ValidationError:
        return `Invalid MusicXML content: ${error.message}`;
      case WasmErrorType.WasmInitializationError:
        return 'Music engine failed to load. Your browser may not support WebAssembly.';
      default:
        return error.message;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Error recovery suggestions
 * 
 * Provides actionable suggestions for resolving errors
 */
export function getErrorRecoverySuggestion(error: WasmError): string | null {
  switch (error.error) {
    case WasmErrorType.NoteOverlapError:
      return 'Try adjusting the note timing or pitch to avoid overlap';
    
    case WasmErrorType.InvalidPitchError:
      return 'MIDI pitch must be between 0 (C-1) and 127 (G9)';
    
    case WasmErrorType.ParseError:
      return 'Ensure the file is a valid MusicXML document (.xml or .mxl)';
    
    case WasmErrorType.WasmInitializationError:
      return 'Try refreshing the page or using a modern browser (Chrome, Firefox, Safari, Edge)';
    
    case WasmErrorType.VoiceNotFoundError:
    case WasmErrorType.StaffNotFoundError:
    case WasmErrorType.InstrumentNotFoundError:
      return 'The specified entity does not exist. The score may have been modified.';
    
    default:
      return null;
  }
}

/**
 * Check if error is recoverable (user can retry)
 */
export function isRecoverableError(error: WasmError): boolean {
  const unrecoverableErrors = [
    WasmErrorType.WasmInitializationError,
    WasmErrorType.InternalError,
    WasmErrorType.SerializationError,
  ];
  
  return !unrecoverableErrors.includes(error.error as WasmErrorType);
}

/**
 * Example error handling patterns
 */

/**
 * Handle WASM errors in component
 * 
 * @example
 * try {
 *   const score = await wasm.add_note(currentScore, voiceId, note);
 *   setScore(score);
 * } catch (err) {
 *   handleWasmError(err, {
 *     onNoteOverlap: () => showToast('Note overlaps with existing note'),
 *     onInvalidPitch: () => showToast('Invalid pitch value'),
 *     onDefault: (error) => showToast(getUserErrorMessage(error)),
 *   });
 * }
 */
export function handleWasmError(
  error: any,
  handlers: {
    onNoteOverlap?: () => void;
    onInvalidPitch?: () => void;
    onParseError?: () => void;
    onNotFound?: () => void;
    onDefault?: (error: WasmError) => void;
  }
): void {
  if (!isWasmError(error)) {
    console.error('Unexpected error:', error);
    handlers.onDefault?.(error);
    return;
  }
  
  switch (error.error) {
    case WasmErrorType.NoteOverlapError:
      handlers.onNoteOverlap?.();
      break;
    case WasmErrorType.InvalidPitchError:
      handlers.onInvalidPitch?.();
      break;
    case WasmErrorType.ParseError:
      handlers.onParseError?.();
      break;
    case WasmErrorType.VoiceNotFoundError:
    case WasmErrorType.StaffNotFoundError:
    case WasmErrorType.InstrumentNotFoundError:
      handlers.onNotFound?.();
      break;
    default:
      handlers.onDefault?.(error);
  }
}
