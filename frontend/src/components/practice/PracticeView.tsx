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
import type { PracticePhase, ExerciseResult, NoteComparisonStatus } from '../../types/practice';
import {
  generateExercise,
  type ExerciseConfig,
  DEFAULT_EXERCISE_CONFIG,
} from '../../services/practice/exerciseGenerator';
import { scoreExercise } from '../../services/practice/exerciseScorer';
import { usePracticeRecorder } from '../../services/practice/usePracticeRecorder';
import { ToneAdapter } from '../../services/playback/ToneAdapter';
import { NotationLayoutEngine } from '../../services/notation/NotationLayoutEngine';
import { NotationRenderer } from '../notation/NotationRenderer';
import { DEFAULT_STAFF_CONFIG } from '../../types/notation/config';
import { ExerciseResultsView } from './ExerciseResultsView';
import { PracticeConfigPanel } from './PracticeConfigPanel';
import './PracticeView.css';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Quarter note duration in ticks (960 PPQ standard) */
const QUARTER_TICKS = 960;

/** Milliseconds to ignore mic input after playing an exercise note (avoids speaker feedback) */
const STEP_INPUT_DELAY_MS = 450;

/** Convert MIDI pitch number to human-readable note name, e.g. 60 → "C4" */
function midiToNoteName(midi: number): string {
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

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
  const [exerciseConfig, setExerciseConfig] = useState<ExerciseConfig>(DEFAULT_EXERCISE_CONFIG);
  const [exercise, setExercise] = useState(() => generateExercise(80, DEFAULT_EXERCISE_CONFIG));
  const [phase, setPhase] = useState<PracticePhase>('ready');
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [highlightedSlotIndex, setHighlightedSlotIndex] = useState<number | null>(null);
  /** Countdown value shown before exercise starts (3, 2, 1, then null) */
  const [countdownValue, setCountdownValue] = useState<number | null>(null);

  // ── Effective clef: always from config (c4scale can render in any clef) ─────────
  const effectiveClef = exerciseConfig.clef;

  // ── Mic recorder ────────────────────────────────────────────────────────
  const { micState, micError, currentPitch, liveResponseNotes, startCapture, stopCapture, clearCapture } =
    usePracticeRecorder();

  // ── Config sidebar collapse ──────────────────────────────────────────────
  const [configCollapsed, setConfigCollapsed] = useState(() => window.innerWidth <= 768);

  // ── Onboarding tips banner ────────────────────────────────────────────────
  const [showTips, setShowTips] = useState(
    () => sessionStorage.getItem('practice-tips-v1-dismissed') !== 'yes'
  );
  const handleDismissTips = useCallback(() => {
    sessionStorage.setItem('practice-tips-v1-dismissed', 'yes');
    setShowTips(false);
  }, []);

  // ── Playback refs ────────────────────────────────────────────────────────
  const playbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Prevents double-firing the auto-start on rapid pitch fluctuations */
  const autoStartedRef = useRef(false);
  /** Holds setTimeout IDs for the 3-2-1 countdown so they can be cancelled */
  const countdownTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Step mode state ───────────────────────────────────────────────────────
  /** Labels to show above exercise staff notes: noteId → display string */
  const [stepExNoteLabels, setStepExNoteLabels] = useState<Record<string, string>>({});
  /** Fill colours for those labels: noteId → CSS colour */
  const [stepExNoteColors, setStepExNoteColors] = useState<Record<string, string>>({});
  /** Notes the user has correctly played in step mode */
  const [stepResponseNotes, setStepResponseNotes] = useState<Note[]>([]);
  /** Transient wrong note displayed in response staff (cleared on correct) */
  const [stepWrongNote, setStepWrongNote] = useState<Note | null>(null);
  /** Label for the wrong note above the response staff */
  const [stepWrongLabel, setStepWrongLabel] = useState<string>('');

  // ── Step mode refs ────────────────────────────────────────────────────────
  /** Current slot index in step mode */
  const stepIndexRef = useRef(0);
  /** Last MIDI pitch that was acted on (debounce) */
  const lastStepMidiRef = useRef<number | null>(null);
  /** Timestamp when step note was last played (input delay guard) */
  const stepLastPlayTimeRef = useRef<number>(0);
  /** Slots that had at least one wrong attempt (each slot penalised once) */
  const stepPenalizedSlotsRef = useRef<Set<number>>(new Set());
  /** setTimeout ID for the currently-active slot timeout (step mode) */
  const stepSlotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Native browser fullscreen on mount ───────────────────────────────────
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.exitFullscreen?.().catch(() => {});
    };
  }, []);

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
        clef: effectiveClef,
        timeSignature: { numerator: 4, denominator: 4 },
        config: STAFF_CONFIG,
      }),
    [exerciseNotes, effectiveClef],
  );

  // ── Ghost note: current held pitch shown at the highlighted slot position ────
  const ghostNote = useMemo<Note | null>(() => {
    if (exerciseConfig.mode !== 'flow' || phase !== 'playing' || !currentPitch) return null;
    const slotIndex = highlightedSlotIndex ?? 0;
    return {
      id: '__practice_ghost__',
      start_tick: slotIndex * QUARTER_TICKS,
      duration_ticks: QUARTER_TICKS,
      pitch: Math.round(12 * Math.log2(currentPitch.hz / 440) + 69),
    };
  }, [exerciseConfig.mode, phase, currentPitch, highlightedSlotIndex]);

  // ── Response staff notes ───────────────────────────────────────────────────
  //    Step mode:    correctly played notes + transient wrong note.
  //    Flow playing: sequential liveResponseNotes + ghost.
  //    Results:      slot-aligned notes from comparisons.
  const responseStaffNotes = useMemo<Note[]>(() => {
    if (exerciseConfig.mode === 'step') {
      return stepWrongNote ? [...stepResponseNotes, stepWrongNote] : stepResponseNotes;
    }
    if (phase === 'results' && result) {
      return result.comparisons
        .filter((c) => c.response !== null)
        .map((c) => ({
          id: `resp-slot-${c.target.slotIndex}`,
          start_tick: c.target.slotIndex * QUARTER_TICKS,
          duration_ticks: QUARTER_TICKS,
          pitch: Math.round(c.response!.midiCents / 100),
        }));
    }
    return ghostNote ? [...liveResponseNotes, ghostNote] : liveResponseNotes;
  }, [exerciseConfig.mode, stepResponseNotes, stepWrongNote, phase, result, liveResponseNotes, ghostNote]);

  // ── Step mode response labels (wrong note label above response staff) ─────────
  const stepRespNoteLabels = useMemo<Record<string, string>>(() => {
    if (!stepWrongNote || !stepWrongLabel) return {};
    return { [stepWrongNote.id]: stepWrongLabel };
  }, [stepWrongNote, stepWrongLabel]);
  const stepRespNoteColors = useMemo<Record<string, string>>(() => {
    if (!stepWrongNote) return {};
    return { [stepWrongNote.id]: '#f44336' };
  }, [stepWrongNote]);

  const responseLayout = useMemo(
    () =>
      NotationLayoutEngine.calculateLayout({
        notes: responseStaffNotes,
        clef: effectiveClef,
        timeSignature: { numerator: 4, denominator: 4 },
        config: STAFF_CONFIG,
      }),
    [responseStaffNotes, effectiveClef],
  );

  // ── Derive highlighted note ID for exercise staff ────────────────────────
  const highlightedNoteIds = useMemo(
    () =>
      highlightedSlotIndex !== null ? [`ex-slot-${highlightedSlotIndex}`] : [],
    [highlightedSlotIndex],
  );

  // ── Tempo + config change ────────────────────────────────────────────────
  const handleBpmChange = useCallback(
    (newBpm: number) => {
      setBpm(newBpm);
      if (phase === 'ready') setExercise(generateExercise(newBpm, exerciseConfig));
    },
    [phase, exerciseConfig],
  );

  const handleConfigChange = useCallback(
    (newConfig: ExerciseConfig) => {
      setExerciseConfig(newConfig);
      if (phase === 'ready') setExercise(generateExercise(bpm, newConfig));
    },
    [phase, bpm],
  );

  // ── Clear countdown timers helper ─────────────────────────────────────────
  const clearCountdown = useCallback(() => {
    countdownTimersRef.current.forEach(clearTimeout);
    countdownTimersRef.current = [];
    setCountdownValue(null);
  }, []);

  // ── Step slot timeout helpers ─────────────────────────────────────────────
  const clearStepTimeout = useCallback(() => {
    if (stepSlotTimeoutRef.current !== null) {
      clearTimeout(stepSlotTimeoutRef.current);
      stepSlotTimeoutRef.current = null;
    }
  }, []);

  const scheduleStepSlotTimeout = useCallback(
    (stepIdx: number) => {
      clearStepTimeout();
      const noteDurationMs = 60_000 / exercise.bpm;
      const timeoutMs = noteDurationMs * exerciseConfig.stepTimeoutMultiplier;
      const noteId = `ex-slot-${stepIdx}`;
      const targetPitch = exercise.notes[stepIdx]?.midiPitch;
      stepSlotTimeoutRef.current = setTimeout(() => {
        stepSlotTimeoutRef.current = null;
        // Penalise only once (wrong note may have already penalised this slot)
        stepPenalizedSlotsRef.current.add(stepIdx);
        if (targetPitch !== undefined) {
          setStepExNoteLabels((prev) => ({ ...prev, [noteId]: midiToNoteName(targetPitch) }));
          setStepExNoteColors((prev) => ({ ...prev, [noteId]: '#f44336' }));
        }
        // No response-staff note for a timeout (no pitch was played)
        setStepWrongNote(null);
        setStepWrongLabel('');
      }, timeoutMs);
    },
    [clearStepTimeout, exercise.bpm, exercise.notes, exerciseConfig.stepTimeoutMultiplier],
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
    clearStepTimeout();
    setHighlightedSlotIndex(null);
    const { responses, extraneousNotes } = stopCapture();
    const raw = scoreExercise(exercise, responses, extraneousNotes);
    const exerciseResult: ExerciseResult = { ...raw, score: Math.round(raw.score * (bpm / 120)) };
    setResult(exerciseResult);
    setPhase('results');
  }, [exercise, bpm, clearStepTimeout, stopCapture, stopPlayback]);

  // ── Stop recording when tab/PWA is hidden (minimised or switched away) ──────
  //    Stops active mic capture + exercise to avoid capturing ambient audio
  //    while the user is away and to give them a clean result on return.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && phase === 'playing') {
        handleStop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [phase, handleStop]);

  // ── Pre-warm ToneAdapter when mic is ready so adapter.init() is instant ────
  //    This eliminates the startMs timing drift that caused early slots to be
  //    missed (adapter.init could take 500 ms+ loading piano samples).
  useEffect(() => {
    if (micState === 'active') {
      void ToneAdapter.getInstance().init();
    }
  }, [micState]);

  // ── handleStartStep — begin step exercise immediately (no note required) ───
  const handleStartStep = useCallback(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    setPhase('playing');
    setHighlightedSlotIndex(0);
    stepIndexRef.current = 0;
    lastStepMidiRef.current = null;
    stepLastPlayTimeRef.current = Date.now();
    void ToneAdapter.getInstance().init().then(() => {
      const adapter = ToneAdapter.getInstance();
      adapter.setMuted(false);
      adapter.startTransport();
      adapter.playNote(exercise.notes[0].midiPitch, 0.6, 0);
    });
    scheduleStepSlotTimeout(0);
  }, [exercise, scheduleStepSlotTimeout]);

  // ── Auto-start: first detected pitch triggers the exercise ─────────────────
  useEffect(() => {
    if (phase !== 'ready' || !currentPitch || autoStartedRef.current) return;

    if (exerciseConfig.mode === 'step') {
      // Step mode: delegate to handleStartStep (also callable via button)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleStartStep();
    } else {
      // Flow mode: 3-2-1 countdown
      autoStartedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase('countdown');
      setCountdownValue(3);
      const t1 = setTimeout(() => setCountdownValue(2), 1000);
      const t2 = setTimeout(() => setCountdownValue(1), 2000);
      const t3 = setTimeout(() => {
        setCountdownValue(null);
        void handlePlay();
      }, 3000);
      countdownTimersRef.current = [t1, t2, t3];
    }
  }, [currentPitch, phase, exerciseConfig.mode, handleStartStep, handlePlay]);

  // ── Step mode: respond to pitch detections ────────────────────────────────
  useEffect(() => {
    if (exerciseConfig.mode !== 'step' || phase !== 'playing' || !currentPitch) return;
    // Ignore mic input right after playing a note (guard against speaker feedback)
    if (Date.now() - stepLastPlayTimeRef.current < STEP_INPUT_DELAY_MS) return;

    const detectedMidi = Math.round(12 * Math.log2(currentPitch.hz / 440) + 69);
    // Debounce: only act on pitch changes
    if (detectedMidi === lastStepMidiRef.current) return;
    lastStepMidiRef.current = detectedMidi;

    const stepIdx = stepIndexRef.current;
    const targetNote = exercise.notes[stepIdx];
    if (!targetNote) return;
    const noteId = `ex-slot-${stepIdx}`;

    if (detectedMidi === targetNote.midiPitch) {
      // ✓ Correct note — mark it green, advance
      const noteName = midiToNoteName(targetNote.midiPitch);
      setStepExNoteLabels((prev) => ({ ...prev, [noteId]: noteName }));
      setStepExNoteColors((prev) => ({ ...prev, [noteId]: '#4caf50' }));
      setStepWrongNote(null);
      setStepWrongLabel('');
      clearStepTimeout();
      // Accumulate on response staff
      const respNote: Note = {
        id: `resp-step-${stepIdx}`,
        start_tick: stepIdx * QUARTER_TICKS,
        duration_ticks: QUARTER_TICKS,
        pitch: targetNote.midiPitch,
      };
      setStepResponseNotes((prev) => [...prev, respNote]);

      const nextIdx = stepIdx + 1;
      if (nextIdx >= exercise.notes.length) {
        // All done — build result: correct notes stay correct, penalised slots get wrong-pitch
        const penalized = stepPenalizedSlotsRef.current;
        const msPerBeat = 60_000 / exercise.bpm;
        const exerciseResult: ExerciseResult = {
          comparisons: exercise.notes.map((n, i) => ({
            target: n,
            response: { hz: 440 * Math.pow(2, (n.midiPitch - 69) / 12), midiCents: n.midiPitch * 100, onsetMs: n.slotIndex * msPerBeat, confidence: 1 },
            status: (penalized.has(i) ? 'wrong-pitch' : 'correct') as NoteComparisonStatus,
            pitchDeviationCents: 0,
            timingDeviationMs: 0,
          })),
          extraneousNotes: [],
          score: Math.max(0, Math.round(100 - penalized.size * 10)),
          correctPitchCount: exercise.notes.length - penalized.size,
          correctTimingCount: exercise.notes.length,
        };
        setResult(exerciseResult);
        setPhase('results');
      } else {
        stepIndexRef.current = nextIdx;
        lastStepMidiRef.current = detectedMidi; // keep debounce — prevents lingering resonance triggering wrong on next slot
        setHighlightedSlotIndex(nextIdx);
        const adapter = ToneAdapter.getInstance();
        stepLastPlayTimeRef.current = Date.now();
        adapter.playNote(exercise.notes[nextIdx].midiPitch, 0.6, adapter.getTransportSeconds() + 0.08);
        scheduleStepSlotTimeout(nextIdx);
      }
    } else {
      // ✗ Wrong note — show target note name as red hint + wrong note in response staff
      stepPenalizedSlotsRef.current.add(stepIdx);
      setStepExNoteLabels((prev) => ({ ...prev, [noteId]: midiToNoteName(targetNote.midiPitch) }));
      setStepExNoteColors((prev) => ({ ...prev, [noteId]: '#f44336' }));
      setStepWrongNote({
        id: 'resp-step-wrong',
        start_tick: stepIdx * QUARTER_TICKS,
        duration_ticks: QUARTER_TICKS,
        pitch: detectedMidi,
      });
      setStepWrongLabel(midiToNoteName(detectedMidi));
    }
  }, [currentPitch, phase, exerciseConfig.mode, exercise, clearStepTimeout, scheduleStepSlotTimeout]);

  // ── Try Again (T018) ─────────────────────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    stopPlayback();
    clearCountdown();
    clearStepTimeout();
    clearCapture();
    setResult(null);
    setHighlightedSlotIndex(null);
    setStepExNoteLabels({});
    setStepExNoteColors({});
    setStepResponseNotes([]);
    setStepWrongNote(null);
    setStepWrongLabel('');
    stepIndexRef.current = 0;
    stepPenalizedSlotsRef.current = new Set();
    lastStepMidiRef.current = null;
    autoStartedRef.current = false;
    setPhase('ready');
    // exercise stays the same
  }, [clearCapture, clearCountdown, clearStepTimeout, stopPlayback]);

  // ── New Exercise (T019) ───────────────────────────────────
  const handleNewExercise = useCallback(() => {
    stopPlayback();
    clearCountdown();
    clearStepTimeout();
    clearCapture();
    setResult(null);
    setHighlightedSlotIndex(null);
    setStepExNoteLabels({});
    setStepExNoteColors({});
    setStepResponseNotes([]);
    setStepWrongNote(null);
    setStepWrongLabel('');
    stepIndexRef.current = 0;
    stepPenalizedSlotsRef.current = new Set();
    lastStepMidiRef.current = null;
    autoStartedRef.current = false;
    setExercise(generateExercise(bpm, exerciseConfig));
    setPhase('ready');
  }, [bpm, exerciseConfig, clearCapture, clearCountdown, clearStepTimeout, stopPlayback]);

  // ── Back button — cleanup on navigate away (T022) ────────────────────────
  const handleBack = useCallback(() => {
    stopPlayback();
    clearCountdown();
    clearStepTimeout();
    // clearCapture releases captureRef; mic teardown is handled by
    // usePracticeRecorder's own unmount cleanup
    clearCapture();
    onBack();
  }, [clearCapture, clearCountdown, clearStepTimeout, stopPlayback, onBack]);

  // ── Stopwatch cleanup on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="practice-view" data-testid="practice-view">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="practice-view__header">
        <button className="practice-view__back-btn" onClick={handleBack} aria-label="← Back">
          ← Back
        </button>
        <h1 className="practice-view__title">Practice Exercise</h1>
      </header>

      {/* ── Body: sidebar + main ─────────────────────────────────── */}
      <div className="practice-view__body">

        <PracticeConfigPanel
          config={exerciseConfig}
          bpm={bpm}
          disabled={phase === 'playing' || phase === 'countdown'}
          collapsed={configCollapsed}
          onToggle={() => setConfigCollapsed((v) => !v)}
          onConfigChange={handleConfigChange}
          onBpmChange={handleBpmChange}
        />

        <main className="practice-view__main">
          {/* ── Mic error banner ─────────────────────────────────── */}
          {micState === 'error' && micError && (
            <div className="practice-view__mic-error" role="alert" data-testid="mic-error-banner">
              🎤 {micError}
            </div>
          )}
          {/* ── Onboarding tips banner ──────────────────────── */}
          {showTips && (
            <div className="practice-view__tips" role="note" data-testid="tips-banner">
              <ul className="practice-view__tips-list">
                <li>🎹 <strong>You need a keyboard</strong> to play the notes.</li>
                <li>🎤 Place the <strong>microphone as close as possible</strong> to the keyboard’s speakers.</li>
                <li>🤫 Practice in a <strong>quiet space</strong> — background noise reduces accuracy.</li>
                <li>⭐ An <strong>external microphone</strong> significantly improves pitch detection.</li>
              </ul>
              <button
                className="practice-view__tips-dismiss"
                onClick={handleDismissTips}
                aria-label="Dismiss tips"
              >
                Got it!
              </button>
            </div>
          )}
          {/* ── Exercise staff ───────────────────────────────────── */}
          <div className="practice-view__staff-block" data-testid="exercise-staff-block">
            <div className="practice-view__staff-label">Exercise</div>
            <div className="practice-view__staff-inner">
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
                  noteLabels={stepExNoteLabels}
                  noteLabelColors={stepExNoteColors}
                />
              </div>
            </div>
          </div>

          {/* ── Controls (ready / countdown / playing) ───────────── */}
          {phase !== 'results' && (
            <div className="practice-view__controls">
              {phase === 'ready' && (
                <>
                  {exerciseConfig.mode === 'step' && micState === 'active' ? (
                    <button
                      className="practice-view__play-btn"
                      onClick={handleStartStep}
                      aria-label="Start step exercise"
                      data-testid="start-step-btn"
                    >
                      ▶ Start
                    </button>
                  ) : (
                    <p className="practice-view__start-prompt" data-testid="start-prompt" aria-live="polite">
                      {micState === 'active'
                        ? '🎹 Press any note to start'
                        : '🎹 Waiting for microphone…'}
                    </p>
                  )}
                </>
              )}
              {phase === 'countdown' && countdownValue !== null && (
                <div
                  className="practice-view__countdown"
                  aria-live="assertive"
                  aria-label={`Starting in ${countdownValue}`}
                  data-testid="countdown-display"
                >
                  <span className="practice-view__countdown-number" key={countdownValue}>
                    {countdownValue}
                  </span>
                </div>
              )}
              {phase === 'playing' && (
                <button className="practice-view__stop-btn" onClick={handleStop} aria-label="Stop exercise" data-testid="stop-btn">
                  ■ Stop
                </button>
              )}
            </div>
          )}

          {/* ── Response staff ───────────────────────────────────── */}
          {(phase === 'playing' || phase === 'results') && (
            <div className="practice-view__staff-block" data-testid="response-staff-block">
              <div className="practice-view__staff-label">Your Response</div>
              <div className="practice-view__staff-inner">
                <div className="practice-view__staff-renderer" aria-label="Your response notes" role="img">
                  <NotationRenderer
                    layout={responseLayout}
                    highlightedNoteIds={ghostNote ? ['__practice_ghost__'] : []}
                    showClef
                    noteLabels={stepRespNoteLabels}
                    noteLabelColors={stepRespNoteColors}
                  />
                </div>
                {phase === 'playing' && currentPitch && exerciseConfig.mode === 'flow' && (
                  <div className="practice-view__pitch-display" aria-live="polite">
                    Detected: {currentPitch.label} ({currentPitch.hz.toFixed(1)} Hz)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Results ──────────────────────────────────────────── */}
          {phase === 'results' && result && (
            <>
              <div className="practice-view__controls">
                <button className="practice-view__play-btn" onClick={handleTryAgain} aria-label="Try Again" data-testid="try-again-btn">
                  🔁 Try Again
                </button>
                <button className="practice-view__play-btn" onClick={handleNewExercise} aria-label="New Exercise" data-testid="new-exercise-btn" style={{ background: '#388e3c' }}>
                  🎲 New Exercise
                </button>
              </div>
              <ExerciseResultsView result={result} exercise={exercise} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
