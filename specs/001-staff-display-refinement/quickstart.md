# Quick Start: Staff Display Refinement

**Feature**: 001-staff-display-refinement  
**Date**: 2026-02-11  
**Status**: Implementation Ready

## Overview

This feature improves tablet readability by adjusting staff visual presentation: reduced spacing between staves (25%), larger staff height (20%), and lighter structural elements (clefs, staff lines, bar lines) using CSS opacity.

## Testing the Changes

### Prerequisites
- Node.js 20.19+ installed
- Frontend development environment set up
- Demo score or sample MusicXML file loaded

### Visual Validation Steps

1. **Load the PWA locally**:
   ```bash
   cd frontend
   npm install
   npm run dev
   # Visit http://localhost:5173
   ```

2. **Load a multi-staff score** (piano, choir, or orchestral):
   - Use Demo button, or
   - Import a MusicXML file with multiple staves

3. **Verify Staff Spacing (FR-001)**:
   - Open browser DevTools
   - Inspect staff group elements
   - Measure vertical gap between staves:
     - **Expected**: 7.5px margin-bottom on `.staff-group`
     - **Previous**: 10px
     - **Reduction**: 25% ✓

4. **Verify Staff Height (FR-002)**:
   - Inspect SVG staff lines
   - Measure distance from top line (y1) to bottom line (y5):
     - **Expected**: 48px (4 * staffSpace where staffSpace = 12px)
     - **Previous**: 40px (4 * 10px)
     - **Increase**: 20% ✓

5. **Verify Opacity Values** (FR-003, FR-004, FR-005):
   - Inspect SVG elements:
     - **Staff lines** (`<line>` with class/testid `staff-line-*`): opacity=0.55
     - **Bar lines** (`<line>` with testid matching `barline-*`): opacity=0.65
     - **Clefs** (`<text>` with testid `clef-*`): opacity=0.65
     - **Note heads** (`<text>` with class `note-head`): opacity=1.0 or no opacity attribute

6. **Verify Visual Hierarchy** (VD-005):
   - View score on tablet at music stand distance (24-36 inches)
   - Confirm:
     - Notes appear **most prominent** (darkest, full opacity)
     - Clefs and bar lines are clearly visible but **subordinate** to notes
     - Staff lines provide structure without **dominating** visual field

### Performance Validation (FR-008)

1. **Load long score** (100+ measures, multiple staves)

2. **Test scrolling performance**:
   ```bash
   # Open Chrome DevTools > Performance tab
   # Click Record, scroll horizontally through score for 5 seconds, stop recording
   # Analyze frame timing:
   #   - Look for red frames (slower than 16ms)
   #   - Check FPS meter in top-right corner
   ```

3. **Performance thresholds**:
   - **Pass**: Consistent 45+ fps during scroll
   - **Ideal**: Consistent 60fps
   - **Fail**: Drops below 45fps for extended periods

4. **Manual tablet testing**:
   - Deploy to GitHub Pages or test on physical tablet
   - Verify smooth scrolling on iPad, Surface, Android tablet
   - Ensure no visual lag or stuttering

### Measure Visibility Test (SC-001)

1. **Before/After comparison**:
   - Checkout `main` branch, load same score, count visible measures on tablet
   - Checkout `001-staff-display-refinement` branch, count visible measures
   - **Expected**: 30% more measures visible

2. **Example calculation**:
   - If current implementation shows 10 measures on iPad screen
   - New implementation should show 13-14 measures (30% increase)

### Automated Tests

Run the test suite to ensure no regressions:

```bash
cd frontend
npm test

# Specific test files affected:
# - NotationRenderer.test.tsx (opacity values)
# - StaffGroup.test.tsx (spacing changes)
# - NotationLayoutEngine.test.tsx (size calculations)
```

**All existing tests must pass** (FR-007, SC-007).

## Expected Component Test Changes

### NotationRenderer.test.tsx

Tests will verify opacity attributes on SVG elements:

```typescript
it('should render staff lines with reduced opacity', () => {
  // Test verifies opacity={0.55} on staff line elements
});

it('should render clef with reduced opacity', () => {
  // Test verifies opacity={0.65} on clef text element
});

it('should render barlines with reduced opacity', () => {
  // Test verifies opacity={0.65} on barline elements
});

it('should render notes with full opacity', () => {
  // Test verifies note heads have no opacity attribute or opacity={1.0}
});
```

### NotationLayoutEngine.test.tsx

Tests will need updated expected values for staffSpace = 12:

```typescript
// BEFORE
expect(noteSize).toBe(40); // staffSpace 10 * glyphFontSizeMultiplier 4.0

// AFTER
expect(noteSize).toBe(48); // staffSpace 12 * glyphFontSizeMultiplier 4.0
```

### StaffGroup.test.tsx

New or updated tests for spacing:

```typescript
it('should have reduced margin-bottom for closer spacing', () => {
  // Test verifies .staff-group has margin-bottom: 7.5px
});
```

## Feature Acceptance Checklist

- [ ] Staff spacing reduced to 7.5px gap (25% reduction from 10px)
- [ ] Staff height increased to 48px (20% increase from 40px)
- [ ] Staff lines have opacity 0.55
- [ ] Bar lines have opacity 0.65
- [ ] Clefs have opacity 0.65
- [ ] Notes maintain full opacity (1.0)
- [ ] Visual hierarchy clear: Notes > Clefs/Bars > Staff Lines
- [ ] Scrolling performance maintains 45+ fps minimum
- [ ] All existing tests pass
- [ ] 30% more measures visible on tablet viewport
- [ ] No visual overlap between staves
- [ ] Works on iPad Safari, Chrome on Android tablets

## Rollback Plan

If visual quality or performance issues arise:

1. **Revert staffSpace**: Change 12px back to 11px (10% increase instead of 20%)
2. **Adjust opacity**: Increase staff line opacity from 0.55 to 0.60 if too faint
3. **Partial rollback**: Keep spacing reduction (7.5px), revert sizing (staffSpace 10px)

Visual quality takes priority over strict targets per clarification decision (Question 3: Option A).

## Next Steps

After validation:
1. Commit changes to `001-staff-display-refinement` branch
2. Create pull request with before/after screenshots
3. Request tablet testing review on multiple devices
4. Merge to main after approval
5. Deploy PWA to GitHub Pages (automatic on merge to main)

## Additional Resources

- [Feature Specification](spec.md) - Complete requirements
- [Implementation Plan](plan.md) - Technical approach
- [Research](research.md) - Design decisions and rationale
