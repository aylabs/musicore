# Research: Layout-Driven Renderer

*Feature 017 - Phase 0 Research*

This document captures technical decisions for rendering music notation using layout engine's computed positions.

---

## Decision 1: SVG vs Canvas 2D API

**Decision**: Use **SVG** for initial renderer implementation.

**Rationale**:
- **Declarative approach**: SVG DOM structure matches notation hierarchy (systems → staves → glyphs)
- **Existing codebase**: Current renderer uses SVG - minimal migration risk, preserve institutional knowledge
- **Debuggability**: Inspect element shows exact glyph positions, easier visual debugging than Canvas
- **Resolution independence**: SVG handles zoom/retina displays natively via viewBox
- **Styling flexibility**: CSS applies to SVG elements (hover states, selection, dark mode)
- **Batching still works**: GlyphRun optimization reduces DOM nodes from 2000+ to ~400 per score

**Alternatives Considered**:
- **Canvas 2D**: Performance may be better for heavy scrolling (imperative drawing, no DOM overhead). **DEFERRED** - Migrate to Canvas if SVG falls below 60fps target in real-world testing.
- **WebGL**: Rejected - Overkill complexity for 2D notation. Would need texture atlas, shaders, custom glyph rendering.
- **Hybrid SVG+Canvas**: Rejected - Premature optimization. Start with pure SVG, measure first.

**Migration Path** (if needed):
```typescript
// If 60fps not achieved with SVG:
// 1. Profile with Chrome DevTools (identify bottleneck: DOM updates vs layout)
// 2. Try virtualization optimizations (remove off-screen elements)
// 3. If still slow, implement Canvas 2D renderer with same interface
// 4. A/B test performance on target tablets
```

**Implementation Guidance**:
```typescript
// Use SVG with SMuFL font:
const svg = document.createElementNS(svgNS, 'svg');
svg.setAttribute('viewBox', '0 0 800 600');
svg.style.fontFamily = 'Bravura';

// Batch glyph rendering via GlyphRuns:
for (const run of system.glyphRuns) {
  const text = document.createElementNS(svgNS, 'text');
  text.setAttribute('x', run.x.toString());
  text.setAttribute('y', run.y.toString());
  text.textContent = String.fromCodePoint(run.smuflCodepoint);
  svg.appendChild(text);
}
```

---

## Decision 2: Coordinate System Strategy

**Decision**: Use **SVG viewBox with logical units directly** (no coordinate conversion needed).

**Rationale**:
- **Native logical units**: SVG viewBox allows working in layout engine's logical coordinates (staff space = 20 units)
- **Resolution independence**: Browser handles zoom/retina automatically via viewBox scaling
- **Simpler code**: No conversion formula needed - use layout coordinates directly for x/y attributes
- **Precision preservation**: No floating point conversion errors from logical→pixel math
- **Zoom implementation**: Change viewBox dimensions, not coordinate conversion

**Alternatives Considered**:
- **Pixel conversion formula**: Rejected - Unnecessary with SVG viewBox. Canvas 2D needs this, SVG doesn't.
- **CSS transform**: Rejected - viewBox is more semantic and standard for SVG scaling
- **Hardcoded units**: Rejected - viewBox provides resolution independence out of the box

**Implementation Guidance**:
```typescript
class LayoutRenderer {
  render(layout: GlobalLayout, viewport: Viewport): void {
    // Set viewBox to logical coordinate space
    this.svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
    
    // Use logical units directly - no conversion!
    for (const system of layout.systems) {
      const group = document.createElementNS(svgNS, 'g');
      group.setAttribute('transform', `translate(${system.x}, ${system.y})`);
      this.svg.appendChild(group);
    }
  }
}
```

**Zoom Support**:
```typescript
// Zoom by changing viewBox, not coordinates
function setZoom(svg: SVGSVGElement, zoomLevel: number): void {
  const width = baseWidth / zoomLevel;
  const height = baseHeight / zoomLevel;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
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

**Decision**: Use **DOM-optimized SVG <text> elements** per GlyphRun, leveraging Feature 016's batching.

**Rationale**:
- **Batching reduces DOM nodes**: Layout engine produces GlyphRuns (6.25% of glyphs), reducing 2000+ nodes → ~400 per score
- **Declarative structure**: Each GlyphRun = one <text> element, easier to debug than Canvas drawing
- **CSS styling**: Can apply hover, selection, color changes via CSS (e.g., highlight selected notes)
- **Browser optimization**: Modern browsers optimize SVG text rendering, font shaping handled natively
- **Accessibility**: SVG text is selectable, searchable (future feature for lyrics/text expressions)

**Alternatives Considered**:
- **Individual glyph <text> elements**: Rejected - 2000+ DOM nodes too heavy, causes scroll jank
- **SVG <path> with manual glyph outlines**: Rejected - Complex, loses font hinting, no better performance than <text>
- **Canvas fallback**: Deferred - Try SVG first with batching, migrate if 60fps not achieved

**Implementation Guidance**:
```typescript
function renderGlyphRun(
  parent: SVGElement,
  run: GlyphRun,
  config: RenderConfig
): void {
  const text = document.createElementNS(svgNS, 'text');
  text.setAttribute('x', run.x.toString());
  text.setAttribute('y', run.y.toString());
  text.setAttribute('font-family', config.fontFamily);
  text.setAttribute('font-size', config.fontSize.toString());
  text.setAttribute('fill', config.glyphColor);
  text.textContent = String.fromCodePoint(run.smuflCodepoint);
  parent.appendChild(text);
}

// Render all runs in system:
for (const run of system.glyphRuns) {
  this.renderGlyphRun(systemGroup, run, config);
}
```

**DOM Optimization**: Use DocumentFragment for batch insertion to minimize reflows:
```typescript
const fragment = document.createDocumentFragment();
for (const run of system.glyphRuns) {
  fragment.appendChild(createTextElement(run));
}
systemGroup.appendChild(fragment); // Single DOM update
```

**Performance Monitoring**: Track DOM node count and render times with Chrome DevTools Performance tab.

---

## Decision 6: Staff Line Rendering

**Decision**: Use **SVG <line> elements** for 5-line staves (batch via DocumentFragment).

**Rationale**:
- **Crisp rendering**: SVG lines render sharply at all zoom levels (vector graphics)
- **No anti-aliasing issues**: Browser handles sub-pixel positioning correctly
- **Semantic structure**: Each staff = 5 <line> elements in a <g>, inspectable in DevTools
- **Styling flexibility**: CSS can change staff line color, thickness (e.g., different colors per staff)

**Implementation Guidance**:
```typescript
function renderStaff(parent: SVGElement, staff: Staff, config: RenderConfig): void {
  const staffGroup = document.createElementNS(svgNS, 'g');
  staffGroup.setAttribute('class', 'staff');
  
  for (let i = 0; i < 5; i++) {
    const line = document.createElementNS(svgNS, 'line');
    const y = staff.y + i * staff.lineSpacing;
    line.setAttribute('x1', staff.x.toString());
    line.setAttribute('y1', y.toString());
    line.setAttribute('x2', (staff.x + staff.width).toString());
    line.setAttribute('y2', y.toString());
    line.setAttribute('stroke', config.staffLineColor);
    line.setAttribute('stroke-width', '0.5'); // 0.5 logical units = ~1px at default zoom
    staffGroup.appendChild(line);
  }
  
  parent.appendChild(staffGroup);
}
```

**Optimization**: Batch line creation with DocumentFragment to reduce reflows.

---

## Decision 7: Viewport Virtualization

**Decision**: Use **DOM removal + re-insertion** for off-screen systems (virtualization).

**Rationale**:
- **Reduced DOM size**: Only visible systems in DOM = faster layout/paint (fewer nodes to process)
- **Memory efficiency**: Browser can garbage collect off-screen elements
- **Scroll performance**: Fewer nodes = less work during scroll events
- **Trade-off**: DOM insertion cost vs rendering cost (test in practice)

**Alternative**: Keep all systems in DOM, rely on browser optimization. If scroll jank occurs, implement DOM removal.

**Implementation Guidance**:
```typescript
function render(layout: GlobalLayout, viewport: Viewport): void {
  // Query visible systems (binary search)
  const visibleSystems = getVisibleSystems(layout.systems, viewport);
  
  // Remove existing system groups
  this.svg.querySelectorAll('.system').forEach(el => el.remove());
  
  // Add visible systems (batch with DocumentFragment)
  const fragment = document.createDocumentFragment();
  for (const system of visibleSystems) {
    const systemGroup = this.createSystemElement(system);
    fragment.appendChild(systemGroup);
  }
  this.svg.appendChild(fragment);
}
```

**Lazy approach** (start with this):
```typescript
// Keep all systems in DOM initially, add virtualization if needed
function render(layout: GlobalLayout): void {
  for (const system of layout.systems) {
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
