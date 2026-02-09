# Implementation Plan: Score Tempo Change Support

**Branch**: `008-tempo-change` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-tempo-change/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to adjust playback tempo (50%-200% range) in real-time using increment/decrement buttons (+/-1% per click, +/-10% on long-press) without changing pitch. Display current and effective tempo (BPM + percentage). Persist tempo preferences per score across sessions. Provide reset button to return to 100% (original tempo).

**Technical Approach**: Frontend-focused feature (95%). Add tempo adjustment multiplier to playback state. Modify PlaybackScheduler to apply tempo multiplier to note timing. Add UI controls with increment/decrement buttons and tempo display. Persist tempo preferences in browser localStorage keyed by score ID. Backend remains unchanged (tempo adjustment is playback-only, does not modify domain model).

## Technical Context

**Language/Version**: 
- Backend: Rust 1.82+ (stable)
- Frontend: TypeScript 5.9, React 19.2

**Primary Dependencies**: 
- Backend: Axum 0.7 (REST API), in-memory repository
- Frontend: Tone.js 14.7 (audio synthesis with time-stretching), Vite 7.2, Vitest 4.0

**Storage**: 
- Backend: In-memory (no persistence)
- Frontend: Browser localStorage for tempo preferences

**Testing**: 
- Backend: cargo test (minimal changes expected)
- Frontend: Vitest unit tests, React Testing Library component tests

**Target Platform**: Web application (modern browsers with Web Audio API support)

**Project Type**: Web (backend + frontend monorepo)

**Performance Goals**: 
- Tempo change applies within 100ms of user adjustment
- UI updates in <50ms (real-time display)
- No audio glitches during tempo adjustment
- Smooth playback at all tempo settings (50%-200%)

**Constraints**: 
- Must use time-stretching (preserve pitch when changing tempo)
- Tempo adjustment must not modify domain model (Score/TempoEvent remain unchanged)
- Compatible with existing playback infrastructure (ToneAdapter, PlaybackScheduler)
- Works with scores that have no tempo marking (default 120 BPM)

**Scale/Scope**: 
- Single-user application (no concurrent playback sessions)
- Typical scores: 100-1000 notes
- Tempo preferences stored per score (dozens of scores per user)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅

**Status**: COMPLIANT

- Tempo adjustment is a **playback concern**, not a domain modification
- `TempoEvent` domain entity remains unchanged (represents score's intended tempo)
- Tempo multiplier lives in playback layer (adapter), not domain layer
- Clear separation: Score defines tempo, playback applies adjustment
- **Ubiquitous language preserved**: "tempo adjustment" vs "tempo change" (domain)

### II. Hexagonal Architecture ✅

**Status**: COMPLIANT

- **Core domain**: Score/TempoEvent/BPM remain unchanged (inward layer)
- **Application layer**: No new use cases in domain (playback is adapter concern)
- **Adapter layer**: Tempo adjustment implemented in frontend playback services
- **Dependency rule**: Frontend depends on backend API, not vice versa
- **Port/Adapter**: PlaybackScheduler (adapter) applies tempo multiplier to timing

### III. API-First Development ✅

**Status**: COMPLIANT

- **No backend API changes required** (tempo adjustment is client-side only)
- Tempo preferences stored in browser (localStorage), not server
- Frontend and backend remain independently deployable
- If future server-side preference storage needed, follows existing REST patterns

### IV. Precision & Fidelity ✅

**Status**: COMPLIANT

- **Domain timing unchanged**: Score remains at 960 PPQ resolution
- Tempo multiplier applied during playback scheduling (integer math preserved)
- No floating-point timing mutations to domain model
- Time-stretching happens in Tone.js (audio layer), not timeline layer

### V. Test-First Development ✅

**Status**: COMPLIANT (TDD Required)

- **Unit tests**: Tempo multiplier calculation, tempo display formatting
- **Component tests**: Increment/decrement buttons, long-press behavior
- **Integration tests**: PlaybackScheduler with tempo adjustment applies correctly
- **localStorage tests**: Persistence and retrieval of tempo preferences

**Test Strategy**:
1. Write failing tests for tempo multiplier logic
2. Implement tempo state management
3. Write failing tests for UI controls (increment/decrement)
4. Implement button components with long-press detection
5. Write failing tests for PlaybackScheduler tempo application
6. Modify PlaybackScheduler to apply tempo multiplier to note timing

**GATE PASSED**: All 5 principles satisfied. Proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/008-tempo-change/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated, may be empty)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/          # No changes (tempo adjustment is playback-only)
│   ├── adapters/api/    # No changes (no new API endpoints)
│   └── ...
└── tests/               # No new tests (backend unchanged)

frontend/
├── src/
│   ├── components/
│   │   └── PlaybackControls/
│   │       ├── TempoControl.tsx          # NEW: Tempo adjustment UI
│   │       ├── TempoControl.test.tsx     # NEW: Component tests
│   │       ├── TempoDisplay.tsx          # NEW: BPM + percentage display
│   │       └── TempoDisplay.test.tsx     # NEW: Display tests
│   │
│   ├── services/
│   │   ├── playback/
│   │   │   ├── PlaybackScheduler.ts      # MODIFIED: Apply tempo multiplier
│   │   │   ├── PlaybackScheduler.test.ts # MODIFIED: Add tempo tests
│   │   │   └── TempoPreferences.ts       # NEW: localStorage utils
│   │   │
│   │   └── state/
│   │       └── PlaybackStateContext.tsx  # NEW: Tempo state management
│   │
│   ├── hooks/
│   │   ├── useTempoAdjustment.ts         # NEW: Tempo control logic
│   │   ├── useTempoAdjustment.test.ts    # NEW: Hook tests
│   │   └── useLongPress.ts               # NEW: Long-press detection
│   │
│   └── types/
│       └── playback.ts                   # MODIFIED: Add TempoAdjustment type
│
└── tests/
    ├── unit/
    │   └── TempoMultiplier.test.ts       # NEW: Calculation tests
    └── integration/
        └── TempoPlayback.test.ts         # NEW: End-to-end tempo tests
```

**Structure Decision**: Web application with frontend-only changes. Backend `backend/` and `frontend/` directories already established. Feature adds new components, hooks, and services in frontend with modifications to existing PlaybackScheduler. No backend changes required (tempo adjustment is playback-only and does not modify domain model).

**Key Files**:
- **PlaybackScheduler.ts**: Modified to apply `tempoMultiplier` to note scheduling times
- **TempoControl.tsx**: Increment/decrement buttons with long-press (+/- 1%, hold for +/- 10%)
- **TempoDisplay.tsx**: Shows "120 BPM (100%)" or "96 BPM (80% of 120 BPM)"
- **TempoPreferences.ts**: localStorage utilities for persisting tempo per score
- **PlaybackStateContext.tsx**: React Context for managing tempo adjustment state

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: NOT APPLICABLE

All 5 Constitution principles passed without violations. No complexity tracking needed.

Feature maintains clean architecture:
- Frontend-only changes (no backend modifications)
- Adapter layer implementation (preserves hexagonal boundaries)
- No new domain concepts (tempo adjustment is playback concern)
- TDD compliance (tests before implementation)
- Integer precision maintained (960 PPQ unchanged)

---

## Post-Phase 1 Constitution Re-Evaluation

**Date**: 2026-02-09  
**Status**: Phase 0 (research.md) and Phase 1 (data-model.md, contracts/, quickstart.md) complete

### Re-Evaluation Results

After completing Phase 0 research and Phase 1 design, re-evaluate all 5 Constitution principles:

#### I. Domain-Driven Design ✅

**Status**: STILL COMPLIANT

**Design Confirmation**:
- ✅ `TempoState` interface (frontend/src/types/playback.ts) is adapter layer, not domain
- ✅ `TempoPreference` interface (frontend/src/services/playback/) is infrastructure, not domain
- ✅ `TempoStateContext` (React Context) is UI adapter, not domain
- ✅ `PlaybackScheduler.scheduleNotes()` modified in adapter layer only
- ✅ Domain entities (Score, TempoEvent, BPM) remain unchanged
- ✅ Ubiquitous language: "tempo adjustment" (adapter) vs "tempo event" (domain)

**Verdict**: No domain pollution. Tempo adjustment correctly modeled as playback adapter concern.

#### II. Hexagonal Architecture ✅

**Status**: STILL COMPLIANT

**Design Confirmation**:
- ✅ Core domain (inner layer): Score, TempoEvent, BPM - NO CHANGES
- ✅ Application layer (use cases): No new use cases in domain
- ✅ Adapter layer (outer layer): All 10 new/modified files in frontend adapters
  - PlaybackScheduler (primary adapter for tempo multiplier)
  - TempoStateContext (UI state adapter)
  - TempoPreferences (localStorage infrastructure adapter)
  - TempoControl, TempoDisplay (UI components)
  - useLongPress (UI interaction adapter)
- ✅ Dependency rule: Adapters depend inward, domain has no frontend dependencies
- ✅ Ports: No new ports needed (tempo multiplier passed as parameter)

**Verdict**: Perfect hexagonal separation maintained. All changes in outer adapter layer.

#### III. API-First Development ✅

**Status**: STILL COMPLIANT

**Design Confirmation**:
- ✅ No backend REST API changes (contracts/README.md documents this)
- ✅ No new endpoints created
- ✅ No database schema changes
- ✅ Frontend/backend independently deployable (frontend-only changes)
- ✅ Internal TypeScript contracts documented (PlaybackScheduler, TempoStateContext)
- ✅ Future server-side persistence follows REST patterns (documented but not implemented)

**Verdict**: API-First principle respected. No backend API surface changes.

#### IV. Precision & Fidelity ✅

**Status**: STILL COMPLIANT

**Design Confirmation**:
- ✅ Domain 960 PPQ unchanged (ticks remain integer throughout)
- ✅ Tempo multiplier applied AFTER tick→time conversion (preserves precision)
  - Formula: `adjustedTime = ticksToSeconds(ticks, tempo) / tempoMultiplier`
  - Ticks (integer) → seconds (float) → apply multiplier (float)
- ✅ No floating-point mutations to domain model (Score/TempoEvent)
- ✅ `MIN_NOTE_DURATION` (50ms) enforced after tempo adjustment
- ✅ Audio layer (Tone.js) handles timing, not domain layer

**Verdict**: Integer tick precision preserved. Tempo multiplier correctly applied in float seconds domain.

#### V. Test-First Development ✅

**Status**: STILL COMPLIANT

**Design Confirmation**:
- ✅ TDD workflow documented in quickstart.md (8 test files before 8 implementation files)
- ✅ Test structure defined:
  - 5 unit test files (TempoStateContext, useLongPress, TempoPreferences, PlaybackScheduler, TempoDisplay)
  - 2 component test files (TempoControl, TempoDisplay)
  - Integration tests (MusicTimeline with tempo)
- ✅ Test-first sequence documented:
  1. Write failing tests
  2. Implement minimal code to pass
  3. Verify tests pass
  4. Proceed to next component
- ✅ Success criteria (SC-001 through SC-008) testable

**Verdict**: TDD approach fully documented and enforceable. Test files identified before implementation.

### Final Gate Status

**GATE PASSED** ✅ - All 5 Constitution principles remain satisfied after Phase 1 design.

**Proceed to Phase 2**: Generate tasks.md using `/speckit.tasks` command.

**No architecture violations introduced.** Feature 008 design is clean, maintainable, and follows all Musicore architecture principles.
