/**
 * TypeScript Interfaces for Playback Note Highlighting
 * 
 * Feature: 019-playback-note-highlight
 * 
 * These interfaces define the contracts for the note highlighting feature,
 * ensuring type safety between playback state, highlight logic, and rendering.
 */

import type { Note } from './score';

/**
 * Return type for useNoteHighlight hook
 * 
 * Provides the set of note IDs that should be visually highlighted.
 */
export interface UseNoteHighlightReturn {
  /**
   * Set of note IDs currently highlighted during playback
   * 
   * - Empty set when playback is stopped
   * - Computed set when playback is playing (updates at 60 Hz)
   * - Frozen set when playback is paused
   */
  highlightedNoteIds: Set<string>;
}

/**
 * Props for NoteElement component highlighting
 * 
 * Extends existing NoteElement props with highlight state.
 */
export interface NoteElementHighlightProps {
  /**
   * Whether this specific note should be highlighted
   * 
   * When true, applies 'highlighted' CSS class
   * When false, uses default 'note' class
   */
  isHighlighted: boolean;
}

/**
 * Props for LayoutRenderer component highlighting
 * 
 * Extends existing LayoutRenderer props with highlight state.
 */
export interface LayoutRendererHighlightProps {
  /**
   * Set of note IDs that should be highlighted
   * 
   * LayoutRenderer checks this set for each note to determine
   * whether to pass isHighlighted=true to NoteElement.
   */
  highlightedNoteIds: Set<string>;
}

/**
 * Pure function type for computing highlighted notes
 * 
 * Takes notes array and current playback position,
 * returns set of note IDs that are actively playing.
 */
export type ComputeHighlightedNotesFn = (
  notes: Note[],
  currentTick: number
) => Set<string>;
