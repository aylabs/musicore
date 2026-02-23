import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Score, Note } from "../types/score";
import { apiClient } from "../services/score-api";
import { InstrumentList } from "./InstrumentList";
import { PlaybackControls } from "./playback/PlaybackControls";
import { usePlayback } from "../services/playback/MusicTimeline";
import { useFileState } from "../services/state/FileStateContext";
import { useTempoState } from "../services/state/TempoStateContext";
import type { ImportResult } from "../services/import/MusicXMLImportService";
import { ViewModeSelector, type ViewMode } from "./stacked/ViewModeSelector";
import { LayoutView } from "./layout/LayoutView";
import { loadScoreFromIndexedDB } from "../services/storage/local-storage";
import { useNoteHighlight } from "../services/highlight/useNoteHighlight";
import { LoadScoreButton } from "./load-score/LoadScoreButton";
import { LoadScoreDialog } from "./load-score/LoadScoreDialog";
import { LandingScreen } from "./LandingScreen";
import "./ScoreViewer.css";

/** A single long-press pin: a noteId coupled with its absolute tick position */
interface PinState { noteId: string; tick: number; }

interface ScoreViewerProps {
  scoreId?: string;
  /** Optional controlled view mode (if not provided, uses internal state with 'individual' default) */
  viewMode?: ViewMode;
  /** Optional callback for view mode changes (required if viewMode is controlled) */
  onViewModeChange?: (mode: ViewMode) => void;
  /** Debug mode: shows Record View button when true */
  debugMode?: boolean;
  /** Called when Record View button is pressed (only relevant when debugMode=true) */
  onShowRecording?: () => void;
  /** Called when Practice View button is pressed (only relevant when debugMode=true) */
  onShowPractice?: () => void;
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
  debugMode = false,
  onShowRecording,
  onShowPractice,
}: ScoreViewerProps) {
  const [score, setScore] = useState<Score | null>(null);
  const [scoreId, setScoreId] = useState<string | undefined>(initialScoreId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [skipNextLoad, setSkipNextLoad] = useState(false); // Flag to prevent reload after local->backend sync
  const [isFileSourced, setIsFileSourced] = useState(false); // Track if score came from file (frontend is source of truth)
  const [dialogOpen, setDialogOpen] = useState(false); // Feature 028: Load Score dialog visibility
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

    // Only enter fullscreen play mode when a score is actually loaded.
    // On the landing screen (no score), keep the app-header (logo/banner) visible.
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

  // Feature 027 — Landing screen: remove fullscreen-play when no score is loaded,
  // even if viewMode is still 'layout' from a previous session preference.
  // This keeps the app-header (logo/banner) visible on the landing/welcome screen.
  // When score loads into layout mode, re-add the class so play view goes fullscreen.
  // Note: viewMode is intentionally excluded from deps — the viewMode effect handles
  // viewMode changes; this effect only reacts to score load/unload events.
  useEffect(() => {
    if (!score) {
      document.body.classList.remove('fullscreen-play');
    } else if (viewMode === 'layout') {
      document.body.classList.add('fullscreen-play');
    }
  }, [score]); // eslint-disable-line react-hooks/exhaustive-deps



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
   * Handle successful MusicXML import (Feature 006)
   * Feature 011: WASM parsing creates in-memory score (not in backend DB)
   * Loads the imported score into the viewer
   */
  const handleMusicXMLImport = (result: ImportResult) => {
    setScore(result.score);
    setScoreId(result.score.id);
    setIsFileSourced(true); // Frontend is source of truth for WASM-imported scores (not in backend DB)
    resetFileState(); // Clear file state (this is a new score from import)

    // Reset playback to the beginning so the new score always starts at tick 0,
    // regardless of where the previous score was paused or stopped.
    playbackState.resetPlayback();
    setLoopStart(null);
    setPinLoopEnd(null);

    // Feature 022: Set score title from metadata (work_title > filename fallback)
    const fileName = result.metadata.file_name;
    const strippedName = fileName ? fileName.replace(/\.[^.]+$/, '') : null;
    setScoreTitle(result.metadata.work_title ?? strippedName ?? null);
    
    setSuccessMessage(`Imported ${result.statistics.note_count} notes from ${result.metadata.file_name || 'MusicXML file'}`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  /**
   * Handle import completion from the Load Score dialog (Feature 028, T018).
   * Opens the score in the play view (layout mode) in a paused state.
   */
  const handleDialogImportComplete = (result: ImportResult) => {
    handleMusicXMLImport(result);
    setDialogOpen(false);
    setViewMode('layout');
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
   * Loop region state — long-press on a note sets loopStart (green pin).
   * Long-press on a second note creates a loop: [loopStart.tick, loopEnd.tick].
   * Long-press inside the loop region clears both pins.
   */
  const [loopStart, setLoopStart] = useState<PinState | null>(null);
  const [loopEnd,   setPinLoopEnd] = useState<PinState | null>(null);

  /** Green-highlighted note IDs: only shown when just ONE pin is set (no region yet).
   * When the full loop region is active the overlay rect replaces the need for
   * individual note highlights. */
  const pinnedNoteIds = useMemo(() => {
    // Both pins set → region rect is visible, green highlights not needed
    if (loopStart && loopEnd) return new Set<string>();
    const ids = new Set<string>();
    if (loopStart) ids.add(loopStart.noteId);
    return ids;
  }, [loopStart, loopEnd]);

  /** Loop region passed down to LayoutRenderer for the overlay rect */
  const loopRegion = useMemo(() =>
    loopStart && loopEnd
      ? { startTick: loopStart.tick, endTick: loopEnd.tick }
      : null,
    [loopStart, loopEnd]
  );

  /**
   * Handle pin / unpin from long-press gesture (tick for seek, noteId for highlight).
   * State machine:
   *   No pins      → set loopStart (single green pin)
   *   pinA only, same note   → clear pin
   *   pinA only, diff note   → create loop [min, max] by tick order
   *   Both pins, inside loop → clear loop
   *   Both pins, outside     → replace with new single pin
   */
  const handlePin = useCallback((tick: number | null, noteId: string | null) => {
    if (tick === null || noteId === null) return;

    if (!loopStart) {
      // No pins: set first pin
      setLoopStart({ noteId, tick });
      setPinLoopEnd(null);
      playbackState.setPinnedStart(tick);
      playbackState.setLoopEnd(null);
      if (playbackState.status !== 'playing') playbackState.seekToTick(tick);
      return;
    }

    if (!loopEnd) {
      if (loopStart.noteId === noteId) {
        // Same note: unpin
        setLoopStart(null);
        playbackState.setPinnedStart(null);
        playbackState.setLoopEnd(null);
        if (playbackState.status !== 'playing') playbackState.seekToTick(tick);
      } else {
        // Different note: normalise by tick order and create loop
        const [start, end] = tick < loopStart.tick
          ? [{ noteId, tick }, loopStart]
          : [loopStart, { noteId, tick }];
        setLoopStart(start);
        setPinLoopEnd(end);
        playbackState.setPinnedStart(start.tick);
        // Loop fires after note B plays, right before the next note starts.
        // Using duration_ticks alone causes notes from other voices that overlap
        // the last note's duration to bleed into the loop.
        // Strategy: loop fires at nextNoteTick - 1 (just before any note after B),
        // or B.tick + duration if B is the last note in the score.
        const endNote = allNotes.find(n => n.id === end.noteId);
        const notesAfterEnd = allNotes.filter(n => n.start_tick > end.tick);
        const nextNoteTick = notesAfterEnd.length > 0
          ? notesAfterEnd.reduce((min, n) => n.start_tick < min ? n.start_tick : min, Infinity)
          : Infinity;
        const loopEndTick = nextNoteTick !== Infinity
          ? nextNoteTick - 1
          : end.tick + (endNote?.duration_ticks ?? 960);
        playbackState.setLoopEnd(loopEndTick);
        if (playbackState.status !== 'playing') playbackState.seekToTick(start.tick);
      }
      return;
    }

    // Both pins set
    if (tick >= loopStart.tick && tick <= loopEnd.tick) {
      // Inside loop region: clear
      setLoopStart(null);
      setPinLoopEnd(null);
      playbackState.setPinnedStart(null);
      playbackState.setLoopEnd(null);
      if (playbackState.status !== 'playing') playbackState.seekToTick(tick);
    } else {
      // Outside loop: start fresh single pin
      setLoopStart({ noteId, tick });
      setPinLoopEnd(null);
      playbackState.setPinnedStart(tick);
      playbackState.setLoopEnd(null);
      if (playbackState.status !== 'playing') playbackState.seekToTick(tick);
    }
  }, [loopStart, loopEnd, playbackState, allNotes]);
  
  /**
   * Toggle playback between play and pause.
   * If a tick is pinned (long-press green marker), play() will start from
   * pinnedStartTickRef automatically — no seekToTick needed here.
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

  // Render loading state
  if (loading && !score) {
    return (
      <div className="score-viewer">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Render initial state (no score) — Feature 001: LandingScreen
  if (!score) {
    return (
      <div className="score-viewer">
        {debugMode && (
          <button
            className="record-view-debug-btn"
            onClick={onShowRecording}
            aria-label="Record View"
          >
            Record View
          </button>
        )}
        <button
          className="record-view-debug-btn"
          onClick={onShowPractice}
          aria-label="Practice View"
        >
          Practice View
        </button>
        {/* Feature 001: animated landing hero covers the full viewport */}
        <LandingScreen onLoadScore={() => setDialogOpen(true)} />
        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}
        {/* Feature 028: Load Score Dialog */}
        <LoadScoreDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onImportComplete={handleDialogImportComplete}
          onWillLoad={() => document.documentElement.requestFullscreen?.().catch(() => {})}
        />
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
              <LoadScoreButton
                onClick={() => setDialogOpen(true)}
              />
            </div>
            <div className="toolbar-right">
              {debugMode && (
                <button
                  className="record-view-debug-btn"
                  onClick={onShowRecording}
                  aria-label="Record View"
                >
                  Record View
                </button>
              )}
              <button
                className="record-view-debug-btn"
                onClick={onShowPractice}
                aria-label="Practice View"
              >
                Practice View
              </button>
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
            playbackStatus={playbackState.status}
            tickSourceRef={playbackState.tickSourceRef}
            allNotes={allNotes}
            pinnedNoteIds={pinnedNoteIds}
            pinnedNoteId={loopStart?.noteId ?? null}
            onPin={handlePin}
            loopRegion={loopRegion}
            onSeekAndPlay={(tick) => {
              // seekToTick updates lastReactTickRef synchronously (no stale-closure issue).
              // If a green pin is set, play() will use it automatically; otherwise
              // it uses the tapped tick set by seekToTick here.
              playbackState.seekToTick(tick);
              playbackState.play();
            }}
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
      {/* Feature 028: Load Score Dialog */}
      <LoadScoreDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onImportComplete={handleDialogImportComplete}
        onWillLoad={() => document.documentElement.requestFullscreen?.().catch(() => {})}
      />
    </div>
  );
}
