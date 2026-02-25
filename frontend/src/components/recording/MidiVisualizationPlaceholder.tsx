/**
 * MidiVisualizationPlaceholder — occupies the oscilloscope canvas slot in MIDI mode.
 *
 * T016 (Phase 4, US2 implementation).
 *
 * Renders a labeled placeholder in the same layout position as OscilloscopeCanvas.
 * Reserved as an extension point for future MIDI-specific visualizations (e.g. note roll).
 *
 * Feature: 029-midi-input
 */

const DEFAULT_MESSAGE = 'Waveform not available in MIDI mode';

export interface MidiVisualizationPlaceholderProps {
  /**
   * Optional label override.
   * Defaults to "Waveform not available in MIDI mode".
   */
  message?: string;
}

export function MidiVisualizationPlaceholder({ message }: MidiVisualizationPlaceholderProps) {
  return (
    <div
      className="midi-viz-placeholder"
      aria-label={message ?? DEFAULT_MESSAGE}
    >
      {message ?? DEFAULT_MESSAGE}
    </div>
  );
}
