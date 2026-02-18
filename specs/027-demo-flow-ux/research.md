# Research: Demo Flow UX (027)

**Date**: 2026-02-18  
**Branch**: `027-demo-flow-ux`  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## R-001: Full-Screen Mechanism

**Question**: What approach — `requestFullscreen`, PWA standalone, or both — should be used for the "full-screen Play screen" requirement?

**Decision**: Option A — invoke `document.documentElement.requestFullscreen()` when the user enters the Play (layout) view. Exit fullscreen when returning to the Instruments view or when back gesture is detected.

**Rationale**:
- The primary demo target is an Android tablet, where `requestFullscreen` is reliable and hides OS chrome (status bar, navigation bar) for maximum score area.
- iOS Safari supports `requestFullscreen` only on specific elements and with limitations; the fallback is to hide app-level chrome (hide the React `<header>` during layout mode), which still provides a full-screen-like experience.

**Implementation approach**:
1. In `ScoreViewer.tsx` (component), `useEffect` watching `viewMode`: call `document.documentElement.requestFullscreen()` when `viewMode === 'layout'`; call `document.exitFullscreen()` otherwise.
2. Wrap in `try/catch` — on iOS or permission denial, fall through to CSS-only fallback.
3. CSS fallback: hide `app-header` (via body class `fullscreen-play` or conditional rendering in `App.tsx` based on `viewMode`).
4. Wrap fullscreen invocation in a user-gesture handler; calling it during a state update may not qualify as a user gesture on some browsers — call from the button click handler that triggers `setViewMode('layout')`.

**Alternatives considered**:
- PWA standalone (B): hides browser chrome but not OS widgets. Insufficient for maximum score area on Android.
- Both A+C: overkill; adds complexity without meaningful benefit over A alone.

**Relevant code**: `frontend/src/components/ScoreViewer.tsx` (viewMode state), `frontend/src/App.tsx` (header rendering).

---

## R-002: Touch Hit-Testing for Notes

**Question**: Do note tap targets match the visual note head, or are they too small for reliable tablet use?

**Decision**: Add transparent `<rect>` touch-target overlays around each notehead using `bounding_box` from the Rust layout engine (Constitution VI compliant). The rect must be at least 44×44 CSS px (per tablet touch target guidelines) at the current render scale.

**Rationale**:
- Current hit area: the browser SVG hit of a `<text>` element rendered at `font-size=40` layout units × `BASE_SCALE=0.5` = ~20 CSS px per unit. Noteheads are small glyphs — actual tap area may be 10–20 CSS px, well below the 44 px minimum.
- Current implementation: pure event delegation on `<svg>` root; `data-note-id` placed on `<g>` wrapper of each glyph run; no explicit hit rect.
- Fix: In `LayoutRenderer.tsx`, inside `renderGlyphRun()`, append a transparent `<rect>` sibling to the glyph `<g>`, positioned using `glyph.bounding_box` (already available from layout engine). The rect carries `data-note-id` and has `fill="transparent"` and `pointer-events="all"`. Size clamped to ensure ≥44px physical — achieved by using `max(bounding_box.width, 44/renderScale)` × `max(bounding_box.height, 44/renderScale)`.

**Constitution VI compliance**: All spatial geometry (bounding_box x, y, width, height) comes from the Rust layout engine. Frontend only centers and clamps — no independent coordinate calculation.

**Relevant code**: `frontend/src/components/LayoutRenderer.tsx` `renderGlyphRun()` at L715–L750; `glyph.bounding_box`.

---

## R-003: Note Highlight Visibility

**Question**: Is the existing `#4A90E2` blue highlight visible enough for the demo? What concrete visual improvement resolves US4?

**Decision**: Increase visual salience of the highlighted note by (1) using a more vivid/contrasting color, (2) adding a background glow effect via SVG `filter: drop-shadow`, and (3) scaling the highlighted `<text>` element slightly.

**Rationale**:
- Current color `#4A90E2` is a mid-blue, similar in luminance to the black score on a white background. On a complex score it can be hard to spot.
- Orange (`#FF6B00`) is already used for "selected" notes and provides maximum contrast against black staff notation.
- A subtle highlight ring / glow is achievable entirely in CSS `filter` on `.highlighted` elements without touching layout geometry.

**Decision on color**: Change playback highlight from `#4A90E2` → `#FF8C00` (dark orange), consistent with the selection color family, maximum contrast against black note stems.

**Decision on glow**: Add `filter: drop-shadow(0 0 3px rgba(255, 100, 0, 0.8))` to `.layout-glyph.highlighted` in `LayoutRenderer.css`. No SVG structural changes needed.

**Alternatives considered**:
- Vertical spanning bar: deferred per spec clarification (only if SC-005 not met by enhanced highlight).
- Larger font-size on highlight: causes layout shift as glyph size changes; rejected.
- Yellow highlight: lower contrast against white background than orange.

**Relevant code**: `frontend/src/components/LayoutRenderer.css` (`.highlighted` rules, L16–L52).

---

## R-004: Bracket/Brace Visual Centering

**Question**: Why does the brace appear off-center between staves, and what is the minimal correct fix?

**Decision**: Fix the Rust `create_bracket_glyph` function to use `dominant-baseline: "hanging"` semantics — set `BracketGlyph.y = top_y` and change the SVG renderer to render the glyph at `y = top_y` with `dominant-baseline: "auto"` (top-aligned), relying purely on `scale_y` for height, which eliminates dependence on the font's typographic midpoint.

**Root cause**: The current contract sets `bracket_glyph.y = center_y` and renders with `dominant-baseline: "middle"`. This aligns the font's typographic midpoint (not the visual geometric center of U+E000 brace) to `center_y`, producing a vertical offset because Bravura's brace glyph has unequal whitespace above/below its typographic axis.

**Alternative fix considered**: Reading actual glyph ascent/descent from Bravura metadata JSON (`backend/assets/bravura_metadata.json`) and computing a correction offset. Rejected as higher complexity — the top-anchored approach is simpler and deterministic.

**Relevant code**:
- `backend/src/layout/mod.rs` `create_bracket_glyph()` at L1456 — set `y = top_y`
- `frontend/src/components/LayoutRenderer.tsx` ~L583 — change bracket `transform` and baseline attribute

---

## R-005: Note Tap → Seek Semantics (handleNoteClick)

**Question**: The current `handleNoteClick` in `ScoreViewer.tsx` (component) calls `seekToTick()` then `play()`. To implement seek-only (no auto-play), what is the minimal change?

**Decision**: Remove the `playbackState.play()` call from `handleNoteClick`. The `seekToTick()` call alone updates the tick position without starting playback. Empty-area taps already propagate to `onTogglePlayback` (scroll container `onClick` in `pages/ScoreViewer.tsx`) which toggles play/pause — this is already working correctly.

**Additional fix needed**: `shouldComponentUpdate` in `LayoutRenderer.tsx` does not include `selectedNoteId` in its guard condition. This means tapping a note changes `selectedNoteId` state but may not trigger a re-render, so the orange selection highlight does not appear. Add `selectedNoteId` to `shouldComponentUpdate`'s comparison.

**Relevant code**:
- `frontend/src/components/ScoreViewer.tsx` `handleNoteClick()` at ~L312–L322 — remove `.play()` call
- `frontend/src/components/LayoutRenderer.tsx` `shouldComponentUpdate()` at L139–L145 — add `selectedNoteId` comparison
- `frontend/src/pages/ScoreViewer.tsx` — `onClick={onTogglePlayback}` on scroll container already handles empty-tap correctly (no change needed)

---

## R-006: Back Gesture Navigation

**Question**: How can the PWA intercept the device back gesture and use it to navigate from Play → Instruments?

**Decision**: Use the History API. When entering layout view, push a new history entry (`history.pushState({view: 'layout'}, '')`). Listen for `popstate` event — when fired, switch `viewMode` back to `'individual'` and exit fullscreen.

**Rationale**: PWAs can intercept the browser/OS back gesture via `popstate`. Pushing a history entry when entering Play mode means the back button/gesture pops that entry and fires `popstate`, allowing clean navigation without leaving the SPA.

**Relevant code**: `frontend/src/components/ScoreViewer.tsx` — add `history.pushState` in the return-arrow click handler; add `window.addEventListener('popstate', ...)` in `useEffect`.

---

## Summary: All NEEDS CLARIFICATION Resolved

| Unknown | Status | Decision |
|---------|--------|---------|
| Full-screen mechanism | ✅ | `requestFullscreen` on Android; CSS fallback on iOS |
| Note hitbox size | ✅ | Transparent `<rect>` from `bounding_box`, ≥44px |
| Highlight visibility improvement | ✅ | Color → `#FF8C00`, add drop-shadow glow |
| Bracket centering root cause | ✅ | Typographic midpoint mismatch; fix: top-anchor strategy |
| Seek-on-tap auto-play removal | ✅ | Remove `.play()` from `handleNoteClick` |
| `selectedNoteId` re-render bug | ✅ | Add to `shouldComponentUpdate` |
| Back gesture | ✅ | History API `popstate` |
