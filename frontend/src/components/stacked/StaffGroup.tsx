/**
 * StaffGroup - Single staff with instrument name label
 * Feature 010: Stacked Staves View - User Story 3
 */

import type { Staff } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';
import { MultiVoiceStaff } from './MultiVoiceStaff';
import './StaffGroup.css';

interface StaffGroupProps {
  instrumentName: string;
  staff: Staff;
  isFirstStaffOfInstrument: boolean;
  currentTick?: number;
  playbackStatus?: PlaybackStatus;
  onSeekToTick?: (tick: number) => void;
  onUnpinStartTick?: () => void;
}

export function StaffGroup({
  instrumentName,
  staff,
  isFirstStaffOfInstrument,
  currentTick,
  playbackStatus,
  onSeekToTick,
  onUnpinStartTick
}: StaffGroupProps) {
  // Use active_clef from staff (already computed by backend)
  const clef = staff.active_clef;

  return (
    <div className="staff-group" role="group" aria-label={instrumentName}>
      {isFirstStaffOfInstrument && (
        <div className="staff-label">{instrumentName}</div>
      )}
      <div className="staff-content">
        <MultiVoiceStaff
          voices={staff.voices}
          clef={clef}
          currentTick={currentTick}
          playbackStatus={playbackStatus}
          onSeekToTick={onSeekToTick}
          onUnpinStartTick={onUnpinStartTick}
        />
      </div>
    </div>
  );
}
