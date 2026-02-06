import { useState } from "react";
import type { Note } from "../types/score";
import { apiClient } from "../services/score-api";
import "./NoteDisplay.css";

interface NoteDisplayProps {
  notes: Note[];
  voiceId: string;
  staffId: string;
  instrumentId: string;
  scoreId: string;
  onUpdate: () => void;
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
 * />
 * ```
 */
export function NoteDisplay({ 
  notes, 
  voiceId, 
  staffId, 
  instrumentId, 
  scoreId, 
  onUpdate 
}: NoteDisplayProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [tick, setTick] = useState("0");
  const [duration, setDuration] = useState("960");
  const [pitch, setPitch] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  /**
   * Add a note to the voice
   */
  const addNote = async () => {
    const tickNum = parseInt(tick);
    const durationNum = parseInt(duration);
    const pitchNum = parseInt(pitch);

    // Validation
    if (isNaN(tickNum) || tickNum < 0) {
      setError("Tick must be a non-negative number");
      return;
    }
    if (isNaN(durationNum) || durationNum <= 0) {
      setError("Duration must be a positive number");
      return;
    }
    if (isNaN(pitchNum) || pitchNum < 0 || pitchNum > 127) {
      setError("Pitch must be between 0 and 127");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.addNote(scoreId, instrumentId, staffId, voiceId, {
        start_tick: tickNum,
        duration_ticks: durationNum,
        pitch: pitchNum,
      });
      onUpdate();
      setShowAddForm(false);
      // Reset to next position
      setTick((tickNum + durationNum).toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setLoading(false);
    }
  };

  // Sort notes by tick
  const sortedNotes = [...notes].sort((a, b) => a.start_tick - b.start_tick);

  return (
    <div className="note-display">
      {sortedNotes.length === 0 ? (
        <div className="no-notes">No notes yet</div>
      ) : (
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

      {!showAddForm ? (
        <button 
          className="add-note-btn"
          onClick={() => setShowAddForm(true)}
        >
          + Add Note
        </button>
      ) : (
        <div className="add-note-form">
          <h6>Add New Note</h6>
          {error && <div className="error">{error}</div>}
          
          <div className="form-row">
            <label>
              Tick (position):
              <input
                type="number"
                value={tick}
                onChange={(e) => setTick(e.target.value)}
                min="0"
                step="1"
                disabled={loading}
              />
            </label>
            
            <label>
              Duration (ticks):
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                step="1"
                disabled={loading}
              />
              <small>960 = quarter note</small>
            </label>
            
            <label>
              Pitch (MIDI):
              <input
                type="number"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                min="0"
                max="127"
                step="1"
                disabled={loading}
              />
              <small>{pitchToNoteName(parseInt(pitch) || 60)}</small>
            </label>
          </div>

          <div className="form-actions">
            <button onClick={addNote} disabled={loading}>
              {loading ? "Adding..." : "Add"}
            </button>
            <button 
              onClick={() => {
                setShowAddForm(false);
                setError(null);
              }} 
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
