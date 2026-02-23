# Implementation Plan: Piano Practice Exercise

**Branch**: `001-piano-practice` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-piano-practice/spec.md`

## Summary

Build a debug-mode Piano Practice Exercise view. The user sees 8 randomly generated quarter notes (C3–C4) on a treble-clef staff, presses Play to hear them highlighted one by one, plays along on their piano (microphone) in real time on a second staff, then receives a per-note results report and a 0–100 score. Reuses the existing pitch detection service without modification. All state is ephemeral (no persistence).

## Technical Context

**Language/Version**: TypeScript 5 / React 18, Node 22  
**Primary Dependencies**: Vite 6, Vitest 2, @testing-library/react, pitchy (already installed), existing `NotationLayoutEngine` + `NotationRenderer` WASM modules  
**Storage**: N/A — all state is in-memory, ephemeral  
**Testing**: Vitest + @testing-library/react (same as rest of frontend)  
**Target Platform**: Tablet devices (iPad/Android), Chrome/Safari, debug-mode only  
**Project Type**: Web application — frontend-only, no backend changes  
**Performance Goals**: UI feedback within 16 ms (60 fps), mic-to-note-display < 200 ms (same as Recording view)  
**Constraints**: Debug-mode only; no new npm dependencies; reuse existing pitch detection service (FR-014); no persistence

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Domain-Driven Design | ✅ PASS | New types follow DDD naming (Exercise, ResponseNote, NoteComparison); no leakage from persistence or UI layers |
| II. Hexagonal Architecture | ✅ PASS | All logic is frontend-only; no backend changes; scoring is a pure service function |
| III. PWA Architecture | ✅ PASS | Feature is fully client-side; mic access via Web Audio API (same as Recording view); no network calls |
| IV. Precision & Fidelity (960 PPQ) | ✅ PASS | Exercise uses real-time ms timings, not tick-based; PPQ applies to the music data model, not real-time practice timing |
| V. Test-First Development | ✅ PASS (GATE) | All tasks will begin with a failing test per TDD; see tasks in /speckit.tasks |
| VI. Layout Engine Authority | ✅ PASS | Both staffs rendered via `NotationLayoutEngine` + `NotationRenderer`; no renderer-side spatial calculations |
| VII. Regression Prevention | ✅ PASS | `useAudioRecorder.ts` and `pitchDetection.ts` are NOT modified; new `usePracticeRecorder` wraps the same AudioWorklet without touching existing code |

**No violations. No Complexity Tracking table needed.**

## Project Structure

### Documentation (this feature)

```text
specs/001-piano-practice/
├── plan.md              ← this file
├── research.md          ← Phase 0 complete
├── data-model.md        ← Phase 1 complete
├── quickstart.md        ← Phase 1 complete
├── contracts/
│   └── typescript-interfaces.md   ← Phase 1 complete
└── tasks.md             ← Phase 2 (/speckit.tasks — not yet created)
```

### Source Code

```text
frontend/
├── src/
│   ├── types/
│   │   └── practice.ts                          ← NEW: all domain types
│   ├── services/
│   │   └── practice/
│   │       ├── exerciseGenerator.ts             ← NEW: random exercise factory
│   │       ├── exerciseGenerator.test.ts        ← NEW
│   │       ├── exerciseScorer.ts                ← NEW: beat-slot alignment + scoring
│   │       ├── exerciseScorer.test.ts           ← NEW
│   │       ├── usePracticeRecorder.ts           ← NEW: mic hook (starts on mount)
│   │       └── usePracticeRecorder.test.ts      ← NEW
│   ├── components/
│   │   ├── practice/
│   │   │   ├── PracticeView.tsx                 ← NEW: top-level view
│   │   │   ├── PracticeView.css                 ← NEW
│   │   │   ├── PracticeView.test.tsx            ← NEW
│   │   │   └── ExerciseResultsView.tsx          ← NEW: results report component
│   │   └── ScoreViewer.tsx                      ← MODIFIED: add "Practice" debug button
│   └── App.tsx                                  ← MODIFIED: showPractice routing flag
```

**Structure Decision**: Web application / Option 2 (frontend + backend present). Only frontend changes. Mirrors the directory pattern established by `001-recording-view`.

---

## Phase 0: Research — Complete ✅

See [research.md](./research.md).

**All NEEDS CLARIFICATION items resolved**:
- Beat-slot alignment: time-based greedy scan at ±200 ms (research §1)
- Pitch comparison: fractional MIDI cents, ±50 cent threshold (research §2)
- Mic lifecycle: `usePracticeRecorder` starts mic on mount, new hook (research §3)
- Note synthesis: `OscillatorNode` chain with per-note envelope (research §4)
- Scoring formula: 50% pitch + 50% timing, extraneous penalise denominator (research §5)
- Exercise generation: pure function, 8 notes, C3–C4 MIDI set (research §6)
- App integration: extend `showRecording` pattern (research §7)
- Reuse map: `pitchDetection.ts` reused; all other files new (research §8)
- Test strategy: unit + component tests, no new E2E (research §9)

---

## Phase 1: Design & Contracts — Complete ✅

- **data-model.md**: All types defined — `ExerciseNote`, `Exercise`, `ResponseNote`, `NoteComparisonStatus`, `NoteComparison`, `ExerciseResult`, `PracticePhase`. State machine and scoring formula documented.
- **contracts/typescript-interfaces.md**: Module contracts for `types/practice.ts`, `exerciseGenerator`, `exerciseScorer`, `usePracticeRecorder`, `PracticeView`, and integration changes to `ScoreViewer` + `App.tsx`.
- **quickstart.md**: How to run dev server, run tests, and manually test the feature.

### Constitution Re-check (post-design)

All checks remain ✅ PASS. No new violations introduced by the design:
- Scoring is a pure function (no side effects, no external dependencies) ✓
- `usePracticeRecorder` does not modify `useAudioRecorder` (Principle VII) ✓
- Both staffs delegate all layout to `NotationLayoutEngine` (Principle VI) ✓
- No new npm packages required ✓

