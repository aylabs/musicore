import { useState, useEffect, useMemo } from "react";
import type { Score, Note } from "../types/score";
import { apiClient } from "../services/score-api";
import { InstrumentList } from "./InstrumentList";
import { PlaybackControls } from "./playback/PlaybackControls";
import { usePlayback } from "../services/playback/MusicTimeline";
import "./ScoreViewer.css";

interface ScoreViewerProps {
  scoreId?: string;
}

/**
 * ScoreViewer - Main component for displaying and interacting with a musical score
 * 
 * Features:
 * - Create new scores
 * - Load existing scores by ID
 * - Display full score hierarchy (instruments, staves, voices, notes)
 * - Show structural events (tempo, time signature)
 * - Add instruments to scores
 * - Error handling and loading states
 * 
 * @example
 * ```tsx
 * <ScoreViewer scoreId="123e4567-e89b-12d3-a456-426614174000" />
 * ```
 */
export function ScoreViewer({ scoreId: initialScoreId }: ScoreViewerProps) {
  const [score, setScore] = useState<Score | null>(null);
  const [scoreId, setScoreId] = useState<string | undefined>(initialScoreId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instrumentName, setInstrumentName] = useState("");

  // Load score when scoreId changes
  useEffect(() => {
    if (scoreId) {
      loadScore(scoreId);
    }
  }, [scoreId]);

  /**
   * Load a score by ID
   */
  const loadScore = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const loadedScore = await apiClient.getScore(id);
      setScore(loadedScore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load score");
      setScore(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new score
   */
  const createNewScore = async () => {
    setLoading(true);
    setError(null);
    try {
      const newScore = await apiClient.createScore({ title: "New Score" });
      setScore(newScore);
      setScoreId(newScore.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create score");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add an instrument to the current score
   */
  const addInstrument = async () => {
    if (!score || !instrumentName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await apiClient.addInstrument(score.id, { name: instrumentName });
      // Reload score to get updated state
      await loadScore(score.id);
      setInstrumentName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add instrument");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get tempo at tick 0
   */
  const getInitialTempo = (): number => {
    if (!score) return 120;
    
    for (const event of score.global_structural_events) {
      if ("Tempo" in event && event.Tempo.tick === 0) {
        return event.Tempo.bpm;
      }
    }
    return 120;
  };

  /**
   * Get time signature at tick 0
   */
  const getInitialTimeSignature = (): string => {
    if (!score) return "4/4";
    
    for (const event of score.global_structural_events) {
      if ("TimeSignature" in event && event.TimeSignature.tick === 0) {
        const ts = event.TimeSignature;
        return `${ts.numerator}/${ts.denominator}`;
      }
    }
    return "4/4";
  };

  /**
   * Extract all notes from score for playback
   * Feature 003 - Music Playback: US1 T025
   */
  const allNotes = useMemo((): Note[] => {
    if (!score) return [];

    const notes: Note[] = [];
    for (const instrument of score.instruments) {
      for (const staff of instrument.staves) {
        for (const voice of staff.voices) {
          // interval_events is already an array of Notes
          notes.push(...voice.interval_events);
        }
      }
    }
    return notes;
  }, [score]);

  /**
   * Initialize playback hook
   * Feature 003 - Music Playback: US1 T025
   */
  const initialTempo = getInitialTempo();
  const playbackState = usePlayback(allNotes, initialTempo);

  // Render loading state
  if (loading && !score) {
    return (
      <div className="score-viewer">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Render initial state (no score)
  if (!score) {
    return (
      <div className="score-viewer">
        <div className="no-score">
          <h2>No Score Loaded</h2>
          <button onClick={createNewScore} disabled={loading}>
            Create New Score
          </button>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  // Render score
  return (
    <div className="score-viewer">
      <div className="score-header">
        <h1>Score</h1>
        <div className="score-info">
          <span className="score-id">ID: {score.id}</span>
          <span className="tempo">Tempo: {getInitialTempo()} BPM</span>
          <span className="time-sig">Time: {getInitialTimeSignature()}</span>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Feature 003 - Music Playback: US1 T025 - Playback Controls */}
      <PlaybackControls
        status={playbackState.status}
        hasNotes={allNotes.length > 0}
        onPlay={playbackState.play}
        onPause={playbackState.pause}
        onStop={playbackState.stop}
      />

      <div className="add-instrument">
        <input
          type="text"
          placeholder="Instrument name (e.g., Piano)"
          value={instrumentName}
          onChange={(e) => setInstrumentName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addInstrument()}
          disabled={loading}
        />
        <button onClick={addInstrument} disabled={loading || !instrumentName.trim()}>
          Add Instrument
        </button>
      </div>

      {score.instruments.length === 0 ? (
        <div className="no-instruments">
          <p>No instruments yet. Add one to get started!</p>
        </div>
      ) : (
        <InstrumentList instruments={score.instruments} scoreId={score.id} onUpdate={() => loadScore(score.id)} />
      )}

      {loading && <div className="loading-overlay">Updating...</div>}
    </div>
  );
}
