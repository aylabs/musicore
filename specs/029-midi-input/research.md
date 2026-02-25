# Research: MIDI Input for Recording View

**Branch**: `029-midi-input` | **Date**: 2026-02-25
**Input**: [spec.md](spec.md) — FR-001 through FR-021; 5 user stories

---

## R-001: Web MIDI API Browser Support

**Decision**: Use the browser's native Web MIDI API (`navigator.requestMIDIAccess`) with no third-party MIDI library wrapper.

**Rationale**: The surface area needed (enumerate inputs, subscribe to note events, handle connect/disconnect) is narrow. All active npm packages for React + MIDI are either unmaintained (`@react-midi/hooks`, last updated 2 years ago, 102 weekly DLs) or oversized (`webmidi.js` 4 MB, general-purpose). Raw API is zero-dependency, fully typed by TypeScript `lib.dom`, and directly testable via Vitest stubs.

**Alternatives considered**:
- `webmidi.js` v3: Active, good API, but 4 MB unpacked — disproportionate for a debug tool that only needs note-on events.
- `@react-midi/hooks`: Thin wrapper that would save minimal code but lacks disconnect-during-recording handling required by US5.

**Browser matrix (as of 2026-02)**:

| Platform | Support |
|---|---|
| Chrome / Edge (Chromium, all tabs) | ✅ Full — permission prompt once per origin |
| Firefox 108+ (desktop) | ✅ Full — one-time site-permission add-on install prompt |
| iOS Safari (all iOS browsers) | ❌ Not supported — WebKit does not implement Web MIDI |
| Firefox for Android | ❌ Not supported |
| Samsung Internet | ✅ Full (Chromium-based) |

**Impact on spec**: FR-016 (MIDI not supported → fall back to Microphone + "MIDI not supported in this browser" message) correctly targets iOS Safari and Firefox for Android. The 3-second enumeration timeout (FR-001 + SC-009) also covers the case where Firefox's permission add-on prompt delays `requestMIDIAccess()` resolution.

---

## R-002: MIDI Permission Model

**Decision**: Request MIDI access with `{ sysex: false }` (default) — never request sysex access.

**Rationale**: Sysex is required only for reading/writing device firmware and configuration. Note-on capture requires no sysex. Requesting sysex triggers a more alarming browser prompt and is unnecessary.

**Alternatives considered**:
- `{ sysex: true }`: Unnecessary, triggers additional user friction, no benefit.

**Implementation notes**:
- Must be called from a secure context (HTTPS or localhost). The Musicore PWA is HTTPS-deployed; localhost dev meets this requirement.
- Can pre-check permission state via `navigator.permissions.query({ name: "midi" })` to differentiate "not yet prompted" from "denied" before calling `requestMIDIAccess()`.
- Firefox adds a one-time site-permission add-on install dialog — surfacing this to users as "allow browser add-on for MIDI" is the correct UX copy, not a bug.

---

## R-003: MIDI Message Parsing — Note-On Events

**Decision**: Parse MIDI messages directly from raw `Uint8Array` data in `onmidimessage` handler. Filter to note-on events only; ignore all other message types.

**Rationale**: The spec captures only note-on events (FR-006). A note-off event is either `0x80` + any velocity or `0x90` + velocity `0`. Only `0x90 && velocity > 0` is a note-on.

**Note-On byte structure**:
```
data[0] = 0x90 | channel   (0x90–0x9F)
data[1] = note number      (0–127)
data[2] = velocity         (1–127; 0 = note off in disguise)
```

**Messages to silently ignore** (per spec edge case "other MIDI messages"):
- `0xB0` Control Change, `0xE0` Pitch Bend, `0xA0` Aftertouch, `0xF0` SysEx, `0x80` Note Off, `0xA0`–`0xAF` Poly Aftertouch, `0xC0` Program Change, `0xD0` Channel Pressure, `0xF8` Clock, `0xFE` Active Sensing.

---

## R-004: MIDI Note Number → Scientific Pitch Name

**Decision**: Implement `midiNoteToLabel(note: number): string` using the standard formula — no library required.

**Formula**:
```
octave = floor(note / 12) - 1
pitchClass = note % 12
names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
label = names[pitchClass] + octave
```

**Key values**: note 60 = C4, note 69 = A4 (440 Hz), note 21 = A0 (piano low), note 108 = C8 (piano high).

**Consistency**: This formula uses the same note name format as the existing `hzToNoteName()` in `pitchDetection.ts` — both produce labels like "A4", "C#5". The note history list format is identical between mic and MIDI modes.

**Alternatives considered**: Using a frequency round-trip (`midiToHz` → `hzToNoteName`) — rejected because it introduces floating-point rounding noise. Direct formula is exact and simpler.

---

## R-005: `useMidiInput` Hook Architecture

**Decision**: Implement a `useMidiInput` React hook that is responsible only for MIDI device access and raw note events. Session state (note history, timestamps) stays in `RecordingView` — same pattern as existing `useAudioRecorder`.

**Rationale**: Keeping session state in the parent component enables seamless source switching (US3-AC4: "recording continues without stopping — note history preserved"). The MIDI hook and mic hook are both pure capture sources that emit events upward via callbacks.

**Design**:
- `useMidiInput(onNoteOn: (event: MidiNoteEvent) => void)` — requests access on mount, subscribes to all inputs on all channels, cleans up on unmount.
- Exposes: `devices: MidiDevice[]`, `error: string | null`, `isSupported: boolean`.
- Does NOT own `noteHistory`, `sessionTimestamp`, or `RecordingSession` state.
- State change debounce: 300 ms on `onstatechange` for UI indicator updates (within FR-005's 500 ms SLA). Disconnect during active recording: fires immediately without debounce (triggers error state per FR-014).

**Cleanup on unmount** (critical for browser mic-release indicator):
- Set `input.onmidimessage = null` on all open inputs.
- Set `access.onstatechange = null`.
- Do NOT call `MIDIInput.close()` — closing ports is not required and can break other tabs using the same device.

---

## R-006: Source Switching — Microphone ↔ MIDI Handoff

**Decision**: `RecordingView` owns a single `activeSource: InputSource` state. Switching sources tears down the old capture source and activates the new one, with note history preserved throughout.

**Handoff sequence (Mic → MIDI)**:
1. Call `micRecorder.stopCapture()` — flushes any pending audio frame; does NOT clear note history.
2. Tear down `AudioContext` and `MediaStream` tracks (releases OS mic permission indicator).
3. Set `activeSource` to `{ kind: 'midi', deviceName }`.
4. `useMidiInput` is already mounted (initialised on view load); attach its note-on callback.
5. `sessionTimestamp` is unchanged — session continues.

**Handoff sequence (MIDI → Mic, on disconnection recovery)**:
1. MIDI device fires `onstatechange` with `state: 'disconnected'`.
2. Set `activeSource` error state, show "MIDI device disconnected" message.
3. User presses "Switch to Microphone" recovery button.
4. Call `useMidiInput` cleanup (already done by disconnect handler).
5. Call `useMicRecorder.startCapture()`.

**Rationale**: This mirrors the existing approach in `useAudioRecorder.ts` where `noteHistory` and `sessionTimestamp` are tracked separately from the audio pipeline lifecycle.

---

## R-007: MIDI Hot-Connect Dialog Implementation

**Decision**: Implement the countdown dialog as a React component with `setInterval` + `useEffect` for the 30-second auto-dismiss timer. No third-party dialog library.

**Countdown pattern**:
```ts
const [remaining, setRemaining] = useState(30);
useEffect(() => {
  if (remaining <= 0) { onDismiss('keep'); return; }
  const id = setInterval(() => setRemaining(r => r - 1), 1000);
  return () => clearInterval(id);
}, [remaining, onDismiss]);
```

**Rationale**: `setInterval` + `useEffect` is the standard, well-tested pattern that handles React 18 Strict Mode double-invocation correctly via its cleanup function. `requestAnimationFrame` is unnecessary for a 1-second counter.

**Debounce**: The hot-connect detection in `useMidiInput.onstatechange` is debounced 300 ms (per R-005) — this prevents the dialog from flickering on rapid connect/disconnect cycles (FR-020).

---

## R-008: Oscilloscope Area in MIDI Mode

**Decision**: Show a static placeholder component (`<MidiVisualizationPlaceholder />`) in the same layout area as `<OscilloscopeCanvas />` when MIDI is the active source. The area is a named extension point for future velocity/roll visualizations.

**Rationale**: Spec clarification (Q2): preserve layout space. `<OscilloscopeCanvas />` has the same dimensions in both modes — the placeholder occupies identical space, preventing layout reflow. The component name signals future intent.

**Implementation**: `RecordingView` renders `{activeSource.kind === 'midi' ? <MidiVisualizationPlaceholder /> : <OscilloscopeCanvas waveform={waveform} />}`. No changes to `OscilloscopeCanvas`.

---

## R-009: Vitest Mocking Strategy for Web MIDI

**Decision**: Add a `mockMidi.ts` utility to `frontend/src/test/` alongside existing mock utilities in `setup.ts`. Mirror the existing `stubGetUserMedia` / `makeAudioContextMock` pattern.

**Required stubs**:
- `mockMidiSupported(access: MIDIAccess)` — stubs `navigator.requestMIDIAccess` via `Object.defineProperty`.
- `mockMidiUnsupported()` — sets `requestMIDIAccess` to `undefined` so `"requestMIDIAccess" in navigator === false`.
- `createMockMidiAccess(inputs?)` — returns a `MIDIAccess` partial with a live `Map` of mock `MIDIInput` objects.
- `createMockMidiInput(name, id?)` — returns a `MIDIInput` partial with `onmidimessage = null` and spy stubs for `open`/`close`.
- `fireMidiNoteOn(input, noteNumber, velocity?, channel?)` — helper that calls `input.onmidimessage(mockEvent)` directly to simulate a note.

**Rationale**: happy-dom does not implement Web MIDI. The stubs follow the exact same pattern as the existing `makeAudioContextMock` factory already in `setup.ts`, keeping the test infrastructure consistent.

---

## R-010: Input Source Indicator — State Architecture

**Decision**: Single `useState<InputSource>` in `RecordingView`; prop-drilled to `<InputSourceBadge source={activeSource} />`. No Context, no Zustand.

**Type**:
```ts
type InputSource =
  | { kind: 'microphone' }
  | { kind: 'midi'; deviceName: string; deviceId: string };
```

**Rationale**: The indicator is used by components at most 1–2 levels below `RecordingView`. Prop drilling at this depth is idiomatic React, directly testable, and avoids unnecessary abstraction. Context would be appropriate only if the indicator needed to appear outside the Recording View subtree (e.g., a global app header) — the spec scopes it within the view.

---

## R-011: ZIP Parsing — Plugin Importer (.zip Upload)

**Decision**: Use **fflate** (`fflate` npm package) for reading user-uploaded `.zip` files in the plugin importer.

**Rationale**:

| | fflate | JSZip | Native (DecompressionStream) |
|---|---|---|---|
| Bundle size (min+gzip) | ~8 KB | ~30 KB | 0 KB |
| API style | Callback + `Uint8Array` / WASM-free | Promise-based, `Blob`/`ArrayBuffer` | Not applicable — no ZIP container support |
| TypeScript types | Built-in (ships `.d.ts`) | `@types/jszip` (separate) | N/A |
| Maintenance (2026-02) | Active — v0.8.x, ~2 M weekly DLs | Stale — last release 3.10.1 (2023), declining downloads | N/A |
| Browser support | All evergreen + IE11 (via polyfill) | IE10+ | Gzip/deflate only — ZIP parsing unsupported |

fflate's `unzip` function accepts a raw `Uint8Array`, iterates entries with their paths and `Uint8Array` contents, and handles both `DEFLATE` and `STORED` entries. Bundle cost is ~8 KB gzip — proportionate for a PWA importer. JSZip is functionally adequate but ~4× larger and no longer actively maintained. Native `DecompressionStream` covers raw deflate/gzip streams but has no concept of a ZIP central directory or entry table — implementing ZIP parsing by hand over it is ~500 LOC and equivalent to shipping a worse JSZip; not feasible.

**Key usage snippet**:
```ts
import { unzip } from 'fflate';

async function readPluginZip(file: File): Promise<{ manifest: unknown; assets: Map<string, Uint8Array> }> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  return new Promise((resolve, reject) => {
    unzip(data, (err, files) => {
      if (err) return reject(err);

      const manifestEntry = files['plugin.json'];
      if (!manifestEntry) return reject(new Error('plugin.json not found in archive'));

      const manifest = JSON.parse(new TextDecoder().decode(manifestEntry));
      const assets = new Map(
        Object.entries(files)
          .filter(([name]) => name !== 'plugin.json')
          .map(([name, bytes]) => [name, bytes] as [string, Uint8Array])
      );
      resolve({ manifest, assets });
    });
  });
}
```

**Alternatives considered**:
- **JSZip**: Familiar API, but ~30 KB gzip, no built-in types, and no significant releases since mid-2023. Rejected on size and maintenance grounds.
- **Native `DecompressionStream`**: Only decompresses raw deflate/gzip — has no ZIP container (local file headers, central directory, end-of-central-directory record) support. Implementing that manually is equivalent to writing a ZIP library from scratch. Rejected as not feasible.

---

## Resolved Unknowns Summary

| Unknown | Resolution |
|---------|-----------|
| Web MIDI API browser support | ✅ Chromium full; Firefox 108+; iOS Safari ❌ (graceful fallback) |
| MIDI library vs raw API | ✅ Raw API — no npm package needed |
| Permission model | ✅ `{ sysex: false }`, HTTPS required, pre-check via Permissions API |
| Note number → name formula | ✅ Standard formula, consistent with existing `hzToNoteName` |
| Hook architecture | ✅ `useMidiInput` events-up, session state in `RecordingView` |
| Source switching state design | ✅ `activeSource` in `RecordingView`, history preserved |
| Dialog countdown timer | ✅ `setInterval` + `useEffect` |
| Oscilloscope in MIDI mode | ✅ Placeholder component (extension point) |
| Vitest MIDI mocking | ✅ `mockMidi.ts` utility in `frontend/src/test/` |
| Input source badge state | ✅ `useState` + prop drilling in `RecordingView` |
