/**
 * usePracticeRecorder — React hook for microphone capture during piano practice.
 *
 * Feature: 001-piano-practice
 * FR-005: Requests microphone permission on mount (view load), not on Play.
 * FR-014: Reuses pitchDetection.ts without modification.
 *
 * Wraps the same AudioWorklet + pitchDetection pattern from useAudioRecorder
 * WITHOUT modifying that hook (avoids regressions per Principle VII).
 *
 * Lifecycle:
 *   mount       → requests mic → micState: 'requesting' → 'active' | 'error'
 *   startCapture → begins collecting ResponseNotes into slots
 *   stopCapture  → returns captured responses + extraneous notes
 *   clearCapture → discards captured data (Try Again / New Exercise)
 *   unmount     → releases all mic resources
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PitchSample } from '../../types/recording';
import type { Note } from '../../types/score';
import type { Exercise, ResponseNote } from '../../types/practice';
import { detectPitch } from '../recording/pitchDetection';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Pitch must persist for this many consecutive frames before being confirmed */
const PITCH_STABLE_FRAMES = 3;
/** Null must persist for this many frames before emitting silence */
const SILENCE_STABLE_FRAMES = 5;
/** Minimum MIDI pitch accepted during capture — filters sub-harmonic noise */
const CAPTURE_MIDI_MIN = 48; // C3
/** Maximum MIDI pitch accepted during capture — filters ultrasonic artifacts */
const CAPTURE_MIDI_MAX = 84; // C6

// ─── Public interface ─────────────────────────────────────────────────────────

export type MicState = 'idle' | 'requesting' | 'active' | 'error';

export interface UsePracticeRecorderReturn {
  /** Current microphone state */
  micState: MicState;
  /** Human-readable error when micState === 'error' */
  micError: string | null;
  /** Latest detected pitch from pitchDetection.ts (null when silent) */
  currentPitch: PitchSample | null;
  /**
   * Confirmed response notes placed so far in the current capture, as Note[]
   * ready to pass directly to NotationLayoutEngine. Updated reactively each
   * time a slot is filled. Empty until startCapture() is called.
   */
  liveResponseNotes: Note[];
  /**
   * Begin collecting response notes for slot alignment.
   * @param exercise  Provides slot timing windows
   * @param startMs   Date.now() or equivalent epoch ms when Play was pressed
   */
  startCapture(exercise: Exercise, startMs: number): void;
  /**
   * Stop capturing. Returns the captured response arrays.
   * Responses array has same length as exercise.notes; null = missed slot.
   */
  stopCapture(): {
    responses: (ResponseNote | null)[];
    extraneousNotes: ResponseNote[];
  };
  /** Discard all captured data without stopping the mic */
  clearCapture(): void;
}

// ─── Internal capture state (kept in a ref) ───────────────────────────────────

interface CaptureState {
  active: boolean;
  exercise: Exercise | null;
  /** Epoch ms when startCapture was called — used to compute note onset offsets */
  startMs: number;
  /**
   * All note onsets finalised so far (pitch changed or silence confirmed).
   * Slot assignment happens post-hoc in stopCapture via matchRawNotesToSlots.
   */
  rawNotes: ResponseNote[];
  /** The pitch currently being held — onset recorded, note-off not yet received */
  pending: ResponseNote | null;
}

// ─── Post-hoc slot matcher ────────────────────────────────────────────────────

/**
 * matchRawNotesToSlots — pairs recorded notes to exercise slots by nearest timing.
 *
 * For each slot, the closest unmatched raw note within one full beat period is
 * chosen. Using a full-beat window (instead of halfBeat) gives enough tolerance
 * to catch notes with detection latency on the first beat, while still
 * respecting genuine gaps: a note played at beat 4 is 1 full beat away from
 * slot 3, so it falls outside the window and slot 3 stays null (missed).
 */
function matchRawNotesToSlots(
  exercise: Exercise,
  rawNotes: ResponseNote[],
): { responses: (ResponseNote | null)[]; extraneousNotes: ResponseNote[] } {
  const msPerBeat = 60_000 / exercise.bpm;
  const window = msPerBeat; // full-beat tolerance
  const responses: (ResponseNote | null)[] = new Array(exercise.notes.length).fill(null);
  const usedIndices = new Set<number>();

  for (const exNote of exercise.notes) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < rawNotes.length; i++) {
      if (usedIndices.has(i)) continue;
      const dist = Math.abs(rawNotes[i].onsetMs - exNote.expectedOnsetMs);
      if (dist < window && dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      usedIndices.add(bestIdx);
      responses[exNote.slotIndex] = rawNotes[bestIdx];
    }
  }

  // Notes outside every slot window are truly extraneous (not penalised in score)
  const extraneousNotes = rawNotes.filter((_, i) => !usedIndices.has(i));
  return { responses, extraneousNotes };
}

// ─── Internal refs ────────────────────────────────────────────────────────────

interface RecorderRefs {
  audioCtx: AudioContext | null;
  workletNode: AudioWorkletNode | null;
  source: MediaStreamAudioSourceNode | null;
  stream: MediaStream | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * usePracticeRecorder
 *
 * Requests microphone access on mount (FR-005). Keeps mic warm so the first
 * note of the exercise is captured without latency.
 */
export function usePracticeRecorder(): UsePracticeRecorderReturn {
  const [micState, setMicState] = useState<MicState>('idle');
  const [micError, setMicError] = useState<string | null>(null);
  const [currentPitch, setCurrentPitch] = useState<PitchSample | null>(null);
  const [liveResponseNotes, setLiveResponseNotes] = useState<Note[]>([]);

  const refsRef = useRef<RecorderRefs>({
    audioCtx: null,
    workletNode: null,
    source: null,
    stream: null,
  });

  const captureRef = useRef<CaptureState>({
    active: false,
    exercise: null,
    startMs: 0,
    rawNotes: [],
    pending: null,
  });

  /**
   * stabRef — temporal stabiliser shared with the worklet message handler.
   *
   * `firstSeenMs` records the epoch ms when the current label was first
   * observed, so onset timestamps backtrack to the actual start of the note
   * rather than the moment it hit the PITCH_STABLE_FRAMES threshold.
   */
  const stabRef = useRef<{ label: string | null; count: number; firstSeenMs: number }>(
    { label: null, count: 0, firstSeenMs: 0 },
  );

  // ─── Teardown ─────────────────────────────────────────────────────────────

  const teardown = useCallback(() => {
    const { audioCtx, workletNode, source, stream } = refsRef.current;
    try {
      workletNode?.disconnect();
      source?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
    } catch {
      // Ignore teardown errors
    }
    refsRef.current = { audioCtx: null, workletNode: null, source: null, stream: null };
    captureRef.current.active = false;
  }, []);

  // ─── Mount: request mic ───────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function initMic() {
      // Guard: AudioWorklet supported
      if (typeof AudioWorkletNode === 'undefined') {
        setMicState('error');
        setMicError('AudioWorklet not supported in this browser');
        return;
      }

      // Guard: secure context
      if (!navigator.mediaDevices?.getUserMedia) {
        const reason = window.isSecureContext === false
          ? 'Microphone access requires HTTPS'
          : 'Microphone access is not supported in this browser';
        setMicState('error');
        setMicError(reason);
        return;
      }

      setMicState('requesting');

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: false,
          },
        });
      } catch (err) {
        if (cancelled) return;
        const name = (err as DOMException).name;
        const message =
          name === 'NotAllowedError'
            ? 'Microphone access required to record your response'
            : name === 'NotFoundError'
            ? 'No microphone detected'
            : `Microphone error: ${(err as Error).message}`;
        setMicState('error');
        setMicError(message);
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const audioCtx = new AudioContext({ sampleRate: 44100 });

      try {
        await audioCtx.audioWorklet.addModule(
          `${import.meta.env.BASE_URL}audio-processor.worklet.js`
        );
      } catch {
        if (cancelled) return;
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        setMicState('error');
        setMicError('Failed to load audio processor');
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        return;
      }

      const workletNode = new AudioWorkletNode(audioCtx, 'audio-capture-processor');
      const source = audioCtx.createMediaStreamSource(stream);

      const highPass = audioCtx.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 55;
      highPass.Q.value = 0.7;

      const lowPass = audioCtx.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 5500;
      lowPass.Q.value = 0.7;

      source.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(workletNode);
      workletNode.connect(audioCtx.destination);

      workletNode.port.onmessage = (evt: MessageEvent) => {
        if (evt.data?.type !== 'pcm') return;
        const buffer = evt.data.buffer as Float32Array;
        const rawPitch = detectPitch(buffer, audioCtx.sampleRate);

        // ── Temporal stabiliser ──────────────────────────────────────────────
        const stab = stabRef.current;
        const newLabel = rawPitch?.label ?? null;
        if (newLabel !== stab.label) {
          stab.label = newLabel;
          stab.count = 1;
          stab.firstSeenMs = Date.now(); // backtrack onset to when label first appeared
        } else {
          stab.count++;
        }
        const threshold = newLabel === null ? SILENCE_STABLE_FRAMES : PITCH_STABLE_FRAMES;
        const justConfirmed = stab.count === threshold;
        if (stab.count >= threshold) {
          setCurrentPitch(rawPitch);
        }

        // ── Record-then-match capture approach ───────────────────────────────
        // Notes are accumulated faithfully as they arrive; slot assignment
        // happens post-hoc in stopCapture() once the full picture is known.
        // This mirrors how RecordingStaff works and eliminates real-time
        // window-racing bugs.
        if (!justConfirmed || !captureRef.current.active || !captureRef.current.exercise) return;

        const cap = captureRef.current;
        // Onset relative to when capture started: backtrack to label's first frame
        const onsetMs = stab.firstSeenMs - cap.startMs;

        if (newLabel !== null && rawPitch) {
          // ── New pitch confirmed ──────────────────────────────────────────
          const midiCents = 12 * Math.log2(rawPitch.hz / 440) * 100 + 6900;
          const midiRound = Math.round(midiCents / 100);

          // Range gate — filters sub-harmonic noise and room rumble
          if (midiRound < CAPTURE_MIDI_MIN || midiRound > CAPTURE_MIDI_MAX) return;

          // Finalise any previously pending note and add it to the live staff
          if (cap.pending) {
            const finalisedNote = cap.pending; // capture before async updater runs
            cap.rawNotes.push(finalisedNote);
            setLiveResponseNotes((prev) => [
              ...prev,
              {
                id: `resp-${prev.length}`,
                start_tick: prev.length * 960,
                duration_ticks: 960,
                pitch: Math.round(finalisedNote.midiCents / 100),
              },
            ]);
          }

          // Start tracking the new pitch
          cap.pending = { hz: rawPitch.hz, midiCents, onsetMs, confidence: rawPitch.confidence };
        } else {
          // ── Silence confirmed — finalise any held note ───────────────────
          if (cap.pending) {
            const finalisedNote = cap.pending; // capture before async updater runs
            cap.rawNotes.push(finalisedNote);
            cap.pending = null;
            setLiveResponseNotes((prev) => [
              ...prev,
              {
                id: `resp-${prev.length}`,
                start_tick: prev.length * 960,
                duration_ticks: 960,
                pitch: Math.round(finalisedNote.midiCents / 100),
              },
            ]);
          }
        }
      };

      // Handle device loss
      const firstTrack = stream.getTracks()[0];
      if (firstTrack) {
        firstTrack.onended = () => {
          teardown();
          setMicState('error');
          setMicError('Microphone disconnected');
          setCurrentPitch(null);
        };
      }

      refsRef.current = { audioCtx, workletNode, source, stream };
      setMicState('active');
    }

    initMic();

    return () => {
      cancelled = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── startCapture ─────────────────────────────────────────────────────────

  const startCapture = useCallback((exercise: Exercise, startMs: number) => {
    const cap = captureRef.current;
    cap.active = true;
    cap.exercise = exercise;
    cap.startMs = startMs;
    cap.rawNotes = [];
    cap.pending = null;
    // Do NOT reset stabRef — preserving stab state means any pitch already
    // stable (count ≥ PITCH_STABLE_FRAMES) fires immediately on the next frame.
    setLiveResponseNotes([]);
  }, []);

  // ─── stopCapture ──────────────────────────────────────────────────────────

  const stopCapture = useCallback((): {
    responses: (ResponseNote | null)[];
    extraneousNotes: ResponseNote[];
  } => {
    const cap = captureRef.current;
    cap.active = false;
    // Finalise any pitch still being held when Stop is pressed
    if (cap.pending) {
      cap.rawNotes.push(cap.pending);
      cap.pending = null;
    }
    if (!cap.exercise) return { responses: [], extraneousNotes: [] };
    return matchRawNotesToSlots(cap.exercise, [...cap.rawNotes]);
  }, []);

  // ─── clearCapture ─────────────────────────────────────────────────────────

  const clearCapture = useCallback(() => {
    const cap = captureRef.current;
    cap.active = false;
    cap.exercise = null;
    cap.startMs = 0;
    cap.rawNotes = [];
    cap.pending = null;
    stabRef.current = { label: null, count: 0, firstSeenMs: 0 };
    setCurrentPitch(null);
    setLiveResponseNotes([]);
  }, []);

  return { micState, micError, currentPitch, liveResponseNotes, startCapture, stopCapture, clearCapture };
}
