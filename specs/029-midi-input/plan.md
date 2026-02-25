# Implementation Plan: MIDI Input for Recording View

**Branch**: `029-midi-input` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/029-midi-input/spec.md`

## Summary

Extend the existing debug-mode Recording View with MIDI input support using the browser Web MIDI API. On Recording View load, the system queries for connected MIDI devices (3-second timeout); if found, MIDI is selected as the default input source and the microphone is never opened. The active input source is shown at all times via an `InputSourceBadge` component. If a MIDI device is hot-connected while microphone mode is active, a countdown dialog (30-second auto-dismiss → "Keep Microphone") offers the user an explicit switch. MIDI note-on events across all channels are captured via a `useMidiInput` hook and emitted into the same shared `noteHistory` / `sessionTimestamp` state owned by `RecordingView` — enabling seamless source switching without session loss. The oscilloscope area is replaced by a static `MidiVisualizationPlaceholder` in MIDI mode (extension point for future velocity display). The feature is frontend-only; no backend or persistence changes.

## Technical Context

**Language/Version**: TypeScript 5.9 / React 19.2 / Vite 7.x
**Primary Dependencies**: Web MIDI API (`navigator.requestMIDIAccess` — no npm library), existing `useAudioRecorder` hook pattern
**Storage**: N/A — in-memory React state only; no IndexedDB, no backend
**Testing**: Vitest 4.x + happy-dom 20.x + @testing-library/react 16.x; new `mockMidi.ts` stub utility mirrors existing `makeAudioContextMock` pattern
**Target Platform**: Tablet PWA — Chromium-based browsers (full MIDI support) + Firefox 108+ (full). iOS Safari: graceful fallback to microphone with informational message.
**Project Type**: Web (frontend-only)
**Performance Goals**: MIDI note-on → UI display < 100 ms (FR-007); input source indicator update < 500 ms (FR-005); MIDI enumeration on load < 3 s before fallback (FR-001 / SC-009)
**Constraints**: Raw Web MIDI API only (no library); `{ sysex: false }`; all 16 MIDI channels captured; velocity captured but not displayed; hot-connect dialog auto-dismisses 30 s → "Keep Microphone"; oscilloscope replaced by placeholder in MIDI mode; source switching must preserve note history and session timestamp
**Scale/Scope**: Single-user debug tool; in-memory state only; extends existing `recording/` directory structure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Domain-Driven Design | ✅ Pass | New entities (`MidiDevice`, `InputSource`, `MidiNoteEvent`, `MidiConnectionEvent`) modelled as typed domain objects with music terminology; `midiNoteToLabel` uses the same ubiquitous note-name language as existing `hzToNoteName` |
| II. Hexagonal Architecture | ✅ Pass | MIDI pipeline isolated in `useMidiInput` service hook; `RecordingView` is a pure UI adapter; Web MIDI API is an infrastructure adapter; source switching logic lives in service layer, not component |
| III. PWA Architecture | ✅ Pass | Debug-only feature; MIDI capture runs entirely client-side; no network dependency; HTTPS requirement already satisfied by PWA deployment |
| IV. Precision & Fidelity | ✅ Pass | MIDI note → scientific pitch uses exact integer arithmetic (note number formula); not part of the Music Timeline 960 PPQ domain; velocity is integer |
| V. Test-First Development | 🔴 **GATE** | Mandatory TDD — `useMidiInput`, `MidiDetectionDialog`, `InputSourceBadge`, `MidiVisualizationPlaceholder`, and all `RecordingView` changes require failing tests written before implementation |
| VI. Layout Engine Authority | ✅ Pass | No spatial geometry involved; `MidiVisualizationPlaceholder` displays text in a fixed layout area — no coordinate calculations |
| VII. Regression Prevention | ✅ Pass | Any bugs found during implementation must produce a failing test before fix; existing `RecordingView` tests must continue to pass (mic mode is a zero-regression surface) |

**Gate violations**: None — all principles pass. Gate V is satisfied by the TDD task ordering in Phase tasks. Constitution Check re-evaluated after Phase 1 design: no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/029-midi-input/
├── plan.md              ← this file
├── research.md          ← Phase 0 output (see above)
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   └── midi-service.ts  ← TypeScript interfaces (service contracts)
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── recording/
│   │       ├── RecordingView.tsx               # Extended: InputSource state, source switching, dialog trigger
│   │       ├── RecordingView.css               # Extended: badge and placeholder styles
│   │       ├── RecordingView.test.tsx          # Extended: MIDI source indicator, dialog, source switch tests
│   │       ├── InputSourceBadge.tsx            # NEW: "Microphone" | "MIDI — [name]" indicator
│   │       ├── InputSourceBadge.test.tsx       # NEW: unit tests
│   │       ├── MidiDetectionDialog.tsx         # NEW: hot-connect modal with 30-second countdown
│   │       ├── MidiDetectionDialog.test.tsx    # NEW: unit tests (countdown, dismiss, switch)
│   │       ├── MidiVisualizationPlaceholder.tsx# NEW: static placeholder for oscilloscope area in MIDI mode
│   │       ├── MidiVisualizationPlaceholder.test.tsx # NEW: rendering tests
│   │       ├── OscilloscopeCanvas.tsx          # Unchanged
│   │       ├── NoteHistoryList.tsx             # Unchanged
│   │       └── NoteHistoryList.test.tsx        # Unchanged
│   ├── services/
│   │   └── recording/
│   │       ├── useMidiInput.ts                 # NEW: Web MIDI hook — device enumeration, note-on events, cleanup
│   │       ├── useMidiInput.test.ts            # NEW: unit tests
│   │       ├── midiUtils.ts                    # NEW: midiNoteToLabel(), parseMidiMessage() pure functions
│   │       ├── midiUtils.test.ts               # NEW: unit tests
│   │       ├── useAudioRecorder.ts             # Unchanged
│   │       └── pitchDetection.ts               # Unchanged
│   ├── test/
│   │   ├── setup.ts                            # Extended: import mockMidi utilities
│   │   └── mockMidi.ts                         # NEW: Web MIDI API stubs for Vitest
│   └── types/
│       └── recording.ts                        # Extended: MidiDevice, InputSource, MidiNoteEvent, MidiConnectionEvent
```

**Structure Decision**: Web project — frontend-only. All new files are added within the existing `components/recording/` and `services/recording/` directories, following the established convention. No new top-level directories. The `mockMidi.ts` utility is placed in `src/test/` alongside the existing setup infrastructure.

## Complexity Tracking

No constitution violations requiring justification.
