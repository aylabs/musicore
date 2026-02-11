# Research: Staff Display Refinement

**Feature**: 001-staff-display-refinement  
**Date**: 2026-02-11  
**Status**: Complete

## Research Questions

This document resolves all "NEEDS CLARIFICATION" items from Technical Context and investigates implementation approaches for visual refinements.

---

## Question 1: CSS Opacity Implementation for SVG Elements

**Context**: Need to lighten clefs, staff lines, and bar lines using CSS opacity (per clarification decision).

### Decision: Use inline `opacity` attribute on SVG elements

**Rationale**: SVG elements support both CSS `opacity` property and inline `opacity` attribute. For React/TSX components, inline attributes provide better type safety and explicit control.

### Implementation Approach
- **Staff lines**: Add `opacity={0.55}` to `<line>` elements (55% opacity - midpoint of 50-60% range)
- **Bar lines**: Add `opacity={0.65}` to `<line>` elements (65% opacity - midpoint of 60-70% range)
- **Clefs**: Add `opacity={0.65}` to `<text>` elements (65% opacity - midpoint of 60-70% range)
- **Notes**: Keep `opacity={1.0}` (full opacity) or omit attribute (defaults to 1.0)

### Browser Support
- **Opacity on SVG**: Supported in all modern browsers (Chrome 57+, Safari 11+, Edge 16+) - all within PWA target platform requirements
- **Performance**: CSS opacity is GPU-accelerated on modern browsers, minimal performance impact

### Alternative Considered
- **CSS classes** with `.staff-line { opacity: 0.55; }` - Rejected because inline attributes are more explicit and easier to test in component tests

### References
- MDN: SVG opacity attribute - https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/opacity
- Browser support confirmed for iPad Safari 11+, Android Chrome 57+

---

## Question 2: Staff Spacing Reduction Implementation

**Context**: Need to reduce vertical gap between staves by 25% (per clarification: gap only, not total system height).

### Decision: Reduce `margin-bottom` in StaffGroup.css from 10px to 7.5px

**Rationale**: 
- Current spacing: `margin-bottom: 10px` in `.staff-group`
- Target: 25% reduction → 10px * 0.75 = 7.5px
- This is the gap between bottom of one staff group and top of next staff group
- Clean, simple CSS change with no JavaScript logic required

### Measurement Verification
- Current: Bottom line of Staff N + 10px gap = Top line of Staff N+1
- New: Bottom line of Staff N + 7.5px gap = Top line of Staff N+1
- Test: Load multi-staff score, measure pixel distance between staff bottom/top lines, verify 7.5px gap

### Edge Case Handling
- **Orchestral scores** (6+ staves): Same 7.5px gap applies to all staff groups
- **Single-staff scores**: No vertical spacing (N/A - only one staff)
- **Stacked staves** (piano): Spacing between staff groups, not within instrument's staves

---

## Question 3: Staff Height Increase Implementation

**Context**: Need to increase staff height by 20% (per FR-002: bottom line to top line distance).

### Decision: Increase `staffSpace` constant from 10px to 12px in config.ts

**Rationale**:
- Current staff height: 4 * staffSpace = 4 * 10px = 40px (from top line to bottom line)
- Target: 20% increase → 40px * 1.20 = 48px
- Required staffSpace: 48px / 4 = 12px
- Exactly 20% increase: 12px / 10px = 1.20 ✓

### Cascading Effects
- **Note sizing**: Font size calculated as `staffSpace * glyphFontSizeMultiplier (4.0)` = 12px * 4.0 = 48px (vs current 40px)
- **Clef sizing**: Same formula = 48px (larger, more readable)
- **Note positioning**: All Y-coordinates scale proportionally (centerY ± staffPosition * staffSpace)
- **Ledger lines**: Width remains `staffSpace * 2.5` = 30px (vs current 25px)

### Layout Engine Impact
- NotationLayoutEngine already uses `config.staffSpace` for all calculations
- No algorithm changes required - purely parametric increase
- Existing tests will need updated expected values (40px → 48px for note sizes, Y-positions scaled)

### Performance Consideration
- Larger SVG elements = more pixels to render
- Testing required: Confirm 45+ fps scrolling with 20% larger staves
- Virtual scrolling already implemented (Feature 009) - should handle larger elements efficiently

---

## Question 4: Performance Testing Approach

**Context**: FR-008 requires minimum 45fps scrolling, 60fps target.

### Decision: Use browser performance tools + manual tablet testing

**Approach**:
1. **Chrome DevTools Performance Profiler**: Record scrolling session, analyze frame timing
2. **Manual tablet testing**: Load long score (100+ measures), perform continuous scroll, observe smoothness
3. **Metrics to collect**:
   - Frame rate during scroll (target: 45+ fps minimum, 60fps ideal)
   - Scroll event handler duration (should be <16ms for 60fps)
   - Paint/composite times (should remain consistent with current implementation)

### Thresholds
- **Pass**: Consistent 45+ fps on iPad Air (2020), Surface Go 3, Samsung Galaxy Tab S7
- **Ideal**: Consistent 60fps on same devices
- **Fail**: Drops below 45fps consistently

### Fallback Plan
- If performance degrades below 45fps:
  1. Reduce staffSpace to 11px (10% increase instead of 20%)
  2. Or reduce opacity precision (55% → 60% for staff lines to reduce transparency overhead)
- Visual quality prioritized per clarification (C answer to Question 3)

---

## Question 5: Visual Hierarchy Validation

**Context**: VD-005 requires clear hierarchy: Notes (most prominent) > Clefs/Bar Lines > Staff Lines

### Decision: User acceptance testing + A/B comparison

**Validation Method**:
1. **Side-by-side comparison**: Current implementation vs new opacity values
2. **Tablet viewing distance test**: Display on tablet at 24-36 inches (music stand distance), verify notes "pop"
3. **Lighting conditions**: Test in bright light (performance venue), dim light (practice room), verify legibility

### Opacity Values Rationale
- **Notes**: 1.0 (100%) - Full opacity, maximum prominence
- **Clefs/Bar Lines**: 0.65 (65%) - Clearly visible but subordinate to notes
- **Staff Lines**: 0.55 (55%) - Lightest, provide structure without competing

### Mathematical Contrast
- Note-to-Clef contrast: 100% / 65% = 1.54x more prominent
- Note-to-Staff contrast: 100% / 55% = 1.82x more prominent
- Clef-to-Staff contrast: 65% / 55% = 1.18x more prominent

This creates clear visual steps per VD-005 requirement.

---

## Question 6: Color Scheme Compatibility

**Context**: VD-006 requires opacity adjustments to work across light and dark color schemes.

### Decision: Opacity is color-agnostic, works universally

**Rationale**:
- Opacity reduces alpha channel of color regardless of RGB values
- `stroke="black" opacity={0.55}` → rgba(0,0,0,0.55) in light mode
- Same opacity works in dark mode if color changes to white: `stroke="white" opacity={0.55}` → rgba(255,255,255,0.55)
- Hierarchy preserved: 1.0 > 0.65 > 0.55 regardless of base color

### Implementation Note
- Current: All elements use `stroke="black"` or `fill="black"`
- If dark mode added later: Change color to white, keep opacity values the same
- No color scheme detection needed for this feature

### Testing
- Light mode (current): Verify on white background
- Future dark mode: Would use inverted colors, same opacity values

---

## Summary of Research Findings

| Topic | Decision | Implementation Detail |
|-------|----------|----------------------|
| **Opacity Method** | Inline SVG opacity attribute | `opacity={0.55}` and `opacity={0.65}` in TSX |
| **Staff Spacing Reduction** | CSS margin-bottom change | 10px → 7.5px in StaffGroup.css |
| **Staff Height Increase** | staffSpace constant increase | 10px → 12px in config.ts (DEFAULT_STAFF_CONFIG) |
| **Performance Target** | 45fps minimum, 60fps ideal | Manual tablet testing + Chrome DevTools |
| **Visual Hierarchy** | Opacity values create clear steps | 1.0 (notes) > 0.65 (clefs/bars) > 0.55 (staff lines) |
| **Color Compatibility** | Opacity is color-agnostic | Works for any stroke/fill color value |

**All NEEDS CLARIFICATION items resolved. Ready for Phase 1: Design.**
