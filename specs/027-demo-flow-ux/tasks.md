# Tasks: Demo Flow UX

**Input**: Design documents from `specs/027-demo-flow-ux/`  
**Feature Branch**: `027-demo-flow-ux`  
**Date**: 2026-02-18  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: Maps to user story in spec.md (US1–US5)
- **[BUG]**: Bug fix task (Constitution VII: test before fix)
- Exact file paths included in every task

---

## Phase 1: Setup

**Purpose**: Establish a green baseline before any changes

- [X] T001 Run full test suite and confirm baseline green: `cd backend && cargo test` + `cd frontend && npm test` — record pass count as baseline

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Fix the `selectedNoteId` re-render bug in `LayoutRenderer` — required by US1 (selection highlight on seek) and US2 (note tap visual feedback). Must complete before US1 and US2 implementation.

**⚠️ Constitution V**: Write the failing test first (T002), verify it fails, then fix (T003).

- [X] T002 [BUG] Write failing Vitest test verifying that changing `selectedNoteId` prop alone triggers `LayoutRenderer` re-render in `frontend/src/components/LayoutRenderer.test.tsx` — test MUST fail before T003
- [X] T003 [BUG] Fix `shouldComponentUpdate` in `frontend/src/components/LayoutRenderer.tsx` to include `prevProps.selectedNoteId !== this.props.selectedNoteId` in the comparison — T002 test must now pass

**Checkpoint**: `selectedNoteId` changes now trigger re-renders. US1 and US2 can begin.

---

## Phase 3: User Story 1 — Full-Screen Play View (Priority: P1) 🎯 MVP

**Goal**: Play screen enters full-screen via `requestFullscreen` (Android) with CSS fallback (iOS); return arrow and back gesture navigate back to Instruments; playback pauses with position preserved on back-navigation.

**Independent Test**: Open Play view → assert `document.fullscreenElement` is set → tap return arrow → assert back on Instruments screen → playback timer shows preserved position.

**Covers**: FR-001, FR-002, FR-003, FR-004, SC-001

### Tests for User Story 1 ⚠️ Write first, verify fail before implementation

- [X] T004 [P] [US1] Write failing Vitest test: entering layout viewMode calls `document.documentElement.requestFullscreen` (mocked) in `frontend/src/components/ScoreViewer.test.tsx`
- [X] T005 [P] [US1] Write failing Vitest test: tapping return arrow calls `document.exitFullscreen` and pauses playback (status stays `'paused'`, tick preserved) in `frontend/src/components/ScoreViewer.test.tsx`
- [X] T006 [P] [US1] Write failing Vitest test: `popstate` event fires → viewMode switches to `'individual'` and `exitFullscreen` called in `frontend/src/components/ScoreViewer.test.tsx`

### Implementation for User Story 1

- [X] T007 [US1] Add `useEffect` watching `viewMode` in `frontend/src/components/ScoreViewer.tsx`: call `document.documentElement.requestFullscreen()` when entering `'layout'`, call `document.exitFullscreen()` when leaving — wrap in `try/catch` for iOS fallback (hide app-level chrome via CSS class `fullscreen-play` on `document.body`)
- [X] T008 [US1] Add `history.pushState({view:'layout'}, '')` when entering layout view and `window.addEventListener('popstate', handleBackGesture)` in `frontend/src/components/ScoreViewer.tsx` — `handleBackGesture` must call `exitFullscreen`, `playbackState.pause()`, `setViewMode('individual')`, and return event listener cleanup in `useEffect`
- [X] T009 [US1] Replace `rightActions` "Instruments View" button with `onReturnToView` callback pattern in `frontend/src/components/ScoreViewer.tsx`: pass `onReturnToView` prop to `PlaybackControls` that calls `exitFullscreen` + `playbackState.pause()` + `setViewMode('individual')`
- [X] T010 [US1] Hide `<header className="app-header">` in `frontend/src/App.tsx` when `viewMode === 'layout'` — receive `viewMode` via existing `onViewModeChange` prop and lift state or use CSS class `fullscreen-play` toggled on `<body>` to hide the header via `App.css`
- [X] T011 [US1] Add CSS rule in `frontend/src/App.css`: `body.fullscreen-play .app-header { display: none; }` to support iOS fallback and ensure header hidden during layout view

**Checkpoint**: US1 fully functional. Navigate Instruments → Play → full-screen → return arrow → Instruments. Playback position preserved.

---

## Phase 4: User Story 2 — Precise Score Touch Interaction (Priority: P1)

**Goal**: Note tap = seek (no auto-play); empty-area tap = toggle play/pause; 44 px minimum hit target on each notehead.

**Independent Test**: Tap note head → playback position changes, `status !== 'playing'`; tap empty area → `status === 'playing'`; every note tap registers at visible notehead.

**Covers**: FR-005, FR-006, FR-007, SC-002, SC-006, SC-007

### Tests for User Story 2 ⚠️ Write first, verify fail before implementation

- [X] T012 [P] [US2] Write failing Vitest test: calling `handleNoteClick` when `status === 'stopped'` seeks to tick without calling `play` in `frontend/src/components/ScoreViewer.test.tsx`
- [X] T013 [P] [US2] Write failing Vitest test: `LayoutRenderer.renderGlyphRun` emits a transparent `<rect>` sibling with `data-note-id`, `x/y/width/height` from `bounding_box`, and `fill="transparent"` in `frontend/src/components/LayoutRenderer.test.tsx`
- [X] T014 [P] [US2] Write failing Vitest test: `<rect>` hit overlay width and height are at least `MIN_TOUCH_PX / renderScale` (clamped) in `frontend/src/components/LayoutRenderer.test.tsx`

### Implementation for User Story 2

- [X] T015 [US2] Remove `playbackState.play()` call from `handleNoteClick` in `frontend/src/components/ScoreViewer.tsx` (seek-only — T012 test must now pass)
- [X] T016 [US2] Add transparent `<rect>` hit overlay per notehead in `renderGlyphRun` in `frontend/src/components/LayoutRenderer.tsx`: use `glyph.bounding_box.{x,y,width,height}` from layout engine; clamp `width` and `height` to `Math.max(value, MIN_TOUCH_PX / renderScale)` where `MIN_TOUCH_PX = 44`; set `data-note-id={noteId}`, `fill="transparent"`, `pointerEvents="all"`, `cursor="pointer"` — T013 and T014 tests must now pass
- [X] T017 [US2] Verify `pages/ScoreViewer.tsx` scroll container `onClick={onTogglePlayback}` already handles empty-area tap correctly (the existing delegation in `handleSVGClick` calls `stopPropagation` only on note hits) — add inline comment confirming the invariant; run T014 suite

**Checkpoint**: US2 fully functional. Note tap seeks; empty-area tap toggles; hit targets ≥44 px.

---

## Phase 5: User Story 3 — Consolidated Playback Strip (Priority: P2)

**Goal**: Remove blue instrument-count bar; score title left of buttons (truncated); `TempoControl` right of timer in compact mode; no zoom buttons; return arrow wired.

**Independent Test**: Open Play view → no blue bar; title visible (truncated if long); BPM control right of timer; no zoom +/− buttons present.

**Covers**: FR-008, FR-009, FR-010, FR-011, SC-003, SC-004

### Tests for User Story 3 ⚠️ Write first, verify fail before implementation

- [X] T018 [P] [US3] Write failing Vitest test: `LayoutView` does not render the `styles.info` div (blue bar) — no element with text matching "Play View:" in `frontend/src/components/layout/LayoutView.test.tsx`
- [X] T019 [P] [US3] Write failing Vitest test: `PlaybackControls` with `title="My Score"` and `compact={true}` renders title text left of play button in `frontend/src/components/playback/PlaybackControls.test.tsx`
- [X] T020 [P] [US3] Write failing Vitest test: `PlaybackControls` renders `TempoControl` in compact mode (previously hidden) in `frontend/src/components/playback/PlaybackControls.test.tsx`
- [X] T021 [P] [US3] Write failing Vitest test: title `"AVeryLongScoreTitleThatExceedsFortyCharactersDefinitely"` renders with CSS `text-overflow: ellipsis` class/style applied in `frontend/src/components/playback/PlaybackControls.test.tsx`

### Implementation for User Story 3

- [X] T022 [US3] Remove the `styles.info` div (blue bar: `backgroundColor: '#e3f2fd'`, "Play View: All instruments" text, and `TempoControl` wrapper inside it) from `frontend/src/components/layout/LayoutView.tsx` — T018 test must now pass
- [X] T023 [US3] Add `title?: string` prop to `PlaybackControlsProps` in `frontend/src/components/playback/PlaybackControls.tsx` and render truncated title `<span>` left of `.playback-buttons` div when `compact={true}` and `title` is provided — T019 and T021 tests must now pass
- [X] T024 [P] [US3] Add title truncation CSS in `frontend/src/components/playback/PlaybackControls.css`: `.playback-title { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 1; }`
- [X] T025 [US3] Remove `!compact` guard from `TempoControl` in `frontend/src/components/playback/PlaybackControls.tsx` so it shows in compact mode right of `PlaybackTimer` — T020 test must now pass; update any existing tests that asserted TempoControl absent in compact mode
- [X] T026 [US3] Add `onReturnToView?: () => void` prop to `PlaybackControlsProps` in `frontend/src/components/playback/PlaybackControls.tsx` and render `←` return arrow button when prop provided (replaces `rightActions` usage for Play screen)
- [X] T027 [US3] Pass `title={scoreTitle ?? undefined}` and `onReturnToView={...}` from `frontend/src/components/ScoreViewer.tsx` to `<PlaybackControls>` — remove `rightActions` usage for the layout view path
- [X] T028 [P] [US3] Remove the `styles.controls` div containing zoom +/− buttons from `frontend/src/pages/ScoreViewer.tsx` render method (`handleZoomIn`, `handleZoomOut`, `handleZoomReset` buttons and zoom label)

**Checkpoint**: US3 fully functional. Playback strip: `← Title | ▶ ⏸ ⏹ | 0:00 / 3:24 | 120 BPM`. No blue bar. No zoom buttons.

---

## Phase 6: User Story 4 — Improved Note Highlight Visibility (Priority: P3)

**Goal**: Current-beat note highlight changes from `#4A90E2` blue to `#FF8C00` orange with glow filter for maximum contrast against black notation.

**Independent Test**: Start playback → highlighted note visible in orange glow at 60 cm from screen (SC-005).

**Covers**: FR-012, SC-005

### Tests for User Story 4 ⚠️ Write first, verify fail before implementation

- [X] T029 [P] [US4] Write failing Vitest test (or CSS snapshot): `.layout-glyph.highlighted` rule has `fill: #FF8C00` (not `#4A90E2`) in `frontend/src/components/LayoutRenderer.test.tsx` or CSS snapshot

### Implementation for User Story 4

- [X] T030 [US4] Change `.highlighted` fill color from `#4A90E2` → `#FF8C00` for all highlighted SVG element selectors (`text.highlighted`, `line.highlighted`, `rect.highlighted`, `polygon.highlighted`, `.layout-glyph.highlighted`) in `frontend/src/components/LayoutRenderer.css` — T029 test must now pass
- [X] T031 [US4] Add `filter: drop-shadow(0 0 3px rgba(255, 100, 0, 0.8))` to `.layout-glyph.highlighted` rule in `frontend/src/components/LayoutRenderer.css` for glow effect visible at distance

**Checkpoint**: US4 functional. Playing note highlighted in bright orange with glow. Manually verify SC-005 at 60 cm.

---

## Phase 7: User Story 5 — Bracket Centred Between Staves (Priority: P3)

**Goal**: Brace/bracket left of multi-staff system renders top-anchored using `bounding_box.y = top_y` (Rust fix) and `dominant-baseline="hanging"` (renderer fix), eliminating the typographic-midpoint visual offset.

**Independent Test**: Load a piano (two-staff) score → bracket brace visually centred between top staff top line and bottom staff bottom line.

**Covers**: Visual polish as specified in US5

### Tests for User Story 5 ⚠️ Write first, verify fail before implementation

- [X] T032 [P] [US5] Write failing Rust test in `backend/tests/layout_test.rs`: assert `bracket_glyph.y == staves[0].staff_lines[0].y_position` for a two-staff instrument layout — test MUST fail with current `center_y` value
- [X] T033 [P] [US5] Write failing Vitest test in `frontend/src/components/LayoutRenderer.test.tsx`: bracket glyph `<text>` element has attribute `dominant-baseline="hanging"` — test MUST fail with current `"middle"` value

### Implementation for User Story 5

- [X] T034 [US5] Change `BracketGlyph.y` assignment in `create_bracket_glyph` in `backend/src/layout/mod.rs`: replace `y: (top_y + bottom_y) / 2.0` with `y: top_y` (top anchor) — T032 Rust test must now pass; run `cargo test`
- [X] T035 [US5] Change bracket `<text>` rendering in `frontend/src/components/LayoutRenderer.tsx`: replace `dominantBaseline="middle"` with `dominantBaseline="hanging"` on the bracket glyph text element — T033 TS test must now pass

**Checkpoint**: US5 functional. Bracket visually centred on piano scores. Run `cargo test` + `npm test` — all tests green.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and spec finalisation

- [X] T036 [P] Write Playwright e2e smoke test covering full demo flow: Instruments → tap Play → verify fullscreen → tap note → assert position changed, status `'stopped'` → tap empty area → assert `'playing'` → tap return arrow → assert Instruments view visible in `frontend/tests/demo-flow.spec.ts`
- [ ] T037 [P] Run `quickstart.md` all five feature-specific test scenarios manually on target device (Android tablet or desktop Chrome) — document results in a brief comment in `specs/027-demo-flow-ux/quickstart.md`
- [X] T038 Update `specs/027-demo-flow-ux/spec.md` Status from `Draft` → `Completed` and add Phase 8 to `specs/027-demo-flow-ux/tasks.md` summary

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS Phase 3 and Phase 4** (US1 and US2 need the `selectedNoteId` re-render fix)
- **Phase 3 (US1)**: Depends on Phase 2; no dependency on Phase 4
- **Phase 4 (US2)**: Depends on Phase 2; no dependency on Phase 3 — **can run parallel to Phase 3**
- **Phase 5 (US3)**: Depends on Phase 3 (return arrow wired there, passed to PlaybackControls) — should follow Phase 3
- **Phase 6 (US4)**: Depends on Phase 2 (LayoutRenderer already open) — **can run parallel to Phase 3 after Phase 2**
- **Phase 7 (US5)**: Independent of all other phases — **can run at any time after Phase 1**
- **Phase 8 (Polish)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 (foundational fix). No US dependency.
- **US2 (P1)**: Depends on Phase 2. No US dependency. **Recommended to implement before US1** (touch semantics are the biggest UX impact per plan.md).
- **US3 (P2)**: Depends on US1 (return arrow prop pattern established in Phase 3).
- **US4 (P3)**: Independent. Can be implemented after Phase 2.
- **US5 (P3)**: Independent. Can be implemented at any point.

### Within Each User Story

1. Tests MUST be written first and MUST fail before implementation
2. Core implementation tasks before integration/wiring tasks
3. CSS changes can be done in parallel to JSX when in different files
4. `cargo test` + `npm test` must stay green at every checkpoint

---

## Parallel Execution Examples

### Phase 2 (Foundational) — sequential (same file)

```
T002 (write failing test) → T003 (fix shouldComponentUpdate)
```

### Phase 3 (US1) — parallel tests, then sequential impl

```
# All 3 tests in parallel:
T004  T005  T006

# Sequential impl (all touch ScoreViewer.tsx):
T007 → T008 → T009 → T010

# T011 (App.css) can be parallel to T009/T010:
T011
```

### Phase 4 (US2) — parallel tests, then impl

```
# Tests in parallel:
T012  T013  T014

# Impl:
T015 (ScoreViewer.tsx)  |  T016 (LayoutRenderer.tsx)  — parallel (different files)
T017 (verify/comment)
```

### Phase 5 (US3) — parallel tests, then impl

```
# Tests in parallel:
T018  T019  T020  T021

# Impl:
T022 (LayoutView.tsx)  |  T028 (pages/ScoreViewer.tsx)  — parallel (different files)
T023 (PlaybackControls.tsx)
T024 (PlaybackControls.css)  — parallel to T023
T025 (PlaybackControls.tsx) → T026 (ScoreViewer.tsx, wiring)
```

### Phase 6 + Phase 7 can start in parallel after Phase 2

```
Phase 6:  T029 → T030 → T031
Phase 7:  T032 | T033  →  T034 → T035
```

---

## Implementation Strategy

### MVP: User Story 1 + User Story 2 (Phases 1–4)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational — fix shouldComponentUpdate)
3. Complete Phase 4 (US2 — touch semantics — highest UX impact)
4. Complete Phase 3 (US1 — full-screen + navigation)
5. **STOP**: Validate via `quickstart.md` US1 + US2 scenarios → demo-ready

### Incremental Delivery

After MVP (US1 + US2):
- Add Phase 5 (US3) → cleaner playback strip → demo to stakeholders
- Add Phase 6 (US4) → better highlight → demo
- Add Phase 7 (US5) → bracket fix → demo
- Phase 8: full e2e test + spec status update

---

## Summary

| Phase | Story | Tasks | Key Files |
|---|---|---|---|
| 1: Setup | — | T001 | — |
| 2: Foundational | BUG | T002–T003 | `LayoutRenderer.tsx` |
| 3: Full-Screen Play View | US1 (P1) | T004–T011 | `ScoreViewer.tsx`, `App.tsx`, `App.css` |
| 4: Touch Interaction | US2 (P1) | T012–T017 | `ScoreViewer.tsx`, `LayoutRenderer.tsx`, `pages/ScoreViewer.tsx` |
| 5: Playback Strip | US3 (P2) | T018–T028 | `LayoutView.tsx`, `PlaybackControls.tsx/.css`, `ScoreViewer.tsx`, `pages/ScoreViewer.tsx` |
| 6: Note Highlight | US4 (P3) | T029–T031 | `LayoutRenderer.css` |
| 7: Bracket Centering | US5 (P3) | T032–T035 | `backend/layout/mod.rs`, `LayoutRenderer.tsx` |
| 8: Polish | — | T036–T038 | `frontend/tests/`, `spec.md` |
| **Total** | | **38 tasks** | |

**Parallel opportunities**: 14 tasks marked [P]  
**MVP scope**: Phases 1–4 (US1 + US2) = 17 tasks  
**Independent test criteria**: Each story has explicit checkpoint and quickstart.md scenario
