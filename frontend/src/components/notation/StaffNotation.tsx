import React, { useMemo, useState, useRef, useEffect } from 'react';
import { NotationLayoutEngine } from '../../services/notation/NotationLayoutEngine';
import { NotationRenderer } from './NotationRenderer';
import { DEFAULT_STAFF_CONFIG } from '../../types/notation/config';
import { usePlaybackScroll } from '../../services/hooks/usePlaybackScroll';
import { ScrollController } from '../../services/playback/ScrollController';
import type { Note, ClefType } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';

/**
 * StaffNotation - Container component for staff notation visualization
 * 
 * This component coordinates between the layout calculation (pure service)
 * and the rendering (presentational component). It manages state and provides
 * the memoization strategy for performance.
 * 
 * Responsibilities:
 * - Extract notes from voice data
 * - Manage configuration state (viewport size, scroll position)
 * - Call layout engine with useMemo for performance
 * - Manage selection state (User Story 3)
 * - Handle scroll events (User Story 4)
 * - Adapt to viewport resize (User Story 5)
 */

export interface StaffNotationProps {
  /** Notes to display on the staff */
  notes: Note[];
  
  /** Current clef type (default: Treble) */
  clef?: ClefType;
  
  /** Viewport width (default: auto-detected) */
  viewportWidth?: number;
  
  /** Viewport height (default: 200px) */
  viewportHeight?: number;
  
  /** Feature 009: Current playback position in ticks (for auto-scroll) */
  currentTick?: number;
  
  /** Feature 009: Current playback status (for auto-scroll) */
  playbackStatus?: PlaybackStatus;
  
  /** Feature 009: Callback when note is clicked - seeks to that note's position */
  onNoteClick?: (tick: number) => void;
  
  /** Feature 009: Callback when note is deselected - clears pinned start position */
  onNoteDeselect?: () => void;
  
  /** Feature 010: External scroll position (for shared scrolling in stacked view) */
  externalScrollX?: number;
  
  /** Feature 010: Disable internal scroll container (use external scroll) */
  disableInternalScroll?: boolean;
}

export const StaffNotation: React.FC<StaffNotationProps> = ({
  notes,
  clef = 'Treble',
  viewportWidth: propsViewportWidth,
  viewportHeight: propsViewportHeight = 200,
  currentTick = 0,
  playbackStatus = 'stopped',
  onNoteClick,
  onNoteDeselect,
  externalScrollX,
  disableInternalScroll = false,
}) => {
  // T060: Add viewportWidth state and containerRef for measuring container size
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredViewportWidth, setMeasuredViewportWidth] = useState(1200);
  
  // Selection state (User Story 3)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  // Scroll state (User Story 4 - T053)
  // Feature 010: Use external scroll if provided, otherwise internal state
  const [internalScrollX, setInternalScrollX] = useState(0);
  const scrollX = externalScrollX !== undefined ? externalScrollX : internalScrollX;
  
  // Feature 009: Track last auto-scroll time for manual override detection
  const lastAutoScrollTimeRef = useRef<number>(0);

  // T061: Add resize observer to update viewport width when container resizes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurement
    const updateDimensions = () => {
      if (container) {
        setMeasuredViewportWidth(container.clientWidth);
      }
    };

    updateDimensions();

    // Use ResizeObserver for efficient resize detection
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setMeasuredViewportWidth(width);
      }
    });

    resizeObserver.observe(container);

    // Fallback: also listen to window resize events
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Use prop value if provided, otherwise use measured value
  const viewportWidth = propsViewportWidth ?? measuredViewportWidth;
  const viewportHeight = propsViewportHeight;
  
  // Calculate layout geometry (memoized for performance)
  // Feature 009 optimization: Only recalculate layout when scrollX changes by >200px
  // to prevent 60 Hz layout recalculations during auto-scroll (causes clef flickering)
  // T062: viewportWidth in dependencies, layout recalculates on viewport change
  const scrollXThrottled = useMemo(() => {
    // Round scrollX to nearest 200px to reduce recalculation frequency
    return Math.round(scrollX / 200) * 200;
  }, [scrollX]);
  
  const layout = useMemo(() => {
    return NotationLayoutEngine.calculateLayout({
      notes,
      clef,
      keySignature: undefined, // User Story 5
      timeSignature: {
        numerator: 4,
        denominator: 4,
      },
      config: {
        ...DEFAULT_STAFF_CONFIG,
        viewportWidth,
        viewportHeight,
        scrollX: scrollXThrottled,
      },
    });
  }, [notes, clef, viewportWidth, viewportHeight, scrollXThrottled]);
  
  // Feature 009 - T012: Use playback scroll hook for auto-scroll during playback
  // Feature 009 - US2 - T020: Extract highlightedNoteIds for note highlighting
  const { autoScrollEnabled, targetScrollX, highlightedNoteIds, setAutoScrollEnabled } = usePlaybackScroll({
    currentTick,
    playbackStatus,
    pixelsPerTick: DEFAULT_STAFF_CONFIG.pixelsPerTick,
    viewportWidth,
    totalWidth: layout.totalWidth,
    currentScrollX: scrollX,
    notes, // T020: Pass notes for highlight calculation
  });
  
  // Feature 009 - T012: Apply auto-scroll when enabled and playing
  // Feature 010: Skip auto-scroll if using external scroll (parent handles it)
  // Use requestAnimationFrame for smooth scrolling synced with browser repaints
  useEffect(() => {
    if (disableInternalScroll) {
      return undefined; // Parent handles auto-scroll
    }
    
    if (!autoScrollEnabled || playbackStatus !== 'playing' || !containerRef.current) {
      return undefined;
    }
    
    const smoothScroll = () => {
      if (containerRef.current) {
        containerRef.current.scrollLeft = targetScrollX;
        lastAutoScrollTimeRef.current = Date.now();
      }
    };
    
    // Schedule scroll on next animation frame for smooth 60 FPS rendering
    const animationFrameId = requestAnimationFrame(smoothScroll);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [autoScrollEnabled, targetScrollX, playbackStatus, disableInternalScroll]);

  // Handle note click - toggle selection and seek to note position
  // Feature 009: When note clicked, seek playback to that note's position
  const handleNoteClick = (noteId: string) => {
    const wasSelected = selectedNoteId === noteId;
    
    // Toggle visual selection (blue highlight)
    setSelectedNoteId((prevId) => (prevId === noteId ? null : noteId));
    
    if (wasSelected) {
      // Note was deselected - clear pinned start position
      if (onNoteDeselect) {
        onNoteDeselect();
      }
    } else {
      // Note was selected - seek to this note's position
      if (onNoteClick) {
        const clickedNote = notes.find(note => note.id === noteId);
        if (clickedNote) {
          onNoteClick(clickedNote.start_tick);
        }
      }
    }
  };

  // Handle scroll event - update scrollX state (User Story 4 - T053)
  // Feature 009 - T012: Detect manual scroll and disable auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollX = e.currentTarget.scrollLeft;
    setInternalScrollX(newScrollX);
    
    // Feature 009: Detect manual scroll during playback
    if (playbackStatus === 'playing' && autoScrollEnabled) {
      const isManual = ScrollController.isManualScroll(lastAutoScrollTimeRef.current);
      if (isManual) {
        setAutoScrollEnabled(false);
      }
    }
  };

  // T056: Add scrollable container with onScroll handler
  // Feature 010: Support external scroll container for stacked view
  const containerStyle = disableInternalScroll
    ? {
        width: 'max-content',  // Expand to full content width for shared scrolling
        minWidth: '100%',  // At least full container width
        height: viewportHeight,
        overflowX: 'visible' as const,  // No internal scrolling
        overflowY: 'hidden' as const,
        border: 'none',  // No border in stacked view
      }
    : {
        width: propsViewportWidth ?? '100%',
        height: viewportHeight,
        overflowX: 'auto' as const,  // Enable horizontal scrolling
        overflowY: 'hidden' as const,
        border: '1px solid #ccc',
        willChange: 'scroll-position',  // Feature 009: Hint to browser for scroll optimization
      };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      onScroll={disableInternalScroll ? undefined : handleScroll}  // Wire up scroll handler only if internal scroll
    >
      <NotationRenderer
        layout={layout}
        selectedNoteId={selectedNoteId}
        onNoteClick={handleNoteClick}
        scrollX={scrollX}
        showClef={!(autoScrollEnabled && playbackStatus === 'playing')}
        notes={notes}  // T033: Pass notes for chord symbol rendering
        pixelsPerTick={DEFAULT_STAFF_CONFIG.pixelsPerTick}
        highlightedNoteIds={highlightedNoteIds}  // T020: Pass highlighted note IDs for visual feedback
      />
    </div>
  );
};
