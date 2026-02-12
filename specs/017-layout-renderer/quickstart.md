# Quickstart: Layout-Driven Renderer

*Feature 017 - Developer Integration Guide*

This guide shows how to integrate the layout-driven renderer into the music notation viewer.

---

## Prerequisites

**Feature 016 - Rust Layout Engine**

The renderer depends on Feature 016's layout computation. Ensure you have:

1. **Layout engine built**: `cd backend && cargo build --target wasm32-unknown-unknown`
2. **WASM bindings working**: `frontend/src/wasm/` contains layout.wasm
3. **layoutUtils.ts available**: `frontend/src/utils/layoutUtils.ts` with 47 passing tests

Verify prerequisites:

```bash
# Check WASM build
ls frontend/src/wasm/layout.wasm

# Run layout tests
cd backend && cargo test layout
cd ../frontend && npm test layoutUtils.test.ts
```

**Expected output**: All tests passing, WASM file present.

---

## Installation

### 1. No additional dependencies needed

The renderer uses Canvas 2D API (browser built-in) and existing Feature 016 dependencies.

Verify Bravura font is loaded (already in project):

```typescript
// In frontend/src/app.tsx or layout.tsx
import '@/assets/fonts/bravura.css';
```

---

## Basic Usage

### 2. Create LayoutRenderer instance

```typescript
// In ScoreViewer.tsx or equivalent component
import { LayoutRenderer } from '@/components/LayoutRenderer';
import type { RenderConfig } from '@/types/RenderConfig';

const canvas = canvasRef.current; // HTMLCanvasElement from useRef
const config: RenderConfig = {
  pixelsPerSpace: 10,
  fontFamily: 'Bravura',
  backgroundColor: '#FFFFFF',
  staffLineColor: '#000000',
  glyphColor: '#000000'
};

const renderer = new LayoutRenderer(canvas, config);
```

---

### 3. Compute layout (using Feature 016)

```typescript
import { computeLayout } from '@/utils/layoutUtils';
import type { CompiledScore } from '@/types/CompiledScore';
import type { LayoutConfig } from '@/types/LayoutConfig';

const score: CompiledScore = /* ... loaded from backend */;
const layoutConfig: LayoutConfig = {
  pageWidth: 800, // Logical units (800 ÷ 20 = 40 staff spaces)
  marginTop: 40,
  marginBottom: 40,
  systemSpacing: 80
};

const layout = computeLayout(score, layoutConfig);
```

---

### 4. Render on canvas

```typescript
import type { Viewport } from '@/types/Viewport';

const viewport: Viewport = {
  x: 0,
  y: 0, // Top of score
  width: canvas.width,
  height: canvas.height
};

renderer.render(layout, viewport);
```

---

## Integration Example: ScoreViewer Component

Complete integration with scroll handling:

```typescript
// frontend/src/components/ScoreViewer.tsx
import React, { useRef, useEffect, useState } from 'react';
import { LayoutRenderer } from './LayoutRenderer';
import { computeLayout } from '@/utils/layoutUtils';
import type { CompiledScore } from '@/types/CompiledScore';
import type { GlobalLayout } from '@/types/GlobalLayout';
import type { RenderConfig } from '@/types/RenderConfig';
import type { Viewport } from '@/types/Viewport';

interface ScoreViewerProps {
  score: CompiledScore;
  pixelsPerSpace?: number;
}

export const ScoreViewer: React.FC<ScoreViewerProps> = ({
  score,
  pixelsPerSpace = 10
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<LayoutRenderer | null>(null);
  const [layout, setLayout] = useState<GlobalLayout | null>(null);
  const [scrollY, setScrollY] = useState(0);

  // Initialize renderer and compute layout
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create renderer
    const config: RenderConfig = {
      pixelsPerSpace,
      fontFamily: 'Bravura',
      backgroundColor: '#FFFFFF',
      staffLineColor: '#000000',
      glyphColor: '#000000'
    };
    const newRenderer = new LayoutRenderer(canvasRef.current, config);
    setRenderer(newRenderer);

    // Compute layout
    const layoutConfig = {
      pageWidth: 800, // 40 staff spaces
      marginTop: 40,
      marginBottom: 40,
      systemSpacing: 80
    };
    const computedLayout = computeLayout(score, layoutConfig);
    setLayout(computedLayout);
  }, [score, pixelsPerSpace]);

  // Render on scroll
  useEffect(() => {
    if (!renderer || !layout || !canvasRef.current) return;

    const viewport: Viewport = {
      x: 0,
      y: scrollY,
      width: canvasRef.current.width,
      height: canvasRef.current.height
    };

    renderer.render(layout, viewport);
  }, [renderer, layout, scrollY]);

  // Scroll event handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  };

  return (
    <div
      className="score-viewer"
      onScroll={handleScroll}
      style={{
        width: '100%',
        height: '100vh',
        overflowY: 'scroll'
      }}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ display: 'block' }}
      />
    </div>
  );
};
```

---

## Configuration

### Zoom Levels

Adjust `pixelsPerSpace` for zoom functionality:

```typescript
// Normal zoom (10px per staff space)
const normalConfig: RenderConfig = {
  pixelsPerSpace: 10,
  /* ... */
};

// Zoomed in 2x (20px per staff space)
const zoomedInConfig: RenderConfig = {
  pixelsPerSpace: 20,
  /* ... */
};

// Zoomed out (8px per staff space)
const zoomedOutConfig: RenderConfig = {
  pixelsPerSpace: 8,
  /* ... */
};
```

**Note**: Zoom changes rendering scale only. Layout computation is resolution-independent (uses logical units).

---

### Dark Mode

Customize colors for dark theme:

```typescript
const darkModeConfig: RenderConfig = {
  pixelsPerSpace: 10,
  fontFamily: 'Bravura',
  backgroundColor: '#1E1E1E', // Dark gray
  staffLineColor: '#CCCCCC',  // Light gray
  glyphColor: '#FFFFFF'       // White
};

const renderer = new LayoutRenderer(canvas, darkModeConfig);
```

---

### Retina Display Support

For high-DPI displays, scale canvas backing store:

```typescript
const canvas = canvasRef.current;
const dpr = window.devicePixelRatio || 1;

// Set display size (CSS pixels)
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;

// Set backing store size (physical pixels)
canvas.width = width * dpr;
canvas.height = height * dpr;

// Scale pixelsPerSpace for retina
const config: RenderConfig = {
  pixelsPerSpace: 10 * dpr, // 20 on 2x retina
  /* ... */
};

const renderer = new LayoutRenderer(canvas, config);
```

---

## Testing

### Unit Tests

Test coordinate conversion and basic rendering:

```typescript
// frontend/tests/unit/LayoutRenderer.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LayoutRenderer } from '@/components/LayoutRenderer';
import type { RenderConfig } from '@/types/RenderConfig';

describe('LayoutRenderer', () => {
  let canvas: HTMLCanvasElement;
  let config: RenderConfig;
  let renderer: LayoutRenderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    config = {
      pixelsPerSpace: 10,
      fontFamily: 'Bravura',
      backgroundColor: '#FFFFFF',
      staffLineColor: '#000000',
      glyphColor: '#000000'
    };

    renderer = new LayoutRenderer(canvas, config);
  });

  it('converts logical units to pixels', () => {
    // Staff space (20 logical units) → 10 pixels
    expect(renderer.logicalToPixels(20)).toBe(10);

    // Staff line spacing (5 logical units) → 2.5 pixels
    expect(renderer.logicalToPixels(5)).toBe(2.5);

    // Full page width (800 logical units) → 400 pixels
    expect(renderer.logicalToPixels(800)).toBe(400);
  });

  it('renders without errors', async () => {
    const layout = await loadFixture('piano_10_measures_layout.json');
    const viewport = { x: 0, y: 0, width: 800, height: 600 };

    expect(() => renderer.render(layout, viewport)).not.toThrow();
  });
});
```

---

### Visual Comparison Tests

Compare against existing renderer (integration test):

```typescript
// frontend/tests/integration/VisualComparison.test.ts
import { describe, it, expect } from 'vitest';
import { test } from '@playwright/test';
import { VisualComparison } from '@/testing/VisualComparison';
import { loadFixture } from '@/testing/fixtures';

test('Single voice rendering matches existing renderer', async ({ page }) => {
  await page.goto('/score-viewer');

  // Setup: Load fixture
  const score = await loadFixture('piano_10_measures.json');
  await page.evaluate((s) => window.loadScore(s), score);

  // Render with both renderers
  const oldCanvas = page.locator('#old-renderer-canvas');
  const newCanvas = page.locator('#new-renderer-canvas');

  // Capture screenshots
  const oldSnapshot = await oldCanvas.screenshot({ type: 'png' });
  const newSnapshot = await newCanvas.screenshot({ type: 'png' });

  // Compare (5% tolerance)
  const comparison = new VisualComparison(oldCanvas, newCanvas, 5);
  const result = comparison.compareRenderers(score);

  // Assert pass
  expect(result.passed).toBe(true);
  expect(result.pixelDiffPercentage).toBeLessThan(5);

  // Save diff on failure
  if (!result.passed) {
    await saveDiffImage(result.diffImage, 'test-results/piano-10-diff.png');
    console.error(`Visual diff: ${result.pixelDiffPercentage}%`);
  }
});
```

---

### Performance Tests

Validate 60fps scrolling with Chrome DevTools:

```typescript
// frontend/tests/performance/ScrollPerformance.test.ts
import { test } from '@playwright/test';
import { chromium } from 'playwright';

test('60fps scrolling with 200 systems', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable performance profiling
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');

  // Load heavy score
  await page.goto('/score-viewer');
  const score = await loadFixture('piano_200_measures.json');
  await page.evaluate((s) => window.loadScore(s), score);

  // Measure scroll performance
  const metrics: number[] = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await page.evaluate(() => window.scrollBy(0, 100));
    const end = performance.now();
    metrics.push(end - start);
  }

  // Assert 60fps (< 16ms per frame)
  const avgFrameTime = metrics.reduce((a, b) => a + b) / metrics.length;
  expect(avgFrameTime).toBeLessThan(16);

  // Assert no dropped frames
  const droppedFrames = metrics.filter(t => t > 16).length;
  expect(droppedFrames).toBe(0);

  await browser.close();
});
```

---

## Debugging

### Canvas Inspector (Chrome DevTools)

View Canvas draw calls:

1. Open Chrome DevTools → **More tools** → **Layers**
2. Scroll to trigger render
3. Inspect **Canvas** layer → See draw calls (fillText, strokeRect)
4. Verify **<10 draw calls per system** (via GlyphRun batching)

---

### Visual Debug Mode

Add debug overlay to see system boundaries:

```typescript
// In LayoutRenderer.ts
if (DEBUG_MODE) {
  for (const system of layout.systems) {
    ctx.strokeStyle = 'red';
    ctx.strokeRect(
      this.logicalToPixels(system.x),
      this.logicalToPixels(system.y),
      this.logicalToPixels(system.width),
      this.logicalToPixels(system.height)
    );
  }
}
```

---

### Performance Profiling

Log render times:

```typescript
// In ScoreViewer.tsx
const renderStart = performance.now();
renderer.render(layout, viewport);
const renderEnd = performance.now();

console.log(`Render time: ${(renderEnd - renderStart).toFixed(2)}ms`);
// Should be <16ms for 60fps
```

---

## Troubleshooting

### Issue: Canvas Blank After Render

**Symptom**: Canvas shows white background, no notation visible.

**Causes**:
1. Bravura font not loaded (glyphs render as squares)
2. Viewport Y out of range (no systems visible)
3. Canvas dimensions zero (not in DOM yet)

**Solution**:

```typescript
// 1. Verify font loaded
document.fonts.ready.then(() => {
  console.log('Fonts loaded:', document.fonts.check('10px Bravura'));
  renderer.render(layout, viewport);
});

// 2. Check viewport bounds
console.log('Viewport:', viewport);
console.log('Layout systems:', layout.systems.length);
console.log('Layout total height:', layout.systems[layout.systems.length - 1].y);

// 3. Verify canvas dimensions
console.log('Canvas:', canvas.width, canvas.height);
```

---

### Issue: Blurry Rendering on Retina Displays

**Symptom**: Notation appears fuzzy or pixelated on high-DPI screens.

**Solution**: Scale canvas backing store (see "Retina Display Support" above).

---

### Issue: Performance Below 60fps

**Symptom**: Scrolling feels laggy, frame times >16ms.

**Causes**:
1. Too many draw calls (GlyphRun batching not working)
2. Not using virtualization (rendering all systems, not just visible)
3. Canvas too large (excessive pixels to fill)

**Solution**:

```typescript
// 1. Verify batching
console.log('GlyphRuns per system:', layout.systems[0].glyphRuns.length);
// Should be <10 (not 100+)

// 2. Verify virtualization
const visibleSystems = getVisibleSystems(layout.systems, viewport);
console.log('Rendering systems:', visibleSystems.length);
// Should be 3-5 (not all 40)

// 3. Profile with Chrome DevTools
// Performance tab → Record → Scroll → Stop
// Check "Rendering" times (should be <10ms)
```

---

## Next Steps

After integrating the renderer:

1. **Run visual comparison tests**: `npm test VisualComparison.test.ts`
2. **Profile performance**: Chrome DevTools → Performance → Record scroll
3. **Compare with existing renderer**: Check pixel diff <5%
4. **Test on tablet devices**: iPad, Surface, Android tablet
5. **Validate zoom levels**: Test 0.8x, 1.0x, 1.5x, 2.0x zoom
6. **Test dark mode**: Verify color contrast and readability

---

## API Reference

For detailed API documentation, see:

- [LayoutRenderer.ts](./contracts/LayoutRenderer.ts) - Main renderer interface
- [RenderConfig.ts](./contracts/RenderConfig.ts) - Configuration options
- [Viewport.ts](./contracts/Viewport.ts) - Viewport definition
- [VisualComparison.ts](./contracts/VisualComparison.ts) - Testing utilities

---

## Support

**Issues**: GitHub Issues for bug reports  
**Documentation**: See `specs/017-layout-renderer/` for full specification  
**Layout Engine**: See `specs/016-rust-layout-engine/` for Feature 016 details
