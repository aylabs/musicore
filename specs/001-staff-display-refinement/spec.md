# Feature Specification: Staff Display Refinement

**Feature Branch**: `001-staff-display-refinement`  
**Created**: 2026-02-11  
**Status**: Draft  
**Input**: User description: "Decrease separation between staves and increase the size of them * Make clef lighter * Make staff lines lighter * Make bar lines between measure lighter"

## Clarifications

### Session 2026-02-11

- Q: Visual weight implementation method - Should "lighter" elements use opacity reduction, stroke-width reduction, both, or filter effects? → A: Use CSS opacity reduction (translucent elements)
- Q: Spacing calculation base - Should the 25% spacing reduction measure the gap only, total distance including staff heights, or center-to-center? → A: Gap between staves only (bottom line of staff N to top line of staff N+1)
- Q: Performance vs. visual quality priority - If 60fps cannot be maintained with all visual enhancements, what should be prioritized? → A: Visual quality priority - reduce size/spacing targets if needed to stay above 45fps minimum

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Improved Screen Real Estate (Priority: P1)

As a tablet user viewing multi-staff scores (e.g., piano music with treble and bass clefs), I need staves to be displayed closer together so that I can see more measures at once without scrolling, improving my reading flow during practice and performance.

**Why this priority**: This is the primary UX improvement - maximizing visible content on tablet screens directly enhances the practice/performance experience by reducing interruptions from scrolling.

**Independent Test**: Can be fully tested by loading a multi-staff score (piano, organ, choir) and measuring the number of measures visible on a standard tablet viewport (10-12 inch screen). Delivers immediate value by showing more musical context at once.

**Acceptance Scenarios**:

1. **Given** a piano score with multiple measures is loaded, **When** viewing on a tablet (iPad, Surface, Android 10-12 inch screen), **Then** at least 30% more measures are visible compared to current spacing
2. **Given** a choir score with 4 staves (SATB) is displayed, **When** viewing in portrait orientation on tablet, **Then** all 4 staves fit comfortably within one viewport height without requiring vertical scroll for a single measure
3. **Given** any multi-staff score is displayed, **When** comparing to previous version, **Then** vertical spacing between adjacent staves is visibly reduced while maintaining clear separation

---

### User Story 2 - Enhanced Readability (Priority: P2)

As a musician reading scores on a tablet, I need the staff notation elements (clefs, staff lines, bar lines) to have lighter visual weight so that the actual notes stand out more prominently, making it easier to sight-read and follow during performance.

**Why this priority**: After optimizing spacing (P1), visual hierarchy is critical - making structural elements lighter allows notes to be the focus, improving sight-reading speed and reducing eye strain.

**Independent Test**: Can be tested by displaying any score and comparing visual contrast between notes and structural elements. Delivers value by improving reading comfort during extended practice sessions.

**Acceptance Scenarios**:

1. **Given** a score is displayed with the new styling, **When** viewing from typical tablet reading distance (18-24 inches), **Then** notes appear more prominent than clefs, staff lines, and bar lines
2. **Given** a score with multiple clef changes is displayed, **When** comparing visual weight, **Then** clefs are clearly visible but lighter in appearance than note heads
3. **Given** a score is displayed, **When** observing staff lines and bar lines, **Then** they provide clear structural guidance without dominating the visual field
4. **Given** a score is viewed in varying lighting conditions (indoor practice room, outdoor performance), **Then** the lighter elements remain legible but don't compete with note heads for attention

---

### User Story 3 - Larger Staff Display (Priority: P1)

As a tablet user, I need the staff itself (including staff lines, notes, and symbols) to be larger so that notation is easier to read during practice and performance, especially when the device is on a music stand at reading distance.

**Why this priority**: Equal to P1 for spacing - larger notation directly addresses tablet readability challenges. Combined with optimized spacing, this creates maximum usable screen area.

**Independent Test**: Can be tested by loading any score and measuring staff height and note size. Delivers immediate value by improving legibility for users with visual challenges or at typical music stand distances.

**Acceptance Scenarios**:

1. **Given** a score is displayed, **When** measuring staff height (bottom line to top line), **Then** staves are at least 20% taller than current implementation
2. **Given** a score with various note types is displayed, **When** viewing at typical music stand distance (24-36 inches on tablet), **Then** note heads, stems, and accidentals are clearly distinguishable without zooming
3. **Given** a score with complex notation (multiple voices, chord symbols, dynamics) is displayed, **When** all elements are rendered at new size, **Then** no overlapping or crowding occurs that impairs readability

---

### Edge Cases

- What happens when a score has 6+ staves (orchestral score)? System should maintain proportional spacing even with many staves, prioritizing fitting as many measures as possible while keeping each staff readable.
- How does system handle very long scores (100+ measures) with new spacing? Virtual scrolling performance should remain at 60fps even with larger staff sizes.
- What if the user zooms in/out? Spacing ratios and element weights should scale proportionally with zoom level.
- How are visual weights affected by different display color modes (dark mode, high contrast)? Lighter elements should remain legible across all supported color schemes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST reduce vertical gap between adjacent staves (measured from bottom line of one staff to top line of the next staff) by at least 25% compared to current implementation
- **FR-002**: System MUST increase staff height (distance from bottom line to top line) by at least 20% compared to current implementation
- **FR-003**: System MUST render staff lines with reduced visual weight (lighter appearance) while maintaining clear visibility
- **FR-004**: System MUST render bar lines with reduced visual weight (lighter appearance) while maintaining clear measure boundaries
- **FR-005**: System MUST render clefs with reduced visual weight (lighter appearance) while maintaining recognizability
- **FR-006**: System MUST maintain current note head, stem, and accidental visual weight (or make them slightly more prominent) to ensure they remain the focal point
- **FR-007**: System MUST preserve all existing functionality (note highlighting, playback, auto-scroll) with the new spacing and sizing
- **FR-008**: System MUST maintain scrolling performance at minimum 45fps with larger staff sizes; 60fps is the target but visual quality (larger staves, reduced spacing) takes priority over achieving 60fps if tradeoffs are necessary
- **FR-009**: System MUST ensure no visual overlap between staves even at minimum spacing
- **FR-010**: System MUST apply these changes consistently across all score types (single-staff, multi-staff, piano, choir)

### Visual Design Requirements

- **VD-001**: Clefs should use CSS opacity of approximately 0.6-0.7 (60-70% opacity) to reduce visual weight while maintaining recognizability
- **VD-002**: Staff lines should use CSS opacity of approximately 0.5-0.6 (50-60% opacity) to appear lighter than notes
- **VD-003**: Bar lines should use CSS opacity of approximately 0.6-0.7 (60-70% opacity) to maintain measure boundaries without dominating
- **VD-004**: Note heads, stems, flags, and beams should maintain full opacity (1.0) or slightly increase their current visual prominence
- **VD-005**: The visual hierarchy should clearly be: Notes (most prominent) > Clefs/Bar Lines > Staff Lines (least prominent)
- **VD-006**: All opacity adjustments should work across light and dark color schemes without compromising legibility

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view at least 30% more measures on a standard tablet screen (10-12 inches) compared to the current implementation
- **SC-002**: Staff height increases from current size to at least 20% larger, measured in pixels from bottom to top staff line
- **SC-003**: Vertical gap between staves (bottom line to top line spacing) is reduced by at least 25% while maintaining clear visual separation
- **SC-004**: Users can read notation comfortably at typical music stand distance (24-36 inches) without digital zoom
- **SC-005**: Sight-reading speed improves as notes are more visually prominent than structural elements (subjective assessment through user testing)
- **SC-006**: Virtual scrolling maintains minimum 45fps performance with larger staff rendering; 60fps is ideal but not required if visual improvements necessitate tradeoff
- **SC-007**: All existing tests pass with the new styling, confirming no regression in functionality

### User Experience Outcomes

- **UX-001**: Musicians report improved reading comfort during extended practice sessions (30+ minutes)
- **UX-002**: Users with visual challenges (presbyopia, mild visual impairment) report easier notation reading
- **UX-003**: Users report fewer interruptions from scrolling due to more measures visible per viewport

## Assumptions & Dependencies

### Assumptions

- The current staff spacing is larger than optimal for tablet screens
- Lightening structural elements (clefs, staff lines, bar lines) will improve note prominence without compromising recognizability
- Users prefer seeing more measures at once over larger spacing between staves
- A 20% increase in staff size combined with reduced spacing will net a positive improvement in screen real estate utilization
- The StaffNotation component uses CSS or SVG styling that can be adjusted without major refactoring

### Dependencies

- Requires access to the StaffNotation component styling (CSS/SVG)
- May depend on the music font (Bravura/SMuFL) supporting visual weight variations
- Virtual scrolling performance must be validated after size changes

## Scope Boundaries

### In Scope

- Reducing vertical spacing between staves
- Increasing staff height and note sizing
- Adjusting visual weight (opacity/stroke) of clefs, staff lines, and bar lines
- Maintaining existing functionality with new styling
- Ensuring changes work across all score types and device sizes
- Preserving performance (60fps scrolling)

### Out of Scope

- User-configurable spacing or sizing preferences (fixed values for all users)
- Changes to note rendering logic or positioning algorithms (only sizing/spacing)
- Modifications to playback, auto-scroll, or interaction behavior
- Changes to horizontal spacing or measure width calculations
- Adjustments to other UI elements (buttons, controls, headers)
- Support for accessibility features beyond larger sizing (e.g., screen reader enhancements)

## Background & Context

### Musical Context

Multi-staff scores (piano, choir, orchestra) are challenging to display on tablet screens because vertical real estate is limited. Traditional printed scores can fit 2-4 systems (sets of staves) per page, but tablets show only one system at a time with current spacing. Musicians need to see more musical context to understand phrasing, anticipate upcoming sections, and reduce page turns during performance.

### Technical Context

The current StaffNotation component renders five-line staves with SMuFL font (Bravura) for musical symbols. Staff lines, bar lines, and clefs are rendered with the same visual weight as notes, causing visual competition. The spacing between staves was likely designed for desktop viewing or inherited from print conventions, not optimized for tablet reading distances and screen sizes.

### User Need

Tablet users (the primary audience per project constitution) need:
1. **More context visible**: See upcoming measures to anticipate musical changes
2. **Easier reading**: Larger notation symbols for comfortable reading at music stand distance
3. **Visual clarity**: Notes should "pop" from the background structural elements

This refinement directly addresses these needs by optimizing for tablet form factor and music reading ergonomics.
