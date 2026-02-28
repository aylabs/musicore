# Implementation Plan: Play Score Plugin

**Branch**: `033-play-score-plugin` | **Date**: 2026-02-27 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/033-play-score-plugin/spec.md`

## Summary

Convert `ScoreViewer.tsx` playback experience into a self-contained core full-screen plugin (`play-score`). The migration has two phases: a **foundational phase** (Plugin API v2 → v3) that adds a `context.scorePlayer` namespace and `context.components.ScoreRenderer` host component, then a **plugin phase** that builds `frontend/plugins/play-score/` on top of the v3 API. All playback interactions (seek, pin/loop, tempo) are preserved with zero regression (SC-002). `ScoreViewer.tsx` is retained during transition.

---

## Technical Context

**Language/Version**: TypeScript 5 (React 18), Rust stable + wasm-pack (WASM; no new Rust changes in this feature)  
**Primary Dependencies**: React 18, Vite, wasm-pack/wasm-bindgen, Tone.js (audio), Vitest + React Testing Library, Playwright  
**Storage**: N/A — scores are bundled static assets (6 MXL files); `<input type="file">` for user scores; no database  
**Testing**: Vitest + RTL (unit/integration), Playwright (e2e); cargo test (no new Rust tests)  
**Target Platform**: Tablet PWA — iPad, Surface, Android tablets; Chrome 57+, Safari 11+, Edge 16+  
**Project Type**: Web monorepo (frontend/ React PWA + backend/ Rust/WASM); all new code in `frontend/`  
**Performance Goals**: Score ready-to-play < 3 s after WASM init (SC-003); note highlight at 60 fps via `tickSourceRef` rAF loop; UI interactions within 16 ms  
**Constraints**: No TypeScript layout engine (Principle VI); plugin must not import from `src/` (FR-016); offline-capable (Principle III); long-press threshold ≥ 500 ms (FR-008); `PluginScoreRendererProps` carries no coordinates  
**Scale/Scope**: 1 new plugin + 1 API version extension; ~15 new/modified files; 6 preloaded scores

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Requirement | Status |
|-----------|-------------|--------|
| I. Domain-Driven Design | Score, PlaybackPosition, PinState, LoopRegion, TempoState use ubiquitous language from spec | ✅ PASS |
| II. Hexagonal Architecture | Plugin accesses all host services via `context.*` only (FR-016); `usePlayback`/`useTempoState`/`MusicXMLImportService` wired as adapters behind `context.scorePlayer` | ✅ PASS |
| III. PWA Architecture | Full-screen plugin, offline-capable, WASM-rendered; bundled static score assets | ✅ PASS |
| IV. Precision & Fidelity | All tick math uses existing 960 PPQ integer pipeline from `usePlayback`; no new floating-point tick arithmetic | ✅ PASS |
| V. Test-First Development | Unit tests (Vitest/RTL) for all plugin state machine paths; integration tests for `scorePlayerContext`; Playwright e2e (SC-006). Tests written before implementation | ✅ PASS |
| VI. Layout Engine Authority | FR-004: Rust/WASM renderer only. FR-016: no TypeScript layout in plugin. `PluginScoreRendererProps`: only tick ints and opaque note ID sets cross the boundary — no coordinates | ✅ PASS |
| VII. Regression Prevention | SC-002: zero observable regression. SC-005: audio teardown test. SC-006: Playwright regression suite. Any implementation bug → failing test before fix | ✅ PASS |

**Gate result: PASS — no violations.**

**Post-design re-check (after research.md + data-model.md + contracts/)**:

| Check | Result |
|-------|--------|
| `PluginScoreRendererProps` — no geometry? | ✅ `currentTick`, `highlightedNoteIds`, `loopRegion.{startTick,endTick}`, `pinnedNoteIds` — all semantic |
| `ScorePlayerState` — no internal types leaked? | ✅ No `Note[]`, `Score`, or `ImportResult` — derived primitives only |
| Plugin pin/loop state machine — no DOM? | ✅ Pure tick arithmetic; DOM stays on host side inside `ScoreRendererPlugin` |
| `getCatalogue()` — no `path` field? | ✅ `PluginPreloadedScore` omits path; host resolves (FR-013) |

---

## Project Structure

### Documentation (this feature)

```text
specs/033-play-score-plugin/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings (R-001 – R-010)
├── data-model.md        ← entities, state machines, relationships
├── quickstart.md        ← step-by-step implementation guide with test specs
├── contracts/
│   └── plugin-api-v3.ts ← canonical TypeScript API contract
├── checklists/
│   └── requirements.md  ← all 16 FRs green
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/
├── plugins/
│   └── play-score/                           [NEW — Phase B]
│       ├── plugin.json
│       ├── index.tsx
│       ├── PlayScorePlugin.tsx
│       ├── PlayScorePlugin.css
│       ├── PlayScorePlugin.test.tsx
│       ├── scoreSelectionScreen.tsx
│       └── playbackToolbar.tsx
│
└── src/
    ├── plugin-api/
    │   ├── types.ts                           [MODIFIED — Phase A1: v3 additions]
    │   └── scorePlayerContext.ts              [NEW — Phase A2: host implementation]
    ├── components/
    │   └── plugins/
    │       ├── ScoreRendererPlugin.tsx        [NEW — Phase A3: host ScoreRenderer]
    │       └── PluginView.tsx                 [MODIFIED — Phase A4: inject v3 ctx]
    └── services/
        └── plugins/
            └── builtinPlugins.ts              [MODIFIED — Phase B4: register plugin]

frontend/e2e/
└── play-score-plugin.spec.ts                [NEW — Phase B5: Playwright e2e]
```

**Structure Decision**: Web application (monorepo). All new code in `frontend/`. Follows the established plugin conventions from features 030 and 031: one directory under `frontend/plugins/<name>/`, registration in `builtinPlugins.ts`, v3 context injected in `PluginView.tsx`.

---

## Complexity Tracking

No constitution violations requiring justification.

| Decision | Rationale |
|----------|-----------|
| `context.scorePlayer` namespace (not top-level) | Consistent with `context.recording` (v2); avoids polluting top-level context |
| `subscribe()` push model | Matches `context.recording.subscribe`; re-renders only on state change |
| `getCurrentTickLive()` escape hatch | `tickSourceRef` can't cross plugin boundary; thin getter is minimal surface for 60 Hz rAF |
| `getCatalogue()` omits `path` | FR-013 compliance; host is the sole path resolver |
| `ScoreRenderer` is host-provided | All spatial/long-press/hit-test logic stays on host — Principle VI enforced |
