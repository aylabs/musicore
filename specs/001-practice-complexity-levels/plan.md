# Implementation Plan: Practice Complexity Levels

**Branch**: `001-practice-complexity-levels` | **Date**: 2026-03-01 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/001-practice-complexity-levels/spec.md`

## Summary

Add a three-level complexity selector (Low / Mid / High) to the Practice plugin's configuration sidebar. Selecting a level pre-fills all exercise parameters (tempo, note count, clef, pitch range) in one tap, replacing manual per-parameter configuration as the primary entry point. Individual controls remain accessible via an Advanced panel. The selected level persists across app restarts via `localStorage`. The exercise generator already supports all required configurations; this feature is a UI-only change within `frontend/plugins/practice-view/`.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Vite 7  
**Primary Dependencies**: Vitest 4, Playwright 1.58 — no new npm packages required  
**Storage**: `localStorage` key `practice-complexity-level-v1` (browser, cross-restart)  
**Testing**: Vitest (unit/component), Playwright (E2E)  
**Target Platform**: Tablet + desktop browsers (PWA); Chrome 57+, Safari 11+; offline-capable  
**Project Type**: Web application (monorepo: `backend/` Rust + `frontend/` React PWA)  
**Performance Goals**: UI feedback within 16 ms (60 fps); session start ≤15 s per SC-001 — no change to WASM pipeline  
**Constraints**: Plugin ESLint boundary — `plugins/practice-view/` MUST NOT import from `src/`; `localStorage` access is permitted directly (same pattern as existing `sessionStorage` use in PracticePlugin line 113)  
**Scale/Scope**: Single component change within one plugin; 6 files touched; no backend changes

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Domain-Driven Design | ✓ PASS | `ComplexityLevel` is a first-class domain concept with ubiquitous-language names (Low/Mid/High); modelled as a named union type in `practiceTypes.ts` |
| II. Hexagonal Architecture | ✓ PASS | Change lives entirely in the plugin layer; no core domain mutation |
| III. PWA Architecture | ✓ PASS | `localStorage` is offline-compatible; no network dependency introduced |
| IV. Precision & Fidelity | ✓ PASS | No timing changes; BPM values are integers |
| V. Test-First Development | ✓ PASS | Tests written before implementation; unit + component + E2E coverage required |
| VI. Layout Engine Authority | ✓ N/A | No coordinate or layout calculations introduced |
| VII. Regression Prevention | ✓ PASS | Existing `exerciseGenerator.test.ts` and `PracticePlugin.test.tsx` must remain green; new tests guard new behaviour |

**Post-design re-check** (after Phase 1): All principles still satisfied — no new violations introduced by the Advanced panel disclosure or `localStorage` persistence pattern.

## Project Structure

### Documentation (this feature)

```text
specs/001-practice-complexity-levels/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: codebase audit + decisions
├── data-model.md        # Phase 1: entities + state transitions
├── quickstart.md        # Phase 1: dev + test commands
├── contracts/
│   └── complexity-levels.ts  # TypeScript type contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (changed files only)

```text
frontend/
├── plugins/
│   └── practice-view/
│       ├── practiceTypes.ts            # Add ComplexityLevel + COMPLEXITY_PRESETS
│       ├── PracticePlugin.tsx          # Add selector UI, state, localStorage
│       ├── PracticePlugin.css          # Add .practice-level-* styles
│       ├── exerciseGenerator.test.ts   # Extend: assert preset constants
│       └── PracticePlugin.test.tsx     # Extend: selector, badge-clear, persist
└── e2e/
    └── practice-complexity-levels.spec.ts  # New: SC-001 through SC-004
```

**Structure Decision**: Web application (Option 2 monorepo). All changes are confined to `frontend/plugins/practice-view/` plus a new e2e spec file. No backend changes. No new directories needed.

## Complexity Tracking

No constitution violations. No complexity justification required.
