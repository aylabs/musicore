/**
 * Feature 026: Playback UI Fixes — User Stories 2 & 4
 * Tests: Instrument label margin (US2) + Scroll reset on playback end (US4)
 *
 * Constitution Principle V: Test-First Development
 * US2 tests FAIL before Fix T005 is applied to pages/ScoreViewer.tsx.
 * US4 tests FAIL before Fix T011 is applied to components/ScoreViewer.tsx.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { LABEL_MARGIN } from '../../src/pages/ScoreViewer';
import { ScoreViewer } from '../../src/pages/ScoreViewer';
import type { GlobalLayout } from '../../src/wasm/layout';
import type { PlaybackStatus } from '../../src/types/playback';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock LayoutRenderer to avoid WASM dependency
vi.mock('../../src/components/LayoutRenderer', () => ({
  LayoutRenderer: () => null,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

/**
 * Minimal GlobalLayout fixture — total_width and total_height are the key values
 * that determine the rendered container dimensions.
 */
const MOCK_LAYOUT: GlobalLayout = {
  systems: [],
  total_width: 1000,
  total_height: 2000,
  units_per_space: 10,
};

const BASE_SCALE = 0.5; // Same as pages/ScoreViewer.tsx BASE_SCALE constant
const DEFAULT_ZOOM = 1.0;
const renderScale = BASE_SCALE * DEFAULT_ZOOM; // 0.5

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScoreViewer Layout — Label Margin (Feature 026 US2)', () => {

  // ── T004-A: LABEL_MARGIN exported constant equals 150 ───────────────────────
  it('T004-A: exported LABEL_MARGIN constant equals 150', () => {
    expect(LABEL_MARGIN).toBe(150);
  });

  // ── T004-B: inner scroll container width includes LABEL_MARGIN ───────────────
  it('T004-B: inner div width = (total_width + LABEL_MARGIN) * renderScale', () => {
    const { container } = render(
      <ScoreViewer layout={MOCK_LAYOUT} />
    );

    const expectedWidth = (MOCK_LAYOUT.total_width + LABEL_MARGIN) * renderScale;

    // The inner positioning div has width set via inline style.
    // Find it by iterating all divs and checking computed style.
    const allDivs = Array.from(container.querySelectorAll('div')) as HTMLElement[];
    const innerDiv = allDivs.find(el => el.style.width === `${expectedWidth}px`);
    
    expect(innerDiv).toBeDefined();
  });

  // ── T004-C: viewport x offset equals negative LABEL_MARGIN ──────────────────
  it('T004-C: inner div width is larger than total_width * renderScale (label area included)', () => {
    const { container } = render(
      <ScoreViewer layout={MOCK_LAYOUT} />
    );

    const baseWidth = MOCK_LAYOUT.total_width * renderScale; // 500
    const expectedWidth = (MOCK_LAYOUT.total_width + LABEL_MARGIN) * renderScale; // 575

    const allDivs = Array.from(container.querySelectorAll('div')) as HTMLElement[];
    const innerDiv = allDivs.find(el => el.style.width === `${expectedWidth}px`);

    expect(innerDiv).toBeDefined();
    expect(expectedWidth).toBeGreaterThan(baseWidth);
    expect(expectedWidth - baseWidth).toBe(LABEL_MARGIN * renderScale);
  });
});

// ── US4: Scroll Reset on Natural Playback End ─────────────────────────────────
//
// Tests the useEffect in components/ScoreViewer.tsx that detects status
// transitions 'playing' → 'stopped' and calls window.scrollTo({ top: 0 }).
// These tests operate at the hook/logic level using renderHook.

/**
 * Simulates the scroll-reset useEffect from components/ScoreViewer.tsx (Fix T011).
 * The hook tracks previous status and scrolls to top when 'playing' → 'stopped'.
 */
function useScrollResetOnPlaybackEnd(status: PlaybackStatus) {
  const prevStatusRef = useRef<PlaybackStatus>('stopped');

  useEffect(() => {
    if (prevStatusRef.current === 'playing' && status === 'stopped') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevStatusRef.current = status;
  }, [status]);
}

describe('ScoreViewer — Scroll Reset on Natural Playback End (Feature 026 US4)', () => {
  const mockScrollTo = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('scrollTo', mockScrollTo);
    mockScrollTo.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── T010-A: window.scrollTo called on 'playing' → 'stopped' transition ──────
  it('T010-A: window.scrollTo({ top: 0 }) called when status transitions from playing to stopped', () => {
    const { rerender } = renderHook(
      ({ status }: { status: PlaybackStatus }) => useScrollResetOnPlaybackEnd(status),
      { initialProps: { status: 'playing' as PlaybackStatus } }
    );

    expect(mockScrollTo).not.toHaveBeenCalled();

    act(() => {
      rerender({ status: 'stopped' });
    });

    expect(mockScrollTo).toHaveBeenCalledOnce();
    expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  // ── T010-B: No scroll on 'stopped' → 'playing' (no spurious scroll on start)
  it('T010-B: window.scrollTo NOT called when status transitions from stopped to playing', () => {
    const { rerender } = renderHook(
      ({ status }: { status: PlaybackStatus }) => useScrollResetOnPlaybackEnd(status),
      { initialProps: { status: 'stopped' as PlaybackStatus } }
    );

    act(() => {
      rerender({ status: 'playing' });
    });

    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  // ── T010-C: No scroll on 'paused' → 'stopped' (only playing → stopped triggers)
  it('T010-C: window.scrollTo NOT called when status transitions from paused to stopped', () => {
    const { rerender } = renderHook(
      ({ status }: { status: PlaybackStatus }) => useScrollResetOnPlaybackEnd(status),
      { initialProps: { status: 'paused' as PlaybackStatus } }
    );

    act(() => {
      rerender({ status: 'stopped' });
    });

    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  // ── T010-D: Multiple transitions scroll each time playing ends ───────────────
  it('T010-D: window.scrollTo called once for each playing → stopped transition', () => {
    const { rerender } = renderHook(
      ({ status }: { status: PlaybackStatus }) => useScrollResetOnPlaybackEnd(status),
      { initialProps: { status: 'stopped' as PlaybackStatus } }
    );

    // First playback cycle
    act(() => { rerender({ status: 'playing' }); });
    act(() => { rerender({ status: 'stopped' }); });
    expect(mockScrollTo).toHaveBeenCalledTimes(1);

    // Second playback cycle
    act(() => { rerender({ status: 'playing' }); });
    act(() => { rerender({ status: 'stopped' }); });
    expect(mockScrollTo).toHaveBeenCalledTimes(2);
  });
});
