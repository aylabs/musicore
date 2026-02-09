/**
 * MultiVoiceStaff - Merge all voices in a staff and render via StaffNotation
 * Feature 010: Stacked Staves View - User Story 2
 */

import { useMemo } from 'react';
import type { Voice, ClefType } from '../../types/score';
import type { PlaybackStatus } from '../../types/playback';
import { StaffNotation } from '../notation/StaffNotation';
import './MultiVoiceStaff.css';

interface MultiVoiceStaffProps {
  voices: Voice[];
  clef: ClefType;
  currentTick?: number;
  playbackStatus?: PlaybackStatus;
  onSeekToTick?: (tick: number) => void;
  onUnpinStartTick?: () => void;
  sharedScrollX?: number;  // Feature 010: Shared scroll position
}

export function MultiVoiceStaff({
  voices,
  clef,
  currentTick,
  playbackStatus,
  onSeekToTick,
  onUnpinStartTick,
  sharedScrollX
}: MultiVoiceStaffProps) {
  // Merge all voice notes into single array, sorted by start_tick
  const mergedNotes = useMemo(() => {
    const allNotes = voices.flatMap(v => v.interval_events);
    return allNotes.sort((a, b) => a.start_tick - b.start_tick);
  }, [voices]);

  return (
    <div className="multi-voice-staff" data-testid="multi-voice-staff">
      <StaffNotation
        notes={mergedNotes}
        clef={clef}
        currentTick={currentTick}
        playbackStatus={playbackStatus}
        onNoteClick={onSeekToTick}
        onNoteDeselect={onUnpinStartTick}
        externalScrollX={sharedScrollX}
        disableInternalScroll={sharedScrollX !== undefined}
      />
    </div>
  );
}
