/**
 * TempoControl Component - Tempo adjustment slider
 *
 * Feature 008 - Tempo Change: Inline tempo display with a range slider.
 *
 * Behavior:
 * - Drag slider to set tempo multiplier (50% – 200%)
 * - Snap to 100% when within ±5% of center for easy reset
 * - Disabled during playback
 */

import { useCallback } from 'react';
import { useTempoState } from '../../services/state/TempoStateContext';
import { MIN_TEMPO_MULTIPLIER, MAX_TEMPO_MULTIPLIER } from '../../utils/tempoCalculations';
import { formatTempoWithPercentage } from '../../utils/tempoFormatting';
import './TempoControl.css';

export interface TempoControlProps {
  /** Disable tempo controls (e.g., during playback) */
  disabled?: boolean;
}

/** Snap to 1.0 when within this distance of center (±5 percentage points) */
const SNAP_THRESHOLD = 0.05;

/**
 * TempoControl Component
 *
 * @param props - Component props
 * @returns Inline tempo display with slider
 */
export default function TempoControl({ disabled = false }: TempoControlProps) {
  const { tempoState, setTempoMultiplier, resetTempo } = useTempoState();

  const atDefault = tempoState.tempoMultiplier === 1.0;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseFloat(e.target.value);
      const snapped = Math.abs(raw - 1.0) <= SNAP_THRESHOLD ? 1.0 : raw;
      setTempoMultiplier(snapped);
    },
    [setTempoMultiplier]
  );

  // Fraction 0–1 of where the thumb sits (for the filled-track gradient)
  const fraction =
    (tempoState.tempoMultiplier - MIN_TEMPO_MULTIPLIER) /
    (MAX_TEMPO_MULTIPLIER - MIN_TEMPO_MULTIPLIER);
  const fillPct = Math.round(fraction * 100);

  // Format display: "120 BPM (100%)"
  const displayText = formatTempoWithPercentage(
    tempoState.originalTempo,
    tempoState.tempoMultiplier
  );

  return (
    <div className={`tempo-control${disabled ? ' tempo-control--disabled' : ''}`}>
      <span className="tempo-label">Tempo</span>
      <div className="tempo-slider-wrap">
        <input
          type="range"
          className="tempo-slider"
          min={MIN_TEMPO_MULTIPLIER}
          max={MAX_TEMPO_MULTIPLIER}
          step={0.01}
          value={tempoState.tempoMultiplier}
          onChange={handleChange}
          disabled={disabled}
          aria-label="Tempo"
          aria-valuetext={displayText}
          style={
            {
              '--fill-pct': `${fillPct}%`,
              '--snap-left': `${Math.round(((1.0 - SNAP_THRESHOLD - MIN_TEMPO_MULTIPLIER) / (MAX_TEMPO_MULTIPLIER - MIN_TEMPO_MULTIPLIER)) * 100)}%`,
              '--snap-right': `${Math.round(((1.0 + SNAP_THRESHOLD - MIN_TEMPO_MULTIPLIER) / (MAX_TEMPO_MULTIPLIER - MIN_TEMPO_MULTIPLIER)) * 100)}%`,
            } as React.CSSProperties
          }
        />
        {/* Center tick mark for 100% reference */}
        <span className="tempo-center-tick" aria-hidden="true" />
      </div>
      <span
        className={`tempo-value${atDefault ? ' tempo-value--default' : ''}`}
        title={disabled ? 'Cannot change tempo while playing' : 'Click to reset to 100%'}
        onClick={disabled || atDefault ? undefined : resetTempo}
        role={disabled || atDefault ? undefined : 'button'}
        tabIndex={disabled || atDefault ? undefined : 0}
        onKeyDown={
          disabled || atDefault
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  resetTempo();
                }
              }
        }
      >
        {displayText}
      </span>
    </div>
  );
}
