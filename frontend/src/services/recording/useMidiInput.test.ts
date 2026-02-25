/**
 * Unit tests for useMidiInput hook.
 *
 * T006 (Phase 3, US1, parallel) — core hook behavior
 * T007 (Phase 3, US1, parallel) — 3-second timeout test
 * T024 (Phase 6, US4, parallel) — note event path
 * T028 (Phase 7, US5, parallel) — disconnect debounce behavior
 *
 * TDD: Written BEFORE implementation — must FAIL until useMidiInput.ts is created.
 * Run: npx vitest run src/services/recording/useMidiInput.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  mockMidiSupported,
  mockMidiUnsupported,
  createMockMidiAccess,
  createMockMidiInput,
  fireMidiNoteOn,
  fireMidiStateChange,
} from '../../test/mockMidi';
import { useMidiInput } from './useMidiInput';
import type { MidiNoteEvent, MidiConnectionEvent } from '../../types/recording';

// ─── Shared setup ─────────────────────────────────────────────────────────────

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ─── T006: Core hook behavior ─────────────────────────────────────────────────

describe('T006 — useMidiInput: core', () => {
  it('calls navigator.requestMIDIAccess({ sysex: false }) on mount', async () => {
    const access = createMockMidiAccess();
    const stub = mockMidiSupported(access);

    renderHook(() =>
      useMidiInput({ onNoteOn: vi.fn(), onConnectionChange: vi.fn() })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(stub).toHaveBeenCalledOnce();
    expect(stub).toHaveBeenCalledWith({ sysex: false });
  });

  it('returns devices populated from MIDIAccess.inputs on mount', async () => {
    const input = createMockMidiInput('Piano');
    const access = createMockMidiAccess([input]);
    mockMidiSupported(access);

    const { result } = renderHook(() =>
      useMidiInput({ onNoteOn: vi.fn(), onConnectionChange: vi.fn() })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.devices).toHaveLength(1);
    expect(result.current.devices[0].name).toBe('Piano');
    expect(result.current.devices[0].id).toBe(input.id);
    expect(result.current.error).toBeNull();
  });

  it('sets isSupported to false when requestMIDIAccess is absent from navigator', async () => {
    mockMidiUnsupported();

    const { result } = renderHook(() =>
      useMidiInput({ onNoteOn: vi.fn(), onConnectionChange: vi.fn() })
    );

    // isSupported is set synchronously — no async needed
    expect(result.current.isSupported).toBe(false);
    expect(result.current.devices).toHaveLength(0);
  });

  it('sets error "MIDI access denied" when requestMIDIAccess rejects with DOMException', async () => {
    const stub = vi
      .fn()
      .mockRejectedValue(new DOMException('Permission denied', 'SecurityError'));
    Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
      value: stub,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() =>
      useMidiInput({ onNoteOn: vi.fn(), onConnectionChange: vi.fn() })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBe('MIDI access denied');
    expect(result.current.devices).toHaveLength(0);
  });

  it('cleans up onmidimessage and onstatechange handlers on unmount', async () => {
    const input = createMockMidiInput('Piano');
    const access = createMockMidiAccess([input]);
    mockMidiSupported(access);

    const { unmount } = renderHook(() =>
      useMidiInput({ onNoteOn: vi.fn(), onConnectionChange: vi.fn() })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    unmount();

    // After unmount, all handlers should be cleared
    expect(input.onmidimessage).toBeNull();
    expect(access.onstatechange).toBeNull();
  });

  it('returns isSupported=true when requestMIDIAccess is available', async () => {
    const access = createMockMidiAccess();
    mockMidiSupported(access);

    const { result } = renderHook(() =>
      useMidiInput({ onNoteOn: vi.fn(), onConnectionChange: vi.fn() })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isSupported).toBe(true);
  });
});

// ─── T007: Timeout behavior ───────────────────────────────────────────────────

describe('T007 — useMidiInput: 3-second enumeration timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('sets error "MIDI access timed out" and returns empty devices if Promise never resolves within 3 s', async () => {
    // Promise that never resolves
    const hangingStub = vi.fn().mockReturnValue(new Promise(() => {}));
    Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
      value: hangingStub,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() =>
      useMidiInput({ onNoteOn: vi.fn(), onConnectionChange: vi.fn() })
    );

    // Advance time past 3 seconds to trigger timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3001);
    });

    expect(result.current.error).toBe('MIDI access timed out');
    expect(result.current.devices).toHaveLength(0);
  });
});

// ─── T024: Note event path ────────────────────────────────────────────────────

describe('T024 — useMidiInput: note event path', () => {
  it('fires onNoteOn with label "A4" when note-on 69 is received', async () => {
    const input = createMockMidiInput('Piano');
    const access = createMockMidiAccess([input]);
    mockMidiSupported(access);

    const onNoteOn = vi.fn<[MidiNoteEvent], void>();

    renderHook(() =>
      useMidiInput({ onNoteOn, onConnectionChange: vi.fn(), sessionStartMs: 0 })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      fireMidiNoteOn(input, 69, 100, 1, 500);
    });

    expect(onNoteOn).toHaveBeenCalledOnce();
    expect(onNoteOn.mock.calls[0][0].label).toBe('A4');
    expect(onNoteOn.mock.calls[0][0].noteNumber).toBe(69);
  });

  it('does NOT fire onNoteOn for velocity-0 note-on (note-off in disguise)', async () => {
    const input = createMockMidiInput('Piano');
    const access = createMockMidiAccess([input]);
    mockMidiSupported(access);

    const onNoteOn = vi.fn();

    renderHook(() =>
      useMidiInput({ onNoteOn, onConnectionChange: vi.fn(), sessionStartMs: 0 })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      fireMidiNoteOn(input, 60, 0); // velocity = 0
    });

    expect(onNoteOn).not.toHaveBeenCalled();
  });

  it('fires onNoteOn for note-on on channel 5', async () => {
    const input = createMockMidiInput('Piano');
    const access = createMockMidiAccess([input]);
    mockMidiSupported(access);

    const onNoteOn = vi.fn<[MidiNoteEvent], void>();

    renderHook(() =>
      useMidiInput({ onNoteOn, onConnectionChange: vi.fn(), sessionStartMs: 0 })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      fireMidiNoteOn(input, 60, 80, 5);
    });

    expect(onNoteOn).toHaveBeenCalledOnce();
    expect(onNoteOn.mock.calls[0][0].channel).toBe(5);
  });

  it('does NOT fire onNoteOn for 0xB0 Control Change message', async () => {
    const input = createMockMidiInput('Piano');
    const access = createMockMidiAccess([input]);
    mockMidiSupported(access);

    const onNoteOn = vi.fn();

    renderHook(() =>
      useMidiInput({ onNoteOn, onConnectionChange: vi.fn(), sessionStartMs: 0 })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      // Directly fire a CC message (0xB0)
      if (input.onmidimessage) {
        input.onmidimessage({
          data: new Uint8Array([0xb0, 7, 127]),
          timeStamp: 500,
        } as unknown as MIDIMessageEvent);
      }
    });

    expect(onNoteOn).not.toHaveBeenCalled();
  });

  it('timestampMs in onNoteOn is session-relative', async () => {
    const SESSION_START = 1000;
    const EVENT_TIME = 1750;
    const input = createMockMidiInput('Piano');
    const access = createMockMidiAccess([input]);
    mockMidiSupported(access);

    const onNoteOn = vi.fn<[MidiNoteEvent], void>();

    renderHook(() =>
      useMidiInput({ onNoteOn, onConnectionChange: vi.fn(), sessionStartMs: SESSION_START })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      fireMidiNoteOn(input, 60, 100, 1, EVENT_TIME);
    });

    expect(onNoteOn.mock.calls[0][0].timestampMs).toBe(750); // 1750 - 1000
  });
});

// ─── T028: Disconnect debounce ────────────────────────────────────────────────

describe('T028 — useMidiInput: disconnect fires onConnectionChange immediately', () => {
  it('fires onConnectionChange immediately (not debounced) on device disconnect', async () => {
    const input = createMockMidiInput('Piano');
    const access = createMockMidiAccess([input]);
    mockMidiSupported(access);

    const onConnectionChange = vi.fn<[MidiConnectionEvent], void>();

    renderHook(() =>
      useMidiInput({ onNoteOn: vi.fn(), onConnectionChange })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      fireMidiStateChange(access, input, 'disconnected');
    });

    // Should be called immediately — no debounce for disconnect
    expect(onConnectionChange).toHaveBeenCalledOnce();
    expect(onConnectionChange.mock.calls[0][0].kind).toBe('disconnected');
    expect(onConnectionChange.mock.calls[0][0].device.id).toBe(input.id);
  });

  it('fires onConnectionChange with 300 ms debounce on device connect', async () => {
    vi.useFakeTimers();
    const input = createMockMidiInput('Piano');
    const access = createMockMidiAccess([]); // start with no devices
    mockMidiSupported(access);

    const onConnectionChange = vi.fn<[MidiConnectionEvent], void>();

    renderHook(() =>
      useMidiInput({ onNoteOn: vi.fn(), onConnectionChange })
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      fireMidiStateChange(access, input, 'connected');
    });

    // Not yet called — debounce pending
    expect(onConnectionChange).not.toHaveBeenCalled();

    // Advance past debounce threshold
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(onConnectionChange).toHaveBeenCalledOnce();
    expect(onConnectionChange.mock.calls[0][0].kind).toBe('connected');
  });
});
