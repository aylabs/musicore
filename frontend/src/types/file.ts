/**
 * File persistence type definitions
 * 
 * These types support the score file save/load functionality,
 * tracking file state and validation results.
 */

/**
 * File state interface for tracking save/load operations
 * 
 * Manages the current file path, modification status, and last save timestamp
 * to support unsaved changes warnings and proper file handling.
 */
export interface FileState {
  /**
   * Absolute path or filename of currently loaded file
   * null = unsaved new score
   */
  currentFilePath: string | null;
  
  /**
   * true if score has unsaved changes since last save/load
   * false otherwise
   */
  isModified: boolean;
  
  /**
   * Unix timestamp (ms) of last successful save
   * null if never saved
   * Used for future conflict detection
   */
  lastSavedTimestamp: number | null;
}

/**
 * Validation error interface for reporting specific issues
 * 
 * Provides structured error information with field context
 * for user-friendly error messages.
 */
export interface ValidationError {
  /**
   * Field path where error occurred
   * e.g., "instruments[0].staves[0].voices[0].notes[2].pitch"
   */
  field: string;
  
  /**
   * Human-readable error message
   * e.g., "MIDI pitch 200 out of range (21-108)"
   */
  message: string;
  
  /**
   * Error severity level
   */
  severity: 'error' | 'warning';
}

/**
 * Validation result interface
 * 
 * Contains validation status and any errors encountered
 * during JSON file validation.
 */
export interface ValidationResult {
  /**
   * true if validation passed, false otherwise
   */
  valid: boolean;
  
  /**
   * Array of validation errors
   * Empty if valid=true
   */
  errors: string[];
}
