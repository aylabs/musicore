/**
 * Feature 026: Playback UI Fixes — User Story 3
 * Tests: Return to Start button in PlaybackControls
 *
 * Constitution Principle V: Test-First Development
 * These tests FAIL before Fix T007 is applied to PlaybackControls.tsx.
 *
 * Root cause: PlaybackControls has no Return-to-Start button or
 * onReturnToStart prop. After playback, the musician has no way to
 * scroll back to measure 1 with a single action.
 *
 * Fix (T007): Add `onReturnToStart?: () => void` to PlaybackControlsProps
 * and render a ⏮ button when the prop is provided.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybackControls } from '../../src/components/playback/PlaybackControls';
import type { PlaybackStatus } from '../../src/types/playback';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock TempoControl (uses useTempoState context — avoid context setup)
vi.mock('../../src/components/playback/TempoControl', () => ({
  default: () => <div data-testid="tempo-control" />,
}));

// Mock PlaybackTimer (simple; avoid any potential context issues)
vi.mock('../../src/components/playback/PlaybackTimer', () => ({
  PlaybackTimer: () => <div data-testid="playback-timer" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderControls(
  status: PlaybackStatus = 'stopped',
  onReturnToStart?: () => void,
) {
  return render(
    <PlaybackControls
      status={status}
      hasNotes={true}
      onPlay={vi.fn()}
      onPause={vi.fn()}
      onStop={vi.fn()}
      onReturnToStart={onReturnToStart}
      currentTick={0}
      totalDurationTicks={1000}
      tempo={120}
    />
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PlaybackControls — Return to Start (Feature 026 US3)', () => {

  // ── T006-A: Button renders when onReturnToStart prop is provided ─────────────
  it('T006-A: ⏮ button renders when onReturnToStart prop is provided', () => {
    renderControls('stopped', vi.fn());
    const btn = screen.getByRole('button', { name: 'Return to Start' });
    expect(btn).toBeDefined();
  });

  // ── T006-B: Button does NOT render when onReturnToStart is omitted ───────────
  it('T006-B: ⏮ button does NOT render when onReturnToStart is omitted', () => {
    renderControls('stopped'); // no onReturnToStart
    const btn = screen.queryByRole('button', { name: 'Return to Start' });
    expect(btn).toBeNull();
  });

  // ── T006-C: Button is enabled when status='stopped' ──────────────────────────
  it('T006-C: ⏮ button is enabled when status is "stopped"', () => {
    renderControls('stopped', vi.fn());
    const btn = screen.getByRole('button', { name: 'Return to Start' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  // ── T006-D: Button is enabled when status='paused' ───────────────────────────
  it('T006-D: ⏮ button is enabled when status is "paused"', () => {
    renderControls('paused', vi.fn());
    const btn = screen.getByRole('button', { name: 'Return to Start' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  // ── T006-E: Button is DISABLED when status='playing' ─────────────────────────
  it('T006-E: ⏮ button is disabled when status is "playing"', () => {
    renderControls('playing', vi.fn());
    const btn = screen.getByRole('button', { name: 'Return to Start' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  // ── T006-F: Clicking button calls onReturnToStart callback ───────────────────
  it('T006-F: clicking ⏮ button calls the onReturnToStart callback', () => {
    const mockCallback = vi.fn();
    renderControls('stopped', mockCallback);
    const btn = screen.getByRole('button', { name: 'Return to Start' });
    fireEvent.click(btn);
    expect(mockCallback).toHaveBeenCalledOnce();
  });

  // ── T006-G: Button has accessible aria-label ──────────────────────────────────
  it('T006-G: ⏮ button has aria-label="Return to Start"', () => {
    renderControls('stopped', vi.fn());
    const btn = screen.getByLabelText('Return to Start');
    expect(btn).toBeDefined();
  });
});
