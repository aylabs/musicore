# Research: Playback Scroll and Highlight

**Feature**: 009-playback-scroll-highlight  
**Date**: 2026-02-09  
**Purpose**: Research decisions for implementing synchronized scroll and note highlighting during playback

---

## Overview

This document captures research decisions for implementing visual playback feedback through automatic scrolling and note highlighting. The feature enhances the existing playback system (Feature 003) and notation display (Feature 002) without modifying domain models.

---

## Research Tasks

### Task 1: Playback Position Tracking Strategy

**Question**: How to efficiently propagate currentTick changes from playback to notation components during active playback?

**Research Findings**:

**Option A: Polling via requestAnimationFrame**
- Components poll `MusicTimeline.currentTick` at 60 Hz using RAF
- Pros: Smooth updates, no state management overhead, decoupled
- Cons: Unnecessary renders when not playing, manual RAF lifecycle management

**Option B: State updates via React Context**
- MusicTimeline updates context state with currentTick at regular intervals
- Pros: Reactive updates, automatic lifecycle, follows React patterns
- Cons: Potential performance overhead from context updates propagating through tree

**Option C: Callback subscription pattern**
- MusicTimeline maintains subscriber list, broadcasts tick updates
- Notation components subscribe/unsubscribe via useEffect
- Pros: Minimal re-renders, precise control over update frequency
- Cons: Imperative pattern less idiomatic in React

**Decision**: **Option B with optimization** - Use React Context for currentTick but throttle updates to 30 Hz (every ~33ms) to balance smoothness with performance.

**Rationale**:
- Most React-idiomatic approach (declarative, automatic cleanup)
- 30 Hz sufficient for smooth visual feedback (< 50ms accuracy requirement from spec)
- Context updates only affect subscribed components (StaffNotation subtree)
- Can optimize further with useMemo/React.memo if needed
- Existing codebase already uses React patterns extensively

**Implementation**: 
```typescript
// MusicTimeline.ts
useEffect(() => {
  if (status === 'playing') {
    const interval = setInterval(() => {
      const elapsedTime = adapter.getCurrentTime() - startTimeRef.current;
      const elapsedTicks = secondsToTicks(elapsedTime, tempo);
      setCurrentTick(currentTick + elapsedTicks);
    }, 33); // 30 Hz
    return () => clearInterval(interval);
  }
}, [status, /* deps */]);
```

---

### Task 2: Scroll Position Calculation

**Question**: How to calculate the target scroll position to maintain comfortable reading context (30% viewport positioning)?

**Research Findings**:

**Current Implementation**:
- NotationLayoutEngine already calculates `totalWidth` and note pixel positions
- StaffNotation manages `scrollX` state for manual scrolling (Feature 002, User Story 4)
- `pixelsPerTick` constant available from layout engine config

**Scroll Formula**:
```typescript
// Given:
// - currentTick: Current playback position in ticks
// - pixelsPerTick: Scaling factor from layout config
// - viewportWidth: Container width in pixels
// - targetPosition: Desired position ratio (0.3 = 30% from left)

const noteX = currentTick * pixelsPerTick;
const targetScrollX = noteX - (viewportWidth * targetPosition);
const clampedScrollX = Math.max(0, Math.min(targetScrollX, maxScrollX));
```

**Edge Cases**:
1. **Score shorter than viewport**: Don't scroll if `totalWidth < viewportWidth`
2. **Near end of score**: Stop scrolling when `noteX + (viewportWidth * 0.7) > totalWidth`
3. **Negative scroll**: Clamp scrollX to minimum 0

**Decision**: Implement ScrollController service with `calculateScrollPosition()` method handling all edge cases.

---

### Task 3: Smooth Scrolling Implementation

**Question**: Should scrolling use CSS smooth-scroll, JavaScript animation, or direct position updates?

**Research Findings**:

**Option A: CSS `scroll-behavior: smooth`**
- Set `scrollLeft` property, browser handles animation
- Pros: Zero JavaScript animation code, hardware accelerated
- Cons: Can't control duration/easing, may overshoot with rapid updates

**Option B: JavaScript animation (RAF loop)**
- Manual interpolation between current and target scroll position
- Pros: Full control over easing, timing, cancellation
- Cons: More code, potential performance overhead

**Option C: Direct position updates (no smoothing)**
- Set `scrollLeft` directly every tick update
- Pros: Simplest implementation, perfectly synchronized
- Cons: Janky appearance

**Decision**: **Option C (direct updates) for MVP, Option A for polish**

**Rationale**:
- Direct updates ensure perfect synchronization (<50ms accuracy requirement)
- Smooth scrolling at 30 Hz appears smooth enough without interpolation
- CSS smooth-scroll can be added later as optimization if jankiness observed
- Frame budget: At 30 Hz, have 33ms per update (sufficient for 60 FPS even with DOM updates)

---

### Task 4: Note Highlight Identification

**Question**: How to efficiently identify which notes are currently playing at a given tick?

**Research Findings**:

**Current Note Structure**:
```typescript
interface Note {
  id: string;
  pitch: number;
  start_tick: number;
  duration_ticks: number;
}
```

**Identification Algorithm**:
```typescript
function getPlayingNotes(notes: Note[], currentTick: number): string[] {
  return notes
    .filter(note => {
      const noteStartTick = note.start_tick;
      const noteEndTick = note.start_tick + note.duration_ticks;
      return currentTick >= noteStartTick && currentTick < noteEndTick;
    })
    .map(note => note.id);
}
```

**Performance Considerations**:
- Typical scores: 200-2000 notes
- Linear scan: O(n) per tick update
- At 30 Hz: 200-2000 comparisons per update = 6,000-60,000 ops/sec
- **Verdict**: Acceptable for typical scores, optimization not needed for MVP

**Potential Optimization** (if needed later):
- Maintain sorted note array by start_tick
- Use binary search to find active range
- Complexity: O(log n) for range discovery + O(k) for active notes
- Trade-off: Added complexity not justified for current scale

**Decision**: Implement linear scan in `NoteHighlightService.getPlayingNoteIds()` method. Monitor performance; optimize only if profiling shows bottleneck.

---

### Task 5: Highlight Visual Styling

**Question**: What visual styling effectively indicates currently playing notes without obscuring notation?

**Research Findings**:

**Industry Standards** (MuseScore, Sibelius, Flat.io):
- Light background color behind note (most common)
- Border/outline around note
- Slight scale increase
- Color change (blue/green tint)

**Accessibility Considerations**:
- Must work in high-contrast mode
- Cannot rely on color alone (WCAG 2.1)
- Should be perceivable by colorblind users

**Decision**: **Light blue/green background (semi-transparent) + subtle outline**

**CSS Implementation**:
```css
.note-head.highlighted {
  fill: #4CAF50;        /* Green tint */
  opacity: 0.8;          /* Slightly transparent */
  stroke: #2E7D32;       /* Darker green outline */
  stroke-width: 2;
  transition: fill 0.1s ease-in, opacity 0.1s ease-in;
}
```

**Rationale**:
- Green universally associated with "active" state
- Semi-transparent preserves note appearance for reading ahead
- Outline provides non-color indicator (accessibility)
- 0.1s transition prevents jarring highlight changes on rapid notes

---

### Task 6: Manual Scroll Override Detection

**Question**: How to detect when user manually scrolls and disable auto-scroll without stopping playback?

**Research Findings**:

**Detection Strategy**:
```typescript
// StaffNotation component
const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
const lastSetScrollRef = useRef<number>(0);

const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
  const newScrollX = e.currentTarget.scrollLeft;
  
  // Check if scroll was user-initiated (not from our auto-scroll update)
  const timeSinceLastSet = Date.now() - lastSetScrollRef.current;
  if (timeSinceLastSet > 100) {  // 100ms threshold
    // User scrolled manually
    setAutoScrollEnabled(false);
  }
  
  setScrollX(newScrollX);
};

// When setting scroll programmatically:
const applyAutoScroll = (targetScrollX: number) => {
  lastSetScrollRef.current = Date.now();
  containerRef.current.scrollLeft = targetScrollX;
};
```

**Re-enable Auto-Scroll Options**:
1. Explicit "Resume Auto-Scroll" button
2. Auto re-enable when playback stops/starts
3. Auto re-enable when user hasn't scrolled for N seconds

**Decision**: Implement all three options:
- Button for immediate re-enable (User Story 4)
- Auto re-enable on stop/play (predictable behavior)
- No timeout-based re-enable (avoid surprising user)

---

### Task 7: Integration with Tempo Change (Feature 008)

**Question**: How does tempo multiplier affect scroll speed calculations?

**Research Findings**:

**Current Implementation** (from Feature 008):
```typescript
// MusicTimeline.ts already has:
const { tempoState } = useTempoState();
// tempoState.tempoMultiplier ranges from 0.5 to 2.0
```

**Scroll Speed Relationship**:
- Tempo multiplier affects playback speed (notes per second)
- Faster tempo → currentTick advances faster → scroll must move faster
- BUT: Tick→pixel  mapping unchanged (layout static)
- THEREFORE: No modification needed to scroll calculations - they automatically adapt because they're based on currentTick position, not time

**Verification**:
```typescript
// Scroll position only depends on currentTick:
const targetScrollX = (currentTick * pixelsPerTick) - (viewportWidth * 0.3);

// currentTick advances based on elapsed time * tempo * tempoMultiplier:
const elapsedTicks = secondsToTicks(elapsedTime, tempo) * tempoMultiplier;

// Therefore scroll speed naturally adjusts with tempo multiplier
```

**Decision**: No special handling needed. Scroll calculations based on currentTick automatically reflect tempo changes.

---

### Task 8: Performance Optimization Strategy

**Question**: How to ensure 60 FPS performance with simultaneous scroll updates and highlight changes?

**Research Findings**:

**Performance Budget** (16.67ms per frame for 60 FPS):
- Note highlight calculation: ~0.5ms (linear scan 2000 notes)
- Scroll position calculation: <0.1ms (arithmetic)
- DOM updates (scrollLeft): ~1ms (browser-optimized)
- React re-render (NotationRenderer): ~5ms (SVG reconciliation)
- CSS transitions: Hardware-accelerated, minimal impact
- **Total**: ~6.6ms (well within 16.67ms budget)

**Optimization Techniques**:
1. **React.memo** on NotationRenderer to prevent unnecessary re-renders
2. **useMemo** for expensive calculations (note filtering)
3. **throttle** currentTick updates to 30 Hz (already decided)
4. **CSS will-change** hint for scroll container
5. **Virtual scrolling** already implemented (Feature 002 US4) - renders only visible notes

**Decision**: Apply optimizations 1-4 in initial implementation. Monitor FPS during testing. Add instrumentation to detect performance regressions.

**Performance Tests**:
```typescript
it('maintains 60 FPS during scroll with 1000 notes', () => {
  const frames: number[] = [];
  let lastTime = performance.now();
  
  // Render hook with performance monitoring
  const { result } = renderHook(() => usePlaybackScroll(largeScore));
  
  // Simulate playback for 5 seconds
  for (let i = 0; i < 150; i++) {  // 5 seconds * 30 Hz
    act(() => result.current.updateTick(i * 320));
    const currentTime = performance.now();
    frames.push(currentTime - lastTime);
    lastTime = currentTime;
  }
  
  const avgFrameTime = frames.reduce((a, b) => a + b) / frames.length;
  expect(avgFrameTime).toBeLessThan(16.67);  // 60 FPS
});
```

---

## Assumptions & Constraints

### Assumptions

1. **Browser Support**: Target modern browsers with:
   - Web Audio API (already required for Feature 003)
   - Smooth scrolling support (fallback to instant scroll)
   - CSS transitions and transforms
   - requestAnimationFrame

2. **Viewport Behavior**: 
   - Notation container has fixed viewport dimensions
   - Horizontal scroll bar always available for long scores
   - No vertical scrolling during playback (staff fits in viewport)

3. **Note Timing**: 
   - Notes don't change during playback (static score)
   - No real-time MIDI input (score-based playback only)
   - Tick positions are immutable

4. **Integration**:
   - Feature 002 (staff notation) provides layout coordinates
   - Feature 003 (playback) provides currentTick tracking
   - Feature 008 (tempo change) integration is passive (no code changes)

### Constraints

1. **Synchronization Accuracy**: <50ms between audio and visual feedback (spec SC-002)
2. **Performance**: 60 FPS scroll animation (spec SC-003)
3. **Responsiveness**: Support viewport widths from 768px to 4K
4. **Compatibility**: Must not break existing playback or notation features
5. **Accessibility**: Highlight must be perceivable without color (WCAG 2.1)

---

## Technology Decisions

### Selected Approaches

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tick Propagation | React Context @ 30 Hz | Idiomatic, performant, automatic lifecycle |
| Scroll Calculation | Direct tick→pixel mapping | Simple, accurate, leverages existing layout |
| Scroll Animation | Direct scrollLeft updates | Perfect sync, smooth at 30 Hz, simple |
| Highlight Detection | Linear scan (O(n)) | Sufficient performance for typical scores |
| Visual Styling | Semi-transparent fill + outline | Industry standard, accessible |
| Manual Override | Timestamp-based detection | Robust, no false positives |
| Tempo Integration | Passive (no changes) | Scroll auto-adapts via currentTick |
| Performance Strategy | React.memo + useMemo + throttle | Proactive optimization, measurable |

### Integration Points

```
MusicTimeline (Feature 003)
  ├─ currentTick state (throttled 30 Hz updates)
  ├─ tempoState.tempoMultiplier (Feature 008)
  └─ playback status (playing/paused/stopped)
       ↓
usePlaybackScroll hook (NEW)
  ├─ ScrollController.calculateScrollPosition()
  ├─ NoteHighlightService.getPlayingNoteIds()
  └─ Auto-scroll enabled state
       ↓
StaffNotation component (Feature 002)
  ├─ Receives currentTick prop
  ├─ Applies auto-scroll to container scrollLeft
  └─ Passes highlightedNoteIds to NotationRenderer
       ↓
NotationRenderer component (Feature 002)
  └─ Applies .highlighted CSS class to matching notes
```

---

## Open Questions

None. All technical decisions finalized. Ready to proceed to Phase 1 (data model and contracts).

---

## References

- **Feature 002**: Staff Notation View - NotationLayoutEngine, StaffNotation component
- **Feature 003**: Music Playback - MusicTimeline, PlaybackScheduler, currentTick tracking
- **Feature 008**: Tempo Change - tempoMultiplier integration
- **Industry Research**: MuseScore, Sibelius, Flat.io playback highlighting patterns
- **Performance**: React rendering optimization patterns, CSS animation best practices
- **Accessibility**: WCAG 2.1 guidelines for non-color indicators
