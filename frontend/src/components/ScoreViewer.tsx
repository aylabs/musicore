import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Score, Note } from "../types/score";
import { apiClient } from "../services/score-api";
import { InstrumentList } from "./InstrumentList";
import { PlaybackControls } from "./playback/PlaybackControls";
import { usePlayback } from "../services/playback/MusicTimeline";
import { useFileState } from "../services/state/FileStateContext";
import { useTempoState } from "../services/state/TempoStateContext";
import { ImportButton } from "./import/ImportButton";
import type { ImportResult } from "../services/import/MusicXMLImportService";
import { ViewModeSelector, type ViewMode } from "./stacked/ViewModeSelector";
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
  const [scoreTitle, setScoreTitle] = useState<string | null>(null); // Feature 022: Score title from MusicXML metadata
  
  // View mode state for toggling between individual and layout views
  // Use controlled mode if provided, otherwise internal state
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('individual');
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = controlledOnViewModeChange ?? setInternalViewMode;

  // File state management (Feature 004 - Score File Persistence)
  const { fileState, resetFileState } = useFileState();

  /**
   * Feature 027 (T009): Return to Instruments view.
   * Called by the ← arrow in PlaybackControls and the popstate listener.
   * Directly exits full-screen and removes the body class so the iOS CSS
   * fallback also works immediately (no dependency on a React re-render).
   * Uses a ref so the popstate listener always accesses the live callback.
   */
  const handleReturnToView = useCallback(() => {
    document.exitFullscreen?.().catch(() => {
      // iOS Safari does not support exitFullscreen — CSS fallback handles it
    });
    document.body.classList.remove('fullscreen-play');
    setViewMode('individual');
  }, [setViewMode]);

  // Keep a ref so the popstate listener always has the latest callback
  const handleReturnToViewRef = useRef(handleReturnToView);
  useEffect(() => {
    handleReturnToViewRef.current = handleReturnToView;
  });

  /**
   * Feature 027 (T007/T008): Full-screen + back-gesture lifecycle.
   * - Entering layout mode: add fullscreen body class, push history state, add popstate listener.
   *   requestFullscreen() is NOT called here — it must be called from the user-gesture handler
   *   (onClick) because useEffect runs after paint and browsers block it outside a user gesture.
   * - Leaving layout mode: exit full-screen, remove body class.
   * - Cleanup is conditional: only undo what this branch actually set up, so entering layout
   *   mode does NOT accidentally trigger exitFullscreen via the previous cleanup.
   */
  useEffect(() => {
    const handlePopState = () => {
      handleReturnToViewRef.current();
    };

    if (viewMode === 'layout') {
      // T010: Body class hides the app header via CSS (App.css rule)
      document.body.classList.add('fullscreen-play');
      // T008: Push state so browser back button / swipe fires popstate
      history.pushState({ view: 'layout' }, '', window.location.href);
      window.addEventListener('popstate', handlePopState);

      // Cleanup: undo only what the layout branch set up
      return () => {
        window.removeEventListener('popstate', handlePopState);
        document.body.classList.remove('fullscreen-play');
        document.exitFullscreen?.().catch(() => {});
      };
    } else {
      document.exitFullscreen?.().catch(() => {});
      document.body.classList.remove('fullscreen-play');

      // Cleanup: just remove the listener (body class already removed above)
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [viewMode]);



  /**
   * Load a score by ID
   * Feature 013: Try IndexedDB first (for demo scores), then fall back to API
   * Feature 025: Offline Mode - IndexedDB only (no REST API fallback)
   */
  const loadScore = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Feature 025: IndexedDB only (offline parity)
      const indexedDBScore = await loadScoreFromIndexedDB(id);
      if (indexedDBScore) {
        console.log(`[ScoreViewer] Loaded score from IndexedDB: ${id}`);
        setScore(indexedDBScore);
        setScoreTitle(indexedDBScore.instruments[0]?.name ?? null); // Feature 022: Fallback to instrument name
        setIsFileSourced(false);
        return;
      }

      // Feature 025: No REST API fallback - show helpful error message
      console.log(`[ScoreViewer] Score not found in IndexedDB: ${id}`);
      throw new Error("Score not found in local storage. Import a MusicXML file or load the demo.");
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
   * Sets layout view and auto-plays the demo
   */
  const handleLoadDemoButtonClick = async () => {
    // T007: Request full-screen NOW — we are still inside the synchronous part of the
    // click-event handler, so the browser grants the user-gesture privilege.
    // All subsequent awaits run outside the user-gesture context, so this is the
    // only safe place to call requestFullscreen for the demo flow.
    document.documentElement.requestFullscreen?.().catch(() => {
      // iOS Safari does not support requestFullscreen — body class provides the CSS fallback
    });
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
      setScoreTitle(demoScore.title ?? null); // Feature 022: Show demo title
      setIsFileSourced(false);
      setSkipNextLoad(true); // Skip the loadScore() useEffect since we already have the score
      resetFileState();
      
      // Set view mode to layout (Play View — better for demo)
      setViewMode('layout');
      
      // Set auto-play flag (will trigger in useEffect after score loads)
      setShouldAutoPlay(true);
      
      console.log(`[ScoreViewer] Loaded demo: ${demoScore.title}, switching to layout view and auto-playing`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete removed: syncLocalScoreToBackend()
   * Feature 025: Offline Mode - No REST API sync needed
   * All scores stored in IndexedDB only, identified by score.id
   */

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
    
    // Feature 022: Set score title from metadata (work_title > filename fallback)
    const fileName = result.metadata.file_name;
    const strippedName = fileName ? fileName.replace(/\.[^.]+$/, '') : null;
    setScoreTitle(result.metadata.work_title ?? strippedName ?? null);
    
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

  // Feature 022: Get tempo state for timer display
  const { tempoState } = useTempoState();

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
   * Selected note state: tracks which note was clicked for seek-and-play
   */
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  /**
   * Toggle playback between play and pause
   * Used for tablet: tapping outside staff regions in layout view
   */
  const togglePlayback = useCallback(() => {
    if (playbackState.status === 'playing') {
      playbackState.pause();
    } else {
      playbackState.play();
    }
  }, [playbackState]);

  /**
   * Feature 027 (T009/T005): Return arrow handler passed to PlaybackControls.
   * Pauses playback to preserve position, then delegates to handleReturnToView
   * which triggers the viewMode useEffect (exitFullscreen + body class removal).
   */
  const handleReturnToViewWithPause = useCallback(() => {
    playbackState.pause();
    handleReturnToView();
  }, [playbackState, handleReturnToView]);

  /**
   * Handle note click: select the note, seek to its position, and start playback.
   * Clicking a note in the rendered score will:
   * 1. Visually select it (orange highlight)
   * 2. Seek playback to the note's start tick
   * 3. Start playing from that position
   */
  /**
   * Handle note click: select the note and seek to its position.
   * Feature 027 (T015): Does NOT auto-play — US2 spec requires note tap = seek only.
   * Empty-area tap = toggle play/pause (handled by onTogglePlayback on the container).
   */
  const handleNoteClick = useCallback((noteId: string) => {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    setSelectedNoteId(noteId);
    playbackState.seekToTick(note.start_tick);
    // T015: Removed play() call — note tap seeks without auto-play per FR-005
  }, [allNotes, playbackState]);

  // Clear selected note when playback stops
  useEffect(() => {
    if (playbackState.status === 'stopped') {
      setSelectedNoteId(null);
    }
  }, [playbackState.status]);

  /**
   * Feature 026 (US3): Return to Start
   * Stop playback and scroll the page back to measure 1.
   * Also provides the scroll-reset mechanism reused by the US4 auto-end effect.
   */
  const handleReturnToStart = useCallback(() => {
    playbackState.stop();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [playbackState]);

  /**
   * Feature 026 (US4): Track playback end so the Return to Start button
   * appears at the end of the score where the user is.
   * Does NOT auto-scroll — the user decides when to return.
   */
  const prevStatusRef = useRef<string>('stopped');
  const [showReturnToStart, setShowReturnToStart] = useState(false);
  useEffect(() => {
    if (prevStatusRef.current === 'playing' && playbackState.status === 'stopped') {
      setShowReturnToStart(true);
    }
    if (playbackState.status === 'playing') {
      setShowReturnToStart(false);
    }
    prevStatusRef.current = playbackState.status;
  }, [playbackState.status]);

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
      {/* Feature 022: In layout/play view the compact PlaybackControls strip shows the title.
          The separate score-title-bar is not needed since ViewMode is 'individual' | 'layout'. */}

      {/* Hide header and file operations in layout view */}
      {viewMode === 'individual' && (
        <>
          <div className="score-header">
            <h1 title={scoreTitle ?? undefined} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scoreTitle ?? 'Score'} {fileState.isModified && <span className="unsaved-indicator">*</span>}
            </h1>
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
                <ViewModeSelector
                  currentMode={viewMode}
                  onChange={(mode) => {
                    // T007: requestFullscreen must be in the user-gesture (onClick) context.
                    // Calling it from the ViewModeSelector click keeps it synchronous with the event.
                    if (mode === 'layout') {
                      document.documentElement.requestFullscreen?.().catch(() => {
                        // iOS Safari fallback — body class handles it via CSS
                      });
                    }
                    setViewMode(mode);
                  }}
                />
              )}
            </div>
          </div>

          {error && <div className="error">{error}</div>}
          {/* Feature 004 T014: Success notification */}
          {successMessage && <div className="success-message">{successMessage}</div>}
        </>
      )}

      {/* Feature 003 - Music Playback: US1 T025 - Playback Controls */}
      {/* Compact mode in layout view, full mode in individual view */}
      <PlaybackControls
        status={playbackState.status}
        hasNotes={allNotes.length > 0}
        error={playbackState.error}
        onPlay={playbackState.play}
        onPause={playbackState.pause}
        onStop={playbackState.stop}
        compact={viewMode !== 'individual'}
        currentTick={playbackState.currentTick}
        totalDurationTicks={playbackState.totalDurationTicks}
        tempo={initialTempo}
        tempoMultiplier={tempoState.tempoMultiplier}
        title={viewMode !== 'individual' ? (scoreTitle ?? undefined) : undefined}
        onReturnToView={viewMode !== 'individual' ? handleReturnToViewWithPause : undefined}
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
          currentTick={playbackState.currentTick}
          playbackStatus={playbackState.status}
          onSeekToTick={playbackState.seekToTick}
          onUnpinStartTick={playbackState.unpinStartTick}
        />
      ) : (
        /* Feature 017: Layout View */
        <>
          <LayoutView 
            score={score} 
            highlightedNoteIds={highlightedNoteIds}
            onTogglePlayback={togglePlayback}
            onNoteClick={handleNoteClick}
            selectedNoteId={selectedNoteId ?? undefined}
            playbackStatus={playbackState.status}
            tickSourceRef={playbackState.tickSourceRef}
            allNotes={allNotes}
          />
          {/* Return to Start button — placed at end of score so user sees it after playback ends */}
          {showReturnToStart && playbackState.status === 'stopped' && (
            <div className="return-to-start-container">
              <button
                className="return-to-start-end-button"
                onClick={handleReturnToStart}
                aria-label="Return to Start"
              >
                ⏮ Return to Start
              </button>
            </div>
          )}
        </>
      )}

      {loading && <div className="loading-overlay">Updating...</div>}
    </div>
  );
}
