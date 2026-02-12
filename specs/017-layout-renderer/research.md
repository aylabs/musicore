# Research: Layout-Driven Renderer

*Feature 017 - Phase 0 Research*

This document captures technical decisions for rendering music notation using layout engine's computed positions.

---

## Decision 1: Canvas 2D API vs WebGL

**Decision**: Use **Canvas 2D API** for renderer implementation.

**Rationale**:
- **Simplicity**: Canvas 2D provides straightforward text and line drawing primitives matching notation needs
- **Performance sufficient**: With GlyphRun batching (6.25% of glyphs), <10 draw calls per system achieves 60fps target
- **Font rendering**: fillText() handles SMuFL fonts natively, no texture atlas needed
- **Maintenance**: Simpler than WebGL shader pipeline, easier debugging
- **Browser support**: Canvas 2D widely supported on all target tablets (iPad, Surface, Android)

**Alternatives Considered**:
- **WebGL**: Rejected - Complexity not justified. Would need texture atlas, custom glyph rendering, shader management. Overkill for 2D notation with batching already optimized.
- **SVG**: Rejected - DOM overhead too high for 100+ glyphs per system. Canvas imperative API faster for dynamic scrolling.
- **OffscreenCanvas**: Deferred - Keep as future optimization for off-main-thread rendering if 60fps not met.

**Implementation Guidance**:
```typescript
// Use Canvas 2D context with SMuFL font:
const ctx = canvas.getContext('2d');
ctx.font = '20px Bravura';
ctx.fillStyle = '#000000';

// Batch glyph rendering via GlyphRuns:
for (const run of system.glyphRuns) {
  ctx.fillText(
    String.fromCodePoint(run.smuflCodepoint),
    run.x * scale, run.y * scale
  );
}
```

---

## Decision 2: Coordinate Conversion Strategy

**Decision**: Use **proportional scaling formula** with `pixelsPerSpace` config.

**Formula**:
```typescript
pixels = logicalUnits * (pixelsPerSpace / unitsPerSpace)
```
Where:
- `logicalUnits`: From layout engine (staff space = 20 logical units)
- `pixelsPerSpace`: Display resolution (default 10px, configurable for zoom/retina)
- `unitsPerSpace`: Layout constant (20 from Feature 016)

**Rationale**:
- **Resolution independence**: Supports zoom (8px-20px per space), retina displays (2x scaling), future print output
- **Precision preservation**: Floating point acceptable for visual positions (±2 pixel tolerance acceptable)
- **Consistent with layout**: Layout engine uses logical units; conversion happens only at render boundary
- **Configurable**: RenderConfig allows per-instance pixelsPerSpace without layout recomputation

**Alternatives Considered**:
- **Hardcoded pixel values**: Rejected - Not zoom-friendly, would break tablet pinch-to-zoom
- **Transform matrix**: Rejected - setTransform() less explicit than formula, harder to test coordinate conversion
- **Direct logical units**: Rejected - Canvas needs pixel coordinates for fillText/stroke

**Implementation Guidance**:
```typescript
class LayoutRenderer {
  logicalToPixels(logical: number): number {
    const unitsPerSpace = 20; // From layout engine
    return logical * (this.config.pixelsPerSpace / unitsPerSpace);
  }

  render(layout: GlobalLayout, viewport: Viewport): void {
    for (const system of layout.systems) {
      const x = this.logicalToPixels(system.x);
      const y = this.logicalToPixels(system.y);
      this.renderSystem(system, x, y);
    }
  }
}
```

---

## Decision 3: Visual Comparison Testing Approach

**Decision**: Use **pixel-diff screenshot comparison** with 5% tolerance threshold.

**Rationale**:
- **Automated validation**: Compare new renderer against existing renderer via Playwright screenshots
- **Anti-aliasing tolerance**: 5% threshold accounts for sub-pixel rendering differences across browsers/devices
- **Regression safety**: Catches unintended visual changes (e.g., wrong positions, missing glyphs)
- **CI integration**: Playwright runs headless in GitHub Actions, generates diff images

**Alternatives Considered**:
- **Manual visual inspection**: Rejected - Not automated, slow, error-prone
- **Exact pixel match**: Rejected - Too brittle, fails on anti-aliasing/font hinting differences
- **Structural comparison**: Rejected - Comparing DOM/data structures doesn't validate visual output
- **10% tolerance**: Rejected - Too loose, could miss spacing errors

**Implementation Guidance**:
```typescript
// Visual comparison test structure:
test('Single voice rendering matches existing renderer', async ({ page }) => {
  const fixture = await loadFixture('piano_10_measures.json');
  
  // Render with old renderer
  const oldSnapshot = await page.locator('#old-canvas').screenshot();
  
  // Render with new renderer
  const newSnapshot = await page.locator('#new-canvas').screenshot();
  
  // Compare with 5% threshold
  const diff = await compareImages(oldSnapshot, newSnapshot);
  expect(diff.percentage).toBeLessThan(5);
});
```

**Diff Image Output**: Generate red-highlighted diff image showing pixel mismatches (saved to `test-results/` on failure).

---

## Decision 4: System Virtualization Query Algorithm

**Decision**: Use **binary search on system bounding boxes** for visible system detection.

**Rationale**:
- **O(log n) performance**: For 40 systems, binary search is ~6 comparisons vs 40 for linear scan
- **<1ms query time**: Easily meets success criteria with 15µs per comparison (6 × 15µs = 90µs)
- **Sort key**: Systems already sorted by y-coordinate from layout engine
- **Simple implementation**: Standard binary search with viewport.top/bottom as search bounds

**Alternatives Considered**:
- **Linear scan**: Rejected - O(n) too slow for large scores (200 systems → 200 comparisons)
- **Spatial index (R-tree)**: Rejected - Overkill for 1D search (only y-coordinate matters), adds complexity
- **Hardcoded range**: Rejected - Breaks with dynamic staff heights, variable system spacing

**Implementation Guidance**:
```typescript
function getVisibleSystems(
  systems: System[],
  viewport: Viewport
): System[] {
  const startIdx = binarySearch(systems, viewport.y, (sys) => sys.y + sys.height);
  const endIdx = binarySearch(systems, viewport.y + viewport.height, (sys) => sys.y);
  return systems.slice(startIdx, endIdx + 1);
}

// Binary search: Find first system intersecting viewportY
function binarySearch(
  systems: System[],
  viewportY: number,
  getY: (sys: System) => number
): number {
  let left = 0, right = systems.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (getY(systems[mid]) < viewportY) left = mid + 1;
    else right = mid - 1;
  }
  return Math.max(0, left);
}
```

**Performance Validation**: Add Chrome DevTools Performance profiling to confirm <1ms per query.

---

## Decision 5: GlyphRun Rendering Strategy

**Decision**: Use **batched fillText() calls** per GlyphRun, leveraging Feature 016's batching.

**Rationale**:
- **Batching already done**: Layout engine produces GlyphRuns (6.25% of glyphs), reducing 160 glyphs → 10 runs
- **Simple Canvas API**: fillText() handles SMuFL fonts, no manual path drawing
- **Performance target met**: 10 fillText calls per system at 60fps = 400 calls/frame (well within Canvas capability)
- **No premature optimization**: Texture atlas not needed at this scale

**Alternatives Considered**:
- **Individual glyph draws**: Rejected - 160 fillText calls per system (16x slower than batching)
- **Texture atlas**: Rejected - Premature optimization, adds complexity (glyph→sprite mapping, atlas packing)
- **Path2D caching**: Deferred - Keep as future optimization if fillText() bottleneck emerges

**Implementation Guidance**:
```typescript
function renderGlyphRun(
  ctx: CanvasRenderingContext2D,
  run: GlyphRun,
  config: RenderConfig
): void {
  const x = this.logicalToPixels(run.x);
  const y = this.logicalToPixels(run.y);
  
  ctx.font = `${config.pixelsPerSpace}px ${config.fontFamily}`;
  ctx.fillStyle = config.glyphColor;
  ctx.fillText(String.fromCodePoint(run.smuflCodepoint), x, y);
}

// Render all runs in system:
for (const run of system.glyphRuns) {
  this.renderGlyphRun(ctx, run, config);
}
```

**Performance Monitoring**: Track fillText() calls per frame via Chrome DevTools to confirm <10 calls/system.

---

## Decision 6: Staff Line Rendering

**Decision**: Use **strokeRect() for horizontal lines** with 1px stroke width.

**Rationale**:
- **Thin lines**: Staff lines are 1px wide (0.05 staff spaces), strokeRect simpler than filled rectangles
- **Canvas optimization**: Horizontal lines are fast path in most Canvas implementations
- **Anti-aliasing control**: Use strokeWidth=1 and integer y-coordinates to avoid blurry lines

**Implementation Guidance**:
```typescript
function renderStaff(ctx: CanvasRenderingContext2D, staff: Staff): void {
  ctx.strokeStyle = this.config.staffLineColor;
  ctx.lineWidth = 1;
  
  for (let i = 0; i < 5; i++) {
    const y = Math.round(this.logicalToPixels(staff.y + i * staff.lineSpacing));
    ctx.beginPath();
    ctx.moveTo(this.logicalToPixels(staff.x), y);
    ctx.lineTo(this.logicalToPixels(staff.x + staff.width), y);
    ctx.stroke();
  }
}
```

---

## Decision 7: Viewport Clipping

**Decision**: Use **Canvas clearRect() + manual bounds check** instead of ctx.clip().

**Rationale**:
- **Flexibility**: Manual bounds check allows debug visualization of clipped systems
- **Performance**: clip() can be slower than bounds check for sparse systems
- **Simplicity**: Avoid save()/restore() overhead for clipping state

**Implementation Guidance**:
```typescript
function render(layout: GlobalLayout, viewport: Viewport): void {
  // Clear entire canvas
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
  // Render only visible systems
  const visibleSystems = getVisibleSystems(layout.systems, viewport);
  for (const system of visibleSystems) {
    this.renderSystem(system);
  }
}
```

---

## Research Summary

**All technical unknowns resolved**:
- ✅ Rendering API: Canvas 2D (simple, performant with batching)
- ✅ Coordinate conversion: Proportional scaling formula (resolution-independent)
- ✅ Visual testing: Pixel-diff with 5% tolerance (automated, robust)
- ✅ Virtualization: Binary search O(log n) (meets <1ms requirement)
- ✅ Glyph rendering: Batched fillText() (<10 calls/system from Feature 016)
- ✅ Staff lines: strokeRect() with 1px width (crisp, fast)
- ✅ Clipping: Manual bounds check (flexible, debuggable)

**Ready for Phase 1 (Design)**. No remaining [NEEDS CLARIFICATION] blockers.
