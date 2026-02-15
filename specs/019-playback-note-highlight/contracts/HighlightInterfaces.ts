/**
 * TypeScript Interfaces for Playback Note Highlighting
 * 
 * Feature: 019-playback-note-highlight
 * 
 * These interfaces define the contracts between playback state management,
 * highlight calculation logic, and rendering components. They ensure type
 * safety and clear API boundaries.
 */

import type { Note } from '../../../frontend/src/types/score';
import type { PlaybackStatus } from '../../../frontend/src/types/playback';

/**
 * Hook return type for useNoteHighlight
 * 
 * Provides the set of note IDs that should be visually highlighted
 * based on current playback position.
 */
export interface UseNoteHighlightReturn {
  /**
   * Set of note IDs currently highlighted during playback
   * 
   * - Empty set when playback is stopped
   * - Computed set when playback is playing (updates at 60 Hz)
   * - Frozen set when playback is paused
   * 
   * @example
   * ```typescript
   * const { highlightedNoteIds } = useNoteHighlight(notes, currentTick, status);
   * 
   * // Check if a specific note is highlighted
   * const isHighlighted = highlightedNoteIds.has(note.id);
   * ```
   */
  highlightedNoteIds: Set<string>;
}

/**
 * Parameters for useNoteHighlight hook
 * 
 * These inputs drive the highlight calculation logic.
 */
export interface UseNoteHighlightParams {
  /**
   * Array of all notes in the score
   * 
   * Each note must have:
   * - id: unique identifier
   * - start_tick: when the note begins (PPQ units, 960 per quarter note)
   * - duration_ticks: how long the note lasts (PPQ units)
   */
  notes: Note[];

  /**
   * Current playback position in ticks (PPQ units, 960 per quarter note)
   * 
   * - Range: 0 to max tick in score
   * - Updates at 60 Hz during playback
   * - Frozen when paused
   * - Reset to 0 when stopped
   */
  currentTick: number;

  /**
   * Current playback state
   * 
   * - 'stopped': No highlighting (empty set)
   * - 'playing': Active highlighting (computed from currentTick)
   * - 'paused': Static highlighting (frozen from last playing state)
   */
  status: PlaybackStatus;
}

/**
 * Props for components that render individual notes
 * 
 * NoteElement component receives these props to determine visual appearance.
 */
export interface NoteElementHighlightProps {
  /**
   * Whether this specific note should be highlighted
   * 
   * When true, component applies 'highlighted' CSS class or equivalent styling.
   * When false, component uses default note styling.
   * 
   * @example
   * ```tsx
   * function NoteElement({ note, isHighlighted }: NoteElementProps) {
   *   return (
   *     <g className={isHighlighted ? 'note highlighted' : 'note'}>
   *       <ellipse ... />
   *     </g>
   *   );
   * }
   * ```
   */
  isHighlighted: boolean;
}

/**
 * Props for LayoutRenderer component (updated)
 * 
 * Extends existing LayoutRenderer props with highlight state.
 */
export interface LayoutRendererHighlightProps {
  /**
   * Set of note IDs that should be highlighted
   * 
   * LayoutRenderer iterates through rendered notes and checks this set
   * to determine which notes should receive highlight styling.
   * 
   * @example
   * ```tsx
   * function LayoutRenderer({ layoutData, highlightedNoteIds }: Props) {
   *   return (
   *     <>
   *       {layoutData.notes.map(note => (
   *         <NoteElement
   *           key={note.id}
   *           note={note}
   *           isHighlighted={highlightedNoteIds.has(note.id)}
   *         />
   *       ))}
   *     </>
   *   );
   * }
   * ```
   */
  highlightedNoteIds: Set<string>;
}

/**
 * Internal function signature for highlight computation
 * 
 * Pure function that calculates which notes should be highlighted
 * for a given playback position. Used internally by useNoteHighlight hook.
 * 
 * @param notes - Array of all notes in the score
 * @param currentTick - Current playback position
 * @returns Set of note IDs that are actively playing at currentTick
 * 
 * @example
 * ```typescript
 * const highlighted = computeHighlightedNotes(notes, 1920);
 * // Returns Set of note IDs where:
 * //   note.start_tick <= 1920 < (note.start_tick + note.duration_ticks)
 * ```
 */
export type ComputeHighlightedNotesFn = (
  notes: Note[],
  currentTick: number
) => Set<string>;

/**
 * Configuration options for highlight feature (future extension)
 * 
 * Currently not used, but defines structure for future enhancements
 * like customizable highlight colors or styles.
 * 
 * @remarks
 * This interface is reserved for future use. Initial implementation
 * uses hardcoded CSS styles defined in stylesheets.
 */
export interface HighlightConfig {
  /**
   * CSS class name to apply when note is highlighted
   * @default 'highlighted'
   */
  highlightClassName?: string;

  /**
   * Whether to use CSS transitions for smooth highlight appearance
   * @default true
   */
  useTransitions?: boolean;

  /**
   * Custom CSS properties to apply (future: user-defined colors)
   * @default undefined
   */
  customStyles?: React.CSSProperties;
}

/**
 * Type guard to check if a note is currently playing
 * 
 * Helper function for inline checks without creating a Set.
 * 
 * @param note - Note to check
 * @param currentTick - Current playback position
 * @returns True if note is playing at currentTick
 * 
 * @example
 * ```typescript
 * if (isNotePlaying(note, currentTick)) {
 *   // Note is currently playing
 * }
 * ```
 */
export type IsNotePlayingFn = (note: Note, currentTick: number) => boolean;

/**
 * Performance metrics for highlight system (testing/debugging)
 * 
 * Used for performance profiling and optimization validation.
 */
export interface HighlightPerformanceMetrics {
  /**
   * Time taken to compute highlighted notes (milliseconds)
   * Target: <2ms for 1000 notes
   */
  computationTimeMs: number;

  /**
   * Number of notes evaluated
   */
  notesEvaluated: number;

  /**
   * Number of notes highlighted in result
   */
  notesHighlighted: number;

  /**
   * Timestamp of measurement
   */
  timestamp: number;
}

/**
 * Contract validation helpers (development/testing)
 * 
 * These functions ensure data integrity and help catch bugs early.
 */

/**
 * Validate that all highlighted note IDs exist in the notes array
 * 
 * Throws error if invalid note IDs are found (development only).
 * 
 * @param notes - Array of all notes
 * @param highlightedNoteIds - Set of highlighted note IDs
 * @throws Error if invalid note IDs found
 */
export type ValidateHighlightStateFn = (
  notes: Note[],
  highlightedNoteIds: Set<string>
) => void;

/**
 * Assert highlight state matches playback status
 * 
 * Ensures invariants:
 * - status === 'stopped' → highlightedNoteIds is empty
 * - status === 'playing' → highlightedNoteIds computed from currentTick
 * 
 * @param status - Current playback status
 * @param highlightedNoteIds - Set of highlighted note IDs
 * @param expectedState - Expected state based on status
 * @throws Error if invariant violated
 */
export type AssertHighlightInvariantsFn = (
  status: PlaybackStatus,
  highlightedNoteIds: Set<string>,
  expectedState: 'empty' | 'computed' | 'frozen'
) => void;
