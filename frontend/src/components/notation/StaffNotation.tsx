import React, { useMemo, useState, useRef, useEffect } from 'react';
import { NotationLayoutEngine } from '../../services/notation/NotationLayoutEngine';
import { NotationRenderer } from './NotationRenderer';
import { DEFAULT_STAFF_CONFIG } from '../../types/notation/config';
import type { Note, ClefType } from '../../types/score';

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
}

export const StaffNotation: React.FC<StaffNotationProps> = ({
  notes,
  clef = 'Treble',
  viewportWidth: propsViewportWidth,
  viewportHeight: propsViewportHeight = 200,
}) => {
  // T060: Add viewportWidth state and containerRef for measuring container size
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredViewportWidth, setMeasuredViewportWidth] = useState(1200);
  
  // Selection state (User Story 3)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  // Scroll state (User Story 4 - T053)
  const [scrollX, setScrollX] = useState(0);

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

  // Handle note click - toggle selection
  const handleNoteClick = (noteId: string) => {
    setSelectedNoteId((prevId) => (prevId === noteId ? null : noteId));
  };

  // Handle scroll event - update scrollX state (User Story 4 - T053)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollX(e.currentTarget.scrollLeft);
  };

  // Calculate layout geometry (memoized for performance)
  // T054: scrollX is already in dependencies, layout recalculates on scroll
  // T062: viewportWidth in dependencies, layout recalculates on viewport change
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
        scrollX,
      },
    });
  }, [notes, clef, viewportWidth, viewportHeight, scrollX]);

  // T056: Add scrollable container with onScroll handler
  return (
    <div
      ref={containerRef}
      style={{
        width: propsViewportWidth ?? '100%',  // Use 100% if no explicit width provided
        height: viewportHeight,
        overflowX: 'auto',  // Enable horizontal scrolling
        overflowY: 'hidden',  // Disable vertical scrolling
        border: '1px solid #ccc',
      }}
      onScroll={handleScroll}  // Wire up scroll handler
    >
      <NotationRenderer
        layout={layout}
        selectedNoteId={selectedNoteId}
        onNoteClick={handleNoteClick}
        scrollX={scrollX}  // T057: Pass scrollX to renderer for fixed clef
      />
    </div>
  );
};
