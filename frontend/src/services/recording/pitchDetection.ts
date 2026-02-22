/**
 * pitchDetection — monophonic pitch detection using the McLeod Pitch Method (pitchy)
 *
 * T023: Core service
 * T024: Wired into useAudioRecorder
 *
 * Frequency range: C2 (~65 Hz) to C7 (~2093 Hz)
 * Confidence threshold: 0.9
 */
import { PitchDetector } from 'pitchy';
import type { PitchSample } from '../../types/recording';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.9;
const MIN_HZ = 65;    // C2
const MAX_HZ = 2093;  // C7
const FRAME_SIZE = 2048;

/**
 * Minimum RMS energy required to attempt pitch detection.
 * Filters out quiet background noise (room hum, HVAC, distant sounds).
 *
 * RMS = sqrt(energy / FRAME_SIZE).  A value of 0.008 blocks signals whose
 * RMS is below ~0.008 (energy < ~0.13) while passing softly-played piano
 * notes (RMS typically ≥ 0.02).
 */
const MIN_RMS_ENERGY = 0.008 ** 2 * FRAME_SIZE; // ≈ 0.131

// ─── Singleton detector ───────────────────────────────────────────────────────

let _detector: PitchDetector<Float32Array> | null = null;

function getDetector(): PitchDetector<Float32Array> {
  if (!_detector) {
    _detector = PitchDetector.forFloat32Array(FRAME_SIZE);
  }
  return _detector;
}

// ─── Note names ───────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert a frequency in Hz to a note name + octave string (e.g. "A4", "C#5").
 * Uses the equal-tempered scale referenced to A4 = 440 Hz (MIDI note 69).
 */
export function hzToNoteName(hz: number): string {
  const midi = Math.round(12 * Math.log2(hz / 440) + 69);
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

/**
 * Run pitch detection on a single PCM frame.
 *
 * @param buffer  Float32Array of exactly 2048 samples ([-1, 1] range)
 * @param sampleRate  Audio context sample rate (expected: 44100 Hz)
 * @returns PitchSample when a confident pitch is found within C2–C7, otherwise null
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): PitchSample | null {
  // Silence / noise check: reject frames whose energy is below the minimum
  // RMS threshold (filters room hum and background noise).
  let energy = 0;
  for (let i = 0; i < buffer.length; i++) energy += buffer[i] * buffer[i];
  if (energy < MIN_RMS_ENERGY) return null;

  const detector = getDetector();
  const [hz, clarity] = detector.findPitch(buffer, sampleRate);

  if (clarity < CONFIDENCE_THRESHOLD) return null;
  if (hz < MIN_HZ || hz > MAX_HZ) return null;

  const label = hzToNoteName(hz);
  const noteChar = label.replace(/\d/g, '');
  const octave = parseInt(label.replace(/[^\d]/g, ''), 10);

  return {
    hz,
    confidence: clarity,
    note: noteChar,
    octave,
    label,
  };
}
