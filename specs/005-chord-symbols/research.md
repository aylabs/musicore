# Research: Chord Symbol Visualization

**Feature**: 005-chord-symbols  
**Date**: 2026-02-08  
**Status**: Complete

## Research Tasks

### Task 1: Chord Detection Strategy

**Question**: How should the system detect when multiple notes form a chord that should be displayed as a symbol?

**Research Findings**:
- **Same-tick grouping**: Most straightforward approach - group notes within a voice that have identical start_tick values
- **Cross-voice consideration**: FR-012 requires analyzing notes across multiple voices in the same staff
- **Existing patterns**: NotationLayoutEngine already groups notes by beat/measure for layout; can extend with tick-based grouping
- **Performance**: Grouping by tick is O(n) with single pass over notes array; negligible overhead

**Decision**: Implement tick-based grouping in a new `ChordDetector` service
- Input: Array of notes from voice(s)
- Process: Group notes by start_tick using Map<number, Note[]>
- Output: Array of chord groups (notes at same tick)
- Rationale: Simple, performant, leverages existing Note structure

**Alternatives Considered**:
- Backend analysis: Rejected for P1 - adds API latency, overkill for visualization
- Heuristic grouping (within tolerance window): Rejected - violates 960 PPQ precision (constitution principle IV)

---

### Task 2: Chord Type Recognition Algorithm

**Question**: What algorithm should identify chord types (major, minor, seventh, etc.) from a set of pitches?

**Research Findings**:
- **Interval-based approach**: Calculate intervals from root note, match against patterns
  - C major: root, major third (4 semitones), perfect fifth (7 semitones)
  - C minor: root, minor third (3 semitones), perfect fifth (7 semitones)
  - C7: root, major third, perfect fifth, minor seventh (10 semitones)
- **Pitch class set approach**: Reduce pitches to pitch classes (0-11), normalize to root, match patterns
  - More robust for inversions and voicings across octaves
  - Standard music theory approach
- **Libraries**: No TypeScript music theory libraries in current dependencies; implementing from scratch is straightforward

**Decision**: Pitch class set approach with root finding algorithm
- Step 1: Extract unique pitch classes from MIDI pitches (pitch % 12)
- Step 2: Find root (lowest pitch class by default, or most stable interval)
- Step 3: Calculate intervals from root
- Step 4: Match interval pattern against chord type database

**Chord Type Database** (minimum FR-007):
```typescript
const CHORD_PATTERNS = {
  major: [0, 4, 7],           // Root, M3, P5
  minor: [0, 3, 7],           // Root, m3, P5
  diminished: [0, 3, 6],      // Root, m3, d5
  augmented: [0, 4, 8],       // Root, M3, A5
  dominant7: [0, 4, 7, 10],   // Root, M3, P5, m7
  major7: [0, 4, 7, 11],      // Root, M3, P5, M7
  minor7: [0, 3, 7, 10],      // Root, m3, P5, m7
};
```

**Rationale**: Standard music theory approach; extensible for future chord types (9ths, 11ths, altered chords)

**Alternatives Considered**:
- Simple interval matching: Rejected - doesn't handle inversions well
- Machine learning classifier: Rejected - overkill, requires training data, adds complexity

---

### Task 3: SVG Text Positioning Strategy

**Question**: How should chord symbols be positioned above the staff without overlapping other notation elements?

**Research Findings**:
- **Existing system**: NotationRenderer uses SVG with hardcoded positioning
- **Staff dimensions**: Standard 5-line staff with configurable spacing (DEFAULT_STAFF_CONFIG)
- **Collision detection**: Current system doesn't have sophisticated layout; notes positioned by beat
- **Text positioning**: SVG `<text>` elements support `text-anchor`, `dominant-baseline` for alignment
- **Typical placement**: Chord symbols 20-30px above staff (clef/key signature typically 10-15px above)

**Decision**: Fixed vertical offset above staff with horizontal alignment to note group
- **Vertical**: `y = staffY - 30` (30px above staff top line)
- **Horizontal**: `x = minNoteX` (leftmost note in chord group)
- **Text anchor**: `middle` (center-aligned on note)
- **Font**: Sans-serif, 14px, bold for readability

**Collision Avoidance** (SC-006 - 98% no overlaps):
- Check for clef/time signature at beat 0: offset +15px if present
- Check for key signature: offset +10px if present
- Future enhancement: Bounding box collision detection (out of scope for P1)

**Rationale**: Simple, predictable,meets 98% success criterion for typical scores

**Alternatives Considered**:
- Dynamic collision detection: Rejected for P1 - adds complexity, 98% achievable with fixed offsets
- Above-note positioning (directly over noteheads): Rejected - clashes with stems, beams

---

### Task 4: Rendering Integration with StaffNotation

**Question**: Where should chord symbol rendering logic integrate into the existing notation system?

**Research Findings**:
- **Current architecture**: StaffNotation (container) → NotationLayoutEngine (layout) → NotationRenderer (SVG)
- **NotationLayoutEngine**: Pure function, returns layout data (noteheads, stems, beams)
- **NotationRenderer**: Presentational component, renders SVG from layout data
- **Pattern**: Separation of layout calculation and rendering

**Decision**: Extend NotationLayoutEngine with chord symbol layout, render in NotationRenderer
- **Layout phase** (NotationLayoutEngine):
  - Call ChordDetector to group notes by tick
  - Call ChordAnalyzer to identify chord types
  - Calculate symbol positions (x, y, text)
  - Add to layout output: `chordSymbols: Array<{ x, y, text, tick }>`
- **Rendering phase** (NotationRenderer):
  - Add `<text>` elements for each chord symbol
  - Position using layout data

**Alternative approach**: Separate ChordSymbol component
- Create standalone `<ChordSymbol>` component
- Pass notes as props, handle detection/rendering internally
- Compose in StaffNotation: `<NotationRenderer /><ChordSymbol />`

**Decision**: Use alternative approach (separate component) for P1
- **Rationale**: 
  - Faster development - doesn't require modifying battle-tested NotationLayoutEngine
  - Better separation of concerns - chord visualization is optional overlay
  - Easier testing - component tested in isolation
  - Lower risk - doesn't touch existing notation logic
- **Future**: Can integrate into layout engine if performance profiling shows re-calculation overhead

---

### Task 5: Performance Optimization Strategy

**Question**: How to ensure chord detection and rendering meets <100ms performance requirement (SC-003)?

**Research Findings**:
- **Current performance**: NotationLayoutEngine uses React useMemo for layout caching
- **Chord detection**: O(n) single pass over notes - negligible for typical voice (100-1000 notes)
- **Chord analysis**: O(1) per chord (fixed pattern matching against 7 types)
- **SVG rendering**: Browser-optimized, text elements are lightweight
- **Typical score**: 10 chords per measure × 50 measures = 500 chords max

**Decision**: Memoize chord detection results in ChordSymbol component
```typescript
const detectedChords = useMemo(() => {
  const groups = ChordDetector.groupByTick(notes);
  return groups.map(group => ({
    tick: group.tick,
    symbol: ChordAnalyzer.identify(group.notes),
    position: calculatePosition(group.notes)
  }));
}, [notes]); // Re-compute only when notes array changes
```

**Performance budget**:
- Chord detection: <10ms (single pass grouping)
- Chord analysis: <10ms (7 patterns × 500 chords = 3500 comparisons, trivial)
- SVG rendering: <50ms (browser-native, 500 text elements)
- **Total**: ~70ms - well under 100ms target (SC-003)

**Rationale**: React memoization prevents unnecessary recalculation; chord analysis is computationally trivial

**Alternatives Considered**:
- Web Worker offloading: Rejected - overhead exceeds calculation time for typical workloads
- Backend pre-processing: Rejected - network latency exceeds calculation time

---

## Summary of Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Detection** | Tick-based grouping (ChordDetector service) | Simple, precise, O(n) performance |
| **Recognition** | Pitch class set with interval matching | Standard music theory, handles inversions |
| **Positioning** | Fixed 30px above staff, centered on notes | Meets 98% no-overlap target, simple |
| **Integration** | Separate ChordSymbol component (P1) | Faster development, lower risk, isolated testing |
| **Performance** | React useMemo on notes array | Meets <100ms target with headroom |

## Technology Choices

- **No new dependencies**: Implement chord analysis from scratch (simple interval math)
- **Extends existing**: ChordSymbol component composes with StaffNotation
- **Follows patterns**: Memoization strategy matches NotationLayoutEngine approach
- **Test-friendly**: Pure chord analysis functions, testable component

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Chord recognition accuracy <95% | Low | High | Extensive unit tests with real-world chord examples |
| Position overlaps >2% | Medium | Medium | Manual testing on varied scores, adjust offsets if needed |
| Performance >100ms on large scores | Low | Medium | Profiling with 10k+ event test scores |

## Next Steps (Phase 1)

1. Define data model (ChordGroup, ChordType interfaces) in `data-model.md`
2. Document API if backend involvement needed (minimal/none for P1)
3. Create quickstart guide for development workflow
