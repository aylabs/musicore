/**
 * RecordingView — Debug-mode-only microphone recording and pitch detection page.
 *
 * Accessed from ScoreViewer when ?debug=true is present in the URL.
 * A "Record View" button in the ScoreViewer toolbar opens this page.
 * All audio resources are released when the user navigates back.
 *
 * FR-001: Only reachable via the debug-gated "Record View" button.
 * FR-002: Explicit Start/Stop toggle button; mic never opens automatically.
 */

import { useEffect, useState } from 'react';
import { useAudioRecorder } from '../../services/recording/useAudioRecorder';
import { OscilloscopeCanvas } from './OscilloscopeCanvas';
import { NoteHistoryList } from './NoteHistoryList';
import { RecordingStaff } from './RecordingStaff';
import './RecordingView.css';

interface RecordingViewProps {
  /** Called when the user taps "← Instruments" to return to ScoreViewer */
  onBack: () => void;
}

export function RecordingView({ onBack }: RecordingViewProps) {
  const { session, waveform, currentPitch, noteHistory, audioChunksRef, start, stop, clearHistory, clearAudioChunks } = useAudioRecorder();

  const isRecording = session.state === 'recording';
  const hasError = session.state === 'error';
  const errorMessage = session.errorMessage;

  // T030: iOS Safari detection — warn about limited AudioWorklet support
  const [isIOS] = useState(() => /iPad|iPhone|iPod/.test(navigator.userAgent));

  // Release resources when navigating back
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return (
    <div className="recording-view">
      <header className="recording-view__header">
        <button
          className="recording-view__back-btn"
          onClick={onBack}
          aria-label="← Instruments"
        >
          ← Instruments
        </button>
        <h1 className="recording-view__title">Recording View</h1>
        <span className="recording-view__debug-badge">debug</span>
      </header>

      <main className="recording-view__body">
        {/* T030: iOS Safari warning banner */}
        {isIOS && (
          <div className="recording-view__ios-warning" role="alert">
            iOS Safari has limited AudioWorklet support — some features may not work
          </div>
        )}

        {/* Error display */}
        {hasError && (
          <div className="recording-view__error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Compact top row: oscilloscope + current pitch side-by-side */}
        <div className="recording-view__top-row">
          <OscilloscopeCanvas waveform={waveform} height={50} />
          <div
            className="recording-view__pitch-display"
            data-testid="current-pitch-display"
            aria-label="Current pitch"
          >
            {currentPitch ? currentPitch.label : '—'}
          </div>
        </div>

        {/* Live staff — detected notes with quantized durations */}
        <RecordingStaff currentPitch={currentPitch} audioChunksRef={audioChunksRef} clearAudioChunks={clearAudioChunks} />

        {/* US2: Start/Stop toggle — placed below the staff */}
        <div className="recording-view__controls">
          <button
            className={`recording-view__toggle-btn${isRecording ? ' recording-view__toggle-btn--stop' : ''}`}
            onClick={isRecording ? stop : start}
            aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          {isRecording && (
            <span
              className="recording-view__active-dot"
              data-testid="recording-active"
              aria-label="recording active"
            />
          )}
        </div>

        {/* US5: Note history list */}
        <NoteHistoryList entries={noteHistory} onClear={clearHistory} />
      </main>
    </div>
  );
}
