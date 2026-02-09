/**
 * useImportMusicXML Hook - Feature 006-musicxml-import
 * Feature 011: Now uses WASM for instant client-side parsing
 * 
 * React hook for importing MusicXML files with loading, error, and result state
 * 
 * T070: Implements useImportMusicXML hook with loading, error, result state
 * 
 * @example
 * ```typescript
 * const { importFile, loading, error, result } = useImportMusicXML();
 * 
 * const handleFileSelect = async (file: File) => {
 *   await importFile(file);
 *   if (result) {
 *     console.log(`Imported ${result.statistics.note_count} notes`);
 *   }
 * };
 * ```
 */

import { useState, useCallback } from "react";
import {
  MusicXMLImportService,
  type ImportResult,
} from "../services/import/MusicXMLImportService";

/**
 * Hook state and methods for MusicXML import
 */
export interface UseImportMusicXMLResult {
  /** Import a MusicXML file */
  importFile: (file: File) => Promise<void>;
  /** Whether import is in progress */
  loading: boolean;
  /** Error message if import failed */
  error: string | null;
  /** Import result if successful */
  result: ImportResult | null;
  /** Clear error and result state */
  reset: () => void;
}

/**
 * Configuration options for the hook
 */
export interface UseImportMusicXMLOptions {
  /** Callback when import completes successfully */
  onSuccess?: (result: ImportResult) => void;
  /** Callback when import fails */
  onError?: (error: Error) => void;
}

/**
 * React hook for importing MusicXML files
 * 
 * Manages loading state, error handling, and result data.
 * Automatically resets error/result when starting a new import.
 * 
 * @param options - Configuration options
 * @returns Hook state and methods
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { importFile, loading, error, result } = useImportMusicXML({
 *     onSuccess: (result) => {
 *       console.log('Import successful!', result);
 *     }
 *   });
 * 
 *   const handleFile = async (file: File) => {
 *     await importFile(file);
 *   };
 * 
 *   return (
 *     <div>
 *       {loading && <p>Importing...</p>}
 *       {error && <p>Error: {error}</p>}
 *       {result && <p>{result.statistics.note_count} notes imported</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useImportMusicXML(
  options: UseImportMusicXMLOptions = {}
): UseImportMusicXMLResult {
  const { onSuccess, onError } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Create service instance (WASM-based, no backend URL needed)
  const [service] = useState(
    () => new MusicXMLImportService()
  );

  /**
   * Import a MusicXML file
   */
  const importFile = useCallback(
    async (file: File) => {
      // Reset state
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        // Call import service
        const importResult = await service.importFile(file);

        // Update state
        setResult(importResult);
        setLoading(false);

        // Call success callback
        if (onSuccess) {
          onSuccess(importResult);
        }
      } catch (err) {
        // Handle error
        const errorMessage =
          err instanceof Error ? err.message : "Import failed";

        setError(errorMessage);
        setLoading(false);

        // Call error callback
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      }
    },
    [service, onSuccess, onError]
  );

  /**
   * Reset state (clear error and result)
   */
  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    importFile,
    loading,
    error,
    result,
    reset,
  };
}

export default useImportMusicXML;
