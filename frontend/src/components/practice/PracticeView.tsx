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
import type { PracticePhase, ExerciseResult, NoteComparisonStatus } from '../../types/practice';
import {
  generateExercise,
  type ExerciseConfig,
  DEFAULT_EXERCISE_CONFIG,
} from '../../services/practice/exerciseGenerator';
import { scoreExercise } from '../../services/practice/exerciseScorer';
import { usePracticeRecorder } from '../../services/practice/usePracticeRecorder';
import { ToneAdapter } from '../../services/playback/ToneAdapter';
import {
  serializeExerciseToLayoutInput,
  buildPracticeSourceToNoteIdMap,
  findPracticeNoteX,
  serializeResponseToLayoutInput,
} from '../../services/practice/practiceLayoutAdapter';
import { computeLayout } from '../../wasm/layout';
import { initWasm } from '../../services/wasm/loader';
import { LayoutRenderer } from '../LayoutRenderer';
import { createDefaultConfig } from '../../utils/renderUtils';
import { ExerciseResultsView } from './ExerciseResultsView';
import { PracticeConfigPanel } from './PracticeConfigPanel';
import type { GlobalLayout } from '../../wasm/layout';
import './PracticeView.css';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Quarter note duration in ticks (960 PPQ standard) */
const QUARTER_TICKS = 960;

/** Milliseconds to ignore mic input after playing an exercise note (avoids speaker feedback) */
const STEP_INPUT_DELAY_MS = 700;

/** Scale factor: logical layout units → CSS pixels (matches LayoutView BASE_SCALE) */
const BASE_SCALE = 0.5;

/** Shared RenderConfig for all practice staves */
const PRACTICE_RENDER_CONFIG = createDefaultConfig();

/** Logical units per staff space — must match LayoutView (20 = Rust engine default) */
const PRACTICE_UNITS_PER_SPACE = 20;

/** Vertical height per system in logical units (matches LayoutView) */
const PRACTICE_SYSTEM_HEIGHT = 200;

/** Vertical spacing between systems in logical units (matches LayoutView) */
const PRACTICE_SYSTEM_SPACING = 100;

/** Convert MIDI pitch number to human-readable note name, e.g. 60 → "C4" */
function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

/**
 * Compute a tight SVG viewport from actual glyph bounding boxes in the layout.
 *
 * Works across all systems (handles multi-row reflow) and adapts to any note
 * range — no fixed padding that silently clips notes outside the staff.
 *
 * Strategy:
 *  1. Walk every glyph (noteheads, accidentals, beams, clef, time sig…) and
 *     every ledger line across all systems.
 *  2. Take the union of all bounding rects → actual content minY / maxY.
 *  3. Add a 0.5-space hairline margin to avoid antialiasing clip at the edges.
 */
function computePracticeViewport(
  layout: GlobalLayout,
  fallbackWidth: number,
): { x: number; y: number; width: number; height: number } {
  const ups = layout.units_per_space ?? PRACTICE_UNITS_PER_SPACE;
  const margin = 2 * ups; // 40 units — comfortable breathing room around extreme notes

  let minY = Infinity;
  let maxY = -Infinity;

  for (const system of layout.systems) {
    for (const sg of system.staff_groups) {
      for (const stave of sg.staves) {
        // Staff lines — always include the 5-line band
        for (const sl of stave.staff_lines) {
          minY = Math.min(minY, sl.y_position);
          maxY = Math.max(maxY, sl.y_position);
        }
        // Positioned glyphs (noteheads, accidentals, rests, flags, beams …)
        for (const run of stave.glyph_runs) {
          for (const g of run.glyphs) {
            minY = Math.min(minY, g.bounding_box.y);
            maxY = Math.max(maxY, g.bounding_box.y + g.bounding_box.height);
          }
        }
        // Structural glyphs: clef, key signature, time signature
        for (const g of stave.structural_glyphs) {
          minY = Math.min(minY, g.bounding_box.y);
          maxY = Math.max(maxY, g.bounding_box.y + g.bounding_box.height);
        }
        // Ledger lines for notes above / below the staff
        for (const ll of stave.ledger_lines) {
          minY = Math.min(minY, ll.y_position);
          maxY = Math.max(maxY, ll.y_position);
        }
      }
    }
  }

  // Fallback when layout has no glyphs yet
  if (!isFinite(minY)) { minY = 0; maxY = 4 * ups; }

  return {
    x: 0,
    y: minY - margin,
    width: layout.total_width > 0 ? layout.total_width : fallbackWidth,
    height: (maxY - minY) + 2 * margin,
  };
}

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

  // ── WASM layout state ───────────────────────────────────────────────────
  const [wasmReady, setWasmReady] = useState(false);
  const [exerciseLayout, setExerciseLayout] = useState<GlobalLayout | null>(null);
  const [responseLayout, setResponseLayout] = useState<GlobalLayout | null>(null);

  // ── Step mode hint (shown below exercise staff when wrong note / timeout) ──
  const [stepHint, setStepHint] = useState<{ text: string; color: string } | null>(null);

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

  // ── Staff scroll refs (auto-scroll to highlighted note) ──────────────────
  const exScrollRef = useRef<HTMLDivElement | null>(null);
  const respScrollRef = useRef<HTMLDivElement | null>(null);
  /** Ref on the staff-inner container to measure available width via ResizeObserver */
  const staffInnerRef = useRef<HTMLDivElement | null>(null);
  /** Available staff container width in CSS px; drives max_system_width for layout reflow */
  const [staffContainerWidth, setStaffContainerWidth] = useState(800);
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
  /** setTimeout ID used to clear lastStepMidiRef after the carry-over guard window */
  const stepDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Observe staff container width for layout reflow ──────────────────────
  // staffInnerRef is attached to the exercise staff-inner div (first mount).
  // When the sidebar collapses / window resizes, the available width changes
  // and we recompute the layout so notes reflow to fill the container width.
  // ResizeObserver fires immediately on observe(), seeding the initial value.
  useEffect(() => {
    const el = staffInnerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setStaffContainerWidth(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /** Maximum system width in logical units that fits without horizontal scrolling */
  const practiceMaxSystemWidth = Math.max(200, Math.floor(staffContainerWidth / BASE_SCALE));

  // ── Native browser fullscreen on mount ───────────────────────────────────
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // ── WASM init on mount ──────────────────────────────────────────────────
  useEffect(() => {
    initWasm().then(() => setWasmReady(true));
  }, []);

  // ── Exercise layout via Rust WASM (US1) ─────────────────────────────────
  //    Recompute whenever exercise or clef changes, but only after WASM is ready.
  useEffect(() => {
    if (!wasmReady) return;
    const input = serializeExerciseToLayoutInput(exercise.notes, effectiveClef);
    computeLayout(input, { max_system_width: practiceMaxSystemWidth, system_height: PRACTICE_SYSTEM_HEIGHT, system_spacing: PRACTICE_SYSTEM_SPACING, units_per_space: PRACTICE_UNITS_PER_SPACE }).then(setExerciseLayout);
  }, [exercise, effectiveClef, wasmReady, practiceMaxSystemWidth]);

  // ── sourceToNoteIdMap for LayoutRenderer highlight system (US2) ──────────
  const exerciseSourceMap = useMemo(
    () => buildPracticeSourceToNoteIdMap(exercise.notes),
    [exercise],
  );

  // ── Ghost note: current held pitch shown at the highlighted slot position ────
  const ghostNote = useMemo<{ slotIndex: number; midiPitch: number } | null>(() => {
    if (exerciseConfig.mode !== 'flow' || phase !== 'playing' || !currentPitch) return null;
    return {
      slotIndex: highlightedSlotIndex ?? 0,
      midiPitch: Math.round(12 * Math.log2(currentPitch.hz / 440) + 69),
    };
  }, [exerciseConfig.mode, phase, currentPitch, highlightedSlotIndex]);

  // ── Response staff notes for WASM layout input (US3) ─────────────────────
  const responseNoteInputs = useMemo<Array<{ slotIndex: number; midiCents: number }>>(() => {
    if (exerciseConfig.mode === 'step') {
      // Step mode: build from scored comparisons when in results, otherwise empty
      return [];
    }
    if (phase === 'results' && result) {
      return result.comparisons
        .filter((c) => c.response !== null)
        .map((c) => ({
          slotIndex: c.target.slotIndex,
          midiCents: c.response!.midiCents,
        }));
    }
    // Flow playing: live response notes + ghost
    const notes = liveResponseNotes.map((n) => ({
      slotIndex: n.start_tick / QUARTER_TICKS,
      midiCents: n.pitch * 100,
    }));
    if (ghostNote) {
      notes.push({ slotIndex: ghostNote.slotIndex, midiCents: ghostNote.midiPitch * 100 });
    }
    return notes;
  }, [exerciseConfig.mode, phase, result, liveResponseNotes, ghostNote]);

  // ── Response layout via Rust WASM (US3) ──────────────────────────────────
  useEffect(() => {
    if (!wasmReady) return;
    if (exerciseConfig.mode === 'step' || responseNoteInputs.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResponseLayout(null);
      return;
    }
    const input = serializeResponseToLayoutInput(responseNoteInputs, effectiveClef);
    computeLayout(input, { max_system_width: practiceMaxSystemWidth, system_height: PRACTICE_SYSTEM_HEIGHT, system_spacing: PRACTICE_SYSTEM_SPACING, units_per_space: PRACTICE_UNITS_PER_SPACE }).then(setResponseLayout);
  }, [responseNoteInputs, effectiveClef, wasmReady, exerciseConfig.mode, practiceMaxSystemWidth]);

  // ── Highlighted note IDs for LayoutRenderer (US2) ────────────────────────
  const highlightedNoteIds = useMemo(
    () =>
      highlightedSlotIndex !== null
        ? new Set([`ex-${highlightedSlotIndex}`])
        : new Set<string>(),
    [highlightedSlotIndex],
  );

  // ── Auto-scroll staves to keep highlighted note centred (US2) ────────────
  useEffect(() => {
    if (highlightedSlotIndex === null || !exerciseLayout) return;
    const noteX = findPracticeNoteX(exerciseLayout, highlightedSlotIndex);
    if (noteX === null) return;
    // Use the same fill-container scale as the rendered div so scroll targets match pixels.
    const displayScale =
      exerciseLayout.total_width > 0 && staffContainerWidth > 0
        ? Math.max(Math.ceil(exerciseLayout.total_width * BASE_SCALE), staffContainerWidth) /
          exerciseLayout.total_width
        : BASE_SCALE;
    const scrollX = noteX * displayScale;
    const scrollToCenter = (el: HTMLDivElement | null) => {
      if (!el) return;
      el.scrollTo({ left: Math.max(0, scrollX - el.clientWidth / 2), behavior: 'smooth' });
    };
    scrollToCenter(exScrollRef.current);
    scrollToCenter(respScrollRef.current);
  }, [highlightedSlotIndex, exerciseLayout, staffContainerWidth]);

  // ── Build viewport for LayoutRenderer ────────────────────────────────────
  // computePracticeViewport() scans all glyph bounding boxes across all systems
  // so the viewBox tightly encloses the actual content — adapts to any octave
  // range, multi-row reflow, or clef without fragile hardcoded padding.
  const exerciseViewport = useMemo(
    () => exerciseLayout
      ? computePracticeViewport(exerciseLayout, practiceMaxSystemWidth)
      : { x: 0, y: -50, width: practiceMaxSystemWidth, height: 180 },
    [exerciseLayout, practiceMaxSystemWidth],
  );

  const responseViewport = useMemo(
    () => responseLayout
      ? computePracticeViewport(responseLayout, practiceMaxSystemWidth)
      : { x: 0, y: -50, width: practiceMaxSystemWidth, height: 180 },
    [responseLayout, practiceMaxSystemWidth],
  );

  // ── Fill-container display widths ─────────────────────────────────────────
  // The layout engine never stretches notes beyond their natural minimum spacing,
  // so few-note exercises produce a narrow staff centred in a wide container.
  // By always rendering at least staffContainerWidth px, the SVG (width:100%)
  // scales up to fill the space — giving consistent visual note density across
  // all note counts. Many-note exercises that exceed the container just scroll.
  const exerciseDisplayWidth = useMemo(
    () =>
      exerciseLayout && exerciseLayout.total_width > 0 && staffContainerWidth > 0
        ? Math.max(Math.ceil(exerciseLayout.total_width * BASE_SCALE), staffContainerWidth)
        : exerciseLayout
          ? Math.ceil(exerciseLayout.total_width * BASE_SCALE)
          : staffContainerWidth,
    [exerciseLayout, staffContainerWidth],
  );

  const responseDisplayWidth = useMemo(
    () =>
      responseLayout && responseLayout.total_width > 0 && staffContainerWidth > 0
        ? Math.max(Math.ceil(responseLayout.total_width * BASE_SCALE), staffContainerWidth)
        : responseLayout
          ? Math.ceil(responseLayout.total_width * BASE_SCALE)
          : staffContainerWidth,
    [responseLayout, staffContainerWidth],
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
      stepSlotTimeoutRef.current = setTimeout(() => {
        stepSlotTimeoutRef.current = null;
        // Penalise only once (wrong note may have already penalised this slot)
        stepPenalizedSlotsRef.current.add(stepIdx);
        const targetPitch = exercise.notes[stepIdx]?.midiPitch;
        if (targetPitch != null) {
          setStepHint({ text: `Expected: ${midiToNoteName(targetPitch)}`, color: '#e65100' });
        }
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
    if (stepDebounceTimeoutRef.current !== null) {
      clearTimeout(stepDebounceTimeoutRef.current);
      stepDebounceTimeoutRef.current = null;
    }
    setHighlightedSlotIndex(null);
    const { responses, extraneousNotes } = stopCapture();
    const raw = scoreExercise(exercise, responses, extraneousNotes);
    const exerciseResult: ExerciseResult = { ...raw, score: Math.round(raw.score * (bpm / 120)) };
    setResult(exerciseResult);
    setStepHint(null);
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

    if (detectedMidi === targetNote.midiPitch) {
      // ✓ Correct note — advance
      clearStepTimeout();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepHint(null);

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
        // Block the just-played pitch immediately to prevent it carrying over into
        // the new slot, then clear the debounce after STEP_INPUT_DELAY_MS so that
        // back-to-back identical pitches are still detected on the new slot.
        if (stepDebounceTimeoutRef.current !== null) clearTimeout(stepDebounceTimeoutRef.current);
        lastStepMidiRef.current = detectedMidi;
        stepDebounceTimeoutRef.current = setTimeout(() => {
          lastStepMidiRef.current = null;
          stepDebounceTimeoutRef.current = null;
        }, STEP_INPUT_DELAY_MS);
        setHighlightedSlotIndex(nextIdx);
        const adapter = ToneAdapter.getInstance();
        stepLastPlayTimeRef.current = Date.now();
        adapter.playNote(exercise.notes[nextIdx].midiPitch, 0.6, adapter.getTransportSeconds() + 0.08);
        scheduleStepSlotTimeout(nextIdx);
      }
    } else {
      // ✗ Wrong note — penalise this slot and show hint
      stepPenalizedSlotsRef.current.add(stepIdx);
      setStepHint({
        text: `Expected: ${midiToNoteName(targetNote.midiPitch)} · You played: ${midiToNoteName(detectedMidi)}`,
        color: '#c62828',
      });
    }
  }, [currentPitch, phase, exerciseConfig.mode, exercise, clearStepTimeout, scheduleStepSlotTimeout]);

  // ── Try Again (T018) ─────────────────────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    stopPlayback();
    clearCountdown();
    clearStepTimeout();
    clearCapture();
    if (stepDebounceTimeoutRef.current !== null) {
      clearTimeout(stepDebounceTimeoutRef.current);
      stepDebounceTimeoutRef.current = null;
    }
    setResult(null);
    setHighlightedSlotIndex(null);
    setStepHint(null);
    stepIndexRef.current = 0;
    stepPenalizedSlotsRef.current = new Set();
    lastStepMidiRef.current = null;
    autoStartedRef.current = false;
    exScrollRef.current?.scrollTo({ left: 0 });
    respScrollRef.current?.scrollTo({ left: 0 });
    setPhase('ready');
    // exercise stays the same
  }, [clearCapture, clearCountdown, clearStepTimeout, stopPlayback]);

  // ── New Exercise (T019) ───────────────────────────────────
  const handleNewExercise = useCallback(() => {
    stopPlayback();
    clearCountdown();
    clearStepTimeout();
    clearCapture();
    if (stepDebounceTimeoutRef.current !== null) {
      clearTimeout(stepDebounceTimeoutRef.current);
      stepDebounceTimeoutRef.current = null;
    }
    setResult(null);
    setHighlightedSlotIndex(null);
    setStepHint(null);
    stepIndexRef.current = 0;
    stepPenalizedSlotsRef.current = new Set();
    lastStepMidiRef.current = null;
    autoStartedRef.current = false;
    exScrollRef.current?.scrollTo({ left: 0 });
    respScrollRef.current?.scrollTo({ left: 0 });
    setExercise(generateExercise(bpm, exerciseConfig));
    setPhase('ready');
  }, [bpm, exerciseConfig, clearCapture, clearCountdown, clearStepTimeout, stopPlayback]);

  // ── Back button — cleanup on navigate away (T022) ────────────────────────
  const handleBack = useCallback(() => {
    stopPlayback();
    clearCountdown();
    clearStepTimeout();
    if (stepDebounceTimeoutRef.current !== null) {
      clearTimeout(stepDebounceTimeoutRef.current);
      stepDebounceTimeoutRef.current = null;
    }
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
        {/* Phase-sensitive action buttons */}
        <div className="practice-view__header-actions">
          {phase === 'playing' && (
            <button
              className="practice-view__header-btn practice-view__header-btn--stop"
              onClick={handleStop}
              aria-label="Stop exercise"
              data-testid="stop-btn"
            >
              ■ Stop
            </button>
          )}
        </div>
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
            <div className="practice-view__staff-inner" ref={staffInnerRef}>
              <div
                ref={exScrollRef}
                className={`practice-view__staff-renderer${phase === 'playing' ? ' practice-view__staff-renderer--playing' : ''}`}
                data-testid="exercise-staff-renderer"
                aria-label="Exercise notes"
                role="img"
              >
                {exerciseLayout ? (
                  <div style={{ width: exerciseDisplayWidth, height: exerciseLayout.total_width > 0 ? Math.ceil(exerciseViewport.height * exerciseDisplayWidth / exerciseLayout.total_width) : Math.ceil(exerciseViewport.height * BASE_SCALE), flexShrink: 0, margin: '0 auto' }}>
                    <LayoutRenderer
                      layout={exerciseLayout}
                      config={PRACTICE_RENDER_CONFIG}
                      viewport={exerciseViewport}
                      highlightedNoteIds={highlightedNoteIds}
                      sourceToNoteIdMap={exerciseSourceMap}
                      hideMeasureNumbers
                    />
                  </div>
                ) : (
                  <div className="practice-view__staff-loading" aria-live="polite">
                    {wasmReady ? 'Generating…' : 'Loading…'}
                  </div>
                )}
              </div>
              {exerciseConfig.mode === 'step' && stepHint && (
                <div
                  className="practice-view__step-hint"
                  style={{ color: stepHint.color }}
                  aria-live="polite"
                  data-testid="step-hint"
                >
                  {stepHint.text}
                </div>
              )}
            </div>
          </div>

          {/* ── Controls (ready / countdown only — Stop lives in header) ── */}
          {(phase === 'ready' || phase === 'countdown') && (
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
            </div>
          )}

          {/* ── Response staff (flow mode only — not needed in step mode) ─── */}
          {(phase === 'playing' || phase === 'results') && exerciseConfig.mode !== 'step' && (
            <div className="practice-view__staff-block" data-testid="response-staff-block">
              <div className="practice-view__staff-label">Your Response</div>
              <div className="practice-view__staff-inner">
                <div ref={respScrollRef} className="practice-view__staff-renderer" aria-label="Your response notes" role="img">
                  {responseLayout ? (
                    <div style={{ width: responseDisplayWidth, height: responseLayout.total_width > 0 ? Math.ceil(responseViewport.height * responseDisplayWidth / responseLayout.total_width) : Math.ceil(responseViewport.height * BASE_SCALE), flexShrink: 0, margin: '0 auto' }}>
                      <LayoutRenderer
                        layout={responseLayout}
                        config={PRACTICE_RENDER_CONFIG}
                        viewport={responseViewport}
                        hideMeasureNumbers
                      />
                    </div>
                  ) : (
                    <div className="practice-view__staff-loading" aria-live="polite">…</div>
                  )}
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
            <div className="practice-view__results-row">
              <ExerciseResultsView result={result} exercise={exercise} />
              <div className="practice-view__results-actions">
                <button
                  className="practice-view__header-btn"
                  onClick={handleTryAgain}
                  aria-label="Try Again"
                  data-testid="try-again-btn"
                >
                  🔁 Again
                </button>
                <button
                  className="practice-view__header-btn practice-view__header-btn--new"
                  onClick={handleNewExercise}
                  aria-label="New Exercise"
                  data-testid="new-exercise-btn"
                >
                  🎲 New
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
