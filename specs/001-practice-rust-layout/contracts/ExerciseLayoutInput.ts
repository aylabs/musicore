/**
 * ExerciseLayoutInput.ts
 * Feature 001-practice-rust-layout — Phase 1 Contract
 *
 * TypeScript interface for the JSON input sent to computeLayout (Rust WASM)
 * when rendering a practice exercise staff.
 *
 * This mirrors the schema the Rust extract_instruments() function reads
 * under its "Format 1" branch (notes with {tick, duration, pitch}).
 * Reference: backend/src/layout/mod.rs lines 654–710.
 */

// ─── Note input ───────────────────────────────────────────────────────────────

/**
 * A single note in the WASM layout input.
 * Format 1 (simple) — used by LayoutView and now by PracticeView.
 */
export interface ExerciseNoteInput {
  /** Absolute tick position (960 PPQ). For quarter-note exercises: slotIndex × 960. */
  tick: number;
  /** Duration in ticks. Quarter note = 960. */
  duration: number;
  /** Integer MIDI pitch (e.g., 60 = C4). */
  pitch: number;
  /** Optional articulation — null for practice notes. */
  articulation?: null;
}

// ─── Staff input ──────────────────────────────────────────────────────────────

export interface ExerciseVoiceInput {
  notes: ExerciseNoteInput[];
}

export interface ExerciseStaffInput {
  /** Clef string as expected by Rust: "Treble" | "Bass" | "Alto" | "Tenor" */
  clef: 'Treble' | 'Bass' | 'Alto' | 'Tenor';
  /** Time signature (4/4 for all practice exercises) */
  time_signature: { numerator: number; denominator: number };
  /** Key signature (C major = 0 sharps for all practice exercises) */
  key_signature: { sharps: number };
  /** Single voice per practice staff */
  voices: ExerciseVoiceInput[];
}

// ─── Instrument input ─────────────────────────────────────────────────────────

export interface ExerciseInstrumentInput {
  /**
   * Stable instrument ID used as the instrument_id in SourceReference.
   * MUST be "practice-instrument" to match buildPracticeSourceToNoteIdMap.
   */
  id: 'practice-instrument';
  /** Display name — not shown in practice view but required by schema */
  name: string;
  staves: ExerciseStaffInput[];
}

// ─── Root input ───────────────────────────────────────────────────────────────

/**
 * Root input object for computeLayout when rendering a practice staff.
 *
 * @example
 * ```typescript
 * const input: ExerciseLayoutInput = serializeExerciseToLayoutInput(exercise, 'Treble');
 * const layout = await computeLayout(input, { max_system_width: 99999 });
 * ```
 */
export interface ExerciseLayoutInput {
  instruments: ExerciseInstrumentInput[];
}
