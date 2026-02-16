# Quickstart: Display Improvements

**Feature**: 022-display-improvements  
**Branch**: `022-display-improvements`  
**Date**: 2026-02-16

## Prerequisites

- Rust toolchain (stable) with `wasm-pack` installed
- Node.js 18+ with npm
- Clone repository and checkout branch `022-display-improvements`

## Setup

```bash
# Install frontend dependencies
cd frontend && npm install && cd ..

# Build WASM module (needed for title extraction changes)
cd backend && ./scripts/build-wasm.sh && cd ..
```

## What This Feature Adds

### 1. Playback Timer (P1)

A real-time `MM:SS` timer in the playback controls showing elapsed / total duration. Visible in all three views (Instruments, Play, Layout).

**Key files**:
- `frontend/src/utils/timeFormatting.ts` — NEW: `formatPlaybackTime()` utility
- `frontend/src/components/playback/PlaybackTimer.tsx` — NEW: timer display component
- `frontend/src/components/playback/PlaybackControls.tsx` — MODIFIED: renders PlaybackTimer
- `frontend/src/services/playback/MusicTimeline.ts` — MODIFIED: exposes `totalDurationTicks`

**Quick verification**:
```bash
cd frontend && npm test -- --run timeFormatting
```

### 2. Score Title (P2)

Displays the score title extracted from MusicXML metadata (`<work-title>` > `<movement-title>` > filename fallback).

**Key files**:
- `backend/src/domain/importers/musicxml/parser.rs` — MODIFIED: extracts title elements
- `backend/src/domain/importers/musicxml/types.rs` — MODIFIED: new title fields
- `backend/src/domain/importers/musicxml/mod.rs` — MODIFIED: populates ImportMetadata
- `backend/src/adapters/wasm/bindings.rs` — MODIFIED: passes title through WASM
- `frontend/src/services/wasm/music-engine.ts` — MODIFIED: adds metadata to WasmImportResult
- `frontend/src/components/ScoreViewer.tsx` — MODIFIED: displays title in header

**Quick verification**:
```bash
cd backend && cargo test musicxml_import -- --test-threads=1
cd frontend && npm test -- --run ScoreViewer
```

### 3. Tempo Control in Layout View (P3)

Adds the existing `TempoControl` component to the Layout View, positioned to the right of zoom controls.

**Key files**:
- `frontend/src/components/layout/LayoutView.tsx` — MODIFIED: renders TempoControl
- `frontend/src/components/ScoreViewer.tsx` — MODIFIED: passes playbackStatus to LayoutView

**Quick verification**:
```bash
cd frontend && npm test -- --run LayoutView
```

## Running All Tests

```bash
# Backend tests (includes title extraction)
cd backend && cargo test

# Frontend unit tests
cd frontend && npm test

# Frontend E2E tests
cd frontend && npx playwright test
```

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Timer in `PlaybackControls` (not per-view) | Single rendering point shared across all views |
| Title extraction in Rust parser (not frontend JS) | Single source of truth; both CLI and WASM paths share the parser |
| Title stored in component state (not `Score` interface) | Avoids modifying the backend domain model for a UI concern |
| `TempoControl` rendered in `LayoutView` (not page-level ScoreViewer) | LayoutView is a function component that can use hooks; page-level ScoreViewer is a class component |
| `playbackStatus` prop (not context) | Explicit data flow; parent already has the value |
