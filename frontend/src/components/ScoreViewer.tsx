import { useState, useEffect, useMemo, useRef } from "react";
import type { Score, Note } from "../types/score";
import { apiClient } from "../services/score-api";
import * as wasmEngine from "../services/wasm/music-engine";
import { InstrumentList } from "./InstrumentList";
import { PlaybackControls } from "./playback/PlaybackControls";
import { usePlayback } from "../services/playback/MusicTimeline";
import { useFileState } from "../services/state/FileStateContext";
import { saveScore as saveScoreToFile, loadScore as loadScoreFromFile, createNewScore as createNewScoreFile } from "../services/file/FileService";
import { validateScoreFile } from "../services/file/validation";
import { ImportButton } from "./import/ImportButton";
import type { ImportResult } from "../services/import/MusicXMLImportService";
import { ViewModeSelector, type ViewMode } from "./stacked/ViewModeSelector";
import { StackedStaffView } from "./stacked/StackedStaffView";
import { loadScoreFromIndexedDB } from "../services/storage/local-storage";
import { demoLoaderService } from "../services/onboarding/demoLoader";
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
export function ScoreViewer({ 
  scoreId: initialScoreId,
  viewMode: controlledViewMode,
  onViewModeChange: controlledOnViewModeChange,
}: ScoreViewerProps) {
  const [score, setScore] = useState<Score | null>(null);
  const [scoreId, setScoreId] = useState<string | undefined>(initialScoreId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instrumentName, setInstrumentName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<'load' | 'new' | null>(null);
  const [skipNextLoad, setSkipNextLoad] = useState(false); // Flag to prevent reload after local->backend sync
  const [isFileSourced, setIsFileSourced] = useState(false); // Track if score came from file (frontend is source of truth)
  const [saveFilename, setSaveFilename] = useState(""); // Custom filename for saving
  
  // Feature 010: View mode state for toggling between individual and stacked views
  // Use controlled mode if provided, otherwise internal state
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('individual');
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = controlledOnViewModeChange ?? setInternalViewMode;

  // File input ref for Load button (Feature 004 T019)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File state management (Feature 004 - Score File Persistence)
  const { fileState, setFilePath, setModified, resetFileState } = useFileState();

  // Load score when scoreId changes (but only for backend-sourced scores)
  useEffect(() => {
    if (scoreId && !skipNextLoad && !isFileSourced) {
      loadScore(scoreId);
    }
    if (skipNextLoad) {
      setSkipNextLoad(false); // Reset flag
    }
  }, [scoreId]);

  // Feature 004 T032: Keyboard shortcuts for file operations
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl/Cmd modifier
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 's') {
          // Ctrl+S / Cmd+S: Save
          event.preventDefault();
          if (score) {
            handleSaveScore();
          }
        } else if (event.key === 'o') {
          // Ctrl+O / Cmd+O: Load
          event.preventDefault();
          handleLoadButtonClick();
        } else if (event.key === 'n') {
          // Ctrl+N / Cmd+N: New Score
          event.preventDefault();
          handleNewScoreButtonClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [score, fileState.isModified]); // Dependencies: score and isModified state

  // Feature 004 T033: Browser beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (fileState.isModified) {
        // Modern browsers ignore custom messages, but returnValue is required
        event.preventDefault();
        event.returnValue = ''; // Chrome requires this
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [fileState.isModified]);

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
   * Handle New Score button click (Feature 004 T026, T027)
   */
  const handleNewScoreButtonClick = () => {
    // Check for unsaved changes (Feature 004 T027)
    if (fileState.isModified) {
      setPendingAction('new');
      setShowUnsavedWarning(true);
    } else {
      // No unsaved changes, create new score directly
      executeNewScore();
    }
  };

  /**
   * Execute new score creation (Feature 004 T028)
   */
  const executeNewScore = () => {
    try {
      // Create new empty score with default settings
      const newScore = createNewScoreFile();

      // Update UI state
      setScore(newScore);
      setScoreId(undefined); // Clear scoreId - this is a local score not saved to backend yet
      setIsFileSourced(true); // Frontend is source of truth for new scores

      // Reset file state (Feature 004 T028)
      resetFileState();
      
      // Clear save filename input
      setSaveFilename("");

      // Show success notification
      showSuccessMessage("New score created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create new score");
    }
  };

  /**
   * Load demo score from IndexedDB (Feature 013)
   */
  const handleLoadDemoButtonClick = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get demo score from IndexedDB
      const demoScore = await demoLoaderService.getDemoScore();
      
      if (!demoScore) {
        setError("Demo not found. Try refreshing the page.");
        return;
      }

      // Load the demo
      setScore(demoScore);
      setScoreId(demoScore.id);
      setIsFileSourced(false);
      resetFileState();
      console.log(`[ScoreViewer] Loaded demo: ${demoScore.title}`);
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
   * Add an instrument to the current score
   * Feature 011: Uses WASM engine for offline capability
   */
  const addInstrument = async () => {
    if (!score || !instrumentName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // Use WASM to add instrument locally (no backend needed)
      const updatedScore = await wasmEngine.addInstrument(score, instrumentName.trim());
      setScore(updatedScore);
      setInstrumentName("");
      
      // Mark as file-sourced since we're using WASM (frontend is source of truth)
      setIsFileSourced(true);
      
      // Feature 004 T013: Mark as modified when score is edited
      setModified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add instrument");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save the current score to a JSON file (Feature 004 T012)
   * Downloads score as .musicore.json file and updates file state
   */
  const handleSaveScore = () => {
    if (!score) return;

    try {
      // Use custom filename if provided, otherwise generate from score ID
      const filename = saveFilename.trim() || `score-${score.id.substring(0, 8)}`;
      
      // Save score to file (triggers browser download)
      saveScoreToFile(score, filename);
      
      // Update file state: mark as saved, update timestamp (Feature 004 T012)
      setFilePath(`${filename}.musicore.json`);
      
      // Show success notification (Feature 004 T014)
      showSuccessMessage("Score saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save score");
    }
  };

  /**
   * Display success message and auto-dismiss after 3 seconds (Feature 004 T014)
   */
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  /**
   * Handle Load button click - open file picker (Feature 004 T019)
   */
  const handleLoadButtonClick = () => {
    // Check for unsaved changes (Feature 004 T020)
    if (fileState.isModified) {
      setPendingAction('load');
      setShowUnsavedWarning(true);
    } else {
      // No unsaved changes, open file picker directly
      fileInputRef.current?.click();
    }
  };

  /**
   * Handle file selection from file picker (Feature 004 T019, T021, T022)
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be selected again
    event.target.value = '';

    setLoading(true);
    setError(null);

    try {
      // Load file using FileReader API (Feature 004 T018)
      const loadedScore = await loadScoreFromFile(file);

      // Validate the loaded score (Feature 004 T021)
      const jsonContent = JSON.stringify(loadedScore);
      const validationResult = validateScoreFile(jsonContent);

      if (!validationResult.valid) {
        // Show validation errors (Feature 004 T021)
        setError(`Invalid score file:\n${validationResult.errors.join('\n')}`);
        setLoading(false);
        return;
      }

      // Score is valid, update state
      setScore(loadedScore);
      setScoreId(undefined); // Clear scoreId - this is a file-loaded score not from backend
      setIsFileSourced(true); // Frontend is source of truth for file-loaded scores
      
      // Update file state (Feature 004 T018)
      setFilePath(file.name);
      
      // Populate save filename input with loaded filename (without extension)
      const filenameWithoutExt = file.name.replace(/\.musicore\.json$/, '').replace(/\.json$/, '');
      setSaveFilename(filenameWithoutExt);
      
      // Show success notification (Feature 004 T022)
      showSuccessMessage("Score loaded successfully");
    } catch (err) {
      // Feature 004 T021: Display error for invalid files
      setError(err instanceof Error ? err.message : "Failed to load score");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Confirm action despite unsaved changes (Feature 004 T020, T027)
   */
  const confirmActionWithUnsavedChanges = () => {
    setShowUnsavedWarning(false);
    
    if (pendingAction === 'load') {
      fileInputRef.current?.click();
    } else if (pendingAction === 'new') {
      executeNewScore();
    }
    
    setPendingAction(null);
  };

  /**
   * Cancel action, preserve unsaved changes (Feature 004 T020, T027)
   */
  const cancelActionWithUnsavedChanges = () => {
    setShowUnsavedWarning(false);
    setPendingAction(null);
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
            >
              🎵 Load Demo
            </button>
            <button onClick={handleNewScoreButtonClick} disabled={loading}>
              New Score
            </button>
            <button onClick={handleLoadButtonClick} disabled={loading}>
              Load Score
            </button>
            {/* Feature 006: Import MusicXML Score */}
            <ImportButton
              onImportComplete={handleMusicXMLImport}
              buttonText="Import Score"
              disabled={loading}
            />
          </div>
          {/* Feature 004 T019: Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.musicore.json"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          {error && <div className="error">{error}</div>}
          {successMessage && <div className="success">{successMessage}</div>}
        </div>
      </div>
    );
  }

  // Render score
  return (
    <div className="score-viewer">
      {/* Feature 010: Hide header and file operations in stacked view */}
      {viewMode === 'individual' && (
        <>
          <div className="score-header">
            <h1>Score {fileState.isModified && <span className="unsaved-indicator">*</span>}</h1>
            <div className="score-info">
              <span className="score-id">ID: {score.id}</span>
              <span className="tempo">Tempo: {getInitialTempo()} BPM</span>
              <span className="time-sig">Time: {getInitialTimeSignature()}</span>
            </div>
            {/* Feature 004 T012, T026: File operation buttons */}
            <div className="score-actions">
              <button onClick={handleNewScoreButtonClick} className="new-button">
                New
              </button>
              <button onClick={handleLoadButtonClick} className="load-button">
                Load
              </button>
              {/* Feature 006: MusicXML Import */}
              <ImportButton
                onImportComplete={handleMusicXMLImport}
                buttonText="Import"
              />
              <input
                type="text"
                placeholder="filename (optional)"
                value={saveFilename}
                onChange={(e) => setSaveFilename(e.target.value)}
                className="filename-input"
              />
              <button onClick={handleSaveScore} className="save-button">
                Save
              </button>
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          {/* Feature 004 T014: Success notification */}
          {successMessage && <div className="success-message">{successMessage}</div>}
        </>
      )}

      {/* Feature 004 T019: Hidden file input for Load functionality */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.musicore.json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Feature 004 T020, T027: Unsaved changes warning dialog */}
      {showUnsavedWarning && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h2>Unsaved Changes</h2>
            <p>
              You have unsaved changes. {pendingAction === 'load' ? 'Loading a file' : 'Creating a new score'} will discard them. Continue?
            </p>
            <div className="modal-actions">
              <button onClick={cancelActionWithUnsavedChanges} className="cancel-button">
                Cancel
              </button>
              <button onClick={confirmActionWithUnsavedChanges} className="confirm-button">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature 010: View Mode Selector - Toggle between Individual and Stacked views */}
      {/* In individual view: show both buttons. In stacked view: integrated with playback controls */}
      {viewMode === 'individual' && score && score.instruments.length > 0 && (
        <ViewModeSelector currentMode={viewMode} onChange={setViewMode} />
      )}

      {/* Feature 003 - Music Playback: US1 T025 - Playback Controls */}
      {/* Feature 010: Compact mode in stacked view, full mode in individual view */}
      <PlaybackControls
        status={playbackState.status}
        hasNotes={allNotes.length > 0}
        error={playbackState.error}
        onPlay={playbackState.play}
        onPause={playbackState.pause}
        onStop={playbackState.stop}
        compact={viewMode === 'stacked'}
        rightActions={viewMode === 'stacked' && score && score.instruments.length > 0 ? (
          <button 
            className="view-mode-button" 
            onClick={() => setViewMode('individual')}
            aria-label="Switch to individual view"
          >
            Individual View
          </button>
        ) : undefined}
      />

      {/* Feature 010: Hide Add Instrument control in stacked view */}
      {viewMode === 'individual' && (
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
      )}

      {score.instruments.length === 0 ? (
        <div className="no-instruments">
          <p>No instruments yet. Add one to get started!</p>
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
      ) : (
        /* Feature 010: Stacked Staves View */
        <StackedStaffView
          score={score}
          currentTick={playbackState.currentTick}
          playbackStatus={playbackState.status}
          onSeekToTick={playbackState.seekToTick}
          onUnpinStartTick={playbackState.unpinStartTick}
        />
      )}

      {loading && <div className="loading-overlay">Updating...</div>}
    </div>
  );
}
