/**
 * PracticePlugin.tsx — Feature 031: Practice View Plugin
 *
 * Main component for the Practice plugin. Uses ONLY context.* API — no imports
 * from src/services/, src/components/, or src/wasm/ are permitted (ESLint boundary).
 *
 * Layout: header + tips banner + collapsible sidebar config + main (staves, controls, results)
 * Matches the visual design of the original PracticeView component.
 *
 * Phase state machine: ready → countdown → playing → results
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PluginContext, PluginPitchEvent, PluginNoteEvent, PluginScorePitches, ScorePlayerState } from '../../src/plugin-api/index';
import type {
  PracticePhase,
  PracticeExercise,
  ExerciseConfig,
  ExerciseResult,
  ExerciseNote,
  ResponseNote,
  NoteComparisonStatus,
} from './practiceTypes';
import { generateExercise, generateScoreExercise, DEFAULT_EXERCISE_CONFIG } from './exerciseGenerator';
import { scoreCapture } from './exerciseScorer';
import './PracticePlugin.css';

// ─── Hz/MIDI helpers ──────────────────────────────────────────────────────────

/** Convert a frequency in Hz to the nearest integer MIDI note number. */
function hzToMidi(hz: number): number {
  return Math.round(12 * Math.log2(hz / 440) + 69);
}

/** Convert hz to fractional MIDI cents for scoring. */
function hzToMidiCents(hz: number): number {
  return 12 * Math.log2(hz / 440) * 100 + 6900;
}

/** MIDI note number to friendly label (C4, D#5 …) */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiToLabel(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

// ─── Pitch onset detection constants (mirrors usePracticeRecorder) ────────────

/** Consecutive identical-pitch frames required before committing a note onset */
const PITCH_STABLE_FRAMES = 3;
/** Consecutive null/silent frames required before finalising the current note */
const SILENCE_STABLE_FRAMES = 5;
/** Minimum MIDI note accepted (C2 = 36) — rejects ultrasonic artefacts */
const CAPTURE_MIDI_MIN = 36;
/** Maximum MIDI note accepted (C6 = 84) — rejects ultrasonic artefacts */
const CAPTURE_MIDI_MAX = 84;
/** Minimum confidence threshold — pitchy readings below this are treated as silence */
const MIN_CONFIDENCE = 0.8;
/** Milliseconds to ignore mic input right after playing a step note (speaker feedback guard) */
const STEP_INPUT_DELAY_MS = 700;

// ─── Countdown steps ──────────────────────────────────────────────────────────

const COUNTDOWN_STEPS = ['3', '2', '1', 'Go!'];

// ─── Component ────────────────────────────────────────────────────────────────

export interface PracticePluginProps {
  context: PluginContext;
}

export function PracticePlugin({ context }: PracticePluginProps) {
  // ── Config & BPM state ─────────────────────────────────────────────────────
  const [config, setConfig] = useState<ExerciseConfig>({ ...DEFAULT_EXERCISE_CONFIG });
  const [bpmValue, setBpmValue] = useState(80);

  // ── Exercise state ──────────────────────────────────────────────────────────
  const [exercise, setExercise] = useState<PracticeExercise>(
    () => generateExercise(80, DEFAULT_EXERCISE_CONFIG),
  );

  // ── Phase state ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<PracticePhase>('ready');
  const [countdownStep, setCountdownStep] = useState<string>('');
  const [result, setResult] = useState<ExerciseResult | null>(null);
  // Current exercise slot being highlighted on the exercise staff (null = none)
  const [highlightedSlotIndex, setHighlightedSlotIndex] = useState<number | null>(null);
  // Step mode wrong-note hint
  const [stepHint, setStepHint] = useState<{ text: string; color: string } | null>(null);

  // ── Input source ──────────────────────────────────────────────────────────────
  // 'midi' when MIDI keyboard is detected, 'mic' when microphone provides input.
  // MIDI takes priority: once a MIDI note is received, mic events are ignored for scoring.
  const [inputSource, setInputSource] = useState<'midi' | 'mic' | null>(null);
  const inputSourceRef = useRef<'midi' | 'mic' | null>(null);

  // ── Mic state ────────────────────────────────────────────────────────────────
  const [micActive, setMicActive] = useState<boolean | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // ── Score preset state ────────────────────────────────────────────────────────
  const [scorePitches, setScorePitches] = useState<PluginScorePitches | null>(null);
  const [showScoreSelector, setShowScoreSelector] = useState(false);
  const [scorePlayerState, setScorePlayerState] = useState<ScorePlayerState>({
    status: 'idle', currentTick: 0, totalDurationTicks: 0,
    highlightedNoteIds: new Set<string>(), bpm: 0, title: null, error: null,
  });
  const scorePitchesRef = useRef<PluginScorePitches | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [showTips, setShowTips] = useState(
    () => sessionStorage.getItem('practice-tips-v1-dismissed') !== 'yes',
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sound toggle — muting silences guide notes without affecting user MIDI feedback
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  // Live response notes for display
  const [responseNoteEvents, setResponseNoteEvents] = useState<PluginNoteEvent[]>([]);
  // Absolute timestamp of when the current exercise playback started (for WASM layout)
  const [playStartMs, setPlayStartMs] = useState(0);

  // ── Computed: exercise note events for the staff ────────────────────────────
  const exerciseNoteEvents = useMemo<PluginNoteEvent[]>(() =>
    exercise.notes.map((n) => ({
      midiNote: n.midiPitch,
      timestamp: n.expectedOnsetMs,
      type: 'attack' as const,
      durationMs: (60_000 / exercise.bpm) * 0.85,
    })),
    [exercise],
  );

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const captureRef = useRef<ResponseNote[]>([]);
  const playStartMsRef = useRef<number>(0);
  const phaseRef = useRef<PracticePhase>('ready');
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exerciseRef = useRef<PracticeExercise>(exercise);

  // ── Onset detection state (mirrors usePracticeRecorder) ──────────────────────
  // These refs track the debounced pitch stream so we emit one ResponseNote per
  // discrete note onset rather than one entry per raw AudioWorklet frame.
  const pitchStableCountRef = useRef(0);
  const silenceStableCountRef = useRef(0);
  const lastCommittedMidiRef = useRef<number | null>(null);
  /** Pending note — pitch confirmed stable but not yet finalised (waiting for silence / pitch change) */
  const pendingNoteRef = useRef<ResponseNote | null>(null);

  // ── Step mode refs ──────────────────────────────────────────────────────────
  /** Current slot index in step mode */
  const stepIndexRef = useRef(0);
  /** Last MIDI note acted on — debounce to prevent re-triggering same note */
  const lastStepMidiRef = useRef<number | null>(null);
  /** Timestamp of last note played in step mode (speaker feedback guard) */
  const stepLastPlayTimeRef = useRef<number>(0);
  /** Slots penalised at least once (wrong note or timeout) */
  const stepPenalizedSlotsRef = useRef<Set<number>>(new Set());
  /** Maps slot index → wrong MIDI played (step mode) — used for pitch deviation in results */
  const stepWrongMidiMapRef = useRef<Map<number, number>>(new Map());
  /** setTimeout id for the current slot's deadline timer */
  const stepSlotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** setTimeout id for the debounce reset after advancing a slot */
  const stepDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** setTimeout ids for flow-mode per-slot highlight timers */
  const highlightTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Prevents auto-start from firing more than once per ready phase */
  const autoStartedRef = useRef(false);
  /** Stable ref to the current handleStepInput function */
  const handleStepInputRef = useRef<(midi: number) => void>(() => {});
  /** Stable ref to the current handleStartStep function */
  const handleStartStepRef = useRef<() => void>(() => {});
  // Stable config/bpm refs for use in callbacks (avoids stale closures)
  const configRef = useRef<ExerciseConfig>({ ...DEFAULT_EXERCISE_CONFIG });
  const bpmRef = useRef(80);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { bpmRef.current = bpmValue; }, [bpmValue]);

  // Stable ref to handlePlay — lets MIDI subscription auto-start without stale closure
  const handlePlayRef = useRef<() => void>(() => {});

  // ── ScorePlayer subscription ──────────────────────────────────────────────────
  // Delivers state snapshots into React state so downstream effects can react.
  useEffect(() => {
    return context.scorePlayer.subscribe((state: ScorePlayerState) => {
      setScorePlayerState(state);
    });
  }, [context.scorePlayer]);

  // When scorePlayerState transitions to 'ready' while the Score preset is active,
  // extract the practice notes.  This effect runs AFTER the host has committed its
  // own state (pluginStatus, score), so extractPracticeNotes returns valid data.
  useEffect(() => {
    if (scorePlayerState.status === 'ready' && configRef.current.preset === 'score') {
      const pitches = context.scorePlayer.extractPracticeNotes(configRef.current.noteCount);
      if (pitches) {
        scorePitchesRef.current = pitches;
        setScorePitches(pitches);
        setShowScoreSelector(false);
        setExercise(generateScoreExercise(bpmRef.current, pitches.notes, configRef.current.noteCount));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scorePlayerState.status, context.scorePlayer]);

  // ── Web MIDI device presence watcher ─────────────────────────────────────────
  // Uses navigator.requestMIDIAccess (browser API, not a host import) to detect
  // connect/disconnect events in real time, independently of note events.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) return;

    let midiAccess: MIDIAccess | null = null;

    function countInputs(access: MIDIAccess): number {
      let n = 0;
      access.inputs.forEach(() => { n++; });
      return n;
    }

    function applyMidiPresence(access: MIDIAccess) {
      const hasMidi = countInputs(access) > 0;
      setInputSource(prev => {
        const next = hasMidi ? 'midi' : (prev === 'midi' ? null : prev);
        inputSourceRef.current = next;
        return next;
      });
    }

    navigator.requestMIDIAccess().then((access) => {
      midiAccess = access;
      // Check devices that are already connected on mount
      applyMidiPresence(access);
      // Listen for connect / disconnect
      access.onstatechange = () => applyMidiPresence(access);
    }).catch(() => {
      // MIDI access denied or unsupported — silently fall back to mic only
    });

    return () => {
      if (midiAccess) {
        midiAccess.onstatechange = null;
      }
    };
  }, []);

  // ── Microphone subscription ─────────────────────────────────────────────────
  // Onset detection mirrors usePracticeRecorder:
  //  - Requires PITCH_STABLE_FRAMES consecutive identical-MIDI readings before committing
  //  - Requires SILENCE_STABLE_FRAMES consecutive silent/low-confidence frames before
  //    finalising the pending note and resetting the state machine
  //  - Filters pitches outside CAPTURE_MIDI_MIN..CAPTURE_MIDI_MAX (ultrasonic artefacts)
  //  - Ignores frames with confidence < MIN_CONFIDENCE
  useEffect(() => {
    const unsubError = context.recording.onError((err) => {
      setMicError(err);
      setMicActive(false);
    });

    const unsubPitch = context.recording.subscribe((event: PluginPitchEvent) => {
      setMicActive(true);
      setMicError(null);

      // MIDI takes priority — ignore mic pitch events when MIDI keyboard is active
      if (inputSourceRef.current === 'midi') return;

      // Determine if this frame carries a valid in-range pitch
      const midi = hzToMidi(event.hz);
      const isValid =
        event.confidence >= MIN_CONFIDENCE &&
        midi >= CAPTURE_MIDI_MIN &&
        midi <= CAPTURE_MIDI_MAX;

      if (isValid) {
        // Promote to mic source on first confirmed pitch
        if (inputSourceRef.current === null) {
          setInputSource('mic');
          inputSourceRef.current = 'mic';
        }

        silenceStableCountRef.current = 0; // reset silence run

        // AUTO-START: first valid mic pitch while in ready phase
        if (phaseRef.current === 'ready' && !autoStartedRef.current) {
          autoStartedRef.current = true;
          if (configRef.current.mode === 'step') {
            handleStartStepRef.current();
          } else {
            handlePlayRef.current();
          }
          return;
        }

        // STEP MODE: dispatch every distinct valid pitch directly (bypass flow debounce)
        if (configRef.current.mode === 'step' && phaseRef.current === 'playing') {
          handleStepInputRef.current(midi);
          return;
        }

        if (midi === lastCommittedMidiRef.current) {
          // Same pitch as current pending note — just keep counting
          pitchStableCountRef.current++;
        } else {
          // Pitch changed: finalise the previous pending note immediately (pitch-change offset)
          if (pendingNoteRef.current !== null) {
            const finalisedNote = pendingNoteRef.current;
            pendingNoteRef.current = null;
            if (phaseRef.current === 'playing') {
              captureRef.current.push(finalisedNote);
              setResponseNoteEvents(prev => [...prev, {
                midiNote: Math.round(finalisedNote.midiCents / 100),
                timestamp: event.timestamp,
                type: 'attack' as const,
              }]);
            }
          }
          // Start counting frames for the new pitch
          lastCommittedMidiRef.current = midi;
          pitchStableCountRef.current = 1;
        }

        // Once we've seen PITCH_STABLE_FRAMES in a row, record the onset
        if (
          pitchStableCountRef.current === PITCH_STABLE_FRAMES &&
          pendingNoteRef.current === null
        ) {
          pendingNoteRef.current = {
            hz: event.hz,
            midiCents: hzToMidiCents(event.hz),
            onsetMs: Date.now() - playStartMsRef.current,
            confidence: event.confidence,
          };
        }
      } else {
        // Silent / invalid frame
        pitchStableCountRef.current = 0;
        silenceStableCountRef.current++;

        if (
          silenceStableCountRef.current >= SILENCE_STABLE_FRAMES &&
          pendingNoteRef.current !== null
        ) {
          // Silence confirmed: finalise the pending note
          const finalisedNote = pendingNoteRef.current;
          pendingNoteRef.current = null;
          lastCommittedMidiRef.current = null;
          if (phaseRef.current === 'playing') {
            captureRef.current.push(finalisedNote);
            setResponseNoteEvents(prev => [...prev, {
              midiNote: Math.round(finalisedNote.midiCents / 100),
              timestamp: event.timestamp,
              type: 'attack' as const,
            }]);
          }
        }
      }
    });

    return () => {
      unsubPitch();
      unsubError();
    };
  }, [context]);

  // ── MIDI subscription — detect source, capture, and auto-start ──────────────
  useEffect(() => {
    const unsub = context.midi.subscribe((event: PluginNoteEvent) => {
      // Relay release events for audio feedback in MIDI flow mode
      if (event.type === 'release') {
        if (phaseRef.current === 'playing' && configRef.current.mode !== 'step') {
          context.playNote({ midiNote: event.midiNote, timestamp: event.timestamp, type: 'release' });
        }
        return;
      }
      if (event.type !== 'attack') return;
      // Promote to MIDI source on first attack (MIDI takes priority over mic)
      if (inputSourceRef.current !== 'midi') {
        setInputSource('midi');
        inputSourceRef.current = 'midi';
      }
      // Auto-start when a key is pressed in the ready phase
      if (phaseRef.current === 'ready') {
        if (!autoStartedRef.current) {
          autoStartedRef.current = true;
          if (configRef.current.mode === 'step') {
            handleStartStepRef.current();
          } else {
            handlePlayRef.current();
          }
        }
        return;
      }
      if (phaseRef.current !== 'playing') return;
      if (configRef.current.mode === 'step') {
        handleStepInputRef.current(event.midiNote);
      } else {
        const onsetMs = Date.now() - playStartMsRef.current;
        captureRef.current.push({
          hz: 0,
          midiCents: event.midiNote * 100,
          onsetMs,
          confidence: 1,
        });
        setResponseNoteEvents(prev => [...prev, event]);
        // Play the note back so the user hears what they pressed (MIDI only —
        // microphone mode already captures acoustic sound from the real instrument)
        context.playNote({
          midiNote: event.midiNote,
          timestamp: event.timestamp,
          type: 'attack',
          durationMs: event.durationMs ?? 500,
        });
      }
    });
    return unsub;
  }, [context]);

  // ── Unmount cleanup ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (finishTimerRef.current !== null) {
        clearTimeout(finishTimerRef.current);
      }
      context.stopPlayback();
    };
  }, [context]);

  // ── Onset detection reset helper ───────────────────────────────────────────
  const resetOnsetDetection = useCallback(() => {
    pitchStableCountRef.current = 0;
    silenceStableCountRef.current = 0;
    lastCommittedMidiRef.current = null;
    pendingNoteRef.current = null;
  }, []);

  // ── Step timeout helpers ────────────────────────────────────────────────────
  const clearStepTimeout = useCallback(() => {
    if (stepSlotTimeoutRef.current !== null) {
      clearTimeout(stepSlotTimeoutRef.current);
      stepSlotTimeoutRef.current = null;
    }
  }, []);

  const scheduleStepSlotTimeout = useCallback((stepIdx: number) => {
    clearStepTimeout();
    const noteDurationMs = 60_000 / bpmRef.current;
    const timeoutMs = noteDurationMs * configRef.current.stepTimeoutMultiplier;
    stepSlotTimeoutRef.current = setTimeout(() => {
      stepSlotTimeoutRef.current = null;
      stepPenalizedSlotsRef.current.add(stepIdx);
      const targetPitch = exerciseRef.current.notes[stepIdx]?.midiPitch;
      if (targetPitch != null) {
        setStepHint({ text: `Expected: ${midiToLabel(targetPitch)}`, color: '#e65100' });
      }
    }, timeoutMs);
  }, [clearStepTimeout]);

  // ── Step input handler (shared by mic + MIDI) ────────────────────────────────
  // Reads all state from refs so it can be stored in handleStepInputRef without
  // becoming stale inside the subscription closures.
  const handleStepInput = useCallback((detectedMidi: number) => {
    if (configRef.current.mode !== 'step') return;
    if (phaseRef.current !== 'playing') return;
    if (Date.now() - stepLastPlayTimeRef.current < STEP_INPUT_DELAY_MS) return;
    if (detectedMidi === lastStepMidiRef.current) return; // debounce

    lastStepMidiRef.current = detectedMidi;
    const stepIdx = stepIndexRef.current;
    const ex = exerciseRef.current;
    const targetNote = ex.notes[stepIdx];
    if (!targetNote) return;

    if (detectedMidi === targetNote.midiPitch) {
      // ✓ Correct note — advance slot
      clearStepTimeout();
      setStepHint(null);
      const nextIdx = stepIdx + 1;

      if (nextIdx >= ex.notes.length) {
        // All slots done — build result from penalised set
        const penalized = stepPenalizedSlotsRef.current;
        const msPerBeat = 60_000 / ex.bpm;
        const exerciseResult: ExerciseResult = {
          comparisons: ex.notes.map((n: ExerciseNote, i: number) => {
            const wrongMidi = penalized.has(i) ? (stepWrongMidiMapRef.current.get(i) ?? n.midiPitch) : n.midiPitch;
            return {
              target: n,
              response: {
                hz: 440 * Math.pow(2, (wrongMidi - 69) / 12),
                midiCents: wrongMidi * 100,
                onsetMs: n.slotIndex * msPerBeat,
                confidence: 1,
              },
              status: (penalized.has(i) ? 'wrong-pitch' : 'correct') as NoteComparisonStatus,
              pitchDeviationCents: penalized.has(i) ? (wrongMidi - n.midiPitch) * 100 : 0,
              timingDeviationMs: 0,
            };
          }),
          extraneousNotes: [],
          score: Math.max(0, Math.round(100 - penalized.size * (100 / ex.notes.length))),
          correctPitchCount: ex.notes.length - penalized.size,
          correctTimingCount: ex.notes.length,
        };
        setResult(exerciseResult);
        setHighlightedSlotIndex(null);
        setPhase('results');
        phaseRef.current = 'results';
      } else {
        stepIndexRef.current = nextIdx;
        // Briefly block carry-over of the just-played pitch into the new slot
        if (stepDebounceTimeoutRef.current !== null) clearTimeout(stepDebounceTimeoutRef.current);
        lastStepMidiRef.current = detectedMidi;
        stepDebounceTimeoutRef.current = setTimeout(() => {
          lastStepMidiRef.current = null;
          stepDebounceTimeoutRef.current = null;
        }, STEP_INPUT_DELAY_MS);
        setHighlightedSlotIndex(nextIdx);
        stepLastPlayTimeRef.current = Date.now();
        if (soundEnabledRef.current) {
          context.playNote({
            midiNote: ex.notes[nextIdx].midiPitch,
            timestamp: Date.now(),
            type: 'attack',
            durationMs: 600,
          });
        }
        scheduleStepSlotTimeout(nextIdx);
      }
    } else {
      // ✗ Wrong note — penalise and show hint
      stepPenalizedSlotsRef.current.add(stepIdx);
      stepWrongMidiMapRef.current.set(stepIdx, detectedMidi);
      setStepHint({
        text: `Expected: ${midiToLabel(targetNote.midiPitch)} · You played: ${midiToLabel(detectedMidi)}`,
        color: '#c62828',
      });
    }
  }, [context, clearStepTimeout, scheduleStepSlotTimeout]);

  useEffect(() => { handleStepInputRef.current = handleStepInput; }, [handleStepInput]);

  // ── Step mode start ──────────────────────────────────────────────────────────
  const handleStartStep = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    setPhase('playing');
    phaseRef.current = 'playing';
    captureRef.current = [];
    resetOnsetDetection();
    setResponseNoteEvents([]);
    setResult(null);
    setStepHint(null);
    stepIndexRef.current = 0;
    lastStepMidiRef.current = null;
    stepPenalizedSlotsRef.current = new Set();
    stepWrongMidiMapRef.current = new Map();
    stepLastPlayTimeRef.current = Date.now();
    setHighlightedSlotIndex(0);
    const firstNote = exerciseRef.current.notes[0];
    if (firstNote) {
      if (soundEnabledRef.current) {
        context.playNote({ midiNote: firstNote.midiPitch, timestamp: Date.now(), type: 'attack', durationMs: 600 });
      }
      scheduleStepSlotTimeout(0);
    }
  }, [context, resetOnsetDetection, scheduleStepSlotTimeout]);

  useEffect(() => { handleStartStepRef.current = handleStartStep; }, [handleStartStep]);

  // ── Play handler (flow mode) ─────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    autoStartedRef.current = true;

    const currentExercise = exerciseRef.current;
    const msPerBeat = 60_000 / currentExercise.bpm;
    const lastNoteMs = currentExercise.notes.length > 0
      ? currentExercise.notes[currentExercise.notes.length - 1].expectedOnsetMs
      : 0;

    setPhase('countdown');
    phaseRef.current = 'countdown';
    captureRef.current = [];
    resetOnsetDetection();
    setResponseNoteEvents([]);
    setResult(null);

    const startExercise = () => {
      setCountdownStep('');
      setPhase('playing');
      phaseRef.current = 'playing';
      const now = Date.now();
      playStartMsRef.current = now;
      setPlayStartMs(now);

      // Schedule per-slot highlight timers
      highlightTimersRef.current.forEach(clearTimeout);
      highlightTimersRef.current = [];
      currentExercise.notes.forEach((note, i) => {
        const t = setTimeout(() => setHighlightedSlotIndex(i), note.expectedOnsetMs);
        highlightTimersRef.current.push(t);
      });

      // Play exercise guide notes only for MIDI (keyboard produces no sound of
      // its own) and unknown source (manual Play button before first input).
      // In mic mode the real acoustic instrument provides the sound — skip audio.
      // Respects soundEnabledRef — muted = no guide notes.
      if (inputSourceRef.current !== 'mic' && soundEnabledRef.current) {
        currentExercise.notes.forEach((note) => {
          context.playNote({
            midiNote: note.midiPitch,
            timestamp: Date.now(),
            type: 'attack',
            offsetMs: note.expectedOnsetMs,
            durationMs: msPerBeat * 0.85,
          });
        });
      }

      const finishMs = lastNoteMs + msPerBeat + 300;
      finishTimerRef.current = setTimeout(() => {
        finishTimerRef.current = null;
        context.stopPlayback();
        // Cancel any remaining highlight timers
        highlightTimersRef.current.forEach(clearTimeout);
        highlightTimersRef.current = [];
        setHighlightedSlotIndex(null);
        // Finalise any in-flight pending note before scoring
        if (pendingNoteRef.current !== null) {
          captureRef.current.push(pendingNoteRef.current);
          pendingNoteRef.current = null;
        }
        resetOnsetDetection();
        const exerciseResult = scoreCapture(
          exerciseRef.current,
          captureRef.current,
          { includeTimingScore: inputSourceRef.current === 'midi' },
        );
        setResult(exerciseResult);
        setPhase('results');
        phaseRef.current = 'results';
      }, finishMs);
    };

    let step = 0;
    function countdownTick() {
      if (step < COUNTDOWN_STEPS.length) {
        const label = COUNTDOWN_STEPS[step];
        setCountdownStep(label);
        step++;
        if (label === 'Go!') {
          setTimeout(startExercise, 500);
        } else {
          setTimeout(countdownTick, 1000);
        }
      }
    }
    countdownTick();
  }, [context, resetOnsetDetection]);
  useEffect(() => { handlePlayRef.current = handlePlay; }, [handlePlay]);

  // ── Stop handler ──────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (finishTimerRef.current !== null) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    // Cancel highlight timers
    highlightTimersRef.current.forEach(clearTimeout);
    highlightTimersRef.current = [];
    setHighlightedSlotIndex(null);
    // Cancel step-mode timers
    clearStepTimeout();
    if (stepDebounceTimeoutRef.current !== null) {
      clearTimeout(stepDebounceTimeoutRef.current);
      stepDebounceTimeoutRef.current = null;
    }
    setStepHint(null);
    context.stopPlayback();
    // Finalise any in-flight pending note before scoring
    if (pendingNoteRef.current !== null) {
      captureRef.current.push(pendingNoteRef.current);
      pendingNoteRef.current = null;
    }
    resetOnsetDetection();
    const exerciseResult = scoreCapture(
      exerciseRef.current,
      captureRef.current,
      { includeTimingScore: inputSourceRef.current === 'midi' },
    );
    setResult(exerciseResult);
    setPhase('results');
    phaseRef.current = 'results';
  }, [context, resetOnsetDetection, clearStepTimeout]);

  // ── Try Again ──────────────────────────────────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    captureRef.current = [];
    resetOnsetDetection();
    setResponseNoteEvents([]);
    setResult(null);
    // Reset highlight / step state
    highlightTimersRef.current.forEach(clearTimeout);
    highlightTimersRef.current = [];
    setHighlightedSlotIndex(null);
    setStepHint(null);
    stepIndexRef.current = 0;
    lastStepMidiRef.current = null;
    stepPenalizedSlotsRef.current = new Set();
    stepWrongMidiMapRef.current = new Map();
    autoStartedRef.current = false;
    if (stepSlotTimeoutRef.current !== null) { clearTimeout(stepSlotTimeoutRef.current); stepSlotTimeoutRef.current = null; }
    if (stepDebounceTimeoutRef.current !== null) { clearTimeout(stepDebounceTimeoutRef.current); stepDebounceTimeoutRef.current = null; }
    setPhase('ready');
    phaseRef.current = 'ready';
  }, [resetOnsetDetection]);

  // ── New Exercise ───────────────────────────────────────────────────────────────
  const handleNewExercise = useCallback(() => {
    captureRef.current = [];
    resetOnsetDetection();
    setResponseNoteEvents([]);
    setResult(null);
    // Reset highlight / step state
    highlightTimersRef.current.forEach(clearTimeout);
    highlightTimersRef.current = [];
    setHighlightedSlotIndex(null);
    setStepHint(null);
    stepIndexRef.current = 0;
    lastStepMidiRef.current = null;
    stepPenalizedSlotsRef.current = new Set();
    stepWrongMidiMapRef.current = new Map();
    autoStartedRef.current = false;
    if (stepSlotTimeoutRef.current !== null) { clearTimeout(stepSlotTimeoutRef.current); stepSlotTimeoutRef.current = null; }
    if (stepDebounceTimeoutRef.current !== null) { clearTimeout(stepDebounceTimeoutRef.current); stepDebounceTimeoutRef.current = null; }
    setExercise(
      configRef.current.preset === 'score' && scorePitchesRef.current
        ? generateScoreExercise(bpmRef.current, scorePitchesRef.current.notes, configRef.current.noteCount)
        : configRef.current.preset !== 'score'
          ? generateExercise(bpmRef.current, configRef.current)
          : { notes: [], bpm: bpmRef.current },
    );
    setPhase('ready');
    phaseRef.current = 'ready';
  }, [resetOnsetDetection]);

  // ── Config helpers — use refs to avoid stale closures ──────────────────────
  const updateConfig = useCallback((patch: Partial<ExerciseConfig>) => {
    // Compute next config synchronously so we can use it for side-effects below
    setConfig(prev => {
      const next = { ...prev, ...patch };
      configRef.current = next;
      return next;
    });
    // Side-effects that depend on the new config value — run outside the updater
    const next = { ...configRef.current, ...patch };
    if (phaseRef.current === 'ready') {
      if (next.preset === 'score') {
        // Open selector when switching to score with no cached pitches
        if (!scorePitchesRef.current && patch.preset === 'score') {
          setShowScoreSelector(true);
        }
        // Regenerate from cached pitches if available
        if (scorePitchesRef.current) {
          setExercise(generateScoreExercise(bpmRef.current, scorePitchesRef.current.notes, next.noteCount));
        } else {
          setExercise({ notes: [], bpm: bpmRef.current });
        }
      } else {
        setExercise(generateExercise(bpmRef.current, next));
      }
    }
  }, []);

  const handleBpmChange = useCallback((v: number) => {
    setBpmValue(v);
    bpmRef.current = v;
    if (phaseRef.current === 'ready') {
      if (configRef.current.preset === 'score' && scorePitchesRef.current) {
        setExercise(generateScoreExercise(v, scorePitchesRef.current.notes, configRef.current.noteCount));
      } else if (configRef.current.preset !== 'score') {
        setExercise(generateExercise(v, configRef.current));
      }
    }
  }, []);

  // ── Tips dismiss ─────────────────────────────────────────────────────────────
  const handleDismissTips = useCallback(() => {
    sessionStorage.setItem('practice-tips-v1-dismissed', 'yes');
    setShowTips(false);
  }, []);

  // ── Sound toggle ──────────────────────────────────────────────────────────────
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      soundEnabledRef.current = next;
      return next;
    });
  }, []);

  // ── Highlighted notes ─────────────────────────────────────────────────────────

  // Response staff: most-recently played note
  const responseHighlightedNotes = useMemo(() => {
    if (phase !== 'playing' || responseNoteEvents.length === 0) return [];
    return [responseNoteEvents[responseNoteEvents.length - 1].midiNote];
  }, [phase, responseNoteEvents]);

  const isDisabled = phase === 'playing' || phase === 'countdown';
  const { StaffViewer, ScoreSelector } = context.components;

  // ── Input source badge ────────────────────────────────────────────────────────
  const inputBadgeClass = [
    'practice-mic-badge',
    inputSource === 'midi'
      ? 'practice-mic-badge--active practice-mic-badge--midi'
      : micError
        ? 'practice-mic-badge--error'
        : micActive === true ? 'practice-mic-badge--active' : '',
  ].filter(Boolean).join(' ');
  const inputBadgeLabel = inputSource === 'midi' ? '🎹 MIDI Keyboard' :
    micError ? `🎤 Microphone (error)` : '🎤 Microphone';
  const inputBadgeTip = inputSource === 'midi' ? 'MIDI keyboard detected — using MIDI input' :
    micError ?? 'Listening via microphone';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="practice-plugin" data-testid="practice-view">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="practice-plugin__header">
        <button
          className="practice-plugin__header-btn practice-plugin__back-btn"
          onClick={() => context.close()}
        >
          ← Back
        </button>
        <h1 className="practice-plugin__title">Practice Exercise</h1>
        <div className="practice-plugin__header-actions">
          <span
            className={inputBadgeClass}
            title={inputBadgeTip}
            aria-label={inputBadgeLabel}
          >
            {inputBadgeLabel}
          </span>

          {phase === 'playing' && (
            <button
              className="practice-plugin__header-btn practice-plugin__header-btn--stop"
              onClick={handleStop}
              aria-label="Stop exercise"
            >
              ■ Stop
            </button>
          )}
          {phase === 'results' && (
            <span className="practice-plugin__phase-label">Results</span>
          )}
        </div>
      </header>

      {/* ── Tips banner ──────────────────────────────────────────────────── */}
      {showTips && (
        <div className="practice-plugin__tips" role="note">
          <ul className="practice-plugin__tips-list">
            <li>🎹 <strong>You need a keyboard</strong> to play the notes.</li>
            <li>🎤 Place the <strong>microphone as close as possible</strong> to the keyboard's speakers.</li>
            <li>🤫 Practice in a <strong>quiet space</strong> — background noise reduces accuracy.</li>
            <li>⭐ An <strong>external microphone</strong> significantly improves pitch detection.</li>
          </ul>
          <button
            className="practice-plugin__tips-dismiss"
            onClick={handleDismissTips}
            aria-label="Dismiss tips"
          >
            Got it!
          </button>
        </div>
      )}

      {/* ── Body: sidebar + main ─────────────────────────────────────────── */}
      <div className="practice-plugin__body">

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className={`practice-sidebar${sidebarCollapsed ? ' practice-sidebar--collapsed' : ''}`}>
          <button
            className="practice-sidebar__toggle"
            onClick={() => setSidebarCollapsed(v => !v)}
            aria-label={sidebarCollapsed ? 'Expand config' : 'Collapse config'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>

          {!sidebarCollapsed && (
            <div className="practice-sidebar__sections">
              {/* MODE */}
              <div className="practice-sidebar__section">
                <p className="practice-sidebar__section-title">Mode</p>
                <select
                  aria-label="Mode"
                  className="practice-sidebar__select"
                  value={config.mode}
                  disabled={isDisabled}
                  onChange={(e) => updateConfig({ mode: e.target.value as 'flow' | 'step' })}
                >
                  <option value="flow">Flow</option>
                  <option value="step">Step</option>
                </select>
              </div>

              {/* SCORE */}
              <div className="practice-sidebar__section">
                <p className="practice-sidebar__section-title">Score</p>
                {([['random', 'Random'], ['c4scale', 'C4 Scale (debug)'], ['score', 'Score']] as [ExerciseConfig['preset'], string][]).map(([v, label]) => (
                  <label
                    key={v}
                    className={`practice-sidebar__radio-label${isDisabled ? ' practice-sidebar__radio-label--disabled' : ''}`}
                  >
                    <input
                      type="radio"
                      name="practice-preset"
                      value={v}
                      checked={config.preset === v}
                      disabled={isDisabled}
                      onChange={() => updateConfig({ preset: v })}
                    />
                    {label}
                  </label>
                ))}
                {config.preset === 'score' && scorePitches !== null && (
                  <button
                    className="practice-sidebar__change-score-btn"
                    disabled={isDisabled}
                    aria-label="Change score"
                    onClick={() => setShowScoreSelector(true)}
                  >
                    Change score
                  </button>
                )}
              </div>

              {/* NOTES */}
              <div className="practice-sidebar__section">
                <p className="practice-sidebar__section-title">Notes</p>
                <div className="practice-sidebar__slider-row">
                  <input
                    type="range"
                    min={2}
                    max={config.preset === 'score' && scorePitches ? scorePitches.totalAvailable : 20}
                    step={1}
                    value={config.noteCount}
                    disabled={isDisabled}
                    aria-label="Note count"
                    onChange={(e) => updateConfig({ noteCount: Number(e.target.value) })}
                  />
                  <span className="practice-sidebar__slider-value">{config.noteCount}</span>
                </div>
              </div>

              {/* CLEF */}
              <div className="practice-sidebar__section">
                <p className="practice-sidebar__section-title">Clef</p>
                {(['Treble', 'Bass'] as const).map((c) => (
                  <label
                    key={c}
                    className={`practice-sidebar__radio-label${(isDisabled || config.preset === 'score') ? ' practice-sidebar__radio-label--disabled' : ''}`}
                  >
                    <input
                      type="radio"
                      name="practice-clef"
                      value={c}
                      checked={config.clef === c}
                      disabled={isDisabled || config.preset === 'score'}
                      aria-disabled={config.preset === 'score'}
                      onChange={() => updateConfig({ clef: c })}
                    />
                    {c}
                  </label>
                ))}
                {config.preset === 'score' && (
                  <span className="practice-score-disabled-label">Set by score</span>
                )}
              </div>

              {/* OCTAVES */}
              <div className="practice-sidebar__section">
                <p className="practice-sidebar__section-title">Octaves</p>
                {([1, 2] as const).map((o) => (
                  <label
                    key={o}
                    className={`practice-sidebar__radio-label${(isDisabled || config.preset === 'score') ? ' practice-sidebar__radio-label--disabled' : ''}`}
                  >
                    <input
                      type="radio"
                      name="practice-octaves"
                      value={o}
                      checked={config.octaveRange === o}
                      disabled={isDisabled || config.preset === 'score'}
                      aria-disabled={config.preset === 'score'}
                      onChange={() => updateConfig({ octaveRange: o })}
                    />
                    {o === 1 ? '1 oct.' : '2 oct.'}
                  </label>
                ))}
                {config.preset === 'score' && (
                  <span className="practice-score-disabled-label">Set by score</span>
                )}
              </div>

              {/* TEMPO */}
              <div className="practice-sidebar__section">
                <p className="practice-sidebar__section-title">Tempo</p>
                <div className="practice-sidebar__slider-row">
                  <input
                    type="range"
                    min={40}
                    max={200}
                    step={5}
                    value={bpmValue}
                    disabled={isDisabled}
                    aria-label="Tempo BPM"
                    onChange={(e) => handleBpmChange(Number(e.target.value))}
                  />
                  <span className="practice-sidebar__slider-value">{bpmValue}</span>
                </div>
                <p className="practice-sidebar__slider-sublabel">BPM</p>
              </div>
            </div>
          )}
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────────── */}
        <main className={`practice-plugin__main${phase === 'countdown' ? ' practice-plugin__main--countdown' : ''}`}>

          {/* Mic error banner */}
          {micError && (
            <div className="practice-plugin__mic-error" role="alert">
              🎤 {micError}
            </div>
          )}

          {/* Countdown overlay */}
          {phase === 'countdown' && countdownStep && (
            <div
              className={`practice-countdown${countdownStep === 'Go!' ? ' practice-countdown--go' : ''}`}
              role="status"
              aria-live="assertive"
            >
              {countdownStep}
            </div>
          )}

          {/* Exercise staff */}
          <div className="practice-staff-block">
            <div className="practice-staff-label">
              <span aria-hidden="true">Exercise</span>
              <button
                className={`practice-staff-sound-btn${soundEnabled ? '' : ' practice-staff-sound-btn--muted'}`}
                onClick={toggleSound}
                aria-label={soundEnabled ? 'Mute exercise notes' : 'Unmute exercise notes'}
                aria-pressed={!soundEnabled}
                title={soundEnabled ? 'Exercise notes sound on — click to mute' : 'Exercise notes muted — click to unmute'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
            </div>
            <div className={`practice-staff-wrapper${phase === 'playing' ? ' practice-staff-wrapper--playing' : ''}`}>
              <StaffViewer
                notes={exerciseNoteEvents}
                clef={config.clef}
                highlightedNoteIndex={highlightedSlotIndex ?? undefined}
                bpm={exercise.bpm}
              />
            </div>
          </div>

          {/* Step mode hint */}
          {phase === 'playing' && config.mode === 'step' && stepHint && (
            <div className="practice-step-hint" role="status" style={{ color: stepHint.color }}>
              {stepHint.text}
            </div>
          )}

          {/* Controls: ready phase */}
          {phase === 'ready' && (
            <div className="practice-controls">
              <p className="practice-start-prompt" aria-live="polite">
                🎹 Press any note to start
              </p>
              <button
                className="practice-plugin__play-btn"
                onClick={config.mode === 'step' ? handleStartStep : handlePlay}
                aria-label="Play exercise"
              >
                ▶ Play
              </button>
            </div>
          )}

          {/* Response staff — flow mode while playing or reviewing results */}
          {(phase === 'playing' || phase === 'results') && config.mode !== 'step' && (
            <div className="practice-staff-block">
              <div className="practice-staff-label" aria-hidden="true">Your Response</div>
              <div className="practice-staff-wrapper">
                <StaffViewer
                  notes={responseNoteEvents}
                  clef={config.clef}
                  highlightedNotes={responseHighlightedNotes}
                  bpm={exercise.bpm}
                  timestampOffset={playStartMs}
                  autoScroll
                />
              </div>
            </div>
          )}

          {/* Results panel */}
          {phase === 'results' && result && (
            <div className="practice-results" role="region" aria-label="Exercise results">
              {/* Score headline */}
              <div className="practice-results__score-block">
                <div className="practice-results__score-ring">
                  <span
                    className="practice-results__score-number"
                    style={{
                      color:
                        result.score >= 90 ? '#2e7d32'
                        : result.score >= 60 ? '#f57f17'
                        : '#c62828',
                    }}
                  >
                    {result.score}
                  </span>
                  <span className="practice-results__score-label">/ 100</span>
                </div>
                <div
                  className="practice-results__score-grade"
                  style={{
                    color:
                      result.score >= 90 ? '#2e7d32'
                      : result.score >= 60 ? '#f57f17'
                      : '#c62828',
                  }}
                >
                  {result.score === 100 ? '🏆 Perfect!'
                    : result.score >= 90 ? '🌟 Excellent!'
                    : result.score >= 70 ? '👍 Good job!'
                    : result.score >= 50 ? '💪 Keep going!'
                    : '🎯 Keep practicing!'}
                </div>
              </div>

              {/* Collapsible note-by-note table */}
              <details className="practice-results__details">
                <summary className="practice-results__details-summary">
                  Note-by-note details
                </summary>
                <div className="practice-results__table-wrapper">
                  <table
                    className="practice-results__table"
                    aria-label="Per-note comparison"
                  >
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Target</th>
                        <th>Detected</th>
                        <th>Status</th>
                        <th>Pitch Δ (¢)</th>
                        <th>Timing Δ (ms)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.comparisons.map((c, i) => (
                        <tr
                          key={i}
                          className={`practice-results__row practice-results__row--${c.status}`}
                        >
                          <td>{i + 1}</td>
                          <td>{midiToLabel(c.target.midiPitch)}</td>
                          <td>
                            {c.response
                              ? `${midiToLabel(Math.round(c.response.midiCents / 100))} (${c.response.hz.toFixed(1)} Hz)`
                              : '—'}
                          </td>
                          <td aria-label={c.status}>
                            <span className="practice-results__status-icon">
                              {c.status === 'correct' ? '✅'
                                : c.status === 'wrong-pitch' ? '⚠️'
                                : c.status === 'wrong-timing' ? '⏱️'
                                : c.status === 'missed' ? '❌'
                                : '➕'}
                            </span>{' '}
                            {c.status === 'correct' ? 'Correct'
                              : c.status === 'wrong-pitch' ? 'Wrong pitch'
                              : c.status === 'wrong-timing' ? 'Wrong timing'
                              : c.status === 'missed' ? 'Missed'
                              : 'Extraneous'}
                          </td>
                          <td>
                            {c.pitchDeviationCents !== null
                              ? Math.round(c.pitchDeviationCents)
                              : '—'}
                          </td>
                          <td>
                            {c.timingDeviationMs !== null
                              ? Math.round(c.timingDeviationMs)
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.extraneousNotes.length > 0 && (
                  <div className="practice-results__extraneous">
                    <strong>Extraneous notes:</strong>{' '}
                    {result.extraneousNotes.length} extra note
                    {result.extraneousNotes.length !== 1 ? 's' : ''} played outside the beat windows.
                  </div>
                )}
              </details>

              <div className="practice-results__actions">
                <button
                  className="practice-plugin__play-btn"
                  onClick={handleTryAgain}
                  aria-label="Try again"
                >
                  🔁 Try Again
                </button>
                <button
                  className="practice-plugin__play-btn practice-plugin__play-btn--new"
                  onClick={handleNewExercise}
                  aria-label="New exercise"
                >
                  🎲 New Exercise
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── ScoreSelector overlay ─────────────────────────────────────────── */}
      {showScoreSelector && config.preset === 'score' && (
        <ScoreSelector
          catalogue={context.scorePlayer.getCatalogue()}
          isLoading={scorePlayerState.status === 'loading'}
          error={scorePlayerState.error}
          onSelectScore={(catalogueId) => {
            context.scorePlayer.loadScore({ kind: 'catalogue', catalogueId });
          }}
          onLoadFile={(file) => {
            context.scorePlayer.loadScore({ kind: 'file', file });
          }}
          onCancel={() => {
            setShowScoreSelector(false);
            if (!scorePitchesRef.current) {
              // No score loaded yet — revert to random preset
              updateConfig({ preset: 'random' });
            }
          }}
        />
      )}
    </div>
  );
}
