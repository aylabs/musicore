/**
 * StackedStaffView - Container for vertically stacked staff groups
 * Feature 010: Stacked Staves View - User Story 1
 * Feature 010 Enhancement: Shared scrolling across all staves
 * Feature 010 Enhancement: Auto-scroll during playback
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import type { Score, Staff, Note } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';
import { StaffGroup } from './StaffGroup';
import { usePlaybackScroll } from '../../services/hooks/usePlaybackScroll';
import { ScrollController } from '../../services/playback/ScrollController';
import { DEFAULT_STAFF_CONFIG } from '../../types/notation/config';
import './StackedStaffView.css';

interface FlattenedStaff {
  instrumentName: string;
  instrumentIndex: number;
  staff: Staff;
  staffIndex: number;
  isFirstStaffOfInstrument: boolean;
}

interface StackedStaffViewProps {
  score: Score;
  currentTick?: number;
  playbackStatus?: PlaybackStatus;
  onSeekToTick?: (tick: number) => void;
  onUnpinStartTick?: () => void;
  /** Callback to toggle playback (play/stop) when tapping outside staff regions */
  onTogglePlayback?: () => void;
}

export function StackedStaffView({
  score,
  currentTick = 0,
  playbackStatus = 'stopped',
  onSeekToTick,
  onUnpinStartTick,
  onTogglePlayback
}: StackedStaffViewProps) {
  // Shared scroll state for all staves
  const [sharedScrollX, setSharedScrollX] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [measuredViewportWidth, setMeasuredViewportWidth] = useState(1200);
  const lastAutoScrollTimeRef = useRef<number>(Date.now());

  const flattenedStaves = useMemo((): FlattenedStaff[] => {
    const staves: FlattenedStaff[] = [];
    score.instruments.forEach((instrument, instIdx) => {
      instrument.staves.forEach((staff, staffIdx) => {
        staves.push({
          instrumentName: instrument.name,
          instrumentIndex: instIdx,
          staff,
          staffIndex: staffIdx,
          isFirstStaffOfInstrument: staffIdx === 0
        });
      });
    });
    return staves;
  }, [score]);

  // Gather all notes from all staves for auto-scroll calculations
  const allNotes = useMemo((): Note[] => {
    const notes: Note[] = [];
    flattenedStaves.forEach(({ staff }) => {
      staff.voices.forEach(voice => {
        notes.push(...voice.interval_events);
      });
    });
    return notes;
  }, [flattenedStaves]);

  // Estimate total width based on note count and layout
  const estimatedTotalWidth = useMemo(() => {
    if (allNotes.length === 0) return measuredViewportWidth;
    const maxTick = Math.max(...allNotes.map(n => n.start_tick + n.duration_ticks));
    return maxTick * DEFAULT_STAFF_CONFIG.pixelsPerTick + 200; // Add margin
  }, [allNotes, measuredViewportWidth]);

  // Measure viewport width
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setMeasuredViewportWidth(width);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Use playback scroll hook for auto-scroll
  const { autoScrollEnabled, targetScrollX, setAutoScrollEnabled } = usePlaybackScroll({
    currentTick,
    playbackStatus,
    pixelsPerTick: DEFAULT_STAFF_CONFIG.pixelsPerTick,
    viewportWidth: measuredViewportWidth,
    totalWidth: estimatedTotalWidth,
    currentScrollX: sharedScrollX,
    notes: allNotes,
  });

  // Apply auto-scroll to shared container
  useEffect(() => {
    if (!autoScrollEnabled || playbackStatus !== 'playing' || !scrollContainerRef.current) {
      return undefined;
    }

    let animationFrameId: number;

    const smoothScroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = targetScrollX;
        lastAutoScrollTimeRef.current = Date.now();
        setSharedScrollX(targetScrollX);
      }
    };

    animationFrameId = requestAnimationFrame(smoothScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [autoScrollEnabled, playbackStatus, targetScrollX]);

  // Handle shared scroll events and detect manual scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollX = e.currentTarget.scrollLeft;
    setSharedScrollX(newScrollX);

    // Detect manual scroll during playback
    if (playbackStatus === 'playing' && autoScrollEnabled) {
      const isManual = ScrollController.isManualScroll(lastAutoScrollTimeRef.current);
      if (isManual) {
        setAutoScrollEnabled(false);
      }
    }
  };

  // Handle clicks on container background (outside staff regions) to toggle playback
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Toggle playback when clicking anywhere in the container
    // Note clicks will stop propagation, so this won't trigger when selecting notes
    if (onTogglePlayback) {
      onTogglePlayback();
    }
  };

  return (
    <div 
      className="stacked-staff-view" 
      data-testid="stacked-staff-view"
      onClick={handleContainerClick}
    >
      <div
        ref={scrollContainerRef}
        className="stacked-staff-scroll-container"
        onScroll={handleScroll}
      >
        <div className="stacked-staff-content">
          {flattenedStaves.map((item) => (
            <StaffGroup
              key={`${item.instrumentIndex}-${item.staffIndex}`}
              instrumentName={item.instrumentName}
              staff={item.staff}
              isFirstStaffOfInstrument={item.isFirstStaffOfInstrument}
              currentTick={currentTick}
              playbackStatus={playbackStatus}
              onSeekToTick={onSeekToTick}
              onUnpinStartTick={onUnpinStartTick}
              sharedScrollX={sharedScrollX}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
