/**
 * Play Score Plugin — Main Component (T011)
 * Feature 033: Play Score Plugin
 *
 * Manages screen state ('selection' | 'player'), subscribes to scorePlayer
 * state changes, and renders the appropriate screen.
 *
 * Screen transitions:
 *   'selection' → 'player' : user picks a score from the catalogue or loads a file
 *   'player' → 'selection' : user taps the Back button
 *
 * US1: Selection screen, player view, Back button behaviour (T011)
 * US2: Playback controls wired in T016
 * US3: Note seeking wired in T018
 * US4: Pin/loop wired in T020–T021
 * US5: Return-to-start wired in T023
 * US6: File loading wired in T025
 * US7: Tempo control wired in T027
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PluginContext, ScorePlayerState, PluginPlaybackStatus } from '../../src/plugin-api/index';
import { ScoreSelectionScreen } from './scoreSelectionScreen';
import { PlaybackToolbar } from './playbackToolbar';
import './PlayScorePlugin.css';

export interface PlayScorePluginProps {
  context: PluginContext;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_PLAYER_STATE: ScorePlayerState = {
  status: 'idle' as PluginPlaybackStatus,
  currentTick: 0,
  totalDurationTicks: 0,
  highlightedNoteIds: new Set<string>(),
  bpm: 120,
  title: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlayScorePlugin({ context }: PlayScorePluginProps) {
  // ─── Screen state ─────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<'selection' | 'player'>('selection');

  // ─── Subscribed scorePlayer state ─────────────────────────────────────────
  const [playerState, setPlayerState] = useState<ScorePlayerState>(INITIAL_PLAYER_STATE);

  // Subscribe to scorePlayer state changes
  useEffect(() => {
    const unsubscribe = context.scorePlayer.subscribe(state => {
      setPlayerState(state);
    });
    return unsubscribe;
  }, [context.scorePlayer]);

  // T030: Audio teardown guarantee — stop all audio when plugin unmounts (SC-005)
  useEffect(() => {
    return () => {
      context.scorePlayer.stop();
      context.stopPlayback();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── US4/T020: Pin/loop state machine ────────────────────────────────────
  type PinState = { tick: number; noteId: string };
  const [loopStart, setLoopStart] = useState<PinState | null>(null);
  const [loopEndPin, setLoopEndPin] = useState<PinState | null>(null);
  const [tempoMultiplier, setTempoMultiplier] = useState(1.0);

  // Two-tap state: first tap seeks (arms play), second tap resumes.
  const [pendingPlay, setPendingPlay] = useState(false);

  // Clear pendingPlay whenever playback leaves the 'paused' state
  // (resumed → 'playing', reset → 'ready'/'idle', error, etc.).
  useEffect(() => {
    if (playerState.status !== 'paused') {
      setPendingPlay(false);
    }
  }, [playerState.status]);

  // T021: Derive pinnedNoteIds and loopRegion from pin state
  const pinnedNoteIds = useMemo<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    if (loopStart) ids.add(loopStart.noteId);
    if (loopEndPin) ids.add(loopEndPin.noteId);
    return ids;
  }, [loopStart, loopEndPin]);

  const loopRegion = useMemo(() => {
    if (!loopStart || !loopEndPin || loopStart.tick === loopEndPin.tick) return null;
    return {
      startTick: Math.min(loopStart.tick, loopEndPin.tick),
      endTick: Math.max(loopStart.tick, loopEndPin.tick),
    };
  }, [loopStart, loopEndPin]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectScore = useCallback((catalogueId: string) => {
    setScreen('player');
    context.scorePlayer.loadScore({ kind: 'catalogue', catalogueId });
  }, [context.scorePlayer]);

  const handleLoadFile = useCallback((file: File) => {
    setScreen('player');
    context.scorePlayer.loadScore({ kind: 'file', file });
  }, [context.scorePlayer]);

  const handleBack = useCallback(() => {
    context.close();
  }, [context]);

  // US2 handlers (wired in T016)
  const handlePlay = useCallback(() => { context.scorePlayer.play(); }, [context.scorePlayer]);
  const handlePause = useCallback(() => { context.scorePlayer.pause(); }, [context.scorePlayer]);
  const handleStop = useCallback(() => { context.scorePlayer.stop(); }, [context.scorePlayer]);
  const handleTempoChange = useCallback((m: number) => {
    setTempoMultiplier(m);
    context.scorePlayer.setTempoMultiplier(m);
  }, [context.scorePlayer]);

  // US3 (wired in T018): two-tap seek-then-play state machine.
  //   First tap while paused  → seek (highlight the note), arm pendingPlay.
  //   Second tap while paused → seek to new position and resume playback.
  //   Tap while playing       → seek only (mid-playback note navigation).
  const handleNoteShortTap = useCallback((tick: number) => {
    if (playerState.status !== 'playing') {
      context.scorePlayer.seekToTick(tick);
      if (pendingPlay) {
        // Second tap: resume from newly seeked position.
        context.scorePlayer.play();
        // pendingPlay will be cleared by the useEffect once status → 'playing'.
      } else {
        // First tap: arm the play trigger.
        setPendingPlay(true);
      }
      return;
    }
    // Playing: seek without interrupting playback.
    context.scorePlayer.seekToTick(tick);
  }, [context.scorePlayer, playerState.status, pendingPlay]);

  // US4 (wired in T020): pin/loop long-press state machine
  const handleNoteLongPress = useCallback((tick: number, noteId: string | null) => {
    const isPlaying = playerState.status === 'playing';

    // If a full loop region is active and tick falls inside it → clear all pins
    if (loopRegion && tick >= loopRegion.startTick && tick <= loopRegion.endTick) {
      setLoopStart(null);
      setLoopEndPin(null);
      context.scorePlayer.setPinnedStart(null);
      context.scorePlayer.setLoopEnd(null);
      return;
    }

    if (loopStart === null) {
      // First long-press: pin the start
      const id = noteId ?? '';
      setLoopStart({ tick, noteId: id });
      if (!isPlaying) context.scorePlayer.setPinnedStart(tick);
    } else if (loopStart.noteId === noteId) {
      // Same note again: unpin
      setLoopStart(null);
      setLoopEndPin(null);
      context.scorePlayer.setPinnedStart(null);
    } else if (loopStart.tick === tick) {
      // Degenerate region (same tick as start): unpin
      setLoopStart(null);
      setLoopEndPin(null);
      context.scorePlayer.setPinnedStart(null);
    } else {
      // Second long-press on a different note: create loop end
      const id = noteId ?? '';
      setLoopEndPin({ tick, noteId: id });
      if (!isPlaying) context.scorePlayer.setLoopEnd(tick);
    }
  }, [context.scorePlayer, loopStart, loopRegion, playerState.status]);

  // US2 (wired in T016): canvas tap toggles play/pause
  const handleCanvasTap = useCallback(() => {
    if (playerState.status === 'playing') {
      context.scorePlayer.pause();
    } else {
      context.scorePlayer.play();
    }
  }, [context.scorePlayer, playerState.status]);

  // US5 (wired in T023): return to start — seeks to pin if set, else tick 0
  const handleReturnToStart = useCallback(() => {
    context.scorePlayer.seekToTick(loopStart?.tick ?? 0);
  }, [context.scorePlayer, loopStart]);

  // ─── Selection screen ──────────────────────────────────────────────────────
  if (screen === 'selection') {
    return (
      <div className="play-score-plugin play-score-plugin--selection">
        <ScoreSelectionScreen
          catalogue={context.scorePlayer.getCatalogue()}
          onSelectScore={handleSelectScore}
          onLoadFile={handleLoadFile}
        />
      </div>
    );
  }

  // ─── Player view ──────────────────────────────────────────────────────────
  const { status, title, error, currentTick, totalDurationTicks, bpm, highlightedNoteIds } = playerState;
  const ScoreRenderer = context.components.ScoreRenderer;

  return (
    <div className="play-score-plugin play-score-plugin--player">
      {/* Toolbar with Back button (hidden before score loaded — Back always shown in player per spec) */}
      <PlaybackToolbar
        showBack={true}
        scoreTitle={title}
        status={status}
        currentTick={currentTick}
        totalDurationTicks={totalDurationTicks}
        bpm={bpm}
        tempoMultiplier={tempoMultiplier}
        onBack={handleBack}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onTempoChange={handleTempoChange}
      />

      {/* Loading indicator */}
      {status === 'loading' && (
        <div className="play-score__loading" role="status" aria-label="Loading score">
          <span className="play-score__loading-spinner">🎼</span>
          <p>Loading…</p>
        </div>
      )}

      {/* Error banner */}
      {status === 'error' && error && (
        <div className="play-score__error-banner" role="alert">
          <p>{error}</p>
        </div>
      )}

      {/* Score renderer — only rendered when score is ready */}
      {(status === 'ready' || status === 'playing' || status === 'paused') && (
        <div className="play-score__score-area">
          <ScoreRenderer
            currentTick={currentTick}
            highlightedNoteIds={highlightedNoteIds}
            loopRegion={loopRegion}
            pinnedNoteIds={pinnedNoteIds}
            onNoteShortTap={handleNoteShortTap}
            onNoteLongPress={handleNoteLongPress}
            onCanvasTap={handleCanvasTap}
            onReturnToStart={handleReturnToStart}
          />
        </div>
      )}
    </div>
  );
}
