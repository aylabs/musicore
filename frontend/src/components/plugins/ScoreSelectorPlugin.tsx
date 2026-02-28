/**
 * ScoreSelectorPlugin.tsx — Host-provided ScoreSelector component (v4)
 * Feature 034: Practice from Score
 *
 * Implements PluginScoreSelectorProps.
 * Renders a score selection overlay with:
 *  - Preloaded catalogue list (tappable entries)
 *  - "Load from file" button with <input type="file"> accepting .mxl .musicxml .xml
 *  - Loading spinner when isLoading === true
 *  - Error message when error is non-null
 *  - Cancel button (calls onCancel)
 *
 * Constitution Principle II: This component is host-owned and injected into plugins
 * via context.components.ScoreSelector. The plugin never imports host internals.
 */
import { useRef } from 'react';
import type { PluginScoreSelectorProps } from '../../plugin-api/types';
import './ScoreSelectorPlugin.css';

export function ScoreSelectorPlugin({
  catalogue,
  isLoading,
  error,
  onSelectScore,
  onLoadFile,
  onCancel,
}: PluginScoreSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
      // Reset input so the same file can be re-selected if needed
      e.target.value = '';
    }
  };

  return (
    <div
      className="score-selector-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Select a Score"
    >
      <div className="score-selector-panel">
        {/* Header */}
        <div className="score-selector-header">
          <h2 className="score-selector-title">Select a Score</h2>
          <button
            className="score-selector-cancel"
            onClick={onCancel}
            aria-label="Cancel score selection"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="score-selector-error" role="alert">
            ⚠️ {error}
          </p>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="score-selector-loading" aria-live="polite" aria-busy="true">
            <span className="score-selector-spinner" aria-hidden="true" />
            Loading…
          </div>
        ) : (
          <ul className="score-selector-list" role="listbox" aria-label="Preloaded scores">
            {catalogue.map((entry) => (
              <li
                key={entry.id}
                role="option"
                aria-selected={false}
                className="score-selector-item"
                onClick={() => onSelectScore(entry.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectScore(entry.id);
                  }
                }}
                tabIndex={0}
              >
                {entry.displayName}
              </li>
            ))}
          </ul>
        )}

        {/* Load from file */}
        {!isLoading && (
          <div className="score-selector-file-row">
            <button
              className="score-selector-file-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              📂 Load from file…
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mxl,.xml,.musicxml"
              style={{ display: 'none' }}
              aria-hidden="true"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
