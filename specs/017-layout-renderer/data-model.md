# Data Model: Layout-Driven Renderer

*Feature 017 - Domain Entities & Relationships*

This document defines the core entities for the layout-driven renderer and their relationships to the layout engine domain (Feature 016).

---

## Entity Overview

```
┌─────────────────────────────────────────────────┐
│                 GlobalLayout                     │  (from Feature 016)
│  - systems: System[]                            │
│  - tickRange: TickRange                         │
└─────────────────┬───────────────────────────────┘
                  │ consumed by
                  ▼
┌─────────────────────────────────────────────────┐
│              LayoutRenderer                      │  (new)
│  - canvas: HTMLCanvasElement                    │
│  - config: RenderConfig                          │
│  - ctx: CanvasRenderingContext2D                │
│  + render(layout, viewport): void               │
│  + logicalToPixels(logical): number             │
└─────────────────┬───────────────────────────────┘
                  │ configured by
                  ▼
┌─────────────────────────────────────────────────┐
│              RenderConfig                        │  (new)
│  - pixelsPerSpace: number                       │
│  - fontFamily: string                           │
│  - backgroundColor: string                      │
│  - staffLineColor: string                       │
│  - glyphColor: string                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│            VisualComparison                      │  (new, testing)
│  - oldRenderer: HTMLCanvasElement               │
│  - newRenderer: HTMLCanvasElement               │
│  - diffThreshold: number                        │
│  + compareRenderers(score): ComparisonResult    │
│  + captureSnapshot(canvas): ImageData           │
│  + computePixelDiff(img1, img2): number         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│                 Viewport                         │  (new)
│  - x: number (pixels)                           │
│  - y: number (pixels)                           │
│  - width: number (pixels)                       │
│  - height: number (pixels)                      │
└─────────────────────────────────────────────────┘
```

---

## Entity 1: LayoutRenderer

**Purpose**: Core rendering class that transforms layout engine's computed positions into Canvas 2D drawing operations.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `canvas` | HTMLCanvasElement | Target canvas element for rendering |
| `config` | RenderConfig | Rendering configuration (colors, scaling) |
| `ctx` | CanvasRenderingContext2D | Canvas context (cached from canvas.getContext('2d')) |

### Methods

#### render(layout: GlobalLayout, viewport: Viewport): void

**Description**: Main rendering entry point. Clears canvas, queries visible systems, renders them.

**Algorithm**:
1. Clear canvas: `ctx.clearRect(0, 0, canvas.width, canvas.height)`
2. Query visible systems: `getVisibleSystems(layout.systems, viewport)`
3. For each visible system:
   - Render staff groups (lines, braces, brackets)
   - Render glyph runs (batched fillText calls)
4. Return (no return value, side effect is canvas drawing)

**Preconditions**: 
- `layout` must be valid GlobalLayout from Feature 016
- `viewport` dimensions must fit canvas size
- `ctx` must be initialized

**Postconditions**: Canvas displays computed layout within viewport bounds

---

#### renderSystem(system: System, offsetX: number, offsetY: number): void

**Description**: Renders a single music system (staff group + glyphs).

**Algorithm**:
1. For each staff group in system:
   - Render staff lines via `renderStaffGroup()`
2. For each glyph run in system:
   - Render glyphs via `renderGlyphRun()`

---

#### renderStaffGroup(staffGroup: StaffGroup): void

**Description**: Renders staff lines, braces, brackets for a group of staves.

**Algorithm**:
1. If `staffGroup.brace`:
   - Draw brace glyph at computed position
2. If `staffGroup.bracket`:
   - Draw bracket glyph at computed position
3. For each staff in `staffGroup.staves`:
   - Render 5 horizontal lines via `renderStaff()`

---

#### renderStaff(staff: Staff): void

**Description**: Renders 5 horizontal staff lines.

**Algorithm**:
```
for i in 0..4:
  y = logicalToPixels(staff.y + i * staff.lineSpacing)
  ctx.strokeRect(logicalToPixels(staff.x), y, logicalToPixels(staff.width), 1)
```

---

#### renderGlyphRun(run: GlyphRun): void

**Description**: Renders a batch of identical glyphs (e.g., noteheads) at one position.

**Algorithm**:
```
x = logicalToPixels(run.x)
y = logicalToPixels(run.y)
glyph = String.fromCodePoint(run.smuflCodepoint)
ctx.fillText(glyph, x, y)
```

**Note**: Single fillText call handles entire run (batching from Feature 016).

---

#### logicalToPixels(logical: number): number

**Description**: Converts layout engine's logical units to screen pixels.

**Formula**:
```typescript
pixels = logical * (config.pixelsPerSpace / 20)
```

Where:
- `logical`: From layout engine (staff space = 20 logical units)
- `config.pixelsPerSpace`: Display resolution (default 10px)
- `20`: Layout engine's unitsPerSpace constant

**Example**: 
- Staff space (20 logical units) → 10 pixels (at default zoom)
- Staff line spacing (5 logical units) → 2.5 pixels

---

### Lifecycle

**Instantiation**: Created once per score viewer component.

```typescript
const renderer = new LayoutRenderer(canvasElement, {
  pixelsPerSpace: 10,
  fontFamily: 'Bravura',
  backgroundColor: '#FFFFFF',
  staffLineColor: '#000000',
  glyphColor: '#000000'
});
```

**Usage**: Called on every scroll/resize event.

```typescript
const viewport = { x: 0, y: scrollY, width: 800, height: 600 };
renderer.render(layout, viewport);
```

**Cleanup**: Remove canvas element reference when component unmounts.

---

### Relationships

- **Consumes**: GlobalLayout (from Feature 016's computeLayout())
- **Uses**: RenderConfig (composition)
- **Produces**: Canvas 2D drawing operations (side effect)

---

## Entity 2: RenderConfig

**Purpose**: Centralize rendering configuration (colors, scaling, fonts) for LayoutRenderer.

### Fields

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `pixelsPerSpace` | number | 10 | > 0, typical range 8-20 |
| `fontFamily` | string | "Bravura" | Non-empty, must be SMuFL font |
| `backgroundColor` | string | "#FFFFFF" | Valid CSS color |
| `staffLineColor` | string | "#000000" | Valid CSS color |
| `glyphColor` | string | "#000000" | Valid CSS color |

### Validation Rules

```typescript
function validateRenderConfig(config: RenderConfig): void {
  if (config.pixelsPerSpace <= 0) {
    throw new Error('pixelsPerSpace must be positive');
  }
  
  if (!config.fontFamily) {
    throw new Error('fontFamily cannot be empty');
  }
  
  // CSS color validation via Canvas
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillStyle = config.backgroundColor;
  if (ctx.fillStyle === '#000000' && config.backgroundColor !== '#000000') {
    throw new Error('Invalid backgroundColor CSS color');
  }
}
```

### Typical Configurations

**Default (tablet, 10" display)**:
```typescript
{
  pixelsPerSpace: 10,
  fontFamily: 'Bravura',
  backgroundColor: '#FFFFFF',
  staffLineColor: '#000000',
  glyphColor: '#000000'
}
```

**Zoomed In (2x magnification)**:
```typescript
{
  pixelsPerSpace: 20, // 2x zoom
  fontFamily: 'Bravura',
  // ... colors same
}
```

**Dark Mode**:
```typescript
{
  pixelsPerSpace: 10,
  fontFamily: 'Bravura',
  backgroundColor: '#1E1E1E',
  staffLineColor: '#CCCCCC',
  glyphColor: '#FFFFFF'
}
```

---

### Relationships

- **Used by**: LayoutRenderer (composition)
- **Independent of**: GlobalLayout (rendering config orthogonal to layout computation)

---

## Entity 3: VisualComparison

**Purpose**: Automated testing tool to compare new renderer against existing renderer via pixel-diff analysis.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `oldRenderer` | HTMLCanvasElement | Existing renderer's canvas |
| `newRenderer` | HTMLCanvasElement | New renderer's canvas |
| `diffThreshold` | number | Acceptable pixel diff percentage (default 5%) |

### Methods

#### compareRenderers(score: CompiledScore): ComparisonResult

**Description**: Renders same score on both canvases, compares pixel data.

**Algorithm**:
1. Compute layout: `layout = computeLayout(score, config)`
2. Render old: `oldRenderer.render(layout, viewport)`
3. Render new: `newRenderer.render(layout, viewport)`
4. Capture snapshots: `oldImg = captureSnapshot(oldCanvas)`, `newImg = captureSnapshot(newCanvas)`
5. Compute diff: `diff = computePixelDiff(oldImg, newImg)`
6. Generate result: Return ComparisonResult with diff percentage, snapshots, pass/fail

**Returns**: ComparisonResult

```typescript
interface ComparisonResult {
  pixelDiffPercentage: number;
  oldSnapshot: ImageData;
  newSnapshot: ImageData;
  diffImage: ImageData; // Red highlighted differences
  passed: boolean; // true if diff < threshold
}
```

---

#### captureSnapshot(canvas: HTMLCanvasElement): ImageData

**Description**: Captures canvas pixel data for comparison.

**Algorithm**:
```typescript
const ctx = canvas.getContext('2d');
return ctx.getImageData(0, 0, canvas.width, canvas.height);
```

---

#### computePixelDiff(img1: ImageData, img2: ImageData): number

**Description**: Calculates percentage of differing pixels.

**Algorithm**:
```typescript
let diffPixels = 0;
const totalPixels = img1.width * img1.height;

for (let i = 0; i < img1.data.length; i += 4) {
  const r1 = img1.data[i], g1 = img1.data[i+1], b1 = img1.data[i+2];
  const r2 = img2.data[i], g2 = img2.data[i+1], b2 = img2.data[i+2];
  
  if (r1 !== r2 || g1 !== g2 || b1 !== b2) {
    diffPixels++;
  }
}

return (diffPixels / totalPixels) * 100;
```

**Returns**: Percentage (0-100)

---

#### generateDiffImage(img1: ImageData, img2: ImageData): ImageData

**Description**: Creates red-highlighted image showing pixel differences.

**Algorithm**:
```typescript
const diff = new ImageData(img1.width, img1.height);

for (let i = 0; i < img1.data.length; i += 4) {
  const r1 = img1.data[i], g1 = img1.data[i+1], b1 = img1.data[i+2];
  const r2 = img2.data[i], g2 = img2.data[i+1], b2 = img2.data[i+2];
  
  if (r1 !== r2 || g1 !== g2 || b1 !== b2) {
    diff.data[i] = 255;     // Red
    diff.data[i+1] = 0;     // Green
    diff.data[i+2] = 0;     // Blue
    diff.data[i+3] = 255;   // Alpha
  } else {
    diff.data[i] = r1;
    diff.data[i+1] = g1;
    diff.data[i+2] = b1;
    diff.data[i+3] = 128;   // Semi-transparent for matching pixels
  }
}

return diff;
```

**Usage in tests**:
```typescript
test('Visual comparison: Single voice rendering', async () => {
  const comparison = new VisualComparison(oldCanvas, newCanvas, 5);
  const result = comparison.compareRenderers(score);
  
  expect(result.passed).toBe(true);
  expect(result.pixelDiffPercentage).toBeLessThan(5);
  
  if (!result.passed) {
    // Save diff image to test-results/
    await saveDiffImage(result.diffImage, 'single-voice-diff.png');
  }
});
```

---

### Lifecycle

**Instantiation**: Created in test setup, reused across test cases.

**Cleanup**: Remove canvas references after test suite.

---

### Relationships

- **Uses**: LayoutRenderer (indirectly via canvas)
- **Produces**: ComparisonResult (test assertion data)

---

## Entity 4: Viewport

**Purpose**: Defines visible region of score for virtualization (scroll position + screen dimensions).

### Fields

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `x` | number | pixels | Left edge of visible region (always 0 for vertical scroll) |
| `y` | number | pixels | Top edge of visible region (scroll position) |
| `width` | number | pixels | Viewport width (canvas.width) |
| `height` | number | pixels | Viewport height (canvas.height) |

### Validation Rules

```typescript
function validateViewport(viewport: Viewport): void {
  if (viewport.width <= 0 || viewport.height <= 0) {
    throw new Error('Viewport dimensions must be positive');
  }
  
  if (viewport.x < 0 || viewport.y < 0) {
    throw new Error('Viewport coordinates must be non-negative');
  }
}
```

### Typical Values

**Tablet landscape (iPad Pro 12.9")**:
```typescript
{ x: 0, y: 0, width: 1366, height: 1024 }
```

**Scrolled 500px down**:
```typescript
{ x: 0, y: 500, width: 1366, height: 1024 }
```

**Tablet portrait (iPad Pro 12.9")**:
```typescript
{ x: 0, y: 0, width: 1024, height: 1366 }
```

---

### Relationships

- **Used by**: LayoutRenderer.render() (input parameter)
- **Produced by**: ScoreViewer component (from scroll events)
- **Related to**: System.boundingBox (for intersection tests in getVisibleSystems())

---

## Data Flow Summary

```
User scrolls ScoreViewer
  ↓
ScoreViewer calculates Viewport (x, y, width, height)
  ↓
ScoreViewer calls LayoutRenderer.render(layout, viewport)
  ↓
LayoutRenderer queries visible systems (binary search on viewport.y)
  ↓
LayoutRenderer converts logical units → pixels (via config.pixelsPerSpace)
  ↓
LayoutRenderer draws glyphs/staff lines (Canvas fillText/strokeRect)
  ↓
User sees updated notation on canvas
```

---

## Invariants & Constraints

1. **Coordinate Systems**: Layout engine uses logical units (staff space = 20); renderer converts to pixels at render boundary only.

2. **Immutability**: GlobalLayout never modified by renderer (read-only consumption).

3. **Canvas State**: Renderer saves/restores canvas context state (fillStyle, font) within each rendering method.

4. **Viewport Bounds**: Renderer only renders systems intersecting viewport (virtualization for performance).

5. **Precision**: Logical→pixel conversion uses floating point; final coordinates rounded for Canvas drawing (±2 pixel tolerance acceptable per spec).

---

## Testing Strategy

### Unit Tests

- **LayoutRenderer.logicalToPixels()**: Test conversion formula (10 logical → 5 pixels at pixelsPerSpace=10)
- **RenderConfig validation**: Test throws on invalid configs (negative pixelsPerSpace, empty fontFamily)
- **Viewport validation**: Test throws on invalid dimensions (negative width/height)

### Integration Tests

- **Single voice rendering**: Load fixture, render, verify canvas not blank
- **Multi-staff rendering**: Load 2-staff fixture, render, verify staff count via pixel analysis
- **Viewport clipping**: Render 40-system score with small viewport, verify only visible systems drawn (via profiler call count)

### Visual Comparison Tests

- **Pixel diff vs existing renderer**: Compare 10-measure piano score, assert <5% diff
- **Staff line alignment**: Compare staff line positions, assert <2 pixel variance
- **Glyph positioning**: Compare notehead positions, assert exact match (±1 pixel for anti-aliasing)

### Performance Tests

- **60fps scrolling**: Render 200-system score, scroll at 60fps, measure frame times (<16ms)
- **System query <1ms**: Profile getVisibleSystems() with 200 systems, assert <1ms
- **Draw call count <10**: Profile renderSystem(), assert <10 fillText/strokeRect calls per system

---

## Future Extensions

### Phase 2 Additions (Deferred)

- **Viewport.zoom**: Add zoom level (0.5-2.0) as separate field (currently embedded in pixelsPerSpace)
- **RenderConfig.theme**: Theme object with semantic colors (primary, secondary, accent) instead of hardcoded staff/glyph colors
- **LayoutRenderer.renderSelection()**: Highlight selected notes/measures (requires selection model from future feature)
- **OffscreenCanvas support**: Render off-main-thread for smoother scrolling (if 60fps not met)

---

## Entity Summary

| Entity | Purpose | Lifecycle | Dependencies |
|--------|---------|-----------|--------------|
| LayoutRenderer | Core renderer | Instantiated per score view | GlobalLayout, RenderConfig |
| RenderConfig | Rendering config | Immutable value object | None |
| VisualComparison | Testing tool | Test setup only | LayoutRenderer (indirect) |
| Viewport | Scroll/visible region | Created per scroll event | None |

**Ready for contract generation** (TypeScript interfaces in contracts/ directory).
