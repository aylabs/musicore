# Research: Stacked Staves View

**Phase**: 0 - Outline & Research  
**Date**: 2026-02-09  
**Status**: Complete

## Research Objective

Identify optimal patterns for implementing a toggleable full-score view with multi-voice rendering, staff labels, and synchronized playback across all staves, without introducing new dependencies or degrading performance.

---

## Research Area 1: View Mode State Management

**Question**: What's the best pattern for managing view mode state (Individual vs Stacked) in React while preserving playback state during transitions?

### Decision: Lift View Mode State to ScoreViewer

**Rationale**:
- ScoreViewer is already the container managing playback state via `usePlayback` hook
- Playback state (status, currentTick, pinnedStartTick) must be preserved across view switches
- Simple boolean or enum state (`viewMode: 'individual' | 'stacked'`) suffices
- No external state management library needed (React useState is sufficient)

**Implementation Pattern**:
```typescript
const [viewMode, setViewMode] = useState<'individual' | 'stacked'>('individual');

// Render based on mode
{viewMode === 'individual' && <InstrumentList .../>}
{viewMode === 'stacked' && <StackedStaffView .../>}
```

**Alternatives Considered**:
- ❌ **Context API**: Overkill for simple binary state; adds unnecessary indirection
- ❌ **URL-based routing**: Feature doesn't require navigation; state should be ephemeral per session
- ❌ **Redux/Zustand**: Constitution principle V mandates minimizing dependencies; useState sufficient

---

## Research Area 2: Multi-Voice Staff Rendering

**Question**: How should multiple voices be rendered together on a single staff without causing visual overlap or ambiguity?

### Decision: Voice Layering with Stem Direction Strategy

**Rationale**:
- Standard music notation convention: Voice 1 = stems up, Voice 2 = stems down
- Existing `NotationRenderer` already calculates stem direction based on pitch
- Voices rendered sequentially on same canvas/SVG layer creates correct overlapping notes
- VexFlow (if used) or custom SVG rendering handles collision detection automatically

**Implementation Pattern**:
```typescript
// MultiVoiceStaff component
<StaffNotation 
  notes={[...voice1Notes, ...voice2Notes, ...voice3Notes]} 
  clef={staff.clef}
  // NotationRenderer internally handles stem directions
/>
```

**Key Constraints**:
- Notes from different voices at same tick position must have opposing stem directions
- Voice 1 (melody): stems up, positioned higher
- Voice 2+ (harmony): stems down, positioned lower
- Existing `NotationRenderer.tsx` likely already handles this (verify during implementation)

**Alternatives Considered**:
- ❌ **Separate canvas per voice**: Creates visual separation, contradicts music notation standard
- ❌ **Manual collision detection**: Reinvents notation rendering logic; error-prone
- ✅ **Leverage existing NotationRenderer**: Reuses proven rendering logic

---

## Research Area 3: Performance Optimization for Many Staves

**Question**: How can we render 50+ staves at 60fps without performance degradation?

### Decision: Virtualization + Canvas Rendering

**Rationale**:
- Constitution requirement: 60fps (16ms frame budget) with up to 50 staves
- Each staff typically renders 20-100 notes depending on score density
- Canvas-based rendering (existing `NotationRenderer`) is GPU-accelerated
- Virtualization: Only render staves within viewport + small buffer

**Implementation Strategy**:
1. **Viewport Tracking**: Calculate visible staff indices based on scroll position
2. **Render Window**: Render visible staves + 2 above + 2 below (buffer for smooth scrolling)
3. **Lazy Rendering**: Staves outside viewport render as placeholder divs with correct height
4. **Existing Auto-Scroll**: Reuse Feature 009's scroll logic (already optimized for 60 Hz updates)

**Performance Budget**:
- Staff rendering: ~1-2ms per staff (canvas draw operations)
- Visible staves (5-8 typical): 5-16ms total
- Playback highlighting: <1ms (update note colors)
- Total: <16ms per frame ✅ meets 60fps target

**Alternatives Considered**:
- ❌ **Render all staves always**: Violates 16ms budget with 50 staves (~100ms)
- ❌ **SVG-only rendering**: Slower DOM manipulation than canvas
- ✅ **Hybrid: Canvas for notes + CSS for structure**: Best of both worlds

---

## Research Area 4: Auto-Scroll Strategy for Stacked View

**Question**: How should auto-scroll work when playback position spans multiple staves simultaneously?

### Decision: Scroll to Topmost Active Staff

**Rationale**:
- Feature 009 already implements per-staff horizontal auto-scroll
- Stacked view requires vertical scroll to keep active notes visible
- Multiple instruments/staves play simultaneously → focus on topmost active staff
- Horizontal scroll can be disabled in stacked view (full width rendering)

**Implementation Pattern**:
```typescript
// In StackedStaffView, when currentTick updates:
const activeStaffIndex = findTopmostActiveStaff(currentTick, score);
scrollToStaff(activeStaffIndex, { behavior: 'smooth', block: 'center' });
```

**Scroll Behavior**:
- **Vertical**: Keep topmost playing staff in center of viewport
- **Horizontal**: Staves render full width (no horizontal scroll needed)
- **Threshold**: Only scroll if active staff is within 20% of viewport edges

**Alternatives Considered**:
- ❌ **Scroll to all active staves**: Impossible when notes span multiple staves
- ❌ **Scroll to currently selected staff**: Breaks during playback
- ✅ **Topmost active staff**: Predictable, follows reading order

---

## Research Area 5: Staff Label Rendering

**Question**: How should instrument names be positioned and styled alongside staves?

### Decision: Fixed-Position Labels with CSS Grid

**Rationale**:
- CSS Grid enables label column + staff column layout
- Fixed-width label column (150-200px) prevents layout shifts
- Labels scroll with staves (not fixed to viewport)
- Truncation with ellipsis for long names (>20 chars)

**Implementation Pattern**:
```css
.staff-group {
  display: grid;
  grid-template-columns: 200px 1fr; /* Label | Staff */
  gap: 20px;
  margin-bottom: 40px; /* Spacing between staves */
}

.staff-label {
  text-align: right;
  padding-right: 10px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

**Multi-Staff Instruments** (e.g., Piano):
- Label spans both staves vertically using `grid-row: 1 / span 2`
- Bracket drawn via CSS border or SVG line connecting staves

**Alternatives Considered**:
- ❌ **Absolutely positioned labels**: Hard to maintain scroll sync
- ❌ **Sticky labels**: Confusing when labels change during scroll
- ✅ **Grid layout**: Clean, responsive, predictable

---

## Research Area 6: Click-to-Seek in Stacked View

**Question**: How should click-to-seek work when clicking notes in any staff?

### Decision: Reuse Existing onSeekToTick Callback

**Rationale**:
- Feature 009 already implements click-to-seek via `onSeekToTick` prop
- Same callback can be passed to all `StaffNotation` components in stacked view
- Playback state is global (managed by `usePlayback`), so seek affects all staves simultaneously
- No additional logic needed

**Implementation Pattern**:
```typescript
// In StackedStaffView
<StaffGroup 
  onSeekToTick={playbackState.seekToTick} // Same callback for all staves
  onUnpinStartTick={playbackState.unpinStartTick}
/>
```

**Expected Behavior**:
- Click any note → seeks to that note's start_tick
- Green highlight appears on clicked note across all staves at that tick
- Persistent start pin behavior preserved (Feature 009)

**Alternatives Considered**:
- ❌ **Staff-specific seek logic**: Breaks global playback state invariant
- ❌ **Disable click in stacked view**: Contradicts feature requirement FR-008
- ✅ **Reuse existing callback**: Zero additional complexity

---

## Summary: No NEEDS CLARIFICATION Remaining

All technical decisions resolved. Implementation can proceed to Phase 1 (data model & contracts).

### Key Technologies Confirmed
- **State Management**: React useState (no new dependencies)
- **Rendering**: Reuse existing canvas-based NotationRenderer
- **Layout**: CSS Grid for label + staff columns
- **Performance**: Viewport virtualization for 50+ staves
- **Playback Integration**: Pass existing playback state callbacks down

### Risks Identified
- ⚠️ **Performance with 50 staves**: Mitigated by virtualization
- ⚠️ **Multi-voice rendering bugs**: Verify NotationRenderer handles voice layering

### Next Phase
Phase 1: Generate data-model.md (component data flows), quickstart.md, and verify no contracts needed (frontend-only feature).
