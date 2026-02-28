/**
 * Play Score Plugin — Score Selection Screen (T010)
 * Feature 033: Play Score Plugin
 *
 * Displays all catalogue entries from context.scorePlayer.getCatalogue()
 * as a tappable list. Tapping an entry calls onSelectScore(catalogueId).
 * "Load from file" item is present but wired in T025 (US6).
 *
 * Design: No Back button (FR-002, Q4) — plugin opens directly to this screen.
 */

import { useRef } from 'react';
import type { PluginPreloadedScore } from '../../src/plugin-api/index';

export interface ScoreSelectionScreenProps {
  catalogue: readonly PluginPreloadedScore[];
  onSelectScore: (catalogueId: string) => void;
  /** Called with the selected File when user picks a file (US6 / T025). */
  onLoadFile: (file: File) => void;
}

export function ScoreSelectionScreen({ catalogue, onSelectScore, onLoadFile }: ScoreSelectionScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadFile(file);
      // Reset so selecting the same file again triggers onChange
      e.target.value = '';
    }
  };

  return (
    <div className="play-score__selection-screen">
      <h2 className="play-score__selection-title">Select a Score</h2>

      <ul className="play-score__catalogue-list" role="list">
        {catalogue.map(entry => (
          <li key={entry.id} className="play-score__catalogue-item">
            <button
              className="play-score__catalogue-btn"
              onClick={() => onSelectScore(entry.id)}
            >
              {entry.displayName}
            </button>
          </li>
        ))}

        {/* US6 (T025): Load from file — file input wired here, handler fills out in T025 */}
        <li className="play-score__catalogue-item play-score__catalogue-item--load-file">
          <button
            className="play-score__catalogue-btn play-score__catalogue-btn--load-file"
            onClick={() => fileInputRef.current?.click()}
          >
            📁 Load from file…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mxl,.xml,.musicxml"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            data-testid="file-input"
          />
        </li>
      </ul>
    </div>
  );
}
