/**
 * PracticeView.tsx — Piano Practice Exercise view.
 *
 * Feature: 001-piano-practice
 * T008: Scaffold — exercise staff + response staff + phase state
 * T010: Play/Stop — OscillatorNode playback, per-slot highlighting
 * T011: usePracticeRecorder integration — startCapture, stopCapture, currentPitch
 * T016: Wire results phase — stopCapture → scoreExercise → ExerciseResultsView
 * T018: Try Again button
 * T019: New Exercise button
 * T020: Mic-denied error message (FR-013)
 * T022: Back button with mic cleanup on unmount
 *
 * FR-001: Debug-mode only (accessed via onShowPractice from ScoreViewer)
 * FR-002: 8 quarter notes, C3–C4
 * FR-004: Play button → highlight + synthesised tones
 * FR-005: Mic starts on mount
 * FR-007: Stop → immediate report; unreached slots = Missed
 * FR-013: Mic denied → error message, exercise still playable
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Note } from '../../types/score';
import type { PracticePhase, ExerciseResult } from '../../types/practice';
import { generateExercise } from '../../services/practice/exerciseGenerator';
import { scoreExercise } from '../../services/practice/exerciseScorer';
import { usePracticeRecorder } from '../../services/practice/usePracticeRecorder';
import { ToneAdapter } from '../../services/playback/ToneAdapter';
import { NotationLayoutEngine } from '../../services/notation/NotationLayoutEngine';
import { NotationRenderer } from '../notation/NotationRenderer';
import { DEFAULT_STAFF_CONFIG } from '../../types/notation/config';
import { ExerciseResultsView } from './ExerciseResultsView';
import './PracticeView.css';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Quarter note duration in ticks (960 PPQ standard) */
const QUARTER_TICKS = 960;

/** Staff config: tight spacing matches RecordingStaff */
const STAFF_CONFIG = {
  ...DEFAULT_STAFF_CONFIG,
  pixelsPerTick: 0.06,
  minNoteSpacing: 10,
  viewportWidth: 99999,
  scrollX: 0,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface PracticeViewProps {
  /** Called when the user presses "← Back" */
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PracticeView({ onBack }: PracticeViewProps) {
  // ── Phase & exercise state ──────────────────────────────────────────────
  const [bpm, setBpm] = useState(80);
  const [exercise, setExercise] = useState(() => generateExercise(80));
  const [phase, setPhase] = useState<PracticePhase>('ready');
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [highlightedSlotIndex, setHighlightedSlotIndex] = useState<number | null>(null);

  // ── Mic recorder ────────────────────────────────────────────────────────
  const { micState, micError, currentPitch, liveResponseNotes, startCapture, stopCapture, clearCapture } =
    usePracticeRecorder();

  // ── Playback refs ────────────────────────────────────────────────────────
  const playbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Prevents double-firing the auto-start on rapid pitch fluctuations */
  const autoStartedRef = useRef(false);

  // ── Build Note[] for the exercise staff ─────────────────────────────────
  //    One quarter note per slot, start_tick = slotIndex × QUARTER_TICKS
  const exerciseNotes = useMemo<Note[]>(
    () =>
      exercise.notes.map((en) => ({
        id: `ex-slot-${en.slotIndex}`,
        start_tick: en.slotIndex * QUARTER_TICKS,
        duration_ticks: QUARTER_TICKS,
        pitch: en.midiPitch,
      })),
    [exercise],
  );

  const exerciseLayout = useMemo(
    () =>
      NotationLayoutEngine.calculateLayout({
        notes: exerciseNotes,
        clef: 'Treble',
        timeSignature: { numerator: 4, denominator: 4 },
        config: STAFF_CONFIG,
      }),
    [exerciseNotes],
  );

  // ── Ghost note: current held pitch shown at the highlighted slot position ────
  const ghostNote = useMemo<Note | null>(() => {
    if (phase !== 'playing' || !currentPitch) return null;
    return {
      id: '__practice_ghost__',
      start_tick: liveResponseNotes.length * QUARTER_TICKS,
      duration_ticks: QUARTER_TICKS,
      pitch: Math.round(12 * Math.log2(currentPitch.hz / 440) + 69),
    };
  }, [phase, currentPitch, liveResponseNotes.length]);

  // ── Response staff: confirmed notes + live ghost ──────────────────────────
  const responseStaffNotes = useMemo<Note[]>(
    () => (ghostNote ? [...liveResponseNotes, ghostNote] : liveResponseNotes),
    [liveResponseNotes, ghostNote],
  );

  const responseLayout = useMemo(
    () =>
      NotationLayoutEngine.calculateLayout({
        notes: responseStaffNotes,
        clef: 'Treble',
        timeSignature: { numerator: 4, denominator: 4 },
        config: STAFF_CONFIG,
      }),
    [responseStaffNotes],
  );

  // ── Derive highlighted note ID for exercise staff ────────────────────────
  const highlightedNoteIds = useMemo(
    () =>
      highlightedSlotIndex !== null ? [`ex-slot-${highlightedSlotIndex}`] : [],
    [highlightedSlotIndex],
  );

  // ── Tempo change ─────────────────────────────────────────────────────────
  const handleBpmChange = useCallback(
    (newBpm: number) => {
      setBpm(newBpm);
      if (phase === 'ready') setExercise(generateExercise(newBpm));
    },
    [phase],
  );

  // ── Stop playback helper ─────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    playbackTimersRef.current.forEach(clearTimeout);
    playbackTimersRef.current = [];
    const adapter = ToneAdapter.getInstance();
    adapter.stopAll();
    adapter.setMuted(false); // restore audio when stopping
  }, []);

  // ── Handle Play (T010) ───────────────────────────────────────────────────
  const handlePlay = useCallback(async () => {
    if (phase === 'playing') {
      // Restart: stop current playback and re-enter
      stopPlayback();
      clearCapture();
    }
    setPhase('playing');
    setResult(null);
    setHighlightedSlotIndex(null);

    const adapter = ToneAdapter.getInstance();
    await adapter.init();
    adapter.startTransport();
    // Mute speaker output so exercise notes don’t bleed into the mic
    // and confuse the pitch detector. The staff highlighting is the visual guide.
    adapter.setMuted(true);

    const startMs = Date.now();
    startCapture(exercise, startMs);

    const msPerBeat = 60_000 / exercise.bpm;
    const durationSec = (msPerBeat * 0.85) / 1000;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Schedule all notes on the Transport (piano samples via ToneAdapter)
    exercise.notes.forEach((note, i) => {
      adapter.playNote(note.midiPitch, durationSec, note.expectedOnsetMs / 1000);

      // Highlight this slot via setTimeout (visual sync)
      const highlightTimer = setTimeout(() => {
        setHighlightedSlotIndex(i);
      }, note.expectedOnsetMs);
      timers.push(highlightTimer);
    });

    // When the last note finishes, finalise
    const lastOnsetMs = (exercise.notes.length - 1) * msPerBeat;
    const finishMs = lastOnsetMs + msPerBeat + 100; // extra 100 ms buffer

    const finishTimer = setTimeout(() => {
      stopPlayback();
      setHighlightedSlotIndex(null);
      const { responses, extraneousNotes } = stopCapture();
      const exerciseResult = scoreExercise(exercise, responses, extraneousNotes);
      setResult(exerciseResult);
      setPhase('results');
    }, finishMs);
    timers.push(finishTimer);

    playbackTimersRef.current = timers;
  }, [phase, exercise, startCapture, stopCapture, clearCapture, stopPlayback]);

  // ── Handle Stop (FR-007) ─────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    stopPlayback();
    setHighlightedSlotIndex(null);
    const { responses, extraneousNotes } = stopCapture();
    const raw = scoreExercise(exercise, responses, extraneousNotes);
    const exerciseResult: ExerciseResult = { ...raw, score: Math.round(raw.score * (bpm / 120)) };
    setResult(exerciseResult);
    setPhase('results');
  }, [exercise, bpm, stopCapture, stopPlayback]);

  // ── Pre-warm ToneAdapter when mic is ready so adapter.init() is instant ────
  //    This eliminates the startMs timing drift that caused early slots to be
  //    missed (adapter.init could take 500 ms+ loading piano samples).
  useEffect(() => {
    if (micState === 'active') {
      void ToneAdapter.getInstance().init();
    }
  }, [micState]);

  // ── Auto-start: trigger playback on first detected pitch ──────────────────
  useEffect(() => {
    if (phase === 'ready' && currentPitch && !autoStartedRef.current) {
      autoStartedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void handlePlay();
    }
  }, [currentPitch, phase, handlePlay]);

  // ── Try Again (T018) ─────────────────────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    stopPlayback();
    clearCapture();
    setResult(null);
    setHighlightedSlotIndex(null);
    autoStartedRef.current = false;
    setPhase('ready');
    // exercise stays the same
  }, [clearCapture, stopPlayback]);

  // ── New Exercise (T019) ──────────────────────────────────────────────────
  const handleNewExercise = useCallback(() => {
    stopPlayback();
    clearCapture();
    setResult(null);
    setHighlightedSlotIndex(null);
    autoStartedRef.current = false;
    setExercise(generateExercise(bpm));
    setPhase('ready');
  }, [bpm, clearCapture, stopPlayback]);

  // ── Back button — cleanup on navigate away (T022) ────────────────────────
  const handleBack = useCallback(() => {
    stopPlayback();
    // clearCapture releases captureRef; mic teardown is handled by
    // usePracticeRecorder's own unmount cleanup
    clearCapture();
    onBack();
  }, [clearCapture, stopPlayback, onBack]);

  // ── Stopwatch cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="practice-view" data-testid="practice-view">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="practice-view__header">
        <button
          className="practice-view__back-btn"
          onClick={handleBack}
          aria-label="← Recording"
        >
          ← Recording
        </button>
        <h1 className="practice-view__title">Practice Exercise</h1>
        <span className="practice-view__debug-badge">debug</span>
      </header>

      <main className="practice-view__body">
        {/* ── Mic error banner (FR-013, T020) ───────────────────── */}
        {micState === 'error' && micError && (
          <div
            className="practice-view__mic-error"
            role="alert"
            data-testid="mic-error-banner"
          >
            🎤 {micError}
          </div>
        )}

        {/* ── Exercise staff ─────────────────────────────────────── */}
        <div className="practice-view__staff-block practice-view__staff-block--with-tempo" data-testid="exercise-staff-block">
          <div className="practice-view__staff-content">
            <div className="practice-view__staff-label">Exercise</div>
            <div
              className={`practice-view__staff-renderer${phase === 'playing' ? ' practice-view__staff-renderer--playing' : ''}`}
              data-testid="exercise-staff-renderer"
              aria-label="Exercise notes"
              role="img"
            >
              <NotationRenderer
                layout={exerciseLayout}
                highlightedNoteIds={highlightedNoteIds}
                showClef
              />
            </div>
          </div>
          {/* Tempo slider — right of staff */}
          <div className="practice-view__tempo-panel">
            <label className="practice-view__tempo-label" htmlFor="tempo-slider">Tempo</label>
            <input
              id="tempo-slider"
              type="range"
              className="practice-view__tempo-slider"
              min={40}
              max={120}
              step={5}
              value={bpm}
              disabled={phase === 'playing'}
              onChange={(e) => handleBpmChange(Number(e.target.value))}
              aria-label="Tempo in BPM"
              data-testid="tempo-slider"
            />
            <span className="practice-view__tempo-value">{bpm}</span>
            <span className="practice-view__tempo-bpm-label">BPM</span>
            <span className="practice-view__tempo-factor">×{(bpm / 120).toFixed(2)}</span>
          </div>
        </div>

        {/* ── Controls ───────────────────────────────────────────── */}
        {phase !== 'results' && (
          <div className="practice-view__controls">
            {phase === 'ready' && (
              <p
                className="practice-view__start-prompt"
                data-testid="start-prompt"
                aria-live="polite"
              >
                {micState === 'active'
                  ? '🎹 Start playing… the exercise will follow you'
                  : '🎹 Waiting for microphone…'}
              </p>
            )}
            {phase === 'playing' && (
              <button
                className="practice-view__stop-btn"
                onClick={handleStop}
                aria-label="Stop exercise"
                data-testid="stop-btn"
              >
                ■ Stop
              </button>
            )}
          </div>
        )}

        {/* ── Response staff (playing: live capture; results: comparison) ─── */}
        {(phase === 'playing' || phase === 'results') && (
          <div className="practice-view__staff-block" data-testid="response-staff-block">
            <div className="practice-view__staff-label">Your Response</div>
            <div
              className="practice-view__staff-renderer"
              aria-label="Your response notes"
              role="img"
            >
              <NotationRenderer
                layout={responseLayout}
                highlightedNoteIds={ghostNote ? ['__practice_ghost__'] : []}
                showClef
              />
            </div>
            {phase === 'playing' && currentPitch && (
              <div className="practice-view__pitch-display" aria-live="polite">
                Detected: {currentPitch.label} ({currentPitch.hz.toFixed(1)} Hz)
              </div>
            )}
          </div>
        )}

        {/* ── Results phase ──────────────────────────────────────── */}
        {phase === 'results' && result && (
          <>
            <div className="practice-view__controls">
              <button
                className="practice-view__play-btn"
                onClick={handleTryAgain}
                aria-label="Try Again"
                data-testid="try-again-btn"
              >
                🔁 Try Again
              </button>
              <button
                className="practice-view__play-btn"
                onClick={handleNewExercise}
                aria-label="New Exercise"
                data-testid="new-exercise-btn"
                style={{ background: '#388e3c' }}
              >
                🎲 New Exercise
              </button>
            </div>
            <ExerciseResultsView result={result} exercise={exercise} />
          </>
        )}
      </main>
    </div>
  );
}
