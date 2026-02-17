import { useState, useEffect, useRef } from "react";
import type { Instrument } from "../types/score";
import type { PlaybackStatus } from "../types/playback";
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
  onSeekToTick?: (tick: number) => void; // Feature 009: Seek to tick when note clicked
  onUnpinStartTick?: () => void; // Feature 009: Clear pinned start position
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
export function InstrumentList({ instruments, currentTick, playbackStatus, onSeekToTick, onUnpinStartTick }: InstrumentListProps) {
  const [expandedInstruments, setExpandedInstruments] = useState<Set<number>>(new Set());
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const lastAutoScrollTimeRef = useRef<number>(0);
  
  // Map of staff IDs to their DOM element refs for vertical auto-scroll
  const staffRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  /**
   * Register a staff element ref for vertical auto-scroll
   */
  const registerStaffRef = (staffId: string, element: HTMLDivElement | null) => {
    if (element) {
      staffRefsMap.current.set(staffId, element);
    } else {
      staffRefsMap.current.delete(staffId);
    }
  };

  /**
   * Auto-scroll vertically to keep currently playing staff in view
   */
  useEffect(() => {
    if (playbackStatus !== 'playing' || !autoScrollEnabled) {
      return;
    }

    /**
     * Find which staff is currently playing based on currentTick
     */
    const getCurrentlyPlayingStaffId = (): string | null => {
      if (typeof currentTick !== 'number') return null;

      for (const instrument of instruments) {
        for (const staff of instrument.staves) {
          // Check if any voice in this staff has notes at currentTick
          for (const voice of staff.voices) {
            for (const note of voice.interval_events) {
              if (note.start_tick <= currentTick && (note.start_tick + note.duration_ticks) > currentTick) {
                return staff.id;
              }
            }
          }
        }
      }
      return null;
    };

    const playingStaffId = getCurrentlyPlayingStaffId();
    if (!playingStaffId) {
      return;
    }

    const staffElement = staffRefsMap.current.get(playingStaffId);
    if (!staffElement) {
      return;
    }

    // Check if staff is already reasonably visible
    const rect = staffElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // If staff is in the middle 60% of viewport, don't scroll (avoid jitter)
    const topThreshold = viewportHeight * 0.2;
    const bottomThreshold = viewportHeight * 0.8;
    
    if (rect.top >= topThreshold && rect.bottom <= bottomThreshold) {
      return; // Already well positioned
    }

    // Scroll staff into view with 30% from top positioning
    const scrollOptions: ScrollIntoViewOptions = {
      behavior: 'smooth',
      block: 'start',
    };

    staffElement.scrollIntoView(scrollOptions);
    // eslint-disable-next-line react-hooks/purity
    lastAutoScrollTimeRef.current = Date.now();
  }, [currentTick, playbackStatus, autoScrollEnabled, instruments]);

  /**
   * Detect manual scroll and disable auto-scroll
   */
  useEffect(() => {
    const handleScroll = () => {
      if (playbackStatus === 'playing' && autoScrollEnabled) {
        // eslint-disable-next-line react-hooks/purity
        const timeSinceLastAuto = Date.now() - lastAutoScrollTimeRef.current;
        if (timeSinceLastAuto > 200) {
          // User scrolled manually during playback
          setAutoScrollEnabled(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [playbackStatus, autoScrollEnabled]);

  /**
   * Re-enable auto-scroll when playback stops
   */
  useEffect(() => {
    if (playbackStatus === 'stopped') {
      setAutoScrollEnabled(true);
    }
  }, [playbackStatus]);

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
                <div 
                  key={staff.id} 
                  className="staff-section"
                  ref={(el) => registerStaffRef(staff.id, el)}
                >
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
                        clef={getStaffClef(instrument, staffIdx)}
                        currentTick={currentTick}
                        playbackStatus={playbackStatus}
                        onSeekToTick={onSeekToTick}
                        onUnpinStartTick={onUnpinStartTick}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
