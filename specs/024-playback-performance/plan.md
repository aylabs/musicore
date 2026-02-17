# Implementation Plan: Playback & Display Performance Optimization

**Branch**: `024-playback-performance` | **Date**: 2026-02-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/024-playback-performance/spec.md`

## Summary

Optimize score playback and interactive display performance for phones and tablets by eliminating three critical bottlenecks: (1) replacing full SVG DOM teardown/rebuild with incremental highlight patching via `data-note-id` attributes, (2) replacing O(n) linear note scanning with O(log n) binary search using a pre-sorted `HighlightIndex`, and (3) decoupling the 60 Hz tick broadcast from React state updates using `requestAnimationFrame` + refs. Mobile defaults to 30 Hz visual updates; audio scheduling is always prioritized over visual updates (audio-first degradation policy). Target: scores up to 10,000 notes on devices from 2020 onwards.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), React 18+ (UI framework)
**Primary Dependencies**: Tone.js (audio engine), React (rendering), SMuFL/Bravura (music font), WASM layout engine (Rust backend)
**Storage**: N/A (no persistence changes)
**Testing**: Vitest (unit tests), Playwright (E2E tests), `performance.now()` instrumentation
**Target Platform**: Tablet and phone devices (iPad/Android tablets, iPhone/Android phones), browsers: Chrome 57+, Safari 11+, Edge 16+
**Project Type**: Web application (frontend-only changes for this feature)
**Performance Goals**: <4ms/frame highlight updates, 30 Hz mobile / 60 Hz desktop visual updates, zero audio glitches, ≥50% CPU reduction during playback
**Constraints**: Audio-first degradation (visual updates sacrificed before audio), main-thread only (no AudioWorklet), SVG rendering retained, devices from 2020+
**Scale/Scope**: Scores up to 10,000 notes on supported devices

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Domain-Driven Design | ✅ PASS | No domain model changes. `HighlightIndex` is a performance adapter around existing domain Note entities. Ubiquitous language preserved. |
| II | Hexagonal Architecture | ✅ PASS | Changes are in infrastructure/adapter layer (React components, services). No core domain modifications. Rendering remains an adapter consuming layout engine output. |
| III | Progressive Web Application | ✅ PASS | PWA architecture preserved. All changes improve offline-capable playback performance. No new network dependencies. WASM boundary untouched. |
| IV | Precision & Fidelity | ✅ PASS | 960 PPQ resolution unchanged. Tick arithmetic remains integer-based. Binary search operates on existing tick values. |
| V | Test-First Development | ✅ PASS | Performance benchmarks will be written as tests. Existing E2E tests must continue passing (SC-006). New unit tests for `HighlightIndex`, `HighlightPatch`, frame budget monitor. |
| VI | Layout Engine Authority | ✅ PASS | No spatial calculations added to renderer. `data-note-id` attributes are metadata tags, not geometric data. Layout engine remains sole authority for positions/spacing. |
| VII | Regression Prevention | ✅ PASS | Known audio glitch and tempo degradation bugs documented. Regression tests will be created for each before fixes are applied. Performance benchmarks added as CI checks. |

**Gate Result**: ✅ ALL PASS — Proceed to Phase 0.

### Post-Design Re-check (after Phase 1)

| # | Principle | Status | Post-Design Notes |
|---|-----------|--------|-------------------|
| I | DDD | ✅ PASS | `HighlightIndex`, `IndexedNote`, `HighlightPatch` are infrastructure types projecting from `Note`. Ubiquitous language maintained. |
| II | Hexagonal | ✅ PASS | All new code in `frontend/src/services/` (adapter layer). `HighlightIndex` is a query adapter. No core domain changes. |
| III | PWA | ✅ PASS | No new network dependencies. `deviceDetection.ts` uses browser APIs. Works offline. No WASM changes. |
| IV | Precision | ✅ PASS | Binary search on integer ticks. `endTick = start_tick + duration_ticks` is integer arithmetic at 960 PPQ. |
| V | TDD | ✅ PASS | Contracts defined first. Quickstart specifies tests per step. Benchmarks as testable criteria. |
| VI | Layout Engine Authority | ✅ PASS | `data-note-id` is metadata (identifier), not spatial data. CSS class toggling does not alter geometry. |
| VII | Regression Prevention | ✅ PASS | Three known bugs documented. Regression tests required before fixes. Performance benchmarks as CI checks. |

**Post-Design Gate Result**: ✅ ALL PASS — No violations. No complexity justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/024-playback-performance/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── LayoutRenderer.tsx          # MODIFY: add data-note-id, split componentDidUpdate, add updateHighlights()
│   │   ├── LayoutRenderer.css          # MODIFY: add .highlighted class-based styling
│   │   └── layout/
│   │       └── LayoutView.tsx          # MINOR: pass highlightedNoteIds via ref instead of props
│   ├── pages/
│   │   └── ScoreViewer.tsx             # MODIFY: decouple auto-scroll from React state
│   ├── services/
│   │   ├── highlight/
│   │   │   ├── computeHighlightedNotes.ts  # REPLACE: O(n) → O(log n) binary search
│   │   │   ├── useNoteHighlight.ts         # MODIFY: stable Set reference, rAF-driven
│   │   │   ├── sourceMapping.ts            # UNCHANGED
│   │   │   └── HighlightIndex.ts           # NEW: pre-sorted note index with binary search
│   │   ├── playback/
│   │   │   ├── MusicTimeline.ts            # MODIFY: rAF + ref instead of setInterval + setState
│   │   │   ├── NoteHighlightService.ts     # REMOVE: consolidate into HighlightIndex
│   │   │   ├── PlaybackScheduler.ts        # UNCHANGED
│   │   │   ├── ScrollController.ts         # MODIFY: rAF-based throttling
│   │   │   └── ToneAdapter.ts              # UNCHANGED
│   │   └── hooks/
│   │       └── usePlaybackScroll.ts        # MODIFY: use consolidated highlight, rAF scroll
│   └── utils/
│       ├── renderUtils.ts                  # UNCHANGED
│       └── deviceDetection.ts              # NEW: mobile detection utility
└── tests/
    └── (Vitest unit tests + Playwright E2E tests)
```

**Structure Decision**: Web application (frontend-only). All changes are in `frontend/src/` — no backend/Rust changes needed. This is a pure frontend performance optimization within the existing hexagonal adapter layer.

## Complexity Tracking

> No constitution violations. No complexity justifications required.
