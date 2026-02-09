import { useState, useEffect, useMemo } from 'react';
import { ScrollController } from '../playback/ScrollController';
import type { ScrollConfig } from '../../types/playback';
import type { PlaybackStatus } from '../../types/playback';

/**
 * Feature 009: Playback Scroll and Highlight - T011
 * usePlaybackScroll - React hook for auto-scroll during playback
 * 
 * Coordinates ScrollController service with React component lifecycle.
 * Manages auto-scroll enabled state and calculates target scroll position.
 * 
 * User Story 1 (MVP): Auto-scroll only
 * User Story 2 (Future): Will add note highlight logic
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
}

export interface PlaybackScrollState {
  /** Whether auto-scroll is currently enabled */
  autoScrollEnabled: boolean;
  
  /** Target scroll position in pixels (for component to apply) */
  targetScrollX: number;
  
  /** Function to enable/disable auto-scroll */
  setAutoScrollEnabled: (enabled: boolean) => void;
}

/**
 * Hook for managing auto-scroll during playback
 * 
 * @param config - Scroll configuration
 * @returns Scroll state with enabled flag and target position
 * 
 * @example
 * ```typescript
 * const { autoScrollEnabled, targetScrollX, setAutoScrollEnabled } = usePlaybackScroll({
 *   currentTick: 1920,
 *   playbackStatus: 'playing',
 *   pixelsPerTick: 0.1,
 *   viewportWidth: 1200,
 *   totalWidth: 5000,
 *   currentScrollX: 100
 * });
 * 
 * // In component: apply targetScrollX to scrollLeft if autoScrollEnabled
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
  
  return {
    autoScrollEnabled,
    targetScrollX,
    setAutoScrollEnabled,
  };
}
