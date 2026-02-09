/**
 * ViewModeSelector - Toggle between Individual and Stacked view modes
 * Feature 010: Stacked Staves View - User Story 1
 */

import './ViewModeSelector.css';

export type ViewMode = 'individual' | 'stacked';

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ currentMode, onChange }: ViewModeSelectorProps) {
  return (
    <div className="view-mode-selector">
      <button 
        className={`view-mode-button ${currentMode === 'individual' ? 'active' : ''}`}
        onClick={() => onChange('individual')}
        aria-label="Switch to individual view"
      >
        Individual View
      </button>
      <button 
        className={`view-mode-button ${currentMode === 'stacked' ? 'active' : ''}`}
        onClick={() => onChange('stacked')}
        aria-label="Switch to stacked view"
      >
        Stacked View
      </button>
    </div>
  );
}
