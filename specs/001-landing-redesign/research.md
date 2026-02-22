# Research: Landing Screen Redesign

**Feature**: `001-landing-redesign`  
**Phase**: 0 — Research  
**Date**: 2026-02-22

---

## Decision 1: Animation Approach

**Decision**: `requestAnimationFrame` (rAF) in a `useEffect` with `useRef` for elapsed-time tracking.

**Rationale**:
- Zero new npm dependencies (all native browser APIs).
- Pause-on-hidden-tab is handled naturally: skip delta accumulation when `document.hidden` is true.
- Click-to-reset is trivial: set `elapsedRef.current = 0` in a click handler.
- `prefers-reduced-motion`: a single guard in the tick function skips position updates while glyph/color continue.
- Matches the existing codebase pattern: `LayoutRenderer.tsx` already uses an rAF loop with `FrameBudgetMonitor`.
- CSS `@keyframes` + `animation-play-state` was considered but rejected because click-to-reset requires an awkward reflow hack (remove node → rAF → re-add node) and glyph/color tick still needs JS regardless.

**Alternatives considered**:
- CSS `@keyframes` + `offset-path` (CSS Motion Path): simplest for pure position animation but requires JS for pause and reset anyway; mixing CSS animation with JS state would split the animation authority across two systems.
- Framer Motion / react-spring: not installed; adding a dependency for a single landing animation would conflict with the zero-new-deps constraint and the PWA bundle size goal.

---

## Decision 2: Movement Path

**Decision**: Lissajous figure parametric curve — x and y driven by sinusoidal functions of a normalized time parameter `t ∈ [0, 1)` with a loop duration of 8 seconds.

```
x(t) = 50 + 38 × sin(2πt)           (% of container width)
y(t) = 50 + 35 × sin(4πt + π/4)     (% of container height)
```

Initial position at `t = 0`: x ≈ 50%, y ≈ 74.7% — positioned in the lower-centre of the screen. The note visually starts "behind" the banner (which covers the top of the screen) by setting the note's `z-index` below the header, and the initial position is constrained to the upper area of the viewport by adjusting the y-offset parameter (see data-model for the chosen constants).

**Rationale**:
- The loop is mathematically perfect at `t = 1` (returns to exact `t = 0` position), eliminating any visible jump on restart.
- The figure-8/Lissajous shape covers the full viewport in both axes, making good use of the 100vw × 100vh canvas.
- Smooth and visually interesting without being distracting.
- No randomness — the path is deterministic and identical on every loop/reset (satisfying the fixed-looping-path clarification from `/speckit.clarify`).

**Adjusted initial position** (note starts behind the banner):
- The app header (banner) occupies `~50–60px` at the top — approximately `5–8%` of a typical tablet viewport.
- To start the note behind the banner, the initial y is set to `~5%` (top area), which is covered by the header. This is achieved by adjusting the y-phase offset.
- At `t = 0` with y-offset `= 0.05 (5%)`: `y(0) = 5 + 30 × sin(π/4) ≈ 26%` — not quite behind the banner.
- Alternative: set y-centre to `0` and r_y to a small value for the initial position, then adjust. **Simpler solution**: specify the note's initial position directly as `(50%, 4%)` (pixel-equivalent of the banner area) and enter the Lissajous path from there. This is done by computing `y_offset = 4 - r_y × sin(π/4)` and `x_offset = 50`.
- Final chosen constants — see `data-model.md` for the exact values used in the component.

**Alternatives considered**:
- Bouncing (linear with reflection): predictable and mechanical; less visually engaging; rejected per clarification Q1 (Option C rejected).
- Random walk: eliminated per clarification Q1 (Option A rejected).
- SVG `<animateMotion>` along a path: elegant for pure CSS/SVG but requires coordination with the React state model for glyph/color; creates two separate animation systems.

---

## Decision 3: Glyph Source and Symbol Set

**Decision**: Import the five codepoint constants from the existing `SMUFL_CODEPOINTS` map in `frontend/src/types/notation/config.ts`. Render the glyph as an HTML `<span>` with `font-family: 'Bravura'` using the existing `.music-glyph` CSS class.

| Symbol | SMuFL Name | Codepoint |
|--------|-----------|-----------|
| Whole note | noteWhole / noteheadWhole | `\uE0A2` |
| Half note (up) | noteHalfUp | `\uE1D3` |
| Quarter note (up) | noteQuarterUp | `\uE1D5` |
| Eighth note (up) | note8thUp / noteEighthUp | `\uE1D7` |
| Sixteenth note (up) | note16thUp / noteSixteenthUp | `\uE1D9` |

**Rationale**:
- Reuses the existing constant map — no hardcoded Unicode strings in the new component.
- The Bravura font is already loaded globally via `@font-face` in `frontend/src/index.css`.
- The `.music-glyph` CSS class (already in `index.css`) sets `font-family: 'Bravura'` and baseline corrections — reusing it avoids duplication.

**No-immediate-repeat algorithm**:
```
nextIdx = randomFrom([0,1,2,3,4] excluding currentIdx)
```
This is a simple `Math.floor(Math.random() * 4)` mapped to indices excluding the current, giving uniform probability over the remaining 4 glyphs.

---

## Decision 4: Color Palette

**Decision**: Use the exact hex values already defined in the play view (`LayoutRenderer.css`):

| Named Color | Hex Value | Source |
|-------------|-----------|--------|
| Black | `#000000` | Standard music notation default |
| Orange | `#FF8C00` | `LayoutRenderer.css` — highlighted notehead fill (FR-012, T030) |
| Green | `#00C853` | `LayoutRenderer.css` — pinned-position notehead fill (Feature 027) |

**Rationale**:
- Exact values sourced from the canonical play-view CSS — no guessing or approximation.
- Satisfies FR-006 and SC-003: the same shades appear on both screens.
- The three colors provide strong visual contrast against both light and dark backgrounds.

**No-immediate-repeat algorithm**: same single-exclusion pattern as glyphs — `randomFrom([0,1,2] excluding currentColorIdx)`.

---

## Decision 5: Reduced-Motion Behaviour

**Decision**: When `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true at component mount, the rAF loop runs but skips the `setPosition()` call. The note remains fixed at its initial position (`t = 0`). Glyph and color continue changing every second on the same 1Hz tick.

**Rationale**:
- Satisfies clarification Q3 (static position, glyph/color still cycle).
- Keeps the component logic unified — no second code path or separate interval timer.
- The `matchMedia` value is read once at mount (not reactively), which is sufficient because system preferences rarely change mid-session. A `change` event listener can be added in a future iteration if needed.

---

## Decision 6: Tab Visibility Pause

**Decision**: Inside the rAF tick callback, check `document.hidden`. If true, set `prevTimeRef.current = null` (discard the stale timestamp) and reschedule the next rAF without advancing `elapsedRef`. Additionally register a `visibilitychange` listener that cancels the rAF when the tab hides and restarts it when the tab regains focus.

**Rationale**:
- The `visibilitychange` + cancel approach is cleaner on low-power/mobile devices: the rAF loop does not tick at all when the tab is hidden, saving battery.
- The null-out of `prevTimeRef.current` on resume prevents a large delta jump (e.g., user returns after 30 seconds — without the null-out, the note would instantly teleport to t+30s on the path).

---

## Decision 7: Component Placement in App

**Decision**: `LandingScreen` is rendered by `ScoreViewer` in the `!score` branch (lines ~490 in `ScoreViewer.tsx`). It replaces the existing `div.no-score` / `LoadScoreButton` minimal placeholder. The component uses `position: fixed; inset: 0; z-index: 0` so it fills the full viewport behind the `.app-header` (which has a higher stacking context via `box-shadow` / natural z-order). The `LoadScoreButton` is embedded inside `LandingScreen` so the action is still accessible.

**Rationale**:
- The existing code already uses the term "landing screen" in comments (ScoreViewer.tsx lines 103, 130).
- `position: fixed; inset: 0` achieves 100vw × 100vh without altering the parent layout or `min-height: 100vh` on `.app`.
- The banner (`.app-header`) remains visible above the landing screen because it is a sibling element rendered before `<main>` in `App.tsx`, and `position: fixed` on the landing screen does not affect the header's painting order.

---

## Test Plan (Principle V Gate)

The following tests must be written first in `frontend/src/test/components/LandingScreen.test.tsx` and must fail before implementation:

| Test ID | Description | How to Test |
|---------|-------------|-------------|
| T001 | Component renders without crashing | `render(<LandingScreen />)` — check no thrown error |
| T002 | Landing screen container has `position: fixed` and covers full viewport | `getByRole('region')` or `getByTestId('landing-screen')` — check CSS class present |
| T003 | A note glyph is rendered on mount | Check a Bravura glyph character is present in the DOM |
| T004 | Glyph changes after 1 second | Use vitest fake timers, advance 1000ms, verify `textContent` has changed |
| T005 | Color changes simultaneously with glyph | Verify `color` style also changes in the same 1-second tick |
| T006 | New glyph differs from previous glyph | Over 5 consecutive seconds, no two adjacent glyphs are the same |
| T007 | Click resets position to initial | Fire click event on the note element; verify position-related state/style returns to `t=0` values |
| T008 | Reduced-motion: note does not change position over time | Mock `matchMedia` to return `reduce`; advance time; verify position style unchanged |
| T009 | Reduced-motion: glyph still changes every second | Same mock; advance 3 seconds; verify glyph changed at 1s, 2s, 3s |
| T010 | Animation pauses on tab hide | Set `document.hidden = true`; advance time; verify `elapsed` ref does not advance |

**Fake timer pattern**:
```ts
import { vi } from 'vitest';
// In beforeEach:
vi.useFakeTimers();
// Advance time:
vi.advanceTimersByTime(1000);
// Note: rAF must also be mocked — vitest fake timers mock setTimeout/setInterval
// but NOT requestAnimationFrame. Use vi.stubGlobal('requestAnimationFrame', cb => { cb(Date.now()); return 0; })
// to drive the loop synchronously in tests.
```
