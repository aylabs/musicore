# Implementation Plan: Practice from Score

**Branch**: `034-practice-from-score` | **Date**: 2026-02-28 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/034-practice-from-score/spec.md`

## Summary

Add a third "Score" preset option to the Practice plugin. When selected, the user picks a score via a host-provided score selection dialog (reused from the Play Score plugin). The host extracts the first N pitched notes (top note of chords, rests skipped) from the topmost staff/voice of the score's primary part and returns them as a flat `{ midiPitch }[]` list via a new `context.scorePlayer.extractPracticeNotes()` Plugin API v4 method. A new `context.components.ScoreSelector` host-provided component surfaces the selection UI. The Practice plugin generates the exercise from these pitches using a new `generateScoreExercise()` helper; all exercise mechanics remain identical to the Random and C4 Scale presets.

---

## Technical Context

**Language/Version**: TypeScript 5 (React 18), Rust stable + wasm-pack (no new Rust changes)  
**Primary Dependencies**: React 18, Vite, Vitest + React Testing Library, Playwright  
**Storage**: N/A — preloaded scores are bundled static assets; `<input type="file">` for user files; no database  
**Testing**: Vitest + RTL (unit/integration), Playwright (e2e); no new Rust tests  
**Target Platform**: Tablet PWA — iPad, Surface, Android tablets; Chrome 57+, Safari 11+, Edge 16+  
**Project Type**: Web monorepo (frontend/ React PWA + backend/ Rust/WASM); all new code in `frontend/`  
**Performance Goals**: Score dialog open < 200 ms; note extraction < 50 ms after load; exercise ready-to-start matching existing SC-001 target (< 15 s total)  
**Constraints**: Plugin MUST NOT import from `src/` (ESLint boundary); clef/octave controls visible-but-disabled when Score preset active; no TypeScript layout engine (Principle VI); offline-capable (Principle III)  
**Scale/Scope**: 1 plugin modified, 1 API method + 1 API component + 1 type added (v4 patch); ~10 modified/new files

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Requirement | Status |
|-----------|-------------|--------|
| I. Domain-Driven Design | `PluginScorePitches`, `ScoreExerciseSource` use ubiquitous music domain language; no "data blob" or "content" terminology leaking into the API | ✅ PASS |
| II. Hexagonal Architecture | Practice plugin accesses all new capabilities via `context.scorePlayer.extractPracticeNotes()` and `context.components.ScoreSelector`; zero `src/` imports from plugin code; host owns dialog, note extraction, and clef derivation | ✅ PASS |
| III. PWA Architecture | Score selection works offline (bundled catalogue); user file loading requires no network; feature fully offline-capable | ✅ PASS |
| IV. Precision & Fidelity | Exercise onset timings use existing `expectedOnsetMs = slotIndex × (60_000 / bpm)` formula unchanged; no floating-point timing modifications | ✅ PASS |
| V. Test-First Development | Contract tests for `extractPracticeNotes()` written before implementation; unit tests for `generateScoreExercise()` before implementation; Practice plugin tests updated before UI changes | ✅ PASS |
| VI. Layout Engine Authority | No spatial calculations in plugin or new API types; `PluginScorePitches` carries only MIDI integers and a clef string — no coordinates | ✅ PASS |
| VII. Regression Prevention | SC-003 (zero regression on existing flow/step/MIDI/mic functionality) enforced; any implementation bug → failing test first | ✅ PASS |

**Gate result: PASS — no violations.**

**Post-design re-check (after research.md + data-model.md + contracts/)**:

| Check | Result |
|-------|--------|
| `PluginScorePitches` — no geometry? | ✅ `midiPitch` integers + `clef` string + `title` + `totalAvailable` — all semantic |
| `ScoreSelector` props — no DOM/spatial? | ✅ Catalogue list + callbacks only — no coordinates |
| `extractPracticeNotes` — host-only extraction? | ✅ Rust Note[] pipeline used internally; plugin receives flat output |
| Practice plugin — no `src/` imports for new code? | ✅ All new capabilities via `context.*`; `generateScoreExercise()` is plugin-internal using only pitch integers |

---

## Project Structure

### Documentation (this feature)

```text
specs/034-practice-from-score/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings (R-001 – R-006)
├── data-model.md        ← entities, state machines, relationships
├── quickstart.md        ← step-by-step implementation guide with test specs
├── contracts/
│   └── plugin-api-v4.ts ← canonical TypeScript API contract (v4 patch)
├── checklists/
│   └── requirements.md  ← all 13 FRs green
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/
├── plugins/
│   └── practice-view/                          [MODIFIED — all practice plugin changes]
│       ├── practiceTypes.ts                    [MODIFIED — preset + PluginScorePitches mirror type]
│       ├── exerciseGenerator.ts                [MODIFIED — new generateScoreExercise()]
│       ├── PracticePlugin.tsx                  [MODIFIED — Score preset, ScoreSelector overlay]
│       ├── PracticePlugin.test.tsx             [MODIFIED — tests for Score preset flows]
│       └── PracticePlugin.css                  [MODIFIED — disabled controls label style]
│
└── src/
    ├── plugin-api/
    │   ├── types.ts                            [MODIFIED — PluginScorePitches, ScoreSelector, extractPracticeNotes]
    │   └── scorePlayerContext.ts               [MODIFIED — extractPracticeNotes() implementation]
    ├── components/
    │   └── plugins/
    │       ├── ScoreSelectorPlugin.tsx          [NEW — host-side ScoreSelector component]
    │       └── PluginView.tsx                  [MODIFIED — inject ScoreSelector into context.components]
    └── services/
        └── plugins/
            └── scorePlayerContext.test.ts      [MODIFIED — extractPracticeNotes() contract tests]
```

**Structure Decision**: Web application (monorepo). All new code in `frontend/`. Follows established plugin conventions from features 031 and 033: plugin receives new capabilities via `context.*`; host implements in `src/plugin-api/` and `src/components/plugins/`.

---

## Complexity Tracking

No constitution violations requiring justification.

| Decision | Rationale |
|----------|-----------|
| `extractPracticeNotes()` on `scorePlayer` (not a separate namespace) | Consistent with existing `scorePlayer` scope; the method reads from the currently-loaded score — it is a natural extension of the score player context already used for `getCatalogue/loadScore` |
| `ScoreSelector` as a host-provided component in `context.components` | Keeps dialog UI (catalogue list + file picker) host-owned, maintains ESLint boundary; reuses the same dialog behaviour as the Play Score plugin without duplicating code in the plugin |
| Practice plugin manages its own score load lifecycle via existing `loadScore()` + `subscribe()` | No new loading primitives needed; the v3 API already handles loading and status transitions; the new `extractPracticeNotes()` just adds a read operation on top of the loaded score |
| Plugin caches `PluginScorePitches` across preset switches (US3) | Avoids re-opening dialog when switching back to Score preset; implemented purely in plugin state with no new API surface |
| Notes slider maximum capped to `scorePitches.totalAvailable` when Score preset | FR-006; handled purely in plugin render logic — no new API needed |

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
