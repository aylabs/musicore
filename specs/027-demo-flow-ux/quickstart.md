# Quickstart: Demo Flow UX (027)

**Branch**: `027-demo-flow-ux`  
**Date**: 2026-02-18

This document shows how to run, develop, and test this feature locally.

---

## Prerequisites

- Rust stable (≥1.79) + `wasm-pack` installed
- Node.js ≥20 + npm
- A modern Chrome/Chromium (Android or desktop) for Fullscreen API testing

---

## Setup

```bash
# 1. Switch to feature branch
git checkout 027-demo-flow-ux

# 2. Build WASM engine (only needed when backend/ changes)
cd backend
./scripts/build-wasm.sh
cd ..

# 3. Install frontend dependencies (first time only)
cd frontend
npm install
```

---

## Development Server

```bash
cd frontend
npm run dev
# Opens http://localhost:5173
```

Import any MusicXML file (or load the demo) to get a two-staff score for testing bracket centering and all playback interactions.

---

## Feature-Specific Test Scenarios

### US1 — Full-Screen Play View

1. Open the app in Chrome (desktop or Android).
2. Import a MusicXML file or load the demo.
3. Switch to the stacked layout view.
4. Verify `document.fullscreenElement` is set in the browser console.
5. Tap the return arrow → verify fullscreen exits and app returns to Instruments view.
6. Press the browser back button → verify same result.

**iOS Safari**: fullscreen will not engage (not supported on iOS for non-video elements); verify the `<header>` is hidden and the score still fills the viewport.

### US2 — Precise Score Touch Interaction

1. Load a score with multiple notes.
2. With playback stopped, tap a note head → verify playback position jumps (timer updates) but playback does NOT start.
3. Tap an empty area of the score → verify playback starts.
4. While playing, tap a note → verify seek happens without interrupting playback.
5. While playing, tap empty area → verify playback pauses.
6. Test hitbox: tap just beside a note vs. on it — verify 44 CSS px effective touch area at default zoom.

### US3 — Consolidated Playback Strip

1. Open the Play view.
2. Verify: no blue "Play View: All instruments" bar.
3. Verify: score title appears left of play/pause/stop buttons (truncated if long).
4. Verify: TempoControl (BPM) is right of the time counter.
5. Verify: no zoom +/− buttons visible.
6. Test with a long title: import a score with >40 character title → verify title truncates with `…`.

### US4 — Improved Note Highlight

1. Start playback.
2. Verify highlighted notes appear in orange (`#FF8C00`) with a visible glow.
3. Stand/sit ~60 cm from a 10-inch tablet and verify the playing note is immediately identifiable.

### US5 — Bracket Centred Between Staves

1. Load a two-staff score (piano/grand staff).
2. Verify the brace on the left of each system is visually centred between the two staff groups.
3. Resize the browser window to trigger a reflowed layout → verify bracket remains centred.

---

## Running Tests

### Frontend unit + component tests (Vitest)

```bash
cd frontend
npm run test          # run all tests once
npm run test:watch    # watch mode
```

### Frontend e2e tests (Playwright)

```bash
cd frontend
npx playwright test
```

### Backend unit tests (Rust)

```bash
cd backend
cargo test
```

### All tests (from repo root)

```bash
# Backend
cd backend && cargo test && cd ..

# Frontend
cd frontend && npm test && cd ..
```

---

## Key Files to Modify

| File | What changes |
|---|---|
| `frontend/src/components/ScoreViewer.tsx` | Full-screen API, back gesture, seek-only note tap, return arrow, pause on back |
| `frontend/src/components/layout/LayoutView.tsx` | Remove blue info bar + TempoControl from here |
| `frontend/src/components/playback/PlaybackControls.tsx` | Add `title` prop + `onReturnToView` + show TempoControl in compact mode |
| `frontend/src/components/playback/PlaybackControls.css` | Title truncation styles |
| `frontend/src/components/LayoutRenderer.tsx` | Touch hit rect, `shouldComponentUpdate`, bracket render baseline |
| `frontend/src/components/LayoutRenderer.css` | Highlight color → `#FF8C00` + glow filter |
| `frontend/src/pages/ScoreViewer.tsx` | Remove zoom control buttons |
| `frontend/src/App.tsx` | Hide header when in fullscreen/layout mode |
| `backend/src/layout/mod.rs` | `create_bracket_glyph` — `y = top_y` (top anchor) |

---

## Conventions

- All new code follows existing naming patterns: `camelCase` for React, `snake_case` for Rust.
- Tests must be written **before** the implementation (Constitution V: Test-First).
- Any bug found during implementation must result in a failing test before the fix (Constitution VII: Regression Prevention).
- Hit-testing geometry must come exclusively from the Rust layout engine (Constitution VI: Layout Engine Authority).
