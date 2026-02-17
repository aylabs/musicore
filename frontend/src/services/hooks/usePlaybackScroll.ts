import { useState, useEffect, useMemo, useRef } from 'react';
import { ScrollController } from '../playback/ScrollController';
import { HighlightIndex } from '../highlight/HighlightIndex';
import type { ScrollConfig } from '../../types/playback';
import type { PlaybackStatus } from '../../types/playback';
import type { Note } from '../../types/score';

/**
 * Feature 009: Playback Scroll and Highlight
 * usePlaybackScroll - React hook for auto-scroll and note highlighting during playback
 * 
 * Coordinates ScrollController and NoteHighlightService with React component lifecycle.
 * Manages auto-scroll enabled state, calculates target scroll position, and identifies playing notes.
 * 
 * User Story 1: Auto-scroll during playback
 * User Story 2: Highlight currently playing notes
 */

export interface UsePlaybackScrollConfig {
  /** Current playback position in ticks (from MusicTimeline) */
  currentTick: number;
  
  /** Current playback status (playing, paused, stopped) */
  playbackStatus: PlaybackStatus;
  
  /** Pixels per tick from layout engine */
  pixelsPerTick: number;
  
  /** Viewport width in pixels */
  viewportWidth: number;
  
  /** Total score width in pixels */
  totalWidth: number;
  
  /** Current horizontal scroll position in pixels */
  currentScrollX: number;
  
  /** Target position ratio (0-1) for playback position in viewport (default: 0.3) */
  targetPositionRatio?: number;
  
  /** Notes array for highlight calculation (User Story 2) */
  notes?: Note[];
}

export interface PlaybackScrollState {
  /** Whether auto-scroll is currently enabled */
  autoScrollEnabled: boolean;
  
  /** Target scroll position in pixels (for component to apply) */
  targetScrollX: number;
  
  /** IDs of notes currently being played (User Story 2) */
  highlightedNoteIds: string[];
  
  /** Function to enable/disable auto-scroll */
  setAutoScrollEnabled: (enabled: boolean) => void;
}

/**
 * Hook for managing auto-scroll and note highlighting during playback
 * 
 * @param config - Scroll and highlight configuration
 * @returns Scroll state with enabled flag, target position, and highlighted note IDs
 * 
 * @example
 * ```typescript
 * const { autoScrollEnabled, targetScrollX, highlightedNoteIds, setAutoScrollEnabled } = usePlaybackScroll({
 *   currentTick: 1920,
 *   playbackStatus: 'playing',
 *   pixelsPerTick: 0.1,
 *   viewportWidth: 1200,
 *   totalWidth: 5000,
 *   currentScrollX: 100,
 *   notes: notesArray
 * });
 * 
 * // Apply scroll and highlights in component
 * useEffect(() => {
 *   if (autoScrollEnabled && containerRef.current) {
 *     containerRef.current.scrollLeft = targetScrollX;
 *   }
 * }, [autoScrollEnabled, targetScrollX]);
 * ```
 */
export function usePlaybackScroll(config: UsePlaybackScrollConfig): PlaybackScrollState {
  const {
    currentTick,
    playbackStatus,
    pixelsPerTick,
    viewportWidth,
    totalWidth,
    currentScrollX,
    targetPositionRatio = 0.3,
    notes = [],
  } = config;
  
  // Auto-scroll enabled state (user can disable by manual scrolling)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  
  // Auto re-enable scroll when playback stops and restarts
  useEffect(() => {
    if (playbackStatus === 'stopped') {
      setAutoScrollEnabled(true);
    }
  }, [playbackStatus]);
  
  // Calculate target scroll position using ScrollController
  const scrollConfig: ScrollConfig = useMemo(() => ({
    targetPositionRatio,
    pixelsPerTick,
    viewportWidth,
    totalWidth,
    currentScrollX,
  }), [targetPositionRatio, pixelsPerTick, viewportWidth, totalWidth, currentScrollX]);
  
  const scrollCalculation = useMemo(() => {
    return ScrollController.calculateScrollPosition(currentTick, scrollConfig);
  }, [currentTick, scrollConfig]);
  
  // Extract target scroll position
  const targetScrollX = scrollCalculation.scrollX;
  
  // Feature 024 (T023): Use HighlightIndex for O(log n) highlight computation
  // Performance optimization: build index during render for immediate availability
  const highlightIndexRef = useRef<HighlightIndex | null>(null);
  const cachedNotesRef = useRef<Note[] | null>(null);

  // Calculate highlighted notes using HighlightIndex (consolidated, User Story 2)
  const highlightedNoteIds = useMemo(() => {
    if (!notes || notes.length === 0) {
      return [];
    }
    // Rebuild index only when notes array changes (intentional ref access during render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (notes !== cachedNotesRef.current) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (!highlightIndexRef.current) {
        highlightIndexRef.current = new HighlightIndex(); // eslint-disable-line react-hooks/exhaustive-deps
      }
      highlightIndexRef.current.build(notes); // eslint-disable-line react-hooks/exhaustive-deps
      cachedNotesRef.current = notes; // eslint-disable-line react-hooks/exhaustive-deps
    }
    return highlightIndexRef.current!.findPlayingNoteIds(currentTick); // eslint-disable-line react-hooks/exhaustive-deps
  }, [notes, currentTick]);
  
  return {
    autoScrollEnabled,
    targetScrollX,
    highlightedNoteIds,
    setAutoScrollEnabled,
  };
}
