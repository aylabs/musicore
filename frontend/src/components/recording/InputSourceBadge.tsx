/**
 * InputSourceBadge — persistent indicator showing the active capture source.
 *
 * T015 (Phase 4, US2 implementation).
 *
 * Renders "Microphone" or "MIDI — [deviceName]" based on the active InputSource.
 * Always visible in the RecordingView regardless of recording state.
 *
 * Feature: 029-midi-input
 */

import type { InputSource } from '../../types/recording';
import './InputSourceBadge.css';

export interface InputSourceBadgeProps {
  /** The currently active input source */
  source: InputSource;
}

export function InputSourceBadge({ source }: InputSourceBadgeProps) {
  const label = source.kind === 'midi' ? `MIDI — ${source.deviceName}` : 'Microphone';

  return (
    <div
      className={`input-source-badge input-source-badge--${source.kind}`}
      role="status"
      aria-label={`Input source: ${label}`}
      aria-live="polite"
    >
      {label}
    </div>
  );
}
