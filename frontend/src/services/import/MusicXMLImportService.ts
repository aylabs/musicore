/**
 * MusicXML Import Service - Feature 006-musicxml-import
 * 
 * Service for importing MusicXML files (.musicxml, .xml, .mxl) from backend API
 * 
 * @example
 * ```typescript
 * const service = new MusicXMLImportService("http://localhost:8080");
 * const result = await service.importFile(file);
 * console.log(`Imported ${result.statistics.note_count} notes`);
 * ```
 */

import type { Score } from "../../types/score";

/**
 * Result of MusicXML import operation
 */
export interface ImportResult {
  /** Successfully imported score */
  score: Score;
  /** Import metadata (file format, version, etc.) */
  metadata: ImportMetadata;
  /** Import statistics (note count, duration, etc.) */
  statistics: ImportStatistics;
  /** Non-fatal warnings during import */
  warnings: ImportWarning[];
}

/**
 * Metadata about the imported file
 */
export interface ImportMetadata {
  /** Original file format (e.g., "MusicXML 3.1") */
  format: string;
  /** Original file name (if available) */
  file_name?: string;
  /** Work title from MusicXML metadata */
  work_title?: string;
  /** Composer from MusicXML metadata */
  composer?: string;
}

/**
 * Statistics about the imported score
 */
export interface ImportStatistics {
  /** Number of instruments */
  instrument_count: number;
  /** Number of staves across all instruments */
  staff_count: number;
  /** Number of voices across all staves */
  voice_count: number;
  /** Total number of notes */
  note_count: number;
  /** Score duration in ticks */
  duration_ticks: number;
}

/**
 * Non-fatal warning during import
 */
export interface ImportWarning {
  /** Warning message */
  message: string;
  /** Context (e.g., "measure 5, voice 2") */
  context?: string;
}

/**
 * Error response from import API
 */
export interface ImportErrorResponse {
  error: string;
  details?: string;
}

/**
 * MusicXML Import Service
 * 
 * Handles uploading .musicxml, .xml, or .mxl files to the backend API
 * and returning the imported Score with metadata and statistics.
 */
export class MusicXMLImportService {
  private readonly baseUrl: string;

  /**
   * Create a new import service instance
   * @param baseUrl - Base URL of the backend API (default: http://localhost:8080)
   */
  constructor(baseUrl: string = "http://localhost:8080") {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  }

  /**
   * Import a MusicXML file from the user's file system
   * 
   * T068-T069: Implements file upload with multipart/form-data
   * 
   * @param file - File object from input element
   * @returns ImportResult with score, metadata, statistics, and warnings
   * @throws Error if file is invalid, too large, or import fails
   * 
   * @example
   * ```typescript
   * const input = document.querySelector('input[type="file"]');
   * const file = input.files[0];
   * const result = await service.importFile(file);
   * ```
   */
  async importFile(file: File): Promise<ImportResult> {
    // Validate file extension
    const validExtensions = [".musicxml", ".xml", ".mxl"];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      throw new Error(
        `Unsupported file type: ${file.name}. Expected .musicxml, .xml, or .mxl`
      );
    }

    // Check file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of 10MB`
      );
    }

    // T069: Create fetch POST request with FormData
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${this.baseUrl}/api/v1/scores/import-musicxml`,
      {
        method: "POST",
        body: formData,
        // Note: Don't set Content-Type header - browser will set it with boundary
      }
    );

    // Handle errors
    if (!response.ok) {
      const errorData: ImportErrorResponse = await response
        .json()
        .catch(() => ({
          error: "Import failed",
          details: response.statusText,
        }));

      const errorMessage = errorData.details
        ? `${errorData.error}: ${errorData.details}`
        : errorData.error;

      throw new Error(errorMessage);
    }

    // Parse and return successful result
    const result: ImportResult = await response.json();
    return result;
  }

  /**
   * Validate a MusicXML file without saving it
   * 
   * Future enhancement: Backend endpoint for validation-only mode
   * 
   * @param file - File object from input element
   * @returns True if valid, throws error if invalid
   */
  async validateFile(file: File): Promise<boolean> {
    // For now, validation happens during import
    // Future: Add dedicated validation endpoint
    await this.importFile(file);
    return true;
  }
}

/**
 * Default export for convenience
 */
export default MusicXMLImportService;
