# Quickstart: Playback & Display Performance Optimization

**Feature**: 024-playback-performance
**Date**: 2026-02-17

## Prerequisites

- Node.js 18+ and npm installed
- Frontend dev server runs: `cd frontend && npm run dev`
- Existing tests pass: `cd frontend && npm test`
- A MusicXML file with 1000+ notes available for testing (e.g., Moonlight Sonata)

## Implementation Order

Execute in this order — each phase is independently testable and deployable.

### Phase 1: Incremental Highlight Rendering (Critical Path)

**Goal**: Eliminate full SVG DOM teardown/rebuild on highlight changes.

#### Step 1.1: Add `data-note-id` attributes to SVG elements

**File**: `frontend/src/components/LayoutRenderer.tsx` — `renderGlyph()` method

During structural rendering, when a glyph has a `source_reference` that maps to a note ID, set `data-note-id` on the SVG element:

```typescript
// In renderGlyph(), after creating the SVG element:
if (noteId) {
  element.setAttribute('data-note-id', noteId);
}
```

**Test**: Load any score, inspect SVG DOM, verify note glyphs have `data-note-id="<uuid>"` attributes.

#### Step 1.2: Add `.highlighted` CSS class styling

**File**: `frontend/src/components/LayoutRenderer.css`

Add a CSS class that applies the same visual effect currently done inline:

```css
.layout-glyph.highlighted {
  fill: #4A90E2;
  stroke: #4A90E2;
  transition: fill 50ms ease-out, stroke 50ms ease-out;
}
```

**Test**: Manually add `.highlighted` class to an SVG element in DevTools — verify it turns blue.

#### Step 1.3: Split `componentDidUpdate` into structural vs. cosmetic paths

**File**: `frontend/src/components/LayoutRenderer.tsx`

Add `shouldComponentUpdate` that returns `false` for highlight-only changes:

```typescript
shouldComponentUpdate(nextProps: LayoutRendererProps): boolean {
  return (
    nextProps.layout !== this.props.layout ||
    nextProps.config !== this.props.config ||
    nextProps.viewport !== this.props.viewport ||
    nextProps.sourceToNoteIdMap !== this.props.sourceToNoteIdMap
  );
}
```

**Test**: During playback, verify `renderSVG()` is NOT called on each tick (add a `console.count` temporarily). Highlights should still work via the rAF path (Step 1.5).

#### Step 1.4: Implement `updateHighlights()` method

**File**: `frontend/src/components/LayoutRenderer.tsx`

New method that computes a `HighlightPatch` and toggles CSS classes:

```typescript
private updateHighlights(): void {
  const currentIds = this.highlightIndex?.findPlayingNoteIds(this.currentTick) ?? [];
  const patch = computeHighlightPatch(this.prevHighlightedIds, currentIds);
  
  if (patch.unchanged) return;
  
  const svg = this.svgRef.current;
  if (!svg) return;
  
  for (const id of patch.removed) {
    const el = svg.querySelector(`[data-note-id="${id}"]`);
    el?.classList.remove('highlighted');
  }
  for (const id of patch.added) {
    const el = svg.querySelector(`[data-note-id="${id}"]`);
    el?.classList.add('highlighted');
  }
  
  this.prevHighlightedIds = new Set(currentIds);
}
```

**Test**: Write unit test for `computeHighlightPatch()` — verify correct added/removed/unchanged for various scenarios.

#### Step 1.5: Add rAF highlight loop

**File**: `frontend/src/components/LayoutRenderer.tsx`

Add instance fields and rAF lifecycle:

```typescript
private rafId = 0;
private lastFrameTime = 0;
private prevHighlightedIds = new Set<string>();

componentDidMount() {
  this.renderSVG();
  this.startHighlightLoop();
}

componentWillUnmount() {
  this.stopHighlightLoop();
}

private startHighlightLoop(): void {
  const loop = (timestamp: number) => {
    this.rafId = requestAnimationFrame(loop);
    if (timestamp - this.lastFrameTime < this.frameInterval) return;
    this.lastFrameTime = timestamp;
    this.updateHighlights();
  };
  this.rafId = requestAnimationFrame(loop);
}

private stopHighlightLoop(): void {
  cancelAnimationFrame(this.rafId);
}
```

**Test**: Play a score — verify highlights update without full SVG rebuild. Check with Performance profiler that `renderSVG` is NOT called during playback.

---

### Phase 2: Optimized Tick Broadcasting & Note Lookup

**Goal**: Eliminate O(n) scans and 60 Hz React state updates.

#### Step 2.1: Create `HighlightIndex`

**File**: `frontend/src/services/highlight/HighlightIndex.ts` (NEW)

```typescript
export class HighlightIndex {
  private sortedNotes: IndexedNote[] = [];
  private _maxDuration = 0;
  
  get noteCount() { return this.sortedNotes.length; }
  get maxDuration() { return this._maxDuration; }
  
  build(notes: ReadonlyArray<{ id: string; start_tick: number; duration_ticks: number }>): void {
    this.sortedNotes = notes
      .map(n => ({ id: n.id, startTick: n.start_tick, endTick: n.start_tick + n.duration_ticks }))
      .sort((a, b) => a.startTick - b.startTick);
    this._maxDuration = this.sortedNotes.reduce((max, n) => Math.max(max, n.endTick - n.startTick), 0);
  }
  
  findPlayingNoteIds(currentTick: number): string[] {
    const result: string[] = [];
    const notes = this.sortedNotes;
    const len = notes.length;
    if (len === 0) return result;
    
    // Binary search: find first index where startTick > currentTick
    let lo = 0, hi = len;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (notes[mid].startTick <= currentTick) lo = mid + 1;
      else hi = mid;
    }
    
    // Scan backward: check notes with startTick <= currentTick
    const earliest = currentTick - this._maxDuration;
    for (let i = lo - 1; i >= 0 && notes[i].startTick >= earliest; i--) {
      if (currentTick < notes[i].endTick) {
        result.push(notes[i].id);
      }
    }
    
    return result;
  }
  
  clear(): void {
    this.sortedNotes = [];
    this._maxDuration = 0;
  }
}
```

**Test**: Write comprehensive unit tests:
- Empty index returns empty array
- Single note: before, during, after
- Chord (multiple notes same startTick)
- Non-overlapping sequential notes
- Long pedal tone overlapping rapid notes
- 10,000 note benchmark: verify <0.1ms per query

#### Step 2.2: Create `deviceDetection.ts`

**File**: `frontend/src/utils/deviceDetection.ts` (NEW)

```typescript
export function detectDeviceProfile(): DeviceProfile {
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const hasNoHover = window.matchMedia('(hover: none)').matches;
  const isSmallViewport = window.innerWidth <= 768;
  const isMobile = (hasCoarsePointer && hasNoHover) || isSmallViewport;
  
  return {
    isMobile,
    targetFrameIntervalMs: isMobile ? 33 : 16,
    frameBudgetMs: isMobile ? 8 : 12,
  };
}
```

**Test**: Mock `matchMedia` and `window.innerWidth` — verify correct profiles for desktop, tablet, phone.

#### Step 2.3: Decouple tick from React state

**File**: `frontend/src/services/playback/MusicTimeline.ts`

Replace the `setInterval(16)` + `setCurrentTick()` pattern with a ref-based approach. The `currentTick` React state should only be updated when the set of highlighted notes actually changes (for components that need it), not on every frame.

Key change: expose a `tickRef` that the rAF loop in `LayoutRenderer` reads directly.

**Test**: During playback, verify React DevTools shows far fewer re-renders of the component tree. Verify `setCurrentTick` is called at most a few times per second (on note transitions), not 60 times.

#### Step 2.4: Remove `NoteHighlightService` and `computeHighlightedNotes`

Consolidate into `HighlightIndex`. Update all imports.

**Test**: All existing E2E tests pass with the consolidated implementation.

---

### Phase 3: Scroll & Mobile Optimization

**Goal**: Throttle auto-scroll and add frame budget monitoring.

#### Step 3.1: Implement `FrameBudgetMonitor`

**File**: `frontend/src/services/highlight/FrameBudgetMonitor.ts` (NEW)

Integrate into the rAF loop — wrap `updateHighlights()` with timing.

**Test**: Simulate slow frames via artificial delay — verify degradation kicks in after threshold.

#### Step 3.2: Throttle auto-scroll to rAF

**File**: `frontend/src/services/playback/ScrollController.ts`

Replace any `setInterval`-based scroll updates with rAF-driven updates, respecting the same frame interval as highlights.

**Test**: Verify smooth scrolling during playback. Verify no separate `setInterval` for scroll.

#### Step 3.3: Re-apply highlights after structural render

After `renderSVG()` rebuilds SVG (viewport change, layout change), immediately re-apply current highlight state since all `data-note-id` elements were recreated.

**Test**: During playback, resize the browser window (triggers viewport change + structural render). Verify highlights are immediately correct after resize.

---

## Validation Checklist

After all phases:

- [ ] Canon in D plays on a phone with zero audio glitches
- [ ] Moonlight Sonata plays on a tablet at correct tempo
- [ ] `renderSVG()` is NOT called during playback (only `updateHighlights()`)
- [ ] Performance profiler shows <4ms per highlight update frame
- [ ] React DevTools shows minimal re-renders during playback
- [ ] All existing E2E playback tests pass unchanged
- [ ] Manual scroll override still works correctly
- [ ] Seeking during playback updates highlights correctly
- [ ] Pause/resume preserves highlight state
- [ ] Tempo change during playback transitions smoothly
