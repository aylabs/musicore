import { useState } from "react";
import type { Instrument } from "../types/score";
import type { PlaybackStatus } from "../types/playback";
import { apiClient } from "../services/score-api";
import { NoteDisplay } from "./NoteDisplay";
import "./InstrumentList.css";

interface InstrumentListProps {
  instruments: Instrument[];
  scoreId: string | undefined;
  onUpdate: (scoreId?: string) => void;
  onScoreCreated?: (scoreId: string) => void;
  onSync?: () => Promise<string>; // Sync local score to backend
  // Feature 009: Playback state for auto-scroll
  currentTick?: number;
  playbackStatus?: PlaybackStatus;
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
 *   onScoreCreated={(id) => setScoreId(id)}
 * />
 * ```
 */
export function InstrumentList({ instruments, scoreId, onUpdate, onScoreCreated, onSync, currentTick, playbackStatus }: InstrumentListProps) {
  const [expandedInstruments, setExpandedInstruments] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Toggle instrument expansion by index (preserves state across ID changes)
   */
  const toggleInstrument = (instrumentIndex: number) => {
    setExpandedInstruments(prev => {
      const next = new Set(prev);
      if (next.has(instrumentIndex)) {
        next.delete(instrumentIndex);
      } else {
        next.add(instrumentIndex);
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
      // If this is a local score (no scoreId), sync it to backend first
      let currentScoreId = scoreId;
      let targetInstrumentId = instrumentId;
      
      if (!currentScoreId && onSync) {
        currentScoreId = await onSync();
        onScoreCreated?.(currentScoreId);
        
        // After sync, fetch score to get correct backend IDs
        // Match by position since sync preserves order
        const updatedScore = await apiClient.getScore(currentScoreId);
        
        // Find instrument by position in original instruments array
        const instIndex = instruments.findIndex(i => i.id === instrumentId);
        const targetInstrument = instIndex >= 0 && updatedScore.instruments[instIndex]
          ? updatedScore.instruments[instIndex]
          : updatedScore.instruments[0];
        
        if (!targetInstrument) {
          setError("Could not find instrument after sync");
          return;
        }
        
        targetInstrumentId = targetInstrument.id;
      } else if (!currentScoreId) {
        setError("Cannot add staff: score not loaded");
        return;
      }
      
      await apiClient.addStaff(currentScoreId, targetInstrumentId);
      onUpdate(currentScoreId);
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
      // If this is a local score (no scoreId), sync it to backend first
      let currentScoreId = scoreId;
      let targetInstrumentId = instrumentId;
      let targetStaffId = staffId;
      
      if (!currentScoreId && onSync) {
        currentScoreId = await onSync();
        onScoreCreated?.(currentScoreId);
        
        // After sync, fetch score to get correct backend IDs
        // Match by position since sync preserves order  
        const updatedScore = await apiClient.getScore(currentScoreId);
        
        // Find instrument by position in original instruments array
        const instIndex = instruments.findIndex(i => i.id === instrumentId);
        const originalInstrument = instruments[instIndex];
        const targetInstrument = instIndex >= 0 && updatedScore.instruments[instIndex]
          ? updatedScore.instruments[instIndex]
          : updatedScore.instruments[0];
        
        if (!targetInstrument || !originalInstrument) {
          setError("Could not find instrument after sync");
          return;
        }
        
        targetInstrumentId = targetInstrument.id;
        
        // Find staff by position in original instrument's staves array
        const staffIdx = originalInstrument.staves.findIndex(s => s.id === staffId);
        const targetStaff = staffIdx >= 0 && targetInstrument.staves[staffIdx]
          ? targetInstrument.staves[staffIdx]
          : targetInstrument.staves[0];
        
        if (!targetStaff) {
          setError("Could not find staff after sync");
          return;
        }
        
        targetStaffId = targetStaff.id;
      } else if (!currentScoreId) {
        setError("Cannot add voice: score not loaded");
        return;
      }
      
      await apiClient.addVoice(currentScoreId, targetInstrumentId, targetStaffId);
      onUpdate(currentScoreId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add voice");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get clef for a staff at tick 0
   * Feature 007: Prefer active_clef field, fall back to staff_structural_events
   */
  const getStaffClef = (instrument: Instrument, staffIndex: number): string => {
    const staff = instrument.staves[staffIndex];
    
    // Feature 007: Use active_clef if available (backward compatible)
    if (staff.active_clef) {
      return staff.active_clef;
    }
    
    // Fallback: Legacy logic for older API responses
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
      
      {instruments.map((instrument, instIdx) => (
        <div key={instrument.id} className="instrument-card">
          <div 
            className="instrument-header"
            onClick={() => toggleInstrument(instIdx)}
          >
            <span className="expand-icon">
              {expandedInstruments.has(instIdx) ? "▼" : "▶"}
            </span>
            <h3>{instrument.name}</h3>
            <span className="badge">{instrument.staves.length} staves</span>
          </div>

          {expandedInstruments.has(instIdx) && (
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
                        onScoreCreated={onScoreCreated}
                        onSync={onSync}
                        clef={getStaffClef(instrument, staffIdx)}
                        instrumentIndex={instIdx}
                        staffIndex={staffIdx}
                        voiceIndex={voiceIdx}
                        currentTick={currentTick}
                        playbackStatus={playbackStatus}
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
