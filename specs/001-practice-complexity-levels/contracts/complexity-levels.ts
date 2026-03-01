/**
 * contracts/complexity-levels.ts
 * Feature 001-practice-complexity-levels
 *
 * TypeScript interface contracts for the Complexity Levels feature.
 * These types are defined here first (contract-first, per Constitution Principle V).
 *
 * Source of truth: data-model.md and spec.md FR-001 through FR-009.
 */

import type { ExerciseConfig } from '../../frontend/plugins/practice-view/practiceTypes';

// ─── Core domain types ────────────────────────────────────────────────────────

/**
 * The three named complexity presets.
 * Persisted to localStorage as-is.
 */
export type ComplexityLevel = 'low' | 'mid' | 'high';

/**
 * The full resolved configuration for a complexity preset.
 * Instances are immutable constants — never modified at runtime.
 */
export interface ComplexityPreset {
  /** The level identifier */
  readonly level: ComplexityLevel;
  /** Human-readable heading shown in the level selector (e.g., "Low") */
  readonly displayName: string;
  /** Short description of key parameters, shown beneath the button */
  readonly description: string;
  /** Tempo to apply when this preset is selected */
  readonly bpm: number;
  /** Full ExerciseConfig passed to generateExercise() */
  readonly config: ExerciseConfig;
}

/**
 * All three complexity presets, keyed by level.
 * Matches FR-002, FR-003, FR-004 exactly.
 */
export type ComplexityPresets = Readonly<Record<ComplexityLevel, ComplexityPreset>>;

// ─── State shape ──────────────────────────────────────────────────────────────

/**
 * Runtime complexity-level selection state managed in PracticePlugin.
 *
 * - non-null → a named preset is active; UI shows the level badge selected.
 * - null     → custom mode; user has overridden at least one individual
 *              parameter via the Advanced panel; no level badge is highlighted.
 */
export type ActiveComplexityLevel = ComplexityLevel | null;

// ─── localStorage contract ────────────────────────────────────────────────────

/** The localStorage key used to persist the last chosen complexity level. */
export const COMPLEXITY_LEVEL_STORAGE_KEY = 'practice-complexity-level-v1' as const;

/**
 * Read the persisted complexity level from localStorage.
 * Returns the stored value if valid, or 'low' (the default per FR-007).
 */
export type ReadComplexityLevel = () => ComplexityLevel;

/**
 * Write the current complexity level to localStorage.
 * Called on every explicit level selection; NOT called when entering custom mode.
 */
export type WriteComplexityLevel = (level: ComplexityLevel) => void;

// ─── UI component props ───────────────────────────────────────────────────────

/**
 * Props for the complexity level selector UI component.
 */
export interface ComplexityLevelSelectorProps {
  /** Currently active level; null = custom mode (no badge selected) */
  activeLevel: ActiveComplexityLevel;
  /** Called when the user clicks a level button */
  onSelect: (level: ComplexityLevel) => void;
  /** Whether the selector should be disabled (e.g., during a live exercise) */
  disabled?: boolean;
}

// ─── Preset constant (canonical values) ──────────────────────────────────────
//
// The actual COMPLEXITY_PRESETS record is defined in practiceTypes.ts (or a
// companion file) within the plugins/practice-view package boundary.
// This section documents the REQUIRED values as a static contract:
//
//   low:
//     bpm: 40
//     config.preset:     'c4scale'
//     config.noteCount:  8
//     config.clef:       'Treble'
//     config.octaveRange: 1
//     → pitch range: C4–C5 (ascending C major scale, MIDI 60–72)
//
//   mid:
//     bpm: 80
//     config.preset:     'random'
//     config.noteCount:  16
//     config.clef:       'Treble'
//     config.octaveRange: 1
//     → pitch range: C4–C5 (NOTE_POOLS['Treble-1'])
//
//   high:
//     bpm: 100
//     config.preset:     'random'
//     config.noteCount:  20
//     config.clef:       'Bass'
//     config.octaveRange: 2
//     → pitch range: C2–C4 (NOTE_POOLS['Bass-2'])
