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
  const [exercise, setExercise] = useState(() => generateExercise());
  const [phase, setPhase] = useState<PracticePhase>('ready');
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [highlightedSlotIndex, setHighlightedSlotIndex] = useState<number | null>(null);

  // ── Mic recorder ────────────────────────────────────────────────────────
  const { micState, micError, currentPitch, startCapture, stopCapture, clearCapture } =
    usePracticeRecorder();

  // ── Playback refs ────────────────────────────────────────────────────────
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  // ── Ghost note for response staff (current detected pitch during playing) ─
  const ghostNote = useMemo<Note | null>(() => {
    if (phase !== 'playing' || !currentPitch) return null;
    return {
      id: '__practice_ghost__',
      start_tick: 0,
      duration_ticks: QUARTER_TICKS,
      pitch: Math.round(12 * Math.log2(currentPitch.hz / 440) + 69),
    };
  }, [phase, currentPitch]);

  const responseLayout = useMemo(
    () =>
      NotationLayoutEngine.calculateLayout({
        notes: ghostNote ? [ghostNote] : [],
        clef: 'Treble',
        timeSignature: { numerator: 4, denominator: 4 },
        config: STAFF_CONFIG,
      }),
    [ghostNote],
  );

  // ── Derive highlighted note ID for exercise staff ────────────────────────
  const highlightedNoteIds = useMemo(
    () =>
      highlightedSlotIndex !== null ? [`ex-slot-${highlightedSlotIndex}`] : [],
    [highlightedSlotIndex],
  );

  // ── Stop playback helper ─────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    playbackTimersRef.current.forEach(clearTimeout);
    playbackTimersRef.current = [];
    try { playbackCtxRef.current?.close(); } catch { /* ignore */ }
    playbackCtxRef.current = null;
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

    const ctx = new AudioContext();
    playbackCtxRef.current = ctx;
    const startMs = Date.now();
    startCapture(exercise, startMs);

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);

    const msPerBeat = 60_000 / exercise.bpm;
    const timers: ReturnType<typeof setTimeout>[] = [];

    exercise.notes.forEach((note, i) => {
      const offsetMs = note.expectedOnsetMs;
      const durationMs = msPerBeat * 0.85; // slight staccato

      // Highlight this slot
      const highlightTimer = setTimeout(() => {
        setHighlightedSlotIndex(i);
      }, offsetMs);
      timers.push(highlightTimer);

      // Schedule OscillatorNode tone
      const toneTimer = setTimeout(() => {
        if (!playbackCtxRef.current) return;
        const c = playbackCtxRef.current;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(masterGain);

        const hz = 440 * Math.pow(2, (note.midiPitch - 69) / 12);
        osc.frequency.value = hz;
        osc.type = 'sine';

        const now = c.currentTime;
        const durSec = durationMs / 1000;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.8, now + 0.01);
        gain.gain.setValueAtTime(0.8, now + durSec - 0.02);
        gain.gain.linearRampToValueAtTime(0, now + durSec);
        osc.start(now);
        osc.stop(now + durSec);
      }, offsetMs);
      timers.push(toneTimer);
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
    const exerciseResult = scoreExercise(exercise, responses, extraneousNotes);
    setResult(exerciseResult);
    setPhase('results');
  }, [exercise, stopCapture, stopPlayback]);

  // ── Try Again (T018) ─────────────────────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    stopPlayback();
    clearCapture();
    setResult(null);
    setHighlightedSlotIndex(null);
    setPhase('ready');
    // exercise stays the same
  }, [clearCapture, stopPlayback]);

  // ── New Exercise (T019) ──────────────────────────────────────────────────
  const handleNewExercise = useCallback(() => {
    stopPlayback();
    clearCapture();
    setResult(null);
    setHighlightedSlotIndex(null);
    setExercise(generateExercise());
    setPhase('ready');
  }, [clearCapture, stopPlayback]);

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
          aria-label="← Back"
        >
          ← Back
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
        <div className="practice-view__staff-block" data-testid="exercise-staff-block">
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

        {/* ── Controls ───────────────────────────────────────────── */}
        {phase !== 'results' && (
          <div className="practice-view__controls">
            {phase === 'ready' && (
              <button
                className="practice-view__play-btn"
                onClick={handlePlay}
                aria-label="Play exercise"
                data-testid="play-btn"
              >
                ▶ Play
              </button>
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

        {/* ── Response staff (shown during playing) ──────────────── */}
        {phase === 'playing' && (
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
            {currentPitch && (
              <div className="practice-view__pitch-display" aria-live="polite">
                Detected: {currentPitch.label} ({currentPitch.hz.toFixed(1)} Hz)
              </div>
            )}
          </div>
        )}

        {/* ── Results phase ──────────────────────────────────────── */}
        {phase === 'results' && result && (
          <>
            <ExerciseResultsView result={result} exercise={exercise} />
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
          </>
        )}
      </main>
    </div>
  );
}
