# Research: Display Improvements

**Feature**: 022-display-improvements  
**Date**: 2026-02-16

## Research Area 1: Playback Timer — Duration Calculation & Time Formatting

### Decision: Calculate `totalDurationTicks` in `usePlayback` hook

**Rationale**: The `usePlayback` hook already receives `notes: Note[]` and `tempo: number`, which are all the inputs needed to calculate total score duration. Exposing `totalDurationTicks` as a new field on `PlaybackState` requires zero wiring changes — the consuming component (`ScoreViewer.tsx`) already destructures `playbackState`.

**Alternatives considered**:
- Calculate in the consuming component (ScoreViewer.tsx): Rejected — duplicates the `allNotes` dependency and separates timer logic from playback logic.
- Calculate in a separate hook: Rejected — over-engineered; the data is already available in `usePlayback`.

### Decision: Convert ticks to seconds using existing `ticksToSeconds()` with tempo multiplier

**Rationale**: `ticksToSeconds(ticks, tempo)` in `PlaybackScheduler.ts` already provides the base conversion (PPQ=960). The tempo multiplier adjustment (`duration / tempoMultiplier`) is already used in `play()` for the auto-stop timeout. For the timer, elapsed seconds = `ticksToSeconds(currentTick, tempo) / tempoMultiplier`, and total = `ticksToSeconds(totalDurationTicks, tempo) / tempoMultiplier`.

**Alternatives considered**:
- Create new conversion utilities: Rejected — would duplicate existing `ticksToSeconds()`.

### Decision: Create a new `timeFormatting.ts` utility with `formatPlaybackTime(seconds: number): string`

**Rationale**: No existing time formatting utility exists. The function converts seconds to `MM:SS` (or `H:MM:SS` for durations ≥ 1 hour). This is a pure function, easily testable, and reusable.

**Alternatives considered**:
- Use a library (e.g., dayjs, date-fns): Rejected — overkill for a single formatting function; adds bundle weight.
- Inline formatting in the component: Rejected — harder to test and reuse.

### Decision: Create a `PlaybackTimer` component rendered inside `PlaybackControls`

**Rationale**: `PlaybackControls` is rendered once at the `ScoreViewer` component level, shared across all three views. Adding the timer here automatically satisfies FR-005 ("visible in all views"). The timer naturally fits after the playback buttons, before the TempoControl.

**Alternatives considered**:
- Render timer per-view: Rejected — `PlaybackControls` is already the shared UI point; duplicating per-view would violate DRY.

## Research Area 2: Score Title — MusicXML Metadata Extraction

### Decision: Extract title in the Rust MusicXML parser (not in frontend JavaScript)

**Rationale**: 
1. The `ImportMetadata` struct already has `work_title` and `composer` fields — they're just hardcoded to `None` with TODO comments.
2. Both native (CLI/test) and WASM paths share the same parser — extracting in Rust serves both.
3. The parser follows a streaming pattern (`quick-xml` `Reader`) where adding new element handlers follows an established pattern.
4. The `WasmImportResult` already serializes `ImportMetadata` via Serde — the frontend TypeScript interface just needs to add the `metadata` field.

**Alternatives considered**:
- Extract in frontend before WASM call (parse XML in JS, extract title, then pass to WASM): Rejected — would parse the XML twice and only help the WASM path.
- Extract in frontend after WASM call from the raw XML: Rejected — frontend shouldn't duplicate parser logic.

### Decision: Title precedence — `work-title` > `movement-title` > filename

**Rationale**: The MusicXML spec treats `<work-title>` as the canonical composition title and `<movement-title>` as a movement-specific title. Per the feature spec (FR-009, FR-010, FR-011), `work-title` takes precedence. The filename fallback happens in the frontend since the parser doesn't have the filename context.

**Alternatives considered**:
- Use `movement-title` first (as some tools recommend): Rejected — the spec explicitly prioritizes `work-title`.
- Also extract `<credit-words>` title: Rejected for now — credit elements are positional (for rendering layout) and not semantic metadata. Two of the test fixtures have title data only in `<credit-words>`, but this introduces complexity (need to match `<credit-type>title</credit-type>`).

### Decision: Store title in frontend state alongside the score, not in the `Score` interface

**Rationale**: The `Score` interface is a domain model shared between Rust and TypeScript via the WASM boundary. Adding a `title` field to `Score` would require changing the backend domain model, the Serde serialization, and all existing tests. Instead, the title is stored as part of component state —  alongside `score`, `fileState`, etc. — sourced from `ImportMetadata` on import.

**Alternatives considered**:
- Add `title` to `Score` interface: Rejected — breaks the backend domain model boundary for a UI concern.
- Add `title` to a dedicated ScoreMetadata context: Rejected — over-engineered for a single string.

## Research Area 3: Tempo Control in Layout View

### Decision: Render `TempoControl` inside `LayoutView.tsx` (functional component)

**Rationale**: `LayoutView` is a function component that can use React hooks (specifically `useTempoState()`). The page-level `ScoreViewer` is a class component that cannot use hooks. Rendering `TempoControl` inside `LayoutView` avoids any class component integration complexity.

**Alternatives considered**:
- Render via render-prop on page-level ScoreViewer: Rejected — over-engineered; would require threading `disabled` through class component props.
- Wrap class component in a function component that adds TempoControl: Rejected — unnecessary indirection.
- Convert page-level ScoreViewer to a function component: Rejected — out of scope; large refactor.

### Decision: Add `playbackStatus` prop to `LayoutViewProps`

**Rationale**: `TempoControl` needs `disabled={status === 'playing'}`. The parent (`components/ScoreViewer.tsx`) already has `playbackState.status` and can pass it to `LayoutView`. This is a 1-line prop addition.

**Alternatives considered**:
- Create a playback status context: Rejected — over-engineered; the parent already has the value.
- Have TempoControl always enabled in Layout View: Rejected — violates FR-017 (disabled during playback).

## Research Area 4: Existing Test Fixtures

### MusicXML fixtures with title data

| File | `<work-title>` | `<movement-title>` | Notes |
|------|-----------------|---------------------|-------|
| `backend/music/scales.musicxml` | "Untitled score" | — | Good test case for `work-title` extraction |
| `backend/music/1bar.musicxml` | "Untitled score" | — | Alternative test fixture |
| `tests/fixtures/musicxml/CanonD.musicxml` | — | — | Only has `<credit-words>` title — good test for filename fallback |
| `tests/fixtures/musicxml/simple_melody.musicxml` | — | — | No title at all — good test for filename fallback |

**Action**: A test fixture with `<movement-title>` should be created for complete coverage. The existing `CanonD.musicxml` can test the filename-fallback path.
