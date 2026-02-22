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
/**
 * Beat-slot alignment window in ms (FR-006).
 * Computed dynamically as 45% of the beat period, capped at 300 ms so adjacent
 * slots never overlap even at higher tempos.
 * e.g. 80 BPM → 337 ms → capped to 300 ms
 *      120 BPM → 225 ms
 */
function slotWindowMs(bpm: number): number {
  return Math.min(Math.round((60_000 / bpm) * 0.45), 300);
}
/** Minimum MIDI pitch accepted during capture — filters sub-harmonic noise */
const CAPTURE_MIDI_MIN = 48; // C3
/** Maximum MIDI pitch accepted during capture — filters ultrasonic artifacts */
const CAPTURE_MIDI_MAX = 84; // C6
/** Pitch match threshold in cents (FR-008) */
/** Min gap between two note onsets on the same slot (ms) — take the first one */
const MIN_ONSET_GAP_MS = 100;

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
  startMs: number;
  /** Best-matching response for each slot (index = slotIndex) */
  slotResponses: (ResponseNote | null)[];
  /** Notes that fell outside all slot windows */
  extraneousNotes: ResponseNote[];
  /** Timestamp of last recorded onset per slot — to deduplicate rapid re-detections */
  lastOnsetMsPerSlot: number[];
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
    slotResponses: [],
    extraneousNotes: [],
    lastOnsetMsPerSlot: [],
  });

  const stabRef = useRef<{ label: string | null; count: number }>({ label: null, count: 0 });

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

        // Temporal stabiliser (same logic as useAudioRecorder)
        const stab = stabRef.current;
        const newLabel = rawPitch?.label ?? null;
        if (newLabel === stab.label) {
          stab.count++;
        } else {
          stab.label = newLabel;
          stab.count = 1;
        }
        const threshold = newLabel === null ? SILENCE_STABLE_FRAMES : PITCH_STABLE_FRAMES;
        if (stab.count >= threshold) {
          setCurrentPitch(rawPitch);
        }

        // Only record confirmed pitches
        const confirmed = newLabel !== null && stab.count >= PITCH_STABLE_FRAMES ? rawPitch : null;

        if (confirmed && captureRef.current.active && captureRef.current.exercise) {
          const cap = captureRef.current;
          if (!cap.exercise) return;
          const onsetMs = Date.now() - cap.startMs;
          const hz = confirmed.hz;
          // midiCents: 12×log2(hz/440)×100 + 6900
          const midiCents = 12 * Math.log2(hz / 440) * 100 + 6900;
          const midiPitchRaw = Math.round(midiCents / 100);

          // Range gate: ignore pitches far outside the playable exercise range
          // (eliminates sub-harmonic noise and microphone handling artefacts)
          if (midiPitchRaw < CAPTURE_MIDI_MIN || midiPitchRaw > CAPTURE_MIDI_MAX) return;

          const responseNote: ResponseNote = {
            hz,
            midiCents,
            onsetMs,
            confidence: confirmed.confidence,
          };

          // Greedy slot alignment: find the nearest open slot within ±window
          const window = slotWindowMs(cap.exercise.bpm);
          let bestSlot = -1;
          let bestDist = Infinity;
          for (const note of cap.exercise.notes) {
            const dist = Math.abs(onsetMs - note.expectedOnsetMs);
            if (dist <= window && dist < bestDist) {
              // Skip if this slot already has a response and it was recorded recently
              const lastOnset = cap.lastOnsetMsPerSlot[note.slotIndex] ?? -Infinity;
              if (onsetMs - lastOnset < MIN_ONSET_GAP_MS) continue;
              bestDist = dist;
              bestSlot = note.slotIndex;
            }
          }

          if (bestSlot >= 0) {
            // Only take the first (best-timing) response per slot
            if (!cap.slotResponses[bestSlot]) {
              cap.slotResponses[bestSlot] = responseNote;
              // Reactive update: add this note to the live staff
              const midiPitch = midiPitchRaw;
              setLiveResponseNotes((prev) => [
                ...prev,
                {
                  id: `resp-slot-${bestSlot}`,
                  start_tick: bestSlot * 960,
                  duration_ticks: 960,
                  pitch: midiPitch,
                },
              ]);
            }
            cap.lastOnsetMsPerSlot[bestSlot] = onsetMs;
          } else {
            cap.extraneousNotes.push(responseNote);
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
    cap.slotResponses = new Array(exercise.notes.length).fill(null);
    cap.extraneousNotes = [];
    cap.lastOnsetMsPerSlot = new Array(exercise.notes.length).fill(-Infinity);
    stabRef.current = { label: null, count: 0 };
    setLiveResponseNotes([]); // always start clean — avoids stale notes from previous capture
  }, []);

  // ─── stopCapture ──────────────────────────────────────────────────────────

  const stopCapture = useCallback((): {
    responses: (ResponseNote | null)[];
    extraneousNotes: ResponseNote[];
  } => {
    const cap = captureRef.current;
    cap.active = false;
    const responses = [...cap.slotResponses];
    const extraneousNotes = [...cap.extraneousNotes];
    return { responses, extraneousNotes };
  }, []);

  // ─── clearCapture ─────────────────────────────────────────────────────────

  const clearCapture = useCallback(() => {
    const cap = captureRef.current;
    cap.active = false;
    cap.exercise = null;
    cap.startMs = 0;
    cap.slotResponses = [];
    cap.extraneousNotes = [];
    cap.lastOnsetMsPerSlot = [];
    stabRef.current = { label: null, count: 0 };
    setCurrentPitch(null);
    setLiveResponseNotes([]);
  }, []);

  return { micState, micError, currentPitch, liveResponseNotes, startCapture, stopCapture, clearCapture };
}
