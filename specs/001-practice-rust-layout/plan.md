# Implementation Plan: Migrate Practice Layout to Rust Layout Engine

**Branch**: `001-practice-rust-layout` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-practice-rust-layout/spec.md`

## Summary

The practice view currently uses `NotationLayoutEngine` (TypeScript) and `NotationRenderer` for its exercise and response staves — a divergent layout path that violates Principle VI (Layout Engine Authority). This feature migrates both staves to use the Rust/WASM `computeLayout` + `LayoutRenderer` pipeline already powering all other score views. The migration requires serializing `ExerciseNote[]` into the WASM input JSON schema, assigning stable string IDs to each exercise note for highlight tracking, building a `sourceToNoteIdMap` from those IDs (bypassing the full `Score` domain object), deriving `max_system_width` from the staff container to guarantee single-system layout, and preserving auto-scroll by looking up glyph x-positions in the returned `GlobalLayout`.

## Technical Context

**Language/Version**: TypeScript (strict), React 18, Vite  
**Primary Dependencies**: `computeLayout` / `GlobalLayout` (`wasm/layout.ts`), `LayoutRenderer` (`components/LayoutRenderer.tsx`), `buildSourceToNoteIdMap` pattern from `services/highlight/sourceMapping.ts`  
**Storage**: N/A — all data is in-memory per practice session  
**Testing**: Vitest + React Testing Library (unit/component), Playwright (e2e)  
**Target Platform**: PWA, tablet devices (iPad/Surface/Android) — offline-capable  
**Project Type**: Web — monorepo `frontend/` only (no Rust changes needed)  
**Performance Goals**: Layout computation < 100 ms; highlight glyph update < 16 ms (60 fps target from Principle III)  
**Constraints**: All exercise notes MUST render in a single scrollable system (no line-breaking); `NotationLayoutEngine` MUST NOT be imported by `PracticeView` post-migration; WASM must be initialised before layout calls  
**Scale/Scope**: Single view migration (`PracticeView.tsx`, `exerciseGenerator.ts`, `types/practice.ts`); affects 8–20 note exercises max

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Domain-Driven Design | ✅ PASS | `ExerciseNote` gains an `id` field — this is a domain field, not an infrastructure concern. The serialization adapter maps domain concepts to the WASM input schema without leaking the schema into the domain. |
| II. Hexagonal Architecture | ✅ PASS | A new `serializeExerciseToLayoutInput()` adapter function is added in a service layer. `PracticeView` calls `computeLayout` (port) via the WASM adapter. Domain types remain unchanged except for the `id` addition. |
| III. PWA Architecture | ✅ PASS | WASM is already deployed and initialised lazily by `loader.ts`. No new infrastructure introduced. |
| IV. Precision & Fidelity | ✅ PASS | Exercise notes are all quarter notes at 960 PPQ. Tick arithmetic (`slotIndex × 960`) uses integers only. |
| V. Test-First Development | ✅ PASS (enforced) | All new code (serializer, sourceToNoteIdMap builder, auto-scroll helper) must be tested before implementation. PracticeView component tests must be updated to mock `computeLayout`. |
| VI. Layout Engine Authority | ✅ FIXES VIOLATION | This migration explicitly resolves the current violation: `NotationLayoutEngine` calculating layout coordinates in TypeScript. Post-migration, `PracticeView` makes zero spatial calculations. |
| VII. Regression Prevention | ⚠️ ACTION REQUIRED | The barline overlap bug fixed by commit `41eb168` was patched in the TypeScript engine. A regression test covering barline-note x-ordering must be written as part of this migration before the TypeScript engine is removed. |

**Gate result**: PASS with one action item — regression test for barline overlap (Principle VII) must be written as part of this feature.

## Project Structure

### Documentation (this feature)

```text
specs/001-practice-rust-layout/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   ├── ExerciseLayoutInput.ts
│   └── PracticeSourceMap.ts
└── tasks.md             ← Phase 2 output (created by /speckit.tasks)
```

### Source Code (affected files)

```text
frontend/
├── src/
│   ├── types/
│   │   └── practice.ts                    ← ADD id: string to ExerciseNote
│   ├── services/
│   │   └── practice/
│   │       ├── exerciseGenerator.ts       ← generate id "ex-{slotIndex}" per note
│   │       └── practiceLayoutAdapter.ts   ← NEW: serializeExercise + buildPracticeSourceMap
│   └── components/
│       └── practice/
│           ├── PracticeView.tsx           ← SWAP NotationLayoutEngine → computeLayout + LayoutRenderer
│           ├── PracticeView.css           ← minor: LayoutRenderer container sizing
│           └── PracticeView.test.tsx      ← UPDATE: mock computeLayout instead of NotationLayoutEngine
└── tests/
    └── unit/
        └── practiceLayoutAdapter.test.ts  ← NEW: serializer + source map unit tests
```
