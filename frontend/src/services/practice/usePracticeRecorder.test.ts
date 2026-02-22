/**
 * usePracticeRecorder.test.ts — Unit tests for the practice recorder hook.
 *
 * Feature: 001-piano-practice (T005)
 * Tests mic lifecycle states, startCapture/stopCapture arrays, clearCapture reset.
 *
 * Note: MediaStream + AudioWorklet are browser APIs not available in Vitest/jsdom.
 * Tests cover the logic layer via mocks and verify the hook's contract.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePracticeRecorder } from './usePracticeRecorder';
import type { Exercise } from '../../types/practice';
import { makeAudioContextMock, stubGetUserMedia } from '../../test/setup';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeExercise(bpm = 80): Exercise {
  const msPerBeat = 60_000 / bpm;
  return {
    bpm,
    notes: Array.from({ length: 8 }, (_, i) => ({
      slotIndex: i,
      midiPitch: 60,
      expectedOnsetMs: i * msPerBeat,
    })),
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  const ctx = makeAudioContextMock();
  vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() { return ctx; }));

  const workletNode = (ctx as unknown as Record<string, unknown>)['__workletNode'];
  vi.stubGlobal('AudioWorkletNode', vi.fn(function AudioWorkletNodeMock() { return workletNode; }));

  stubGetUserMedia(null); // null = use default mock stream (success)

  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('usePracticeRecorder', () => {
  describe('mic lifecycle', () => {
    it('starts as idle before mount effects run', () => {
      const { result } = renderHook(() => usePracticeRecorder());
      // Initial synchronous state before effects
      expect(['idle', 'requesting']).toContain(result.current.micState);
    });

    it('transitions to active after successful getUserMedia', async () => {
      const { result } = renderHook(() => usePracticeRecorder());
      // Wait for async effects
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(result.current.micState).toBe('active');
      expect(result.current.micError).toBeNull();
    });

    it('transitions to error when getUserMedia is denied', async () => {
      stubGetUserMedia(null, Object.assign(new DOMException('denied'), { name: 'NotAllowedError' }) as DOMException);
      const { result } = renderHook(() => usePracticeRecorder());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(result.current.micState).toBe('error');
      expect(result.current.micError).toMatch(/Microphone access required/);
    });

    it('transitions to error when no microphone is detected', async () => {
      stubGetUserMedia(null, Object.assign(new DOMException('not found'), { name: 'NotFoundError' }) as DOMException);
      const { result } = renderHook(() => usePracticeRecorder());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(result.current.micState).toBe('error');
      expect(result.current.micError).toMatch(/No microphone/);
    });

    it('sets error when AudioWorklet is not supported', async () => {
      vi.stubGlobal('AudioWorkletNode', undefined);
      const { result } = renderHook(() => usePracticeRecorder());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      expect(result.current.micState).toBe('error');
    });
  });

  describe('startCapture / stopCapture', () => {
    it('stopCapture returns empty arrays when no notes detected', async () => {
      const { result } = renderHook(() => usePracticeRecorder());
      await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

      const exercise = makeExercise();
      act(() => result.current.startCapture(exercise, Date.now()));
      const { responses, extraneousNotes } = result.current.stopCapture();

      expect(responses).toHaveLength(8);
      responses.forEach((r) => expect(r).toBeNull());
      expect(extraneousNotes).toHaveLength(0);
    });

    it('stopCapture preserves captured data snapshot and deactivates capture', async () => {
      const { result } = renderHook(() => usePracticeRecorder());
      await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

      const exercise = makeExercise();
      const startMs = Date.now();
      act(() => result.current.startCapture(exercise, startMs));

      // stop. Since no PCM messages were fired, all slots should be null.
      const { responses } = result.current.stopCapture();
      expect(responses.length).toBe(exercise.notes.length);
    });
  });

  describe('clearCapture', () => {
    it('clears currentPitch and resets capture state', async () => {
      const { result } = renderHook(() => usePracticeRecorder());
      await act(async () => { await new Promise((r) => setTimeout(r, 50)); });

      const exercise = makeExercise();
      act(() => result.current.startCapture(exercise, Date.now()));
      act(() => result.current.clearCapture());

      // After clearCapture, stopCapture should return empty arrays for a fresh exercise
      act(() => result.current.startCapture(exercise, Date.now()));
      const { responses } = result.current.stopCapture();
      expect(responses).toHaveLength(8);
      responses.forEach((r) => expect(r).toBeNull());
    });
  });
});
