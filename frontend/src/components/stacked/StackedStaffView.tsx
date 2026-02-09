/**
 * StackedStaffView - Container for vertically stacked staff groups
 * Feature 010: Stacked Staves View - User Story 1
 */

import { useMemo } from 'react';
import type { Score, Staff } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';
import { StaffGroup } from './StaffGroup';
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
}

export function StackedStaffView({
  score,
  currentTick,
  playbackStatus,
  onSeekToTick,
  onUnpinStartTick
}: StackedStaffViewProps) {
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

  return (
    <div className="stacked-staff-view" data-testid="stacked-staff-view">
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
        />
      ))}
    </div>
  );
}
