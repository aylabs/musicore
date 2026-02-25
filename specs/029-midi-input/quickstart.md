# Quickstart: MIDI Input for Recording View

**Branch**: `029-midi-input` | **Date**: 2026-02-25

---

## Prerequisites

- Node.js 20+, npm 10+
- A MIDI keyboard or controller connected via USB (optional — Microphone mode works without one)
- Chrome/Edge (recommended) or Firefox 108+ (requires one-time site-permission add-on)
- **Not supported**: iOS Safari, Firefox for Android

---

## Run the app locally

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/?debug=true` in Chrome or Edge.

---

## Open the Recording View

1. On the Instruments View, click **"Record View"** (only visible with `?debug=true`).
2. The Recording View opens.

---

## Test MIDI input

### With a MIDI device connected before opening the view

1. Connect a MIDI keyboard via USB.
2. Open `http://localhost:5173/?debug=true` and navigate to the Recording View.
3. The browser will prompt for MIDI permission — click **Allow**.
4. The **input source indicator** reads **"MIDI — [device name]"**.
5. Press **"Start Recording"**.
6. Play notes — they appear in the current-note display and note history list.
7. The oscilloscope area shows the placeholder **"Waveform not available in MIDI mode"**.

### Without a MIDI device (microphone mode — existing behaviour)

1. Open the Recording View without a MIDI device connected.
2. The input source indicator reads **"Microphone"**.
3. Existing mic capture / pitch detection / oscilloscope behaviour is unchanged.

### Hot-connect during microphone session

1. Open the Recording View without a MIDI device.
2. Press **"Start Recording"** in microphone mode.
3. Connect a MIDI keyboard.
4. Within 2 seconds, a dialog appears: **"MIDI device detected: [name]"** with a 30-second countdown.
5. Click **"Switch to MIDI"** — microphone is released, MIDI activates, note history is preserved.
6. Or click **"Keep Microphone"** (or wait for countdown) — mic session continues uninterrupted.

---

## Run all recording tests

```bash
cd frontend
npm test -- --run --reporter=verbose src/components/recording src/services/recording src/test/mockMidi.ts
```

---

## New files in this feature

| File | Purpose |
|------|---------|
| `src/types/recording.ts` | Extended: `MidiDevice`, `InputSource`, `MidiNoteEvent`, `MidiConnectionEvent` |
| `src/services/recording/useMidiInput.ts` | Hook: Web MIDI access, device subscriptions, cleanup |
| `src/services/recording/midiUtils.ts` | Pure functions: `midiNoteToLabel()`, `parseMidiNoteOn()` |
| `src/test/mockMidi.ts` | Vitest stubs: `mockMidiSupported()`, `createMockMidiAccess()`, `fireMidiNoteOn()` |
| `src/components/recording/InputSourceBadge.tsx` | "Microphone" / "MIDI — [name]" indicator |
| `src/components/recording/MidiDetectionDialog.tsx` | Hot-connect modal with 30-second countdown |
| `src/components/recording/MidiVisualizationPlaceholder.tsx` | Oscilloscope area placeholder in MIDI mode |

## Modified files in this feature

| File | Change |
|------|--------|
| `src/components/recording/RecordingView.tsx` | `activeSource` state, source switching, dialog trigger, badge + placeholder wiring |
| `src/components/recording/RecordingView.css` | Badge and placeholder styles |
| `src/components/recording/RecordingView.test.tsx` | Extended: MIDI source indicator, dialog, source-switch scenarios |
| `src/test/setup.ts` | Import `mockMidi.ts` stubs |

---

## Browser-specific notes

| Browser | Behaviour |
|---------|-----------|
| Chrome / Edge | Full MIDI support. Standard permission prompt once per origin. |
| Firefox 108+ | Full MIDI support. One-time site-permission add-on install prompt on first use. |
| iOS Safari | No MIDI support. Falls back silently to Microphone. "MIDI not supported in this browser" info message shown. |
| Firefox for Android | No MIDI support. Same fallback as iOS Safari. |
