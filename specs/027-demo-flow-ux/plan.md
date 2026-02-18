# Implementation Plan: Demo Flow UX

**Branch**: `027-demo-flow-ux` | **Date**: 2026-02-18 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/027-demo-flow-ux/spec.md`

## Summary

Transform the Musicore Play screen into an immersive, demo-quality experience:
full-screen playback (OS-level via Fullscreen API on Android, CSS fallback on iOS),
correct touch semantics (seek-on-tap, empty-tap = pause/resume, 44 px hit targets),
a consolidated single-row playback strip (title + controls + tempo, no blue bar, no
zoom buttons), a return arrow replacing the "Instruments View" button, improved note
highlight visibility (orange glow), and bracket centering fix for multi-staff scores.

All changes are frontend-only except for one Rust layout engine fix (bracket y-anchor).
No new persisted entities or REST/WASM API surfaces. Research is in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript (React 18 + Hooks), Rust stable ≥1.79  
**Primary Dependencies**: React, Vite, Vitest, Playwright, Tone.js, wasm-bindgen, History API, Fullscreen API  
**Storage**: N/A — no new or changed storage  
**Testing**: Vitest (unit/component), Playwright (e2e), `cargo test` (Rust)  
**Target Platform**: Tablet PWA — Android Chrome (primary, Fullscreen API reliable); iOS Safari (secondary, CSS fallback)  
**Project Type**: Web application (frontend + Rust WASM backend)  
**Performance Goals**: Seek ≤300 ms, pause/resume ≤150 ms, 60 fps rendering, touch targets ≥44×44 CSS px  
**Constraints**: Constitution V (tests before implementation), Constitution VI (hitbox from layout engine geometry only), Fullscreen API iOS limitation, existing test suite must stay green  
**Scale/Scope**: 12 FRs, 5 user stories, 7 SCs; ~9 frontend files modified, 1 Rust file modified; no new files required

## Constitution Check

*GATE: Must pass before implementation. Checked again after Phase 1 design — see below.*

| Principle | Status | Notes |
|---|---|---|
| I. Domain-Driven Design | ✅ Pass | No domain model changes; pure UI/UX feature |
| II. Hexagonal Architecture | ✅ Pass | Bracket centering fix belongs in layout engine (correct layer); frontend receives updated `BracketGlyph.y` |
| III. PWA Architecture | ✅ Pass | Fullscreen API degrades gracefully on iOS (documented in research.md R-001 and spec assumptions) |
| IV. Precision & Fidelity | ✅ Pass | No timing arithmetic changes; seek uses existing `seekToTick` |
| V. Test-First Development | ⚠️ **GATE** | All implementation steps must be preceded by failing tests. See phase breakdown for test plan. |
| VI. Layout Engine Authority | ⚠️ **GATE** | Touch hit-rect MUST use `bounding_box` from Rust layout engine. No coordinate computation in frontend. See R-002 in research.md. |
| VII. Regression Prevention | ✅ Pass | Any bug found during implementation must get a failing test before fix |

**Gate compliance plan**:
- Constitution V: Each phase begins by writing a failing test that exercises the target behaviour, then implements.
- Constitution VI: `LayoutRenderer` hit rect will use `glyph.bounding_box.{x,y,width,height}` — values that arrive from WASM layout engine. The only frontend computation is `max(value, MIN_TOUCH_PX / renderScale)` clamping, which is a display-layer concern (analogous to permitted CSS scaling).

**Post-design Constitution Check** — Re-evaluated after Phase 1 design:
- No new violations introduced by interface changes in data-model.md.
- `PlaybackControlsProps.title` truncation is CSS-only — no spatial computation in frontend.
- `BracketGlyph.y` semantic change communicated to both Rust (mod.rs) and TypeScript (LayoutRenderer.tsx) simultaneously to preserve invariant.

## Project Structure

### Documentation (this feature)

```text
specs/027-demo-flow-ux/
├── plan.md              ← this file
├── research.md          ← Phase 0: all unknowns resolved
├── data-model.md        ← Phase 1: interface changes
├── quickstart.md        ← Phase 1: dev + test guide
├── contracts/
│   └── internal-interfaces.md   ← Phase 1: TypeScript interface changes
├── checklists/
│   └── requirements.md ← already written
└── tasks.md             ← Phase 2 output (not yet created)
```

### Source Code (modified files)

```text
backend/
└── src/
    └── layout/
        └── mod.rs               # create_bracket_glyph: y = top_y (top anchor)

frontend/
├── src/
│   ├── App.tsx                  # Hide <header> in layout/fullscreen mode
│   ├── components/
│   │   ├── ScoreViewer.tsx      # Full-screen API, back gesture, seek-only note
│   │   │                        # tap, return arrow, pause on back
│   │   ├── ScoreViewer.css      # Remove/adapt score-title-bar styles
│   │   ├── LayoutRenderer.tsx   # Touch hit rect (bounding_box), shouldComponentUpdate,
│   │   │                        # bracket render baseline change
│   │   ├── LayoutRenderer.css   # Highlight color → #FF8C00, glow filter
│   │   └── layout/
│   │       └── LayoutView.tsx   # Remove blue info bar + TempoControl
│   │   └── playback/
│   │       ├── PlaybackControls.tsx  # Add title + onReturnToView + TempoControl
│   │       │                         # in compact mode, right of timer
│   │       └── PlaybackControls.css  # Title truncation styles
│   └── pages/
│       └── ScoreViewer.tsx      # Remove zoom control buttons
└── tests/
    └── (component tests alongside source files — *.test.tsx)
```

**Structure Decision**: Option 2 (Web application). Changes span both `backend/` (one Rust function) and `frontend/` (React components and CSS).

## Implementation Phases

### Phase 1 — Touch Interaction Semantics (US2, P1)

**Spec coverage**: FR-005, FR-006, FR-007, SC-002, SC-006, SC-007  
**Why first**: Fixes the highest-impact UX bug (note tap starts playback). Independent of all other phases.

**Changes**:
1. `ScoreViewer.tsx` (component) `handleNoteClick`: remove `playbackState.play()` — seek only.
2. `LayoutRenderer.tsx` `shouldComponentUpdate`: add `selectedNoteId` to guard condition.
3. `LayoutRenderer.tsx` `renderGlyphRun`: add transparent `<rect>` hit overlay per notehead using `glyph.bounding_box`, minimum 44 CSS px at render scale.

**Test plan (write first)**:
- `PlaybackControls.test.tsx` — note tap does not start playback when stopped (unit test)
- `LayoutRenderer.test.tsx` — `selectedNoteId` change triggers re-render (unit test)
- `LayoutRenderer.test.tsx` — hit rect rendered with correct `bounding_box` attributes and `data-note-id` (unit test)
- Playwright e2e: tap note → assert `status === 'stopped'` remains; tap empty area → assert `status === 'playing'`

---

### Phase 2 — Full-Screen Play View + Navigation (US1, P1)

**Spec coverage**: FR-001, FR-002, FR-003, FR-004, SC-001  
**Depends on**: Phase 1 (play screen structure must be correct before adding fullscreen)

**Changes**:
1. `ScoreViewer.tsx` (component): `useEffect` on `viewMode` — call `requestFullscreen()` on entry to `'layout'`; call `exitFullscreen()` on exit. Wrap in try/catch for iOS fallback.
2. `ScoreViewer.tsx`: Push `history.pushState({view:'layout'}, '')` on layout entry; `window.addEventListener('popstate', handleBackGesture)` to switch back to `'individual'` and exit fullscreen.
3. `ScoreViewer.tsx`: Replace `rightActions` "Instruments View" button with a return arrow button (`←`) that calls `exitFullscreen()` + `playbackState.pause()` + `setViewMode('individual')`.
4. `App.tsx`: Conditionally hide `<header>` when `viewMode === 'layout'` — pass `viewMode` up via `onViewModeChange` callback (already wired).

**Test plan (write first)**:
- `ScoreViewer.test.tsx` — entering layout mode calls `document.requestFullscreen` (mock)
- `ScoreViewer.test.tsx` — tapping return arrow calls `exitFullscreen` + pauses playback
- `ScoreViewer.test.tsx` — `popstate` event triggers view mode switch back to `'individual'`
- Playwright e2e: navigate Play → tap return arrow → verify on Instruments screen

---

### Phase 3 — Consolidated Playback Strip (US3, P2)

**Spec coverage**: FR-008, FR-009, FR-010, FR-011, SC-003, SC-004  
**Depends on**: Phase 2 (return arrow integration into `rightActions` or `onReturnToView`)

**Changes**:
1. `LayoutView.tsx`: Remove `styles.info` div entirely (blue bar + "Play View: All instruments" text + TempoControl).
2. `PlaybackControls.tsx`: Add `title?: string` prop — render truncated title left of playback buttons in compact mode.
3. `PlaybackControls.tsx`: Show `<TempoControl>` in compact mode (right of timer). Remove the `!compact` guard from `TempoControl`.
4. `PlaybackControls.tsx`: Add `onReturnToView?: () => void` prop — render return arrow button (replace `rightActions` usage for Play screen).
5. `PlaybackControls.css`: Add title truncation styles (`max-width`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`).
6. `ScoreViewer.tsx` (component): Pass `title={scoreTitle ?? undefined}` and `onReturnToView={...}` to `PlaybackControls`. Remove `rightActions` pass-through.
7. `pages/ScoreViewer.tsx`: Remove the `styles.controls` div containing zoom +/− buttons.

**Test plan (write first)**:
- `PlaybackControls.test.tsx` — title renders left of buttons in compact mode
- `PlaybackControls.test.tsx` — title truncates with ellipsis when long (>40 chars) — controls still visible
- `PlaybackControls.test.tsx` — TempoControl renders in compact mode right of timer
- `PlaybackControls.test.tsx` — return arrow button rendered when `onReturnToView` provided
- Snapshot test: compact mode renders match expected layout

---

### Phase 4 — Improved Note Highlight (US4, P3)

**Spec coverage**: FR-012, SC-005  
**Depends on**: Phase 1 (LayoutRenderer already modified)

**Changes**:
1. `LayoutRenderer.css`: Change `.highlighted` fill color from `#4A90E2` → `#FF8C00`.
2. `LayoutRenderer.css`: Add `filter: drop-shadow(0 0 3px rgba(255, 100, 0, 0.8))` to `.layout-glyph.highlighted`.

**Test plan (write first)**:
- `LayoutRenderer.test.tsx` (or snapshot): highlighted note class applies `#FF8C00` fill
- Manual SC-005 test at 60 cm viewing distance

---

### Phase 5 — Bracket Centred Between Staves (US5, P3)

**Spec coverage**: SC-001 (visual quality), no direct FR — spec says bracket centred  
**Depends on**: None (independent Rust + renderer change)

**Changes**:
1. `backend/src/layout/mod.rs` `create_bracket_glyph`: Change `y` from `center_y` → `top_y`. Update `bounding_box.y` remains `top_y` (unchanged).
2. `frontend/src/components/LayoutRenderer.tsx` bracket render: Change `dominant-baseline` on bracket glyph `<text>` from `"middle"` → `"hanging"`, and render at y = `bracket_glyph.y` (now meaning top, not center).

**Test plan (write first)**:
- `backend/tests/layout_test.rs`: Add assertion that `bracket_glyph.y == staves[0].staff_lines[0].y_position` for a two-staff instrument.
- `LayoutRenderer.test.tsx`: Bracket text element has `dominant-baseline="hanging"` attribute.
- Visual regression via Playwright screenshot comparison (if available).

## Complexity Tracking

No Constitution violations. No complexity budget consumed.
| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
