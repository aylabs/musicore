/**
 * Import Warning Contract - Feature 015-musicxml-error-handling
 * 
 * TypeScript interface for MusicXML import warnings returned by WASM parser.
 * Matches Rust `ImportWarning` struct from backend/src/domain/importers/musicxml/errors.rs
 * 
 * @see data-model.md for complete entity documentation
 */

/**
 * Severity level of an import warning
 */
export type WarningSeverity = 'info' | 'warning' | 'error';

/**
 * Category classification for warning grouping
 */
export type WarningCategory = 
  | 'overlap_resolution'   // Same-pitch notes overlapping, split into multiple voices
  | 'missing_elements'     // Required elements absent, defaults applied
  | 'structural_issues'    // Malformed XML, encoding problems, skipped elements
  | 'partial_import';      // Content skipped due to unrecoverable errors

/**
 * Non-fatal issue encountered during MusicXML import
 * 
 * Provides detailed, actionable feedback about recovered errors,
 * applied defaults, and skipped content.
 * 
 * @example
 * ```typescript
 * const warning: ImportWarning = {
 *   severity: 'warning',
 *   category: 'overlap_resolution',
 *   message: 'Overlapping C4 quarter notes at tick 480 - split into 2 voices',
 *   measure_number: 5,
 *   instrument_name: 'Piano',
 *   staff_number: 1,
 *   voice_number: 1
 * };
 * ```
 */
export interface ImportWarning {
  /** Impact level: info (defaults), warning (recovered errors), error (partial failures) */
  severity: WarningSeverity;
  
  /** Classification for UI grouping and filtering */
  category: WarningCategory;
  
  /** Human-readable description of the issue and resolution */
  message: string;
  
  /** Measure number (1-indexed) where issue occurred */
  measure_number?: number;
  
  /** Instrument name for context (e.g., "Piano - Right Hand") */
  instrument_name?: string;
  
  /** Staff number within instrument (1-indexed) */
  staff_number?: number;
  
  /** Voice number within staff (1-indexed) */
  voice_number?: number;
}

/**
 * Extended import statistics including warning metrics
 * 
 * Extends existing ImportStatistics from Feature 006
 */
export interface ImportStatistics {
  /** Number of instruments in score */
  instrument_count: number;
  
  /** Total staves across all instruments */
  staff_count: number;
  
  /** Total voices across all staves */
  voice_count: number;
  
  /** Total notes in score */
  note_count: number;
  
  /** Score duration in ticks (960 PPQ) */
  duration_ticks: number;
  
  /** Total warnings generated during import */
  warning_count: number;
  
  /** Number of XML elements skipped (malformed/unparseable) */
  skipped_element_count: number;
}

/**
 * Result of MusicXML import operation with warning collection
 * 
 * Extends existing ImportResult from Feature 006 with warnings array
 * and partial import indicator.
 */
export interface ImportResult {
  /** Successfully imported score (may be partial if some content skipped) */
  score: Score;
  
  /** Import metadata (format, filename, composer) */
  metadata: ImportMetadata;
  
  /** Import statistics including warning counts */
  statistics: ImportStatistics;
  
  /** Collected warnings (empty array for perfect import) */
  warnings: ImportWarning[];
  
  /** True if some content was skipped due to unrecoverable errors */
  partial_import: boolean;
}

/**
 * Helper: Group warnings by category for UI display
 * 
 * @param warnings - Array of import warnings
 * @returns Map of category to warnings in that category
 * 
 * @example
 * ```typescript
 * const grouped = groupWarningsByCategory(result.warnings);
 * console.log(`${grouped.overlap_resolution?.length || 0} overlap warnings`);
 * ```
 */
export function groupWarningsByCategory(
  warnings: ImportWarning[]
): Record<WarningCategory, ImportWarning[]> {
  return warnings.reduce((acc, warning) => {
    if (!acc[warning.category]) {
      acc[warning.category] = [];
    }
    acc[warning.category].push(warning);
    return acc;
  }, {} as Record<WarningCategory, ImportWarning[]>);
}

/**
 * Helper: Get severity icon for UI display
 * 
 * @param severity - Warning severity level
 * @returns CSS class or icon name for UI rendering
 */
export function getSeverityIcon(severity: WarningSeverity): string {
  const icons = {
    info: 'info-circle',
    warning: 'exclamation-triangle',
    error: 'exclamation-circle'
  };
  return icons[severity];
}

/**
 * Helper: Get severity color for UI display
 * 
 * @param severity - Warning severity level
 * @returns CSS color class or hex color
 */
export function getSeverityColor(severity: WarningSeverity): string {
  const colors = {
    info: '#6c757d',    // Gray
    warning: '#ffc107', // Yellow
    error: '#dc3545'    // Red
  };
  return colors[severity];
}

/**
 * Type guard: Check if import has warnings
 * 
 * @param result - Import result to check
 * @returns True if warnings present
 */
export function hasWarnings(result: ImportResult): boolean {
  return result.warnings.length > 0;
}

/**
 * Type guard: Check if import is partial (some content skipped)
 * 
 * @param result - Import result to check
 * @returns True if partial import occurred
 */
export function isPartialImport(result: ImportResult): boolean {
  return result.partial_import;
}
