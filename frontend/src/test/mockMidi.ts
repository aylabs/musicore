/**
 * Web MIDI API stubs for Vitest / happy-dom.
 *
 * T004 (Phase 2 — Foundational).
 *
 * happy-dom does not implement Web MIDI API at all, so these utilities
 * full-stub the relevant browser objects needed for testing useMidiInput
 * and components that rely on MIDI input.
 *
 * Usage in test files:
 *   import { mockMidiSupported, createMockMidiAccess, createMockMidiInput, fireMidiNoteOn } from '../test/mockMidi';
 */

import { vi } from 'vitest';

// ─── Mock types ───────────────────────────────────────────────────────────────

/** Minimal MIDIInput stub */
export interface MockMidiInput {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
  connection: 'open' | 'closed' | 'pending';
  type: 'input';
  onmidimessage: ((ev: Partial<MIDIMessageEvent>) => void) | null;
  onstatechange: ((ev: Partial<MIDIConnectionEvent>) => void) | null;
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

/** Minimal MIDIAccess stub */
export interface MockMidiAccess {
  inputs: Map<string, MockMidiInput>;
  outputs: Map<string, never>;
  sysexEnabled: boolean;
  onstatechange: ((ev: Partial<MIDIConnectionEvent>) => void) | null;
}

// ─── Factory helpers ──────────────────────────────────────────────────────────

let _inputIdCounter = 0;

/**
 * Creates a mock MIDIInput device.
 *
 * @param name - Human-readable device name (e.g. "Piano")
 * @param id   - Optional port ID; auto-generated if omitted
 */
export function createMockMidiInput(name: string, id?: string): MockMidiInput {
  return {
    id: id ?? `mock-midi-input-${++_inputIdCounter}`,
    name,
    manufacturer: '',
    state: 'connected',
    connection: 'open',
    type: 'input',
    onmidimessage: null,
    onstatechange: null,
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock MIDIAccess object.
 * The `inputs` Map is live — mutate it to simulate hot-connect/disconnect.
 *
 * @param inputs - Pre-populated inputs; defaults to empty map (no devices)
 */
export function createMockMidiAccess(inputs?: MockMidiInput[]): MockMidiAccess {
  const inputMap = new Map<string, MockMidiInput>();
  for (const input of inputs ?? []) {
    inputMap.set(input.id, input);
  }
  return {
    inputs: inputMap,
    outputs: new Map<string, never>(),
    sysexEnabled: false,
    onstatechange: null,
  };
}

// ─── navigator stubs ──────────────────────────────────────────────────────────

/**
 * Stubs `navigator.requestMIDIAccess` to resolve with the provided access object.
 *
 * @param access - MockMidiAccess to return from the resolved Promise
 */
export function mockMidiSupported(access: MockMidiAccess): ReturnType<typeof vi.fn> {
  const stub = vi.fn().mockResolvedValue(access);
  Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
    value: stub,
    writable: true,
    configurable: true,
  });
  return stub;
}

/**
 * Stubs `navigator.requestMIDIAccess` to be `undefined`, simulating a browser
 * without Web MIDI support (e.g. iOS Safari, Firefox for Android).
 */
export function mockMidiUnsupported(): void {
  Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

// ─── Event simulators ─────────────────────────────────────────────────────────

/**
 * Simulates a MIDI note-on event directly on a mock input.
 * Calls `input.onmidimessage` synchronously.
 *
 * @param input      - Target MockMidiInput
 * @param noteNumber - MIDI note number 0–127
 * @param velocity   - Note velocity 1–127 (defaults to 100); use 0 for note-off-in-disguise
 * @param channel    - MIDI channel 1–16 (defaults to 1)
 * @param timeStamp  - Event timestamp in ms (defaults to 0)
 */
export function fireMidiNoteOn(
  input: MockMidiInput,
  noteNumber: number,
  velocity = 100,
  channel = 1,
  timeStamp = 0
): void {
  if (!input.onmidimessage) return;
  const statusByte = 0x90 | ((channel - 1) & 0x0f); // 0x90 = note-on, channel nibble
  const data = new Uint8Array([statusByte, noteNumber, velocity]);
  input.onmidimessage({ data, timeStamp } as unknown as MIDIMessageEvent);
}

/**
 * Simulates a MIDI note-off event (status 0x80) on a mock input.
 *
 * @param input      - Target MockMidiInput
 * @param noteNumber - MIDI note number 0–127
 * @param channel    - MIDI channel 1–16 (defaults to 1)
 */
export function fireMidiNoteOff(
  input: MockMidiInput,
  noteNumber: number,
  channel = 1,
  timeStamp = 0
): void {
  if (!input.onmidimessage) return;
  const statusByte = 0x80 | ((channel - 1) & 0x0f);
  const data = new Uint8Array([statusByte, noteNumber, 64]);
  input.onmidimessage({ data, timeStamp } as unknown as MIDIMessageEvent);
}

/**
 * Simulates a MIDI state-change (connect/disconnect) event on the MIDIAccess object.
 * Updates `input.state` and calls `access.onstatechange` synchronously.
 *
 * For connect: adds the input to `access.inputs` if not already present.
 * For disconnect: updates the input's state to 'disconnected'.
 *
 * @param access    - MockMidiAccess to fire on
 * @param input     - The device that changed state
 * @param eventKind - 'connected' or 'disconnected'
 */
export function fireMidiStateChange(
  access: MockMidiAccess,
  input: MockMidiInput,
  eventKind: 'connected' | 'disconnected'
): void {
  input.state = eventKind;
  if (eventKind === 'connected') {
    access.inputs.set(input.id, input);
  } else {
    // keep the input in the map but with state 'disconnected' so onstatechange can inspect it
    input.state = 'disconnected';
  }
  if (access.onstatechange) {
    access.onstatechange({ port: input as unknown as MIDIPort } as Partial<MIDIConnectionEvent>);
  }
}
