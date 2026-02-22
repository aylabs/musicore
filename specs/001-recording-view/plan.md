# Implementation Plan: Recording View

**Branch**: `001-recording-view` | **Date**: 2026-02-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-recording-view/spec.md`

## Summary

Add a debug-only Recording View to the Musicore PWA. Accessed via a "Record View" button that only appears in `ScoreViewer` when `?debug=true` is present in the URL, the view captures live microphone audio using the Web Audio API (`AudioWorklet`) and presents: (1) a real-time oscilloscope waveform, (2) the currently detected monophonic pitch (using the `pitchy` MPM library), and (3) a bounded scrollable list of note onsets. All audio resources are released on exit. The feature is front-end only with no backend or persistence.

## Technical Context

**Language/Version**: TypeScript 5.9 / React 19.2 / Vite 7.x  
**Primary Dependencies**: Web Audio API (`AudioWorklet`, `getUserMedia`), `pitchy` (MPM pitch detection, ~33 kB, zero-dependency), Canvas 2D API  
**Storage**: N/A — in-memory React state only; no IndexedDB, no backend  
**Testing**: Vitest 4.x + happy-dom 20.x + @testing-library/react 16.x  
**Target Platform**: Tablet PWA — Chromium-based browsers + Firefox. iOS Safari: show compatibility warning.  
**Project Type**: Web (frontend-only)  
**Performance Goals**: Oscilloscope ≥ 30 fps; pitch detection latency < 200 ms; memory stable over 10 min  
**Constraints**: AudioWorklet required (no ScriptProcessor fallback); monophonic pitch detection only; debug gate via `?debug=true`; note history list capped at 200 entries; silence-gap dedup threshold 300 ms  
**Scale/Scope**: Single-user debug tool; in-memory state only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Domain-Driven Design | ✅ Pass | Core entities (`RecordingSession`, `PitchSample`, `NoteOnset`) modelled as typed domain objects with ubiquitous music terminology |
| II. Hexagonal Architecture | ✅ Pass | Audio pipeline and pitch detection isolated in service layer (`useAudioRecorder` hook + `pitchDetection.ts`); `RecordingView` component is a pure UI adapter |
| III. PWA Architecture | ✅ Pass | Debug-only feature; audio capture runs entirely client-side; no network dependency |
| IV. Precision & Fidelity | ✅ Pass | Pitch detection uses float Hz → integer MIDI → note name; not part of the Music Timeline domain (960 PPQ constraint does not apply) |
| V. Test-First Development | 🔴 **GATE** | Mandatory TDD — all services and components require failing tests written before implementation |
| VI. Layout Engine Authority | ✅ Pass | No spatial geometry involved; oscilloscope canvas draws raw waveform, not music layout |
| VII. Regression Prevention | ✅ Pass | Any bugs found during implementation must produce a failing test before fix |

**Gate violations**: None — all principles pass. Constitution Check re-evaluated after Phase 1 design: no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-recording-view/
├── plan.md              ← this file
├── research.md          ← Phase 0 output (see below)
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   └── audio-service.ts ← TypeScript interfaces (service contracts)
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── recording/
│   │       ├── RecordingView.tsx          # Top-level page component
│   │       ├── RecordingView.css
│   │       ├── RecordingView.test.tsx     # Integration tests (TDD first)
│   │       ├── OscilloscopeCanvas.tsx     # Canvas waveform renderer
│   │       ├── OscilloscopeCanvas.test.tsx
│   │       ├── NoteHistoryList.tsx        # Scrollable onset list
│   │       └── NoteHistoryList.test.tsx
│   ├── services/
│   │   └── recording/
│   │       ├── useAudioRecorder.ts        # AudioWorklet lifecycle hook
│   │       ├── useAudioRecorder.test.ts
│   │       ├── pitchDetection.ts          # Hz → NoteOnset pure functions
│   │       ├── pitchDetection.test.ts
│   │       └── audio-processor.worklet.ts # AudioWorklet processor (builds to public/)
│   └── types/
│       └── recording.ts                   # RecordingSession, NoteOnset, etc.
└── public/
    └── audio-processor.worklet.js         # Built/copied AudioWorklet processor file
```

**Structure Decision**: Web project — frontend-only. New `recording/` subdirectory under both `components/` and `services/` keeps the feature self-contained and mirrors the existing convention (e.g., `components/playback/`, `services/playback/`).

## Complexity Tracking

No constitution violations requiring justification.
