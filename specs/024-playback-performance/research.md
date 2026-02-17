# Research: Playback & Display Performance Optimization

**Feature**: 024-playback-performance
**Date**: 2026-02-17

## Topic 1: requestAnimationFrame-Driven Highlight Updates Bypassing React State

### Decision
Use **instance fields** on the `LayoutRenderer` class for mutable highlight state (`currentTick`, `prevHighlightedIds`, `rafId`). Run a self-scheduling `requestAnimationFrame` loop that toggles CSS classes on existing SVG elements without triggering React re-renders.

### Rationale
- Instance fields are invisible to React reconciliation — writing to them never triggers a render.
- The codebase already uses `private svgRef: RefObject` for DOM access, so the pattern is familiar.
- `useRef` is the function component equivalent, but `LayoutRenderer` is a class component.

### Implementation Pattern

**Two-tier rendering model:**

| Tier | Trigger | What changes | Method |
|------|---------|-------------|--------|
| Structural | `componentDidUpdate` (layout/config/viewport) | Full SVG DOM rebuild | `renderSVG()` → then re-apply highlights |
| Cosmetic | rAF loop (every frame or every other on mobile) | CSS class toggles on existing elements | `updateHighlights()` |

**Preventing React conflicts:**
- `shouldComponentUpdate` returns `false` when only `highlightedNoteIds` or `selectedNoteId` changed → prevents React from touching the DOM for highlight-only updates.
- After structural re-renders (`renderSVG()`), immediately re-apply current highlight state so highlights survive DOM rebuilds.
- Eventually stop passing `highlightedNoteIds` as a React prop entirely; the rAF loop reads tick from a shared mutable source.

**rAF lifecycle:**
- Start loop in `componentDidMount()`, cancel in `componentWillUnmount()`.
- Self-scheduling pattern: `requestAnimationFrame(tick)` inside each tick callback.
- For mobile 30Hz: skip every other frame via timestamp check inside the rAF callback (not via `setInterval`).

### Alternatives Considered
- **React.memo / PureComponent**: Rejected — `LayoutRenderer` uses imperative DOM manipulation (`while (svg.firstChild) svg.removeChild(...)`), so React's diffing provides no benefit.
- **Separate highlight component**: Rejected — would require splitting the SVG into React-managed and imperatively-managed subtrees, adding complexity without benefit since the SVG is already fully imperative.

---

## Topic 2: Binary Search for Interval Overlap Queries

### Decision
Use a **pre-sorted array by `start_tick`** with **binary search + bounded backward scan**. No interval tree needed.

### Rationale
- Notes are immutable during playback — the index is built once on score load.
- Queries are "find all intervals [start_tick, start_tick + duration_ticks) containing point currentTick" — a sorted array handles this efficiently.
- Sorted arrays are cache-friendly (contiguous memory); trees have pointer-chasing overhead.
- For n=10,000 notes: binary search ≈ 14 comparisons (~50ns), backward scan visits ~5-15 notes. Total: <0.01ms per frame.

### Algorithm

```
1. Binary search: Find the first index where start_tick > currentTick (upper_bound)
2. Scan backward: From that index - 1, scan while start_tick >= (currentTick - maxDuration)
3. Check overlap: For each candidate, if currentTick < start_tick + duration_ticks → note is playing
4. Early exit: Stop when start_tick < currentTick - maxDuration (precomputed maximum note duration)
```

**Chord handling**: Notes with identical `start_tick` are adjacent after sorting. The backward scan processes the entire cluster naturally. Typical chord size: 2-6 notes, max ~10+. Always O(k) where k is chord size.

**Performance for n=10,000:**
- Binary search: O(log₂ 10000) ≈ 14 comparisons
- Backward scan: ~5-15 notes typical, ~50-100 worst case (long pedal + dense passage)
- Total: <0.01ms typical, <0.1ms worst case
- vs. O(n) linear scan: ~0.2ms for 10K notes → 10-100× faster

### Alternatives Considered
- **Interval tree (augmented BST)**: Same O(log n + k) complexity but higher constant factors, more complex to implement, harder to debug. Rejected as over-engineering.
- **Segment tree**: Better for range queries but overkill for point-in-interval queries on static data.

---

## Topic 3: Stable Set Reference Pattern

### Decision
**Create a new `Set<string>` only when the highlighted note contents actually change.** Compare using size check + element iteration.

### Rationale
- Current implementation creates a new Set every 16ms (60 allocs/sec), causing GC pressure.
- Set equality comparison via `size + has()` iteration is O(k) where k = highlighted notes (typically 1-6), costing ~100ns.
- Eliminates ~60 unnecessary allocations per second during playback.

### Implementation

```typescript
// Instance field
private prevHighlightedIds: Set<string> = new Set();

// In rAF callback:
const newIds: string[] = findPlayingNotes(index, currentTick);
if (this.setsMatch(this.prevHighlightedIds, newIds)) {
  return; // No change — skip DOM work entirely
}
this.prevHighlightedIds = new Set(newIds);
this.applyHighlightDiff(/* ... */);
```

### Alternatives Considered
- **Mutate a single Set in-place**: Zero allocations but dangerous — consumers holding a reference see mutations underneath them. Rejected for correctness.
- **Sorted array string join** (`[...ids].sort().join(',')` comparison): Simple but allocates array + string per frame. Rejected for GC pressure.

---

## Topic 4: Mobile Device Detection for Frame Rate Selection

### Decision
Use **`matchMedia('(pointer: coarse)')` + `matchMedia('(hover: none)')` as primary signal pair**, with **`window.innerWidth <= 768`** as fallback. Evaluate once on mount; re-evaluate on media query change events.

### Rationale

| Signal | Reliability | Notes |
|--------|------------|-------|
| `pointer: coarse` + `hover: none` | HIGH | Correctly identifies phones/tablets being used as touch devices. iPads with keyboard/trackpad get 60Hz (correct — they have CPU budget). |
| `innerWidth <= 768` | MEDIUM | Fallback for old browsers without media query support. Small viewports correlate with limited CPU. |
| `navigator.maxTouchPoints > 0` | LOW | False positives on touch-enabled laptops (Surface). |
| `navigator.userAgent` | LOW | Chrome UA reduction initiative removes device info. iPad Safari reports macOS UA. |
| `devicePixelRatio` | LOW | Too much overlap between phones (2-3), tablets (2), and retina desktops (2). |

### Implementation

```typescript
function isMobileDevice(): boolean {
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const hasNoHover = window.matchMedia('(hover: none)').matches;
  const isSmallViewport = window.innerWidth <= 768;
  return (hasCoarsePointer && hasNoHover) || isSmallViewport;
}
```

**Frame-skipping in rAF loop** (not setInterval):

```typescript
private lastFrameTime = 0;
private frameInterval = isMobileDevice() ? 33 : 16; // 30Hz or 60Hz

private highlightLoop = (timestamp: number) => {
  this.rafId = requestAnimationFrame(this.highlightLoop);
  if (timestamp - this.lastFrameTime < this.frameInterval) return;
  this.lastFrameTime = timestamp;
  this.updateHighlights();
};
```

Re-evaluate on device orientation/input changes:
```typescript
window.matchMedia('(pointer: coarse)').addEventListener('change', this.reevaluateDeviceTier);
```

### Alternatives Considered
- **navigator.hardwareConcurrency**: Number of CPU cores. Phone: 4-8, Desktop: 8-16+. Useful as performance tier indicator but not device type. Could be used as a third tier (e.g., <4 cores → 15Hz degradation threshold) but adds complexity without clear benefit.
- **Three-tier approach** (15/30/60 Hz): Considered but decided against as a default — 15Hz is only for degradation mode. Normal operation uses binary 30/60Hz.

---

## Summary of All Decisions

| Area | Decision | Complexity |
|------|----------|-----------|
| Mutable highlight state | Instance fields on class component | Low |
| rAF lifecycle | Self-scheduling loop, start on mount, cancel on unmount | Low |
| React conflict prevention | `shouldComponentUpdate` gate + post-structural re-apply | Medium |
| Note lookup algorithm | Sorted array + binary search + bounded backward scan | Medium |
| Set stability | New Set only on content change, compare via size + iteration | Low |
| Mobile detection | `pointer: coarse` + `hover: none` + innerWidth fallback | Low |
| Frame rate control | rAF with timestamp-based frame-skipping | Low |
| Overall architecture | Two-tier render model (structural via React, cosmetic via rAF) | Medium |
