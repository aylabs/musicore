# Quickstart: Playback UI Fixes

**Feature**: 026-playback-ui-fixes  
**Date**: 2026-02-18

---

## Developer Quickstart

### Prerequisites

```bash
cd /Users/alvaro.delcastillo/devel/sdd/musicore/frontend
npm install   # already done
```

### Run the Dev Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Run Tests

```bash
# All tests
npm test -- --run

# Tests for this feature only
npm test -- --run --reporter=verbose MusicTimeline.replay PlaybackControls.returnToStart ScoreViewer.layout
```

### Build Production

```bash
npm run build
```

---

## Manual Test Checklist (4 bugs)

### P1 — Replay State

1. Load Canon in D (demo) or import any MusicXML file
2. Switch to "Play View" (layout view)
3. Press **Play** — wait for playback to finish naturally (do not press Stop)
4. Verify: status shows "Stopped" ✓
5. Press **Play** again (Replay)
6. Verify: only ONE score plays, no overlapping audio ✓
7. Verify: score view returns to measure 1 ✓

### P2 — Instrument Labels

1. Load a multi-instrument score (e.g., Canon in D has piano left/right hand)
2. Switch to "Play View"
3. Press **Play**
4. Scroll through all systems
5. Verify: instrument name labels on left side of each system are fully visible ✓

### P3 — Return to Start Button

1. Load any score in Play View
2. Press **Play** and let it finish (or press Stop mid-score)
3. Verify: a "⏮" or "Return to Start" button is visible and enabled ✓
4. Press the button
5. Verify: page scrolls to top, score shows measure 1, status shows "Stopped" ✓
6. Verify: pressing Play after Return to Start starts from the beginning ✓

### P4 — Container Overflow

1. Load a long score (2+ pages) in Play View
2. Press Play, let playback auto-scroll through multiple systems
3. Wait for natural end
4. Verify: page layout is correct, no extra whitespace below the score ✓
5. Verify: the score container does not extend beyond the page boundaries ✓

---

## File Map (all changes in this feature)

| File | Change |
|------|--------|
| `frontend/src/services/playback/MusicTimeline.ts` | Add cleanup to natural-end timeout (P1) |
| `frontend/src/components/playback/PlaybackControls.tsx` | Add `onReturnToStart` prop + button (P3) |
| `frontend/src/components/playback/PlaybackControls.css` | Style the new button (P3) |
| `frontend/src/components/ScoreViewer.tsx` | Wire `onReturnToStart` handler + scroll-to-top (P3, P4) |
| `frontend/src/pages/ScoreViewer.tsx` | Increase `labelMargin` 80→150; expose `scrollToTop()` (P2, P4) |
| `frontend/tests/services/MusicTimeline.replay.test.ts` | New: P1 regression test |
| `frontend/tests/components/PlaybackControls.returnToStart.test.tsx` | New: P3 unit tests |
| `frontend/tests/pages/ScoreViewer.layout.test.tsx` | New: P2, P4 layout tests |
