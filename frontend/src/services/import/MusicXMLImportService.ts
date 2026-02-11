/**
 * MusicXML Import Service - Feature 006-musicxml-import
 * Feature 011: Migrated to WASM for instant client-side parsing
 * 
 * Service for importing MusicXML files (.musicxml, .xml, .mxl)
 * Now uses WASM engine for immediate parsing without network requests
 * 
 * @example
 * ```typescript
 * const service = new MusicXMLImportService();
 * const result = await service.importFile(file);
 * console.log(`Imported ${result.statistics.note_count} notes`);
 * ```
 */

import JSZip from 'jszip';
import type { Score } from "../../types/score";
import { parseMusicXML } from "../wasm/music-engine";
import { WasmEngineError } from "../../types/wasm-error";
import type { ImportWarning, ImportStatistics as EnhancedImportStatistics } from "../../types/import-warning";

/**
 * Result of MusicXML import operation
 */
export interface ImportResult {
  /** Successfully imported score (may be partial if some content skipped) */
  score: Score;
  /** Import metadata (file format, version, etc.) */
  metadata: ImportMetadata;
  /** Import statistics (note count, duration, etc.) */
  statistics: ImportStatistics;
  /** Non-fatal warnings during import */
  warnings: ImportWarning[];
  /** True if some content was skipped due to unrecoverable errors */
  partial_import: boolean;
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
  /** Total warnings generated during import */
  warning_count: number;
  /** Number of XML elements skipped (malformed/unparseable) */
  skipped_element_count: number;
}

// ImportWarning now imported from ../../types/import-warning.ts (feature 015-musicxml-error-handling)

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
 * Handles parsing .musicxml, .xml, or .mxl files using WASM engine
 * Returns the imported Score with metadata and statistics
 */
export class MusicXMLImportService {
  /**
   * Create a new import service instance
   * No backend URL needed - parsing happens locally via WASM
   */
  constructor() {
    // No initialization needed for WASM-based parsing
  }

  /**
   * Import a MusicXML file from the user's file system
   * 
   * Feature 011: Now uses WASM for instant client-side parsing
   * Handles both uncompressed (.musicxml, .xml) and compressed (.mxl) formats
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

    try {
      // Extract XML content from file
      let xmlContent: string;
      
      if (file.name.toLowerCase().endsWith('.mxl')) {
        // Decompress .mxl file using JSZip
        xmlContent = await this.extractMxlFile(file);
      } else {
        // Read uncompressed .musicxml or .xml file
        xmlContent = await file.text();
      }

      // Parse XML using WASM engine
      const score = await parseMusicXML(xmlContent);

      // Build import result
      const result: ImportResult = {
        score,
        metadata: this.buildMetadata(file),
        statistics: this.buildStatistics(score),
        warnings: [], // WASM parser in does not return warnings yet
      };

      return result;
    } catch (error) {
      // Handle WASM errors
      if (error instanceof WasmEngineError) {
        throw new Error(`MusicXML parsing failed: ${error.message}`);
      }
      
      // Re-throw other errors
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Unknown error during MusicXML import');
    }
  }

  /**
   * Extract MusicXML content from compressed .mxl file
   * .mxl files are ZIP archives containing a 'META-INF/container.xml'
   * that points to the main MusicXML file (usually 'musicxml.xml')
   * 
   * @param file - .mxl File object
   * @returns Extracted MusicXML content as string
   * @throws Error if file is not a valid .mxl archive
   */
  private async extractMxlFile(file: File): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Look for the main MusicXML file
      // Most .mxl files have a 'musicxml.xml' file at the root
      let xmlFile = zip.file('musicxml.xml');
      
      // Try common alternative names
      if (!xmlFile) {
        xmlFile = zip.file('score.xml');
      }
      
      // If not found, try to read container.xml to find the main file
      if (!xmlFile) {
        const containerFile = zip.file('META-INF/container.xml');
        if (containerFile) {
          const containerXml = await containerFile.async('string');
          // Parse container.xml to extract the full-path attribute
          const match = containerXml.match(/full-path="([^"]+)"/);
          if (match && match[1]) {
            xmlFile = zip.file(match[1]);
          }
        }
      }
      
      // Last resort: find first .xml file that's NOT container.xml
      if (!xmlFile) {
        const xmlFiles = zip.file(/\.xml$/i).filter(f => 
          !f.name.includes('container.xml') && !f.name.startsWith('META-INF/')
        );
        xmlFile = xmlFiles[0];
      }
      
      if (!xmlFile) {
        throw new Error('No MusicXML file found in .mxl archive');
      }
      
      // Extract and return XML content
      const content = await xmlFile.async('string');
      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to decompress .mxl file: ${error.message}`);
      }
      throw new Error('Failed to decompress .mxl file');
    }
  }

  /**
   * Build import metadata from file and score
   * @param file - Original file object
   * @returns Import metadata
   */
  private buildMetadata(file: File): ImportMetadata {
    // Score doesn't have metadata fields directly
    // In the future, we could extract title/composer from MusicXML work-title/creator elements
    return {
      format: 'MusicXML', // WASM parser doesn't track version yet
      file_name: file.name,
      // Title and composer would need to be extracted during parsing
      // For now, we don't have access to them after parsing
    };
  }

  /**
   * Build import statistics from score
   * @param score - Parsed score
   * @returns Import statistics
   */
  private buildStatistics(score: Score): ImportStatistics {
    let noteCount = 0;
    let voiceCount = 0;
    let staffCount = 0;
    let maxTick = 0;

    // Count notes, voices, and staves across all instruments
    for (const instrument of score.instruments || []) {
      for (const staff of instrument.staves || []) {
        staffCount++;
        for (const voice of staff.voices || []) {
          voiceCount++;
          // Count notes and track max tick
          for (const note of voice.interval_events || []) {
            noteCount++;
            const noteTick = note.start_tick + note.duration_ticks;
            if (noteTick > maxTick) {
              maxTick = noteTick;
            }
          }
        }
      }
    }

    return {
      instrument_count: score.instruments?.length || 0,
      staff_count: staffCount,
      voice_count: voiceCount,
      note_count: noteCount,
      duration_ticks: maxTick,
    };
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
