/**
 * ImportButton Component - Feature 006-musicxml-import
 * 
 * Button with file picker for importing MusicXML files
 * 
 * T071-T074: Implements ImportButton with file picker, loading state, error display
 * 
 * @example
 * ```typescript
 * <ImportButton
 *   onImportComplete={(result) => {
 *     console.log(`Imported ${result.statistics.note_count} notes`);
 *   }}
 * />
 * ```
 */

import { useRef, type ChangeEvent } from "react";
import { useImportMusicXML } from "../../hooks/useImportMusicXML";
import type { ImportResult } from "../../services/import/MusicXMLImportService";
import "./ImportButton.css";

/**
 * Props for ImportButton component
 */
export interface ImportButtonProps {
  /** Callback when import completes successfully */
  onImportComplete?: (result: ImportResult) => void;
  /** Custom button text (default: "Import MusicXML") */
  buttonText?: string;
  /** Base URL for backend API */
  baseUrl?: string;
  /** Custom CSS class name */
  className?: string;
  /** Disable the button */
  disabled?: boolean;
}

/**
 * ImportButton Component
 * 
 * Renders a button that opens a file picker for .musicxml, .xml, or .mxl files.
 * Displays loading state during import and error messages if import fails.
 * 
 * T072: File picker with .musicxml, .xml, .mxl accept filter
 * T073: Display loading state and error messages
 * T074: Call onImportComplete callback with ImportResult
 * 
 * @param props - Component props
 * @returns JSX.Element
 */
export function ImportButton({
  onImportComplete,
  buttonText = "Import MusicXML",
  baseUrl,
  className = "",
  disabled = false,
}: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // T070: Use import hook
  const { importFile, loading, error, result, reset } = useImportMusicXML({
    baseUrl,
    onSuccess: (importResult) => {
      // T074: Call onImportComplete callback
      if (onImportComplete) {
        onImportComplete(importResult);
      }
    },
  });

  /**
   * Handle button click - trigger file picker
   */
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Handle file selection from picker
   */
  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      // Reset previous state
      reset();

      // Import the file
      await importFile(file);

      // Reset input value to allow re-importing same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={`import-button-container ${className}`}>
      {/* T072: File input with accept filter */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".musicxml,.xml,.mxl"
        onChange={handleFileChange}
        style={{ display: "none" }}
        disabled={disabled || loading}
        aria-label="Upload MusicXML file"
      />

      {/* Import button */}
      <button
        onClick={handleButtonClick}
        disabled={disabled || loading}
        className="import-button"
        aria-busy={loading}
      >
        {loading ? (
          <>
            <span className="spinner" aria-hidden="true"></span>
            Importing...
          </>
        ) : (
          buttonText
        )}
      </button>

      {/* T073: Display loading state */}
      {loading && (
        <div className="import-status" role="status" aria-live="polite">
          <p className="import-loading">Uploading and processing file...</p>
        </div>
      )}

      {/* T073: Display error messages */}
      {error && (
        <div className="import-status import-error" role="alert">
          <p className="error-message">
            <strong>Import Failed:</strong> {error}
          </p>
          <button
            onClick={reset}
            className="dismiss-button"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Display success message with statistics */}
      {result && !error && (
        <div className="import-status import-success" role="status">
          <p className="success-message">
            <strong>✓ Import Successful!</strong>
          </p>
          <ul className="import-stats">
            <li>{result.statistics.instrument_count} instrument(s)</li>
            <li>{result.statistics.staff_count} staff/staves</li>
            <li>{result.statistics.note_count} notes</li>
          </ul>
          {result.warnings.length > 0 && (
            <details className="import-warnings">
              <summary>{result.warnings.length} warning(s)</summary>
              <ul>
                {result.warnings.map((warning, index) => (
                  <li key={index}>
                    {warning.context ? `[${warning.context}] ` : ""}
                    {warning.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default ImportButton;
