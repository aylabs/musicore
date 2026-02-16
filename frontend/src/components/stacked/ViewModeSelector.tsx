/**
 * ViewModeSelector - Toggle between Instruments and Play view modes
 * Feature 010: Stacked Staves View - User Story 1
 */

import './ViewModeSelector.css';

export type ViewMode = 'individual' | 'stacked' | 'layout';

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
        aria-label="Switch to instruments view"
      >
        Instruments View
      </button>
      <button 
        className={`view-mode-button ${currentMode === 'layout' ? 'active' : ''}`}
        onClick={() => onChange('layout')}
        aria-label="Switch to play view"
      >
        Play View
      </button>
      <button 
        className={`view-mode-button ${currentMode === 'stacked' ? 'active' : ''}`}
        onClick={() => onChange('stacked')}
        aria-label="Switch to play legacy view"
      >
        Play Legacy View
      </button>
    </div>
  );
}
