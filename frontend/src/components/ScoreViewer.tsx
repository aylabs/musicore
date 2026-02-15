import { useState, useEffect, useMemo, useCallback } from "react";
import type { Score, Note } from "../types/score";
import { apiClient } from "../services/score-api";
import { InstrumentList } from "./InstrumentList";
import { PlaybackControls } from "./playback/PlaybackControls";
import { usePlayback } from "../services/playback/MusicTimeline";
import { useFileState } from "../services/state/FileStateContext";
import { ImportButton } from "./import/ImportButton";
import type { ImportResult } from "../services/import/MusicXMLImportService";
import { ViewModeSelector, type ViewMode } from "./stacked/ViewModeSelector";
import { StackedStaffView } from "./stacked/StackedStaffView";
import { LayoutView } from "./layout/LayoutView";
import { loadScoreFromIndexedDB } from "../services/storage/local-storage";
import { demoLoaderService } from "../services/onboarding/demoLoader";
import { useNoteHighlight } from "../services/highlight/useNoteHighlight";
import "./ScoreViewer.css";

interface ScoreViewerProps {
  scoreId?: string;
  /** Optional controlled view mode (if not provided, uses internal state with 'individual' default) */
  viewMode?: ViewMode;
  /** Optional callback for view mode changes (required if viewMode is controlled) */
  onViewModeChange?: (mode: ViewMode) => void;
}

/**
 * ScoreViewer - Main component for displaying and interacting with a musical score
 * 
 * Features:
 * - Load existing scores by ID
 * - Display full score hierarchy (instruments, staves, voices, notes)
 * - Show structural events (tempo, time signature)
 * - Error handling and loading states
 * 
 * @example
 * ```tsx
 * <ScoreViewer scoreId="123e4567-e89b-12d3-a456-426614174000" />
 * ```
 */
export function ScoreViewer({ 
  scoreId: initialScoreId,
  viewMode: controlledViewMode,
  onViewModeChange: controlledOnViewModeChange,
}: ScoreViewerProps) {
  const [score, setScore] = useState<Score | null>(null);
  const [scoreId, setScoreId] = useState<string | undefined>(initialScoreId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [skipNextLoad, setSkipNextLoad] = useState(false); // Flag to prevent reload after local->backend sync
  const [isFileSourced, setIsFileSourced] = useState(false); // Track if score came from file (frontend is source of truth)
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false); // Flag for auto-playing demo after load
  
  // Feature 010: View mode state for toggling between individual and stacked views
  // Use controlled mode if provided, otherwise internal state
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('individual');
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = controlledOnViewModeChange ?? setInternalViewMode;

  // File state management (Feature 004 - Score File Persistence)
  const { fileState, resetFileState } = useFileState();

  /**
   * Load a score by ID
   * Feature 013: Try IndexedDB first (for demo scores), then fall back to API
   */
  const loadScore = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Try IndexedDB first (for demo scores and imported scores)
      const indexedDBScore = await loadScoreFromIndexedDB(id);
      if (indexedDBScore) {
        console.log(`[ScoreViewer] Loaded score from IndexedDB: ${id}`);
        setScore(indexedDBScore);
        setIsFileSourced(false);
        return;
      }

      // Fall back to API if not in IndexedDB
      console.log(`[ScoreViewer] Score not in IndexedDB, trying API: ${id}`);
      const loadedScore = await apiClient.getScore(id);
      setScore(loadedScore);
      setIsFileSourced(false); // Backend is source of truth for API-loaded scores
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load score");
      setScore(null);
    } finally {
      setLoading(false);
    }
  };

  // Load score when scoreId changes (but only for backend-sourced scores)
  useEffect(() => {
    if (scoreId && !skipNextLoad && !isFileSourced) {
      loadScore(scoreId);
    }
    if (skipNextLoad) {
      setSkipNextLoad(false); // Reset flag
    }
  }, [scoreId, skipNextLoad, isFileSourced]);

  // Feature 004 T032: Keyboard shortcuts for file operations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl/Cmd modifier
      if (event.ctrlKey || event.metaKey) {
        // Removed: Ctrl+S (Save), Ctrl+N (New), Ctrl+O (Load from backend)
        // All editing shortcuts removed per Feature 014
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [score, fileState.isModified]); // Dependencies: score and isModified state

  // Removed: Feature 004 T033 - Browser beforeunload warning
  // No unsaved changes warning needed since editing is disabled (Feature 014)

  /**
   * Create a new score via API (legacy method - kept for backward compatibility)
   * @deprecated Use handleNewScoreButtonClick instead
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
  // Explicitly mark as used to avoid build errors (legacy API compatibility)
  void createNewScore;

  /**
   * Load demo score from IndexedDB (Feature 013)
   * Sets stacked view and auto-plays the demo
   */
  const handleLoadDemoButtonClick = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get demo score from IndexedDB
      let demoScore = await demoLoaderService.getDemoScore();
      
      if (!demoScore) {
        // Demo might have outdated schema - reload it
        console.log('[ScoreViewer] Demo not found or outdated, reloading...');
        demoScore = await demoLoaderService.loadBundledDemo();
      }
      
      if (!demoScore) {
        setError("Demo not found. Try refreshing the page.");
        return;
      }

      // Load the demo
      setScore(demoScore);
      setScoreId(demoScore.id);
      setIsFileSourced(false);
      setSkipNextLoad(true); // Skip the loadScore() useEffect since we already have the score
      resetFileState();
      
      // Set view mode to stacked (better for demo)
      setViewMode('stacked');
      
      // Set auto-play flag (will trigger in useEffect after score loads)
      setShouldAutoPlay(true);
      
      console.log(`[ScoreViewer] Loaded demo: ${demoScore.title}, switching to stacked view and auto-playing`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sync a local score to the backend by recreating its entire structure
   * Used when a file-loaded score needs to be modified via backend APIs
   * After syncing, reloads the score from backend to get correct IDs
   * @returns The backend score ID
   */
  const syncLocalScoreToBackend = async (): Promise<string> => {
    if (!score) throw new Error("No score to sync");
    if (scoreId) return scoreId; // Already synced

    // Create empty backend score
    const backendScore = await apiClient.createScore({ title: "Imported Score" });
    const newScoreId = backendScore.id;

    // Recreate each instrument with its full structure
    for (const instrument of score.instruments) {
      await apiClient.addInstrument(newScoreId, { name: instrument.name });
      const backendScoreWithInst = await apiClient.getScore(newScoreId);
      const backendInstrument = backendScoreWithInst.instruments.find(i => i.name === instrument.name);
      if (!backendInstrument) continue;

      // Add staves
      for (let staffIdx = 0; staffIdx < instrument.staves.length; staffIdx++) {
        if (staffIdx > 0) await apiClient.addStaff(newScoreId, backendInstrument.id);
      }

      // Reload to get staff IDs
      const scoreWithStaves = await apiClient.getScore(newScoreId);
      const instWithStaves = scoreWithStaves.instruments.find(i => i.name === instrument.name);
      if (!instWithStaves) continue;

      // Add voices and notes for each staff
      for (let staffIdx = 0; staffIdx < instrument.staves.length; staffIdx++) {
        const originalStaff = instrument.staves[staffIdx];
        const backendStaff = instWithStaves.staves[staffIdx];
        if (!backendStaff) continue;

        // Add voices
        for (let voiceIdx = 0; voiceIdx < originalStaff.voices.length; voiceIdx++) {
          if (voiceIdx > 0) await apiClient.addVoice(newScoreId, instWithStaves.id, backendStaff.id);
        }

        // Reload to get voice IDs
        const scoreWithVoices = await apiClient.getScore(newScoreId);
        const instWithVoices = scoreWithVoices.instruments.find(i => i.name === instrument.name);
        if (!instWithVoices) continue;
        const staffWithVoices = instWithVoices.staves[staffIdx];
        if (!staffWithVoices) continue;

        // Add notes for each voice
        for (let voiceIdx = 0; voiceIdx < originalStaff.voices.length; voiceIdx++) {
          const originalVoice = originalStaff.voices[voiceIdx];
          const backendVoice = staffWithVoices.voices[voiceIdx];
          if (!backendVoice) continue;

          for (const note of originalVoice.interval_events) {
            await apiClient.addNote(newScoreId, instWithVoices.id, staffWithVoices.id, backendVoice.id, {
              start_tick: note.start_tick,
              duration_ticks: note.duration_ticks,
              pitch: note.pitch,
            });
          }
        }
      }
    }

    // Mark score as backend-sourced now that we've synced
    // The score will be reloaded by onUpdate after the operation completes
    setIsFileSourced(false);

    return newScoreId;
  };

  /**
   * Load button and file selection handlers removed - Feature 014:
   * Read-only viewer focuses on Import and Demo loading only.
  };

  /**
   * Handle successful MusicXML import (Feature 006)
   * Feature 011: WASM parsing creates in-memory score (not in backend DB)
   * Loads the imported score into the viewer
   */
  const handleMusicXMLImport = (result: ImportResult) => {
    setScore(result.score);
    setScoreId(result.score.id);
    setIsFileSourced(true); // Frontend is source of truth for WASM-imported scores (not in backend DB)
    resetFileState(); // Clear file state (this is a new score from import)
    setSuccessMessage(`Imported ${result.statistics.note_count} notes from ${result.metadata.file_name || 'MusicXML file'}`);
    setTimeout(() => setSuccessMessage(null), 5000);
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
        // Only include voice 0 notes (matching layout's convertScoreToLayoutFormat)
        const firstVoice = staff.voices[0];
        if (firstVoice) {
          // interval_events is already an array of Notes
          notes.push(...firstVoice.interval_events);
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

  /**
   * Feature 019: Note highlighting during playback
   * Compute which notes should be highlighted based on current playback position
   */
  const highlightedNoteIds = useNoteHighlight(
    allNotes,
    playbackState.currentTick,
    playbackState.status
  );
  
  /**
   * Toggle playback between play and pause
   * Used for tablet: tapping outside staff regions in stacked view
   */
  const togglePlayback = useCallback(() => {
    if (playbackState.status === 'playing') {
      playbackState.pause();
    } else {
      playbackState.play();
    }
  }, [playbackState]);

  /**
   * Auto-play demo when loaded (Feature 013)
   */
  useEffect(() => {
    if (shouldAutoPlay && score) {
      console.log('[ScoreViewer] Auto-playing demo after score loaded');
      // Small delay to ensure playback state is initialized with new notes
      const timer = setTimeout(() => {
        if (playbackState.play) {
          playbackState.play();
          console.log('[ScoreViewer] Demo playback started');
        }
        setShouldAutoPlay(false); // Reset flag
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [shouldAutoPlay, score, playbackState]);

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
          <div className="initial-actions">
            {/* Feature 013: Load demo button */}
            <button 
              onClick={handleLoadDemoButtonClick} 
              disabled={loading}
              style={{ 
                backgroundColor: '#4CAF50',
                color: 'white',
                fontWeight: 'bold'
              }}
            >              🎵 Demo
            </button>
            {/* Feature 006: Import MusicXML Score */}
            <ImportButton
              onImportComplete={handleMusicXMLImport}
              buttonText="Import Score"
              disabled={loading}
            />
          </div>
          {error && <div className="error">{error}</div>}
          {successMessage && <div className="success">{successMessage}</div>}
        </div>
      </div>
    );
  }

  // Render score
  return (
    <div className="score-viewer">
      {/* Feature 010: Hide header and file operations in stacked/layout view */}
      {viewMode === 'individual' && (
        <>
          <div className="score-header">
            <h1>Score {fileState.isModified && <span className="unsaved-indicator">*</span>}</h1>
            <div className="score-info">
              <span className="score-id">ID: {score.id}</span>
              <span className="tempo">Tempo: {getInitialTempo()} BPM</span>
              <span className="time-sig">Time: {getInitialTimeSignature()}</span>
            </div>
          </div>

          {/* Feature 010: Import (left) and View Mode Selector (right) on same line */}
          <div className="score-toolbar">
            <div className="toolbar-left">
              <ImportButton
                onImportComplete={handleMusicXMLImport}
                buttonText="Import"
              />
            </div>
            <div className="toolbar-right">
              {score && score.instruments.length > 0 && (
                <ViewModeSelector currentMode={viewMode} onChange={setViewMode} />
              )}
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          {/* Feature 004 T014: Success notification */}
          {successMessage && <div className="success-message">{successMessage}</div>}
        </>
      )}

      {/* Feature 003 - Music Playback: US1 T025 - Playback Controls */}
      {/* Feature 010: Compact mode in stacked/layout view, full mode in individual view */}
      <PlaybackControls
        status={playbackState.status}
        hasNotes={allNotes.length > 0}
        error={playbackState.error}
        onPlay={playbackState.play}
        onPause={playbackState.pause}
        onStop={playbackState.stop}
        compact={viewMode !== 'individual'}
        rightActions={viewMode !== 'individual' && score && score.instruments.length > 0 ? (
          <button 
            className="view-mode-button" 
            onClick={() => setViewMode('individual')}
            aria-label="Switch to instruments view"
          >
            Instruments View
          </button>
        ) : undefined}
      />

      {score.instruments.length === 0 ? (
        <div className="no-instruments">
          <p>This score has no instruments. Try importing a MusicXML file or loading the demo.</p>
        </div>
      ) : viewMode === 'individual' ? (
        <InstrumentList 
          instruments={score.instruments} 
          scoreId={scoreId} 
          onUpdate={(id) => {
            // If explicit id provided (e.g., after sync), always reload
            // Otherwise, only reload if score is backend-sourced
            if (id) {
              loadScore(id);
            } else if (!isFileSourced && scoreId) {
              loadScore(scoreId);
            }
          }} 
          onScoreCreated={(id) => {
            setSkipNextLoad(true); // Prevent reload on scoreId change (onUpdate will handle reload)
            setScoreId(id);
          }}
          onSync={syncLocalScoreToBackend}
          currentTick={playbackState.currentTick}
          playbackStatus={playbackState.status}
          onSeekToTick={playbackState.seekToTick}
          onUnpinStartTick={playbackState.unpinStartTick}
        />
      ) : viewMode === 'stacked' ? (
        /* Feature 010: Stacked Staves View */
        <StackedStaffView
          score={score}
          currentTick={playbackState.currentTick}
          playbackStatus={playbackState.status}
          onSeekToTick={playbackState.seekToTick}
          onUnpinStartTick={playbackState.unpinStartTick}
          onTogglePlayback={togglePlayback}
        />
      ) : (
        /* Feature 017: Layout View */
        <LayoutView 
          score={score} 
          highlightedNoteIds={highlightedNoteIds}
          onTogglePlayback={togglePlayback}
        />
      )}

      {loading && <div className="loading-overlay">Updating...</div>}
    </div>
  );
}
