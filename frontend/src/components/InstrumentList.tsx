import { useState } from "react";
import type { Instrument } from "../types/score";
import { apiClient } from "../services/score-api";
import { NoteDisplay } from "./NoteDisplay";
import "./InstrumentList.css";

interface InstrumentListProps {
  instruments: Instrument[];
  scoreId: string;
  onUpdate: () => void;
}

/**
 * InstrumentList - Component for displaying instruments and their staves/voices
 * 
 * Features:
 * - Display all instruments in a score
 * - Show staves and voices for each instrument
 * - Add new staves and voices
 * - Display notes in each voice
 * - Add notes with validation
 * 
 * @example
 * ```tsx
 * <InstrumentList 
 *   instruments={score.instruments} 
 *   scoreId={score.id}
 *   onUpdate={() => reloadScore()}
 * />
 * ```
 */
export function InstrumentList({ instruments, scoreId, onUpdate }: InstrumentListProps) {
  const [expandedInstruments, setExpandedInstruments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Toggle instrument expansion
   */
  const toggleInstrument = (instrumentId: string) => {
    setExpandedInstruments(prev => {
      const next = new Set(prev);
      if (next.has(instrumentId)) {
        next.delete(instrumentId);
      } else {
        next.add(instrumentId);
      }
      return next;
    });
  };

  /**
   * Add a staff to an instrument
   */
  const addStaff = async (instrumentId: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.addStaff(scoreId, instrumentId);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add staff");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a voice to a staff
   */
  const addVoice = async (instrumentId: string, staffId: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.addVoice(scoreId, instrumentId, staffId);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add voice");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get clef for a staff at tick 0
   */
  const getStaffClef = (instrument: Instrument, staffIndex: number): string => {
    const staff = instrument.staves[staffIndex];
    for (const event of staff.staff_structural_events) {
      if ("Clef" in event && event.Clef.tick === 0) {
        return event.Clef.clef_type;
      }
    }
    return "Treble";
  };

  /**
   * Get key signature for a staff at tick 0
   */
  const getStaffKey = (instrument: Instrument, staffIndex: number): string => {
    const staff = instrument.staves[staffIndex];
    for (const event of staff.staff_structural_events) {
      if ("KeySignature" in event && event.KeySignature.tick === 0) {
        return event.KeySignature.key;
      }
    }
    return "CMajor";
  };

  return (
    <div className="instrument-list">
      {error && <div className="error">{error}</div>}
      
      {instruments.map((instrument) => (
        <div key={instrument.id} className="instrument-card">
          <div 
            className="instrument-header" 
            onClick={() => toggleInstrument(instrument.id)}
          >
            <span className="expand-icon">
              {expandedInstruments.has(instrument.id) ? "▼" : "▶"}
            </span>
            <h3>{instrument.name}</h3>
            <span className="badge">{instrument.staves.length} staves</span>
          </div>

          {expandedInstruments.has(instrument.id) && (
            <div className="instrument-body">
              {instrument.staves.map((staff, staffIdx) => (
                <div key={staff.id} className="staff-section">
                  <div className="staff-header">
                    <h4>Staff {staffIdx + 1}</h4>
                    <div className="staff-info">
                      <span className="clef">Clef: {getStaffClef(instrument, staffIdx)}</span>
                      <span className="key">Key: {getStaffKey(instrument, staffIdx)}</span>
                      <span className="badge">{staff.voices.length} voices</span>
                    </div>
                  </div>

                  {staff.voices.map((voice, voiceIdx) => (
                    <div key={voice.id} className="voice-section">
                      <div className="voice-header">
                        <h5>Voice {voiceIdx + 1}</h5>
                        <span className="badge">{voice.interval_events.length} notes</span>
                      </div>
                      <NoteDisplay 
                        notes={voice.interval_events}
                        voiceId={voice.id}
                        staffId={staff.id}
                        instrumentId={instrument.id}
                        scoreId={scoreId}
                        onUpdate={onUpdate}
                        clef={getStaffClef(instrument, staffIdx)}
                      />
                    </div>
                  ))}

                  <button 
                    className="add-voice-btn"
                    onClick={() => addVoice(instrument.id, staff.id)}
                    disabled={loading}
                  >
                    + Add Voice to Staff {staffIdx + 1}
                  </button>
                </div>
              ))}

              <button 
                className="add-staff-btn"
                onClick={() => addStaff(instrument.id)}
                disabled={loading}
              >
                + Add Staff
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
