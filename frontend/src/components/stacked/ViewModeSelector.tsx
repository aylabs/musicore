/**
 * ViewModeSelector - Toggle between Instruments and Play view modes
 * Updated: Removed legacy stacked view, keeping only individual and layout modes
 */

import './ViewModeSelector.css';

export type ViewMode = 'individual' | 'layout';

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ currentMode, onChange }: ViewModeSelectorProps) {
  return (
    <div className="view-mode-selector">
      {currentMode === 'individual' ? (
        <button 
          className="view-mode-button"
          onClick={() => onChange('layout')}
          aria-label="Switch to play view"
        >
          Play View
        </button>
      ) : (
        <button 
          className="view-mode-button"
          onClick={() => onChange('individual')}
          aria-label="Switch to instruments view"
        >
          Instruments
        </button>
      )}
    </div>
  );
}
