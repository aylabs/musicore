/**
 * Tests for useAudioRecorder hook
 * T013 — getUserMedia called, error states
 * T014 — stop() cleanup
 * T025 — onset detection / note history (added in Phase 7)
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeAudioContextMock, stubGetUserMedia } from '../../test/setup';

// Mock pitchDetection so we control what detectPitch returns (T025)
vi.mock('./pitchDetection', () => ({
  detectPitch: vi.fn(() => null),
}));

// Import under test — will fail until T016 creates the file
import { useAudioRecorder } from './useAudioRecorder';
import { detectPitch } from './pitchDetection';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockStream(trackOverrides: Partial<MediaStreamTrack> = {}) {
  const track = {
    stop: vi.fn(),
    onended: null as ((ev: Event) => void) | null,
    ...trackOverrides,
  } as unknown as MediaStreamTrack;
  return {
    getTracks: vi.fn(() => [track]),
    getAudioTracks: vi.fn(() => [track]),
    _track: track,
  } as unknown as MediaStream & { _track: MediaStreamTrack };
}

// ─── T013: getUserMedia / error states ────────────────────────────────────────

describe('useAudioRecorder — start behaviour (T013)', () => {
  beforeEach(() => {
    // Fresh AudioContext mock per test
    const ctx = makeAudioContextMock();
    const capturedCtx = ctx;
    vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() { return capturedCtx; }));
    const AudioWorkletNodeMock = vi.fn(function AudioWorkletNodeMockFn() { return ctx.__workletNode; });
    vi.stubGlobal('AudioWorkletNode', AudioWorkletNodeMock);
  });

  it('calls getUserMedia with noise-suppression constraints when start() is invoked', async () => {
    const stream = makeMockStream();
    const getUserMediaSpy = stubGetUserMedia(stream);

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });

    expect(getUserMediaSpy).toHaveBeenCalledWith({
      audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: false },
    });
  });

  it('sets error "Microphone access required" when permission denied', async () => {
    const denied = new DOMException('Permission denied', 'NotAllowedError');
    stubGetUserMedia(null, denied);

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.session.state).toBe('error');
    expect(result.current.session.errorMessage).toMatch(/microphone access required/i);
  });

  it('sets error "No microphone detected" when device not found', async () => {
    const notFound = new DOMException('Requested device not found', 'NotFoundError');
    stubGetUserMedia(null, notFound);

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.session.state).toBe('error');
    expect(result.current.session.errorMessage).toMatch(/no microphone detected/i);
  });

  it('sets error "AudioWorklet not supported" when AudioWorkletNode is absent', async () => {
    // Remove AudioWorkletNode from global
    vi.stubGlobal('AudioWorkletNode', undefined);
    const stream = makeMockStream();
    stubGetUserMedia(stream);

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.session.state).toBe('error');
    expect(result.current.session.errorMessage).toMatch(/audioworklet not supported/i);
  });
});

// ─── T014: stop() cleanup ─────────────────────────────────────────────────────

describe('useAudioRecorder — stop/cleanup behaviour (T014)', () => {
  it('disconnects AudioWorkletNode, closes AudioContext, and calls track.stop()', async () => {
    const ctx = makeAudioContextMock();
    const capturedCtx = ctx;
    vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() { return capturedCtx; }));
    const workletNode = ctx.__workletNode as { disconnect: ReturnType<typeof vi.fn> };
    vi.stubGlobal('AudioWorkletNode', vi.fn(function AudioWorkletNodeMock() { return workletNode; }));

    const stream = makeMockStream();
    const track = stream._track as { stop: ReturnType<typeof vi.fn> };
    stubGetUserMedia(stream);

    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      result.current.stop();
    });

    expect(workletNode.disconnect).toHaveBeenCalled();
    expect(ctx.close).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.session.state).toBe('idle');
  });
});

// ─── T025: onset detection / note history ─────────────────────────────────────

describe('useAudioRecorder — onset detection / note history (T025)', () => {
  let ctx: ReturnType<typeof makeAudioContextMock>;

  beforeEach(() => {
    ctx = makeAudioContextMock();
    const capturedCtx = ctx;
    vi.stubGlobal('AudioContext', vi.fn(function AudioContextMock() { return capturedCtx; }));
    vi.stubGlobal('AudioWorkletNode', vi.fn(function AudioWorkletNodeMock() { return ctx.__workletNode; }));
    const stream = makeMockStream();
    stubGetUserMedia(stream);
    // Reset detectPitch mock
    vi.mocked(detectPitch).mockReturnValue(null);
  });

  /**
   * Helper: start recording and fire PITCH_STABLE_FRAMES (3) PCM messages with
   * the same pitch so the temporal stabiliser confirms the note.
   */
  async function startAndFirePitch(
    hooks: ReturnType<typeof renderHook<ReturnType<typeof useAudioRecorder>, unknown>>,
    pitchReturn: ReturnType<typeof detectPitch>,
    delayMs = 0,
  ) {
    await act(async () => { await hooks.result.current.start(); });
    vi.mocked(detectPitch).mockReturnValue(pitchReturn);
    const port = ctx._workletNodePort;
    // Fire 3 frames (PITCH_STABLE_FRAMES) so the stabiliser confirms the pitch
    await act(async () => {
      if (delayMs > 0) vi.advanceTimersByTime(delayMs);
      port.onmessage?.({ data: { type: 'pcm', buffer: new Float32Array(2048) } } as MessageEvent);
      port.onmessage?.({ data: { type: 'pcm', buffer: new Float32Array(2048) } } as MessageEvent);
      port.onmessage?.({ data: { type: 'pcm', buffer: new Float32Array(2048) } } as MessageEvent);
    });
  }

  /** Helper: fire N stable frames for a given pitch on an already-started recorder */
  async function fireStableFrames(
    pitchReturn: ReturnType<typeof detectPitch>,
    frames = 3,
  ) {
    vi.mocked(detectPitch).mockReturnValue(pitchReturn);
    const port = ctx._workletNodePort;
    await act(async () => {
      for (let i = 0; i < frames; i++) {
        port.onmessage?.({ data: { type: 'pcm', buffer: new Float32Array(2048) } } as MessageEvent);
      }
    });
  }

  it('appends a new entry when a new pitch is detected', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    const pitch = { hz: 440, confidence: 0.95, note: 'A', octave: 4, label: 'A4' };
    await startAndFirePitch({ result } as Parameters<typeof startAndFirePitch>[0], pitch);
    expect(result.current.noteHistory).toHaveLength(1);
    expect(result.current.noteHistory[0].label).toBe('A4');
  });

  it('does NOT add a duplicate when the same pitch is sustained', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    const pitch = { hz: 440, confidence: 0.95, note: 'A', octave: 4, label: 'A4' };
    await startAndFirePitch({ result } as Parameters<typeof startAndFirePitch>[0], pitch);
    // Fire a second frame with the same pitch immediately (< 300 ms)
    vi.mocked(detectPitch).mockReturnValue(pitch);
    await act(async () => {
      ctx._workletNodePort.onmessage?.({ data: { type: 'pcm', buffer: new Float32Array(2048) } } as MessageEvent);
    });
    expect(result.current.noteHistory).toHaveLength(1);
  });

  it('appends a new entry when note changes', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    const pitchA4 = { hz: 440, confidence: 0.95, note: 'A', octave: 4, label: 'A4' };
    const pitchB4 = { hz: 493.88, confidence: 0.95, note: 'B', octave: 4, label: 'B4' };
    await startAndFirePitch({ result } as Parameters<typeof startAndFirePitch>[0], pitchA4);
    // Fire 3 stable B4 frames so the stabiliser confirms the new pitch
    await fireStableFrames(pitchB4);
    expect(result.current.noteHistory).toHaveLength(2);
    expect(result.current.noteHistory[1].label).toBe('B4');
  });

  it('caps note history at 200 entries (drops oldest)', async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => { await result.current.start(); });
    // Fire 201 frames, each with a distinct pitch (by alternating two labels)
    for (let i = 0; i < 201; i++) {
      const label = `${i % 2 === 0 ? 'A' : 'B'}4`;
      vi.mocked(detectPitch).mockReturnValue({ hz: 440, confidence: 0.95, note: label[0], octave: 4, label });
      await act(async () => {
        ctx._workletNodePort.onmessage?.({ data: { type: 'pcm', buffer: new Float32Array(2048) } } as MessageEvent);
      });
    }
    expect(result.current.noteHistory.length).toBeLessThanOrEqual(200);
  });
});
