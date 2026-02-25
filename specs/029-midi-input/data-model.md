# Data Model: MIDI Input for Recording View

**Branch**: `029-midi-input` | **Date**: 2026-02-25
**Source**: [spec.md](spec.md) Key Entities + [research.md](research.md)

---

## New Entities

### MidiDevice

Represents a connected MIDI input device discovered via the MIDI access capability.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique port identifier assigned by browser (stable per device per browser) |
| `name` | `string` | Human-readable device name (e.g., "Arturia MiniLab mkII") |
| `manufacturer` | `string` | Manufacturer name, may be empty string |
| `state` | `'connected' \| 'disconnected'` | Current connection state |

**Validation rules**:
- `id` must be a non-empty string
- `name` used in `InputSourceBadge` display — falls back to `"Unknown Device"` if empty
- `state` drives error handling in `useMidiInput`

**Source**: Derived from `MIDIInput` port object in Web MIDI API; only `inputs` (not outputs) are tracked.

---

### InputSource

Discriminated union representing the active capture source in a recording session.

```
InputSource =
  | { kind: 'microphone' }
  | { kind: 'midi'; deviceName: string; deviceId: string }
```

| Variant | Fields | When |
|---------|--------|------|
| `microphone` | — | No MIDI device detected at load, or user explicitly keeps microphone |
| `midi` | `deviceName: string`, `deviceId: string` | MIDI device detected at load, or user switches in dialog |

**State transitions**:
```
microphone → midi       : User accepts "Switch to MIDI" in hot-connect dialog
midi → microphone       : MIDI device disconnects + user presses "Switch to Microphone"
microphone (initial)    : No MIDI device at load OR enumeration timeout (3 s)
midi (initial)          : MIDI device present at load, enumerated within 3 s
```

**Invariants**:
- Exactly one `InputSource` is active at any time; never both simultaneously
- Source change does not affect `noteHistory` or `sessionTimestamp`
- Source change while in `idle` state updates indicator immediately; source change while `recording` preserves session continuity

---

### MidiNoteEvent

A single note-on event received from the MIDI device. Not persisted; consumed immediately.

| Field | Type | Description |
|-------|------|-------------|
| `noteNumber` | `number` | MIDI note number 0–127 |
| `velocity` | `number` | Key press force 1–127 (0 = note-off, excluded by filter) |
| `channel` | `number` | MIDI channel 1–16 (all channels captured, no filtering) |
| `timestampMs` | `number` | Milliseconds since `sessionTimestamp` (session-relative) |
| `label` | `string` | Derived scientific pitch name e.g. "A4", "C#5" |

**Validation rules**:
- Only events with `velocity > 0` and status byte `0x90` are treated as note-on (velocity 0 = note-off, silently ignored)
- `label` derived via `midiNoteToLabel(noteNumber)` — never stored raw, always derived
- `channel` stored for future use; not displayed in this feature version

**Relationship**: On receipt, a `MidiNoteEvent` is transformed into a `NoteOnset` (existing entity) and appended to `noteHistory`. The transformation uses the same `NoteOnset` structure used by mic-mode pitch detection — the history list is source-agnostic.

---

### MidiConnectionEvent

A device-level lifecycle event emitted by `useMidiInput` when a MIDI device connects or disconnects during an active session.

| Field | Type | Description |
|-------|------|-------------|
| `device` | `MidiDevice` | The device that changed state |
| `kind` | `'connected' \| 'disconnected'` | Type of state change |
| `timestamp` | `number` | `Date.now()` at time of event |

**Used by**:
- `RecordingView`: `connected` event while in microphone mode → trigger `MidiDetectionDialog`
- `RecordingView`: `disconnected` event while in MIDI mode → set error state, show recovery UI

---

## Modified Entities

### RecordingSession (extended)

The existing `RecordingSession` entity gains no new fields. The `activeSource: InputSource` is tracked as separate state in `RecordingView` alongside `RecordingSession` — it is not embedded inside `RecordingSession` to avoid coupling the session lifecycle to the input source selection.

### NoteOnset (unchanged)

`NoteOnset` is the shared entity for the history list in both mic and MIDI modes. In MIDI mode:
- `label` — set from `MidiNoteEvent.label` (e.g., "A4")
- `note` — pitch class only (e.g., "A")
- `octave` — octave number (e.g., 4)
- `confidence` — set to `1.0` (MIDI note-on is deterministic, no pitch confidence concept)
- `elapsedMs` — set from `MidiNoteEvent.timestampMs`

**No deduplication / silence-gap logic** applies in MIDI mode — every distinct note-on event produces a history entry (spec US4-AC3: "one entry per note-on event").

---

## Entity Relationships

```
RecordingView
├── activeSource: InputSource          ← NEW (alongside existing RecordingSession)
│   ├── { kind: 'microphone' }
│   └── { kind: 'midi', deviceName, deviceId }
│
├── useMidiInput hook
│   ├── devices: MidiDevice[]          ← NEW
│   ├── onNoteOn: (MidiNoteEvent) → void  ← NEW (callback to RecordingView)
│   └── onConnectionChange: (MidiConnectionEvent) → void  ← NEW
│
├── useAudioRecorder hook (existing, unchanged)
│   └── onNoteOnset: (PitchSample) → void
│
└── noteHistory: NoteOnset[]           ← SHARED, source-agnostic (existing)
    sessionTimestamp: number | null    ← SHARED, never reset on source switch (existing)
```

---

## State Transitions — InputSource on load

```
Recording View mounts
        │
        ▼
requestMIDIAccess() ─── timeout 3s ──► microphone (fallback)
        │
   success: MIDIAccess
        │
   inputs.size > 0? ─── no ──► microphone (default)
        │ yes
        ▼
      midi (first device)
```

## State Transitions — Hot-Connect Dialog

```
activeSource = microphone
        │
  MidiConnectionEvent { kind: 'connected' }
  (debounced 300 ms)
        │
        ▼
MidiDetectionDialog shown
  ┌─────────────────────────────────────┐
  │  "Switch to MIDI" │ "Keep Mic"      │
  │  countdown: 30s                     │
  └─────────────────────────────────────┘
        │                    │               │ (timeout / Escape)
        ▼                    ▼               ▼
  activeSource = midi  activeSource unchanged   activeSource unchanged
  mic released         dialog closes            dialog closes
  session preserved    session preserved        session preserved
```
