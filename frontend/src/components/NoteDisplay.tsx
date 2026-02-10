import { useState } from "react";
import type { Note, ClefType } from "../types/score";
import type { PlaybackStatus } from "../types/playback";
import { StaffNotation } from "./notation/StaffNotation";
import "./NoteDisplay.css";

interface NoteDisplayProps {
  notes: Note[];
  clef: string;
  // Feature 009: Playback state for auto-scroll
  currentTick?: number;
  playbackStatus?: PlaybackStatus;
  onSeekToTick?: (tick: number) => void; // Feature 009: Seek to tick when note clicked
  onUnpinStartTick?: () => void; // Feature 009: Clear pinned start position
}

/**
 * NoteDisplay - Component for displaying and adding notes
 * 
 * Features:
 * - Display notes with tick, duration, and pitch
 * - Show pitch as MIDI number and note name
 * - Add new notes with validation
 * - Sort notes by tick position
 * - Error handling for invalid input
 * 
 * @example
 * ```tsx
 * <NoteDisplay 
 *   notes={voice.interval_events}
 *   voiceId={voice.id}
 *   staffId={staff.id}
 *   instrumentId={instrument.id}
 *   scoreId={score.id}
 *   onUpdate={() => reloadScore()}
 *   onScoreCreated={(id) => setScoreId(id)}
 * />
 * ```
 */
export function NoteDisplay({ 
  notes, 
  clef,
  currentTick,
  playbackStatus,
  onSeekToTick,
  onUnpinStartTick
}: NoteDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Convert MIDI pitch number to note name
   */
  const pitchToNoteName = (pitch: number): string => {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor(pitch / 12) - 1;
    const noteName = noteNames[pitch % 12];
    return `${noteName}${octave}`;
  };

  /**
   * Format tick as measures:beats:ticks (assuming 4/4 time, 960 PPQ)
   */
  const formatTick = (tick: number): string => {
    const ticksPerBeat = 960;
    const beatsPerMeasure = 4;
    const ticksPerMeasure = ticksPerBeat * beatsPerMeasure;
    
    const measure = Math.floor(tick / ticksPerMeasure) + 1;
    const remainingTicks = tick % ticksPerMeasure;
    const beat = Math.floor(remainingTicks / ticksPerBeat) + 1;
    const subTick = remainingTicks % ticksPerBeat;
    
    return `${measure}:${beat}:${subTick.toString().padStart(3, "0")}`;
  };

  // Sort notes by tick
  const sortedNotes = [...notes].sort((a, b) => a.start_tick - b.start_tick);

  return (
    <div className="note-display">
      {/* Staff Notation Visualization */}
      {notes.length > 0 && (
        <div className="staff-notation-container">
          <StaffNotation
            notes={notes}
            clef={clef as ClefType}
            viewportWidth={800}
            viewportHeight={200}
            currentTick={currentTick}
            playbackStatus={playbackStatus}
            onNoteClick={onSeekToTick}
            onNoteDeselect={onUnpinStartTick}
          />
        </div>
      )}

      {/* Note Details Toggle */}
      {notes.length > 0 && (
        <button 
          className="toggle-details-btn"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? "Hide Note Details" : "Show Note Details"}
        </button>
      )}

      {/* Note Grid Details */}
      {showDetails && (
        <div className="notes-grid">
          {sortedNotes.map((note, idx) => (
            <div key={idx} className="note-item">
              <div className="note-pitch">
                <strong>{pitchToNoteName(note.pitch)}</strong>
                <span className="midi-number">(MIDI {note.pitch})</span>
              </div>
              <div className="note-timing">
                <span>Tick: {formatTick(note.start_tick)}</span>
                <span>Duration: {note.duration_ticks}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {sortedNotes.length === 0 && <div className="no-notes">No notes yet</div>}
    </div>
  );
}
