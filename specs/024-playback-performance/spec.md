# Feature Specification: Playback & Display Performance Optimization

**Feature Branch**: `024-playback-performance`  
**Created**: 2026-02-17  
**Status**: Draft  
**Input**: User description: "Improve score playback and interactive display performance especially for phones and tablets. Canon in D demo has audio glitches on mobile phones. Larger scores like Moonlight Sonata (4932 notes) can be scrolled smoothly on tablets but playback is too slow — auto-scrolling and highlighting make it impossible to reproduce music fluently."

## Clarifications

### Session 2026-02-17

- Q: Should audio scheduling move to an AudioWorklet (separate thread) or stay on the main thread with rendering optimizations? → A: Main-thread optimizations only (Option B). AudioWorklet deferred to a future feature after performance issues are resolved.
- Q: When frame budget is exceeded on low-end devices, what should be sacrificed first? → A: Audio-first policy. Always prioritize audio scheduling; skip highlight and scroll visual updates when frame budget is exceeded.
- Q: What is the minimum supported device tier for performance targets? → A: Devices from 2020 onwards (5-year window): iPhone 11 / Pixel 4a / Samsung A51 or newer.
- Q: What is the maximum score size that must meet performance targets? → A: 10,000 notes. Covers most solo/chamber repertoire. Scores beyond 10K (full orchestral) deferred to a future spec.
- Q: What should be the normal-operation highlight update frequency on mobile vs desktop? → A: 30 Hz on mobile, 60 Hz on desktop. Mobile defaults to half-rate updates to preserve CPU headroom for audio.

## Problem Analysis

During playback the system performs three expensive operations every 16ms (60 Hz):

1. **React state update** — `setCurrentTick()` triggers a full React render cycle 60 times per second.
2. **O(n) highlight recomputation** — `computeHighlightedNotes()` linearly scans *all* notes to find which are currently playing, allocating a new `Set` each frame even when the highlighted notes haven't changed.
3. **Full SVG DOM teardown and rebuild** — `LayoutRenderer.renderSVG()` destroys every SVG child element and recreates the entire DOM tree from scratch whenever `highlightedNoteIds` changes by reference, which happens every frame.

On a 4932-note score this means ~5000 SVG elements are destroyed and ~5000 recreated **60 times per second**, competing with the audio thread for CPU time. Desktop machines absorb this; mobile devices cannot, producing audio glitches (small scores) or unplayable slowdowns (large scores).

### Root Cause Map

| Bottleneck | Severity | File | Lines |
|---|---|---|---|
| Full SVG teardown/rebuild on every highlight change | **CRITICAL** | `LayoutRenderer.tsx` | `componentDidUpdate` → `renderSVG()` |
| O(n) linear scan of all notes per frame | HIGH | `computeHighlightedNotes.ts` | `computeHighlightedNotes()` |
| New `Set` allocation every 16ms regardless of change | HIGH | `useNoteHighlight.ts` | `useMemo` on `currentTick` |
| React `setState` at 60 Hz broadcasting tick to entire tree | MODERATE | `MusicTimeline.ts` | `setCurrentTick()` in `setInterval(16)` |
| Duplicate highlight computation in two code paths | LOW | `NoteHighlightService.ts` + `useNoteHighlight.ts` | — |
| No sub-system virtualization (all glyphs in visible systems rendered) | LOW | `LayoutRenderer.tsx` | `renderGlyphRun()` |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Glitch-Free Playback on Mobile Phones (Priority: P1)

A user opens the Canon in D demo on a mobile phone and presses play. The music plays smoothly from start to finish with no audio glitches, stutters, or timing irregularities, while notes are highlighted and the score scrolls to follow playback.

**Why this priority**: Audio quality is the primary user experience. Glitchy audio on the most common device class (phones) makes the app feel broken. This must be fixed before any visual refinements matter.

**Independent Test**: Load Canon in D on a mid-range Android phone (e.g., Pixel 7a or Samsung A54) and an iPhone SE. Play the full score. Verify zero audible glitches across three consecutive full playthroughs.

**Acceptance Scenarios**:

1. **Given** the Canon in D demo is loaded on a mobile phone, **When** the user presses play, **Then** the music plays to completion with no audible glitches, pops, or timing irregularities
2. **Given** playback is active on a mobile phone, **When** notes are highlighted and the score auto-scrolls, **Then** audio playback remains smooth and uninterrupted
3. **Given** a mobile phone with moderate CPU load (browser tabs open), **When** the user plays a score, **Then** audio quality remains acceptable with at most minor visual frame drops
4. **Given** the device transitions between portrait and landscape during playback, **When** the layout recomputes, **Then** audio continues without interruption

---

### User Story 2 — Fluent Large Score Playback on Tablets (Priority: P1)

A user opens the Moonlight Sonata (4932 notes) on a tablet and presses play. The music plays at correct tempo with synchronized highlighting and smooth auto-scrolling, with no perceptible slowdown compared to the experience without highlight/scroll features.

**Why this priority**: Large scores are a key use case (classical repertoire). If playback degrades proportionally to score size, the app is limited to simple pieces. This and US1 together cover the full device × score-size matrix.

**Independent Test**: Load Moonlight Sonata on an iPad (9th gen or newer) and a mid-range Android tablet. Play the full score. Measure that playback tempo matches the specified BPM within ±2% and that highlight updates are visually smooth.

**Acceptance Scenarios**:

1. **Given** a 4932-note score is loaded on a tablet, **When** the user presses play, **Then** the music plays at the correct tempo without slowdown
2. **Given** playback is active on a large score, **When** auto-scrolling and highlighting are both active, **Then** the combined CPU usage does not cause audio scheduling delays
3. **Given** a large score is playing with highlighting, **When** the user manually scrolls away and back, **Then** highlighting and auto-scroll resume without performance degradation
4. **Given** playback is active on a large score, **When** the user changes tempo multiplier, **Then** the transition happens smoothly without audio gaps

---

### User Story 3 — Responsive Highlight Updates Without Jank (Priority: P2)

During playback, note highlights update in real-time with no visible frame drops or "jumping" artifacts. The transition from one highlighted note to the next appears fluid, even during fast passages.

**Why this priority**: Once audio is solid (P1), visual smoothness is the next quality tier. Janky highlighting undermines the purpose of the feature even if audio is fine.

**Independent Test**: Play a score with rapid 16th-note passages on a phone. Record the screen at 120fps. Verify highlight transitions show no frames where the wrong notes are highlighted or where highlights visibly lag behind audio.

**Acceptance Scenarios**:

1. **Given** playback is active with rapid note sequences, **When** highlights transition between notes, **Then** transitions are visually smooth at ≥30 FPS on mobile and ≥60 FPS on desktop
2. **Given** a chord with 6+ simultaneous notes is playing, **When** the chord starts, **Then** all notes highlight in the same visual frame
3. **Given** playback is at 2× tempo, **When** rapid passages play, **Then** highlighting remains synchronized without dropping visual updates

---

### User Story 4 — Efficient Battery and Resource Usage (Priority: P3)

The optimized playback engine uses significantly less CPU during playback than the current implementation, resulting in longer battery life on mobile devices and cooler device temperatures.

**Why this priority**: Performance optimization naturally improves resource efficiency. This story captures the non-functional benefits that matter for real-world mobile usage but aren't directly visible to the user.

**Independent Test**: Profile CPU usage on a mobile device during 2-minute playback of Moonlight Sonata. Compare before and after optimization. Target: ≥50% reduction in CPU time spent on rendering during playback.

**Acceptance Scenarios**:

1. **Given** a large score is playing on a mobile device, **When** monitoring CPU usage, **Then** the rendering thread uses less than 30% of a single core on average
2. **Given** playback is active, **When** measuring JavaScript heap allocations, **Then** per-frame GC pressure is minimal (no per-frame Set/Array allocations when highlighted notes haven't changed)
3. **Given** the app is playing a score for an extended period (10+ minutes), **When** monitoring device temperature, **Then** the device does not become noticeably warm

---

### Out of Scope

- **AudioWorklet migration**: Moving audio scheduling to a Web Audio AudioWorklet thread is explicitly deferred to a future feature. This spec focuses on main-thread rendering optimizations to reduce CPU contention with Tone.js audio scheduling. Once these optimizations are validated, a follow-up spec will address AudioWorklet adoption for structural audio-thread isolation.
- **Audio engine replacement**: Tone.js remains the audio engine; no alternative audio libraries will be evaluated in this feature.
- **Score rendering paradigm change**: The SVG-based rendering approach is retained; no migration to Canvas or WebGL is in scope.

### Minimum Supported Device Tier

Performance targets (glitch-free audio, correct-tempo playback) apply to devices manufactured from **2020 onwards**. Reference devices:
- **Phone (Android)**: Pixel 4a / Samsung Galaxy A51 or newer
- **Phone (iOS)**: iPhone 11 or newer
- **Tablet (Android)**: Samsung Galaxy Tab A7 (2020) or newer
- **Tablet (iOS)**: iPad 8th gen (2020) or newer

Devices older than 2020 receive best-effort graceful degradation (audio-first policy) but are not guaranteed to meet all success criteria.

### Maximum Score Size

Performance targets (glitch-free audio, correct tempo, smooth highlights) are guaranteed for scores up to **10,000 notes**. This covers virtually all solo and chamber music repertoire. Scores exceeding 10,000 notes (e.g., full orchestral scores) are out of scope for this feature and may require additional architectural work in a follow-up spec.

### Edge Cases

- What happens on ultra-low-end devices (1GB RAM, quad-core A53)? The system should gracefully degrade — reducing highlight update frequency rather than producing audio glitches.
- What happens with extremely dense passages (30+ simultaneous notes)? Highlight updates should still complete within frame budget.
- What happens if the browser tab is backgrounded during playback? Audio should continue; highlighting resumes when foregrounded.
- What happens with scores that have multiple instruments (6+ staves)? The optimization must scale with visual complexity, not just note count.
- What happens during rapid seek operations? The system should not queue up stale highlight updates.
- What happens when viewport is zoomed in, showing only a small portion of a system? Sub-system virtualization should reduce work proportionally.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST NOT perform full SVG DOM teardown/rebuild when only highlight state changes during playback. Highlight changes MUST be applied by mutating existing DOM element attributes (class, fill) in-place.
- **FR-002**: System MUST separate structural rendering (layout/config/viewport changes) from cosmetic rendering (highlight/selection changes) with distinct code paths.
- **FR-003**: System MUST use an O(log n) or better algorithm to determine which notes are playing at a given tick, replacing the current O(n) linear scan. A pre-sorted index by `start_tick` with binary search is the recommended approach.
- **FR-004**: System MUST avoid allocating new `Set` or `Array` objects on each frame when the set of highlighted notes has not changed. The existing set MUST be reused by reference.
- **FR-005**: System MUST reduce the React state update frequency for `currentTick` during playback. The recommended approach is to decouple the tick broadcast from React state using a ref-based or event-based pattern, updating React state only when highlighted notes actually change.
- **FR-006**: System MUST default to **30 Hz highlight and auto-scroll updates on mobile devices** and **60 Hz on desktop**. Mobile is detected via `matchMedia('(pointer: coarse)')` combined with `matchMedia('(hover: none)')`, with `window.innerWidth ≤ 768` as fallback. The system MUST use `requestAnimationFrame` with frame-skipping on mobile (process every other rAF callback) instead of `setInterval`.
- **FR-007**: System MUST assign stable `data-note-id` attributes (corresponding to the note's domain ID) to SVG glyph elements during structural rendering, enabling O(1) DOM lookup for highlight toggling via `querySelector('[data-note-id="ID"]')`.
- **FR-008**: System MUST maintain existing highlighting visual behavior — same colors, same timing semantics, same synchronization accuracy (≤50ms lag).
- **FR-009**: System MUST preserve all existing playback features: play, pause, stop, seek, tempo change, manual scroll override, auto-scroll resume.
- **FR-010**: System MUST consolidate the duplicate highlight computation paths (`computeHighlightedNotes` + `NoteHighlightService.getPlayingNoteIds`) into a single optimized implementation.
- **FR-011**: System SHOULD implement sub-system horizontal virtualization to skip rendering glyphs that are outside the horizontal viewport bounds.
- **FR-012**: System MUST enforce an **audio-first degradation policy**: when frame budget is consistently exceeded, the system MUST skip highlight and auto-scroll visual updates (reducing to as low as 15 Hz) rather than allow any contention with audio scheduling. Audio playback quality MUST never be sacrificed for visual updates.
- **FR-013**: System MUST use `requestAnimationFrame` for all visual updates (highlighting and scrolling) during playback, yielding to the browser's compositor for optimal scheduling.

### Key Entities

- **HighlightIndex**: A pre-sorted array of notes by `start_tick` with binary search capability. Replaces the O(n) linear scan with O(log n) lookup. Built once when the score is loaded; invalidated only on score change.

- **HighlightPatch**: A diff between the previous and current set of highlighted note IDs. Contains `added: string[]` and `removed: string[]`. Only the affected DOM elements are touched.

- **ITickSource**: A non-React mechanism (ref + `requestAnimationFrame`) that exposes the current playback tick without triggering React re-renders. Implemented via a ref-based pattern in `MusicTimeline`; consumed by the rAF highlight loop in `LayoutRenderer`.

- **FrameBudgetMonitor**: A performance monitor that tracks the time spent on highlight updates each frame. If budget (8ms on mobile, 12ms on desktop) is consistently exceeded for 5 consecutive frames, automatically reduces update frequency. Recovers when frames return within budget.

## Technical Approach

### Phase 1: Decouple Highlight from Full Render (Critical Path)

1. **Add `data-note-id` attributes** to SVG glyph elements during `renderGlyph()`. This is a small change to structural rendering.

2. **Split `componentDidUpdate`** into two paths:
   - **Structural change** (layout, config, viewport, sourceMap): call `renderSVG()` as today.
   - **Highlight-only change** (highlightedNoteIds, selectedNoteId): call new `updateHighlights()` that queries `[data-note-id]` elements and toggles CSS classes.

3. **`updateHighlights()` implementation**: Compute the diff between previous and current `highlightedNoteIds`. For each added ID, `querySelector('[data-note-id="ID"]')` → add `.highlighted` class. For each removed ID, remove class. Cost: O(changed notes) instead of O(all glyphs).

### Phase 2: Optimize Tick Broadcasting

4. **Replace `setInterval(16)` + `setState`** with `requestAnimationFrame` + a `ref` that stores `currentTick`. The `rAF` callback computes highlighted notes directly and calls `updateHighlights()` — no React re-render needed.

5. **Binary search for active notes**: Pre-sort notes by `start_tick`. On each frame, binary-search the sorted array to find the window of potentially-active notes, then check only those. Cost: O(log n + k) where k is the number of active notes, vs. O(n) today.

6. **Stable Set reference**: Only create a new `Set<string>` when the contents actually change. Compare active note IDs to previous frame's IDs before allocating.

### Phase 3: Scroll and Mobile Optimization

7. **Throttle auto-scroll** to `requestAnimationFrame` cadence (typically 60 Hz desktop, 30-60 Hz mobile), removing the separate `setInterval`.

8. **Device-adaptive frame budget**: Detect mobile via viewport width or `navigator.maxTouchPoints`. On mobile, allow highlight updates to skip frames if behind budget, prioritizing audio thread.

9. **Sub-system horizontal virtualization** (optional): During `renderGlyphRun`, skip glyphs whose x-position falls outside `[viewport.scrollLeft - margin, viewport.scrollLeft + viewport.width + margin]`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Canon in D plays on a mid-range mobile phone (Pixel 7a, iPhone SE) with zero audible glitches across three consecutive full playthroughs with highlighting and auto-scroll active.

- **SC-002**: Moonlight Sonata (4932 notes) plays on a mid-range tablet (iPad 9th gen, Samsung Tab A8) at correct tempo (within ±2% of specified BPM) with highlighting and auto-scroll active. Performance guarantees extend to scores up to 10,000 notes on supported devices.

- **SC-003**: During playback of a score up to 10,000 notes, the LayoutRenderer spends less than 4ms per frame on highlight updates (measured via `performance.now()` instrumentation), vs. the current ~16ms+ per full SVG rebuild.

- **SC-004**: During playback, JavaScript heap allocation rate drops by ≥80% compared to current implementation (measured via Chrome DevTools allocation timeline), eliminating per-frame `Set` allocations when highlighted notes are stable.

- **SC-005**: Highlight update frequency defaults to **30 Hz on mobile** and **60 Hz on desktop** during normal playback. Under degradation (frame budget exceeded), mobile may drop to 15 Hz while maintaining glitch-free audio.

- **SC-006**: All existing playback E2E tests continue to pass without modification, confirming no functional regression in play/pause/stop/seek/tempo-change/highlight/scroll behavior.

- **SC-007**: CPU usage during playback of Moonlight Sonata decreases by ≥50% on mobile devices compared to current implementation (measured via browser Performance profiler).

- **SC-008**: Time from pressing Play to first audible note remains under 500ms on mobile devices (no regression from optimization overhead).

- **SC-009**: Manual scroll override during playback continues to work correctly — auto-scroll disables on manual scroll and re-enables on playback restart.

- **SC-010**: The optimization introduces no visual difference in highlighting appearance — same colors, same timing, same transitions.

## Known Issues & Regression Tests *(if applicable)*

### Current Known Issues

1. **Audio glitches on mobile phones** — Canon in D demo produces audible glitches on phones (not desktops/tablets) due to main thread contention from SVG rebuilds competing with Tone.js audio scheduling.

2. **Unplayable large scores on tablets** — Moonlight Sonata playback speed degrades severely when highlighting and auto-scroll are active, making the music sound wrong.

3. **Duplicate highlight computation** — Two independent code paths (`computeHighlightedNotes` in `useNoteHighlight` and `NoteHighlightService.getPlayingNoteIds` in `usePlaybackScroll`) both scan all notes independently.

### Regression Tests Required

- All existing playback tests (play, pause, stop, seek, tempo change) must pass.
- All existing highlight tests (single note, chord, multi-staff, seek-to-mid-note) must pass.
- All existing scroll tests (auto-scroll, manual override, scroll resume) must pass.
- New performance benchmarks must be added as CI checks to prevent future regressions.
- Visual snapshot tests should confirm highlight appearance is unchanged.

---

## Post-Implementation Fixes

The following issues were discovered and resolved during integration testing after the core optimization was implemented. They are documented here for architectural context.

### Fix 1: ESLint react-hooks/refs Violations (bc381bd)

**Problem**: The `react-hooks/refs` ESLint rule flagged the new `tickSourceRef` pattern in `MusicTimeline.ts` as a violation — reading `.current` during render and passing refs as dependencies.

**Resolution**: Added targeted `/* eslint-disable react-hooks/refs */` directives around the intentional ref access patterns. These are architectural choices (bypassing React state for performance), not bugs.

### Fix 2: Mobile Jitter — Synchronous Tick Status (0cd1ff7)

**Problem**: After the two-tier rendering refactor, mobile playback exhibited timing jitter. The `tickSource.status` was being synchronized via `useEffect` (async, batched by React) instead of during render, causing a 1-frame lag between status changes and the rAF loop reading the status.

**Resolution**: Moved `tickSourceRef.current = { ...tickSourceRef.current, status }` from `useEffect` to synchronous render-time assignment in `MusicTimeline.ts`. Added `server.host: '0.0.0.0'` to `vite.config.ts` for mobile device testing over LAN.

### Fix 3: Vertical Auto-Scroll for Multi-Instrument Playback (d52293d)

**Problem**: Play View did not scroll vertically to follow the current measure during playback of multi-instrument scores. The `ScoreViewer` (pages) component used container-based scroll listeners, but Play View renders in the main window scroll context.

**Resolution**: Updated `pages/ScoreViewer.tsx` to use `window.addEventListener('scroll', ...)` and `window.scrollY` instead of container-based scroll detection. Added viewport-based system visibility calculation using `window.innerHeight`.

### Fix 4: Auto-Scroll Losing Track of Current Measure (9ba84ea)

**Problem**: After scrolling past approximately measure 50, auto-scroll would lose track of the current playback position and stop following the highlighted notes.

**Resolution**: Fixed the scroll tracking logic in `pages/ScoreViewer.tsx` to correctly compute system positions relative to the document rather than the viewport.

### Fix 5: Stale Highlights Persisting After Scroll (003888e, 5795d8c)

**Problem**: Note highlights would persist (remain blue) on notes that were no longer playing after the user scrolled or the viewport changed. The root cause was twofold:

1. **Frozen props**: `shouldComponentUpdate` in `LayoutRenderer` blocked `tickSource` prop updates (by design, to prevent re-renders). But the rAF highlight loop was reading `this.props.tickSource`, which was frozen at the time of the last structural render.
2. **Missing prop chain**: `ScoreViewer` (component) was not passing `tickSourceRef` through `LayoutView` to `LayoutRenderer` at all.

**Resolution**: Exposed `tickSourceRef` (a live `useRef<ITickSource>`) from `MusicTimeline.ts` alongside the snapshot `tickSource`. Threaded it through the component chain: `ScoreViewer` → `LayoutView` → `LayoutRenderer`. The rAF loop now reads `this.props.tickSourceRef?.current` instead of `this.props.tickSource`, getting live tick data regardless of `shouldComponentUpdate` gating.

**Files modified**: `MusicTimeline.ts`, `LayoutView.tsx`, `LayoutRenderer.tsx`, `ScoreViewer.tsx` (component).

### Fix 6: Dual-Highlight Conflict — Inline SVG vs CSS Classes (22677be)

**Problem**: After Fix 5 resolved the stale data issue, highlights still appeared incorrect. `renderGlyphRun` was baking highlight colors into SVG `fill` attributes (e.g., `fill="#4A90E2"`) during structural renders, while the rAF loop only toggled CSS `.highlighted` classes. The inline `fill` attribute has higher specificity than CSS classes, so the rAF loop's class removal had no visible effect — notes stayed blue.

**Resolution**: Removed all inline highlight color logic from `renderGlyph()`. The `_isHighlighted` parameter was eliminated. CSS `.highlighted` class with `!important` (applied by the rAF loop) became the sole highlight mechanism. Added `polygon.highlighted` CSS rule for beam elements.

**Files modified**: `LayoutRenderer.tsx`, `LayoutRenderer.css`.

### Fix 7: Scroll Fight Loop at Measure ~50 (941443a → 23d95af)

**Problem**: At approximately measure 50, a scroll fight loop occurred: `scrollToHighlightedSystem` was called every ~100ms (on each `highlightedNoteIds` change via React state), and each call cancelled the previous 400ms ease-out animation and restarted it. This caused visible jittering and oscillation at system boundaries.

**First attempt (941443a)**: Added an `isAutoScrolling` flag to suppress `updateViewport()` during auto-scroll. This fixed the fight but introduced a regression — `isAutoScrolling` was effectively always `true` during playback (every ~100ms call restarts the 400ms animation), preventing viewport updates entirely. Systems beyond the initial view were never rendered, breaking highlights in imported scores.

**Final resolution (23d95af)**: Replaced `isAutoScrolling` with `autoScrollTargetSystem` tracking. Animation is only restarted when the target system changes. Viewport updates are never suppressed. Increased `SCROLL_THRESHOLD` from 4 to 20 pixels to reduce viewport update frequency during scroll.

**Files modified**: `pages/ScoreViewer.tsx`.
