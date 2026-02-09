/**
 * TempoControl Component - Tempo adjustment buttons
 * 
 * Feature 008 - Tempo Change: Inline tempo display with adjustment buttons
 * 
 * Behavior:
 * - Single click: ±1% (0.01 multiplier)
 * - Long press (500ms): ±10% every 100ms
 * - Format: "Tempo: 120 BPM (100%) - Reset +"
 */

import { useTempoState } from '../../services/state/TempoStateContext';
import { useLongPress } from '../../hooks/useLongPress';
import { MIN_TEMPO_MULTIPLIER, MAX_TEMPO_MULTIPLIER } from '../../utils/tempoCalculations';
import { formatTempoWithPercentage } from '../../utils/tempoFormatting';
import './TempoControl.css';

export interface TempoControlProps {
  /** Disable tempo controls (e.g., during playback) */
  disabled?: boolean;
}

/**
 * TempoControl Component
 * 
 * @param props - Component props
 * @returns Inline tempo display with control buttons
 */
export default function TempoControl({ disabled = false }: TempoControlProps) {
  const { tempoState, adjustTempo, resetTempo } = useTempoState();

  // Check if at boundaries
  const atMinimum = tempoState.tempoMultiplier <= MIN_TEMPO_MULTIPLIER;
  const atMaximum = tempoState.tempoMultiplier >= MAX_TEMPO_MULTIPLIER;
  const atDefault = tempoState.tempoMultiplier === 1.0;

  // Long press handlers for increment button
  const incrementLongPress = useLongPress(
    () => adjustTempo(1),   // Single click: +1%
    () => adjustTempo(10)   // Long press: +10%
  );

  // Long press handlers for decrement button
  const decrementLongPress = useLongPress(
    () => adjustTempo(-1),  // Single click: -1%
    () => adjustTempo(-10)  // Long press: -10%
  );

  // Format display: "120 BPM (100%)"
  const displayText = formatTempoWithPercentage(tempoState.originalTempo, tempoState.tempoMultiplier);

  return (
    <div className="tempo-control">
      <span className="tempo-label">Tempo:</span>
      <span className="tempo-value">{displayText}</span>
      
      <button
        type="button"
        className={`tempo-btn tempo-decrement ${decrementLongPress.isPressed ? 'pressed' : ''}`}
        onPointerDown={decrementLongPress.onPointerDown}
        onPointerUp={decrementLongPress.onPointerUp}
        onPointerLeave={decrementLongPress.onPointerLeave}
        disabled={disabled || atMinimum}
        aria-label="Decrease tempo"
        title={disabled ? "Cannot change tempo while playing" : "Click: -1%, Hold: -10%"}
      >
        −
      </button>

      <button
        type="button"
        className="tempo-btn tempo-reset"
        onClick={resetTempo}
        disabled={disabled || atDefault}
        aria-label="Reset tempo to 100%"
        title={disabled ? "Cannot change tempo while playing" : "Reset to 100%"}
      >
        Reset
      </button>

      <button
        type="button"
        className={`tempo-btn tempo-increment ${incrementLongPress.isPressed ? 'pressed' : ''}`}
        onPointerDown={incrementLongPress.onPointerDown}
        onPointerUp={incrementLongPress.onPointerUp}
        onPointerLeave={incrementLongPress.onPointerLeave}
        disabled={disabled || atMaximum}
        aria-label="Increase tempo"
        title={disabled ? "Cannot change tempo while playing" : "Click: +1%, Hold: +10%"}
      >
        +
      </button>
    </div>
  );
}
