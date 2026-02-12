# Quickstart: Layout-Driven Renderer

*Feature 017 - Developer Integration Guide*

This guide shows how to integrate the SVG-based layout renderer into the music notation viewer.

---

## Prerequisites

**Feature 016 - Rust Layout Engine**

The renderer depends on Feature 016's layout computation. Ensure you have:

1. **Layout engine built**: `cd backend && cargo build --target wasm32-unknown-unknown`
2. **WASM bindings working**: `frontend/src/wasm/` contains layout types
3. **Test fixtures available**: `frontend/tests/fixtures/`contains layout JSON files

Verify prerequisites:

```bash
# Check layout types
ls frontend/src/wasm/layout.ts

# Run tests
cd frontend && npm test
```

**Expected output**: All tests passing (168 passing total).

---

## Installation

### 1. No additional dependencies needed

The renderer uses SVG DOM API (browser built-in). The Bravura SMuFL font is already configured.

Verify Bravura font is loaded:

```typescript
// Font should be available via RenderConfig
import { createDefaultConfig } from '@/utils/renderUtils';

const config = createDefaultConfig();
console.log(config.fontFamily); // 'Bravura'
```

---

## Basic Usage

### 2. Import LayoutRenderer component

```typescript
// In your React component
import { LayoutRenderer } from '@/components/LayoutRenderer';
import { createDefaultConfig } from '@/utils/renderUtils';
import type { GlobalLayout } from '@/wasm/layout';
import type { Viewport } from '@/types/Viewport';

// Load layout from fixture or compute from score
import violinLayout from '@/tests/fixtures/violin_10_measures.json';

function ScoreDisplay() {
  const layout = violinLayout as GlobalLayout;
  const config = createDefaultConfig();
  const viewport: Viewport = {
    x: 0,
    y: 0,
    width: 1200,
    height: 800
  };

  return <LayoutRenderer layout={layout} config={config} viewport={viewport} />;
}
```

---

### 3. Compute layout (using Feature 016)

```typescript
// If you have a CompiledScore from Feature 015
import { computeLayout } from '@/wasm/layout';
import type { CompiledScore } from '@/types/CompiledScore';

const score: CompiledScore = /* ... loaded from backend */;

// Compute layout with default settings
const layout = computeLayout(score);

// Use in renderer
<LayoutRenderer layout={layout} config={config} viewport={viewport} />
```

---

### 4. Render with viewport control

The renderer uses viewBox for resolution-independent rendering:

```typescript
import { useState } from 'react';

function ZoomableScore() {
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    width: 1200,
    height: 800
  });

  const handleZoomIn = () => {
    setViewport(prev => ({
      ...prev,
      width: prev.width / 1.2,
      height: prev.height / 1.2
    }));
  };

  return (
    <div>
      <button onClick={handleZoomIn}>Zoom In</button>
      <LayoutRenderer layout={layout} config={config} viewport={viewport} />
    </div>
  );
}
```

```

---

## Integration Example: ScoreViewer Component

Complete integration with scroll handling and zoom controls:

```typescript
// frontend/src/pages/ScoreViewer.tsx (T066-T067)
import { Component, createRef, type RefObject } from 'react';
import { LayoutRenderer } from '../components/LayoutRenderer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { createDefaultConfig } from '../utils/renderUtils';
import type { GlobalLayout } from '../wasm/layout';
import type { RenderConfig } from '../types/RenderConfig';
import type { Viewport } from '../types/Viewport';

interface ScoreViewerProps {
  layout: GlobalLayout | null;
  darkMode?: boolean;
}

interface ScoreViewerState {
  viewport: Viewport;
  zoom: number;
  config: RenderConfig;
}

export class ScoreViewer extends Component<ScoreViewerProps, ScoreViewerState> {
  private containerRef: RefObject<HTMLDivElement>;
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ScoreViewerProps) {
    super(props);
    this.containerRef = createRef<HTMLDivElement>();

    const config = props.darkMode
      ? this.createDarkModeConfig()
      : createDefaultConfig();

    this.state = {
      viewport: { x: 0, y: 0, width: 1200, height: 800 },
      zoom: 1.0,
      config,
    };
  }

  private createDarkModeConfig(): RenderConfig {
    return {
      fontSize: 40,
      fontFamily: 'Bravura',
      backgroundColor: '#1E1E1E',
      staffLineColor: '#CCCCCC',
      glyphColor: '#FFFFFF',
    };
  }

  componentDidMount(): void {
    const container = this.containerRef.current;
    if (container) {
      container.addEventListener('scroll', this.handleScroll);
      this.updateViewport();
    }
  }

  componentWillUnmount(): void {
    const container = this.containerRef.current;
    if (container) {
      container.removeEventListener('scroll', this.handleScroll);
    }
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
  }

  private handleScroll = (): void => {
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
    }
    this.scrollTimer = setTimeout(() => this.updateViewport(), 16);
  };

  private updateViewport(): void {
    const container = this.containerRef.current;
    if (!container || !this.props.layout) return;

    const { zoom } = this.state;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    this.setState({
      viewport: {
        x: 0,
        y: scrollTop / zoom,
        width: 1200,
        height: clientHeight / zoom,
      },
    });
  }

  private handleZoomIn = (): void => {
    this.setState(
      (prev) => ({ zoom: Math.min(prev.zoom * 1.2, 4.0) }),
      () => this.updateViewport()
    );
  };

  private handleZoomOut = (): void => {
    this.setState(
      (prev) => ({ zoom: Math.max(prev.zoom / 1.2, 0.25) }),
      () => this.updateViewport()
    );
  };

  render() {
    const { layout } = this.props;
    const { viewport, zoom, config } = this.state;

    if (!layout) {
      return <div>No score loaded</div>;
    }

    const totalHeight = layout.total_height * zoom;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Zoom Controls */}
        <div style={{ padding: '12px', backgroundColor: '#F5F5F5' }}>
          <button onClick={this.handleZoomOut}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={this.handleZoomIn}>+</button>
        </div>

        {/* Scroll Container */}
        <div
          ref={this.containerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: config.backgroundColor,
          }}
        >
          <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
            <div style={{ position: 'sticky', top: 0, height: '100vh' }}>
              <ErrorBoundary>
                <LayoutRenderer layout={layout} config={config} viewport={viewport} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
```

---

## Configuration

### Zoom Levels

Zoom is controlled via viewport dimensions (viewBox manipulation):

```typescript
// Normal zoom (1.0x)
const normalViewport: Viewport = {
  x: 0,
  y: 0,
  width: 1200,
  height: 800
};

// Zoomed in 2x (viewport shows half the area)
const zoomedInViewport: Viewport = {
  x: 0,
  y: 0,
  width: 600,   // Half width
  height: 400   // Half height
};

// Zoomed out 0.5x (viewport shows double the area)
const zoomedOutViewport: Viewport = {
  x: 0,
  y: 0,
  width: 2400,  // Double width
  height: 1600  // Double height
};
```

**Note**: Zoom changes viewport size only. Layout computation is resolution-independent (uses logical units). SVG viewBox handles rendering at any scale.

---

### Dark Mode

Customize colors via RenderConfig:

```typescript
import { createDefaultConfig } from '@/utils/renderUtils';

// Light mode (default)
const lightConfig = createDefaultConfig();

// Dark mode
const darkConfig: RenderConfig = {
  fontSize: 40,
  fontFamily: 'Bravura',
  backgroundColor: '#1E1E1E', // Dark gray
  staffLineColor: '#CCCCCC',  // Light gray
  glyphColor: '#FFFFFF'       // White
};

// Use in renderer
<LayoutRenderer layout={layout} config={darkConfig} viewport={viewport} />
```

---

### High-DPI Display Support

SVG rendering is automatically resolution-independent - no special handling needed for Retina/high-DPI displays.

The browser's SVG engine handles:
- Pixel density scaling (2x, 3x, etc.)
- Crisp rendering at any zoom level
- Font rendering at device resolution

**Why SVG?**
- Resolution-independent by design
- Sharp rendering on all devices (phones, tablets, 4K displays)
- No manual scaling or DPI calculations needed
- Better accessibility (text remains text, not rasterized)

**Trade-offs vs Canvas**:
- ✅ Simpler code (no DPI scaling)
- ✅ Better for accessibility
- ✅ Easier debugging (inspect DOM)
- ❌ Less pixel-perfect control
- ❌ Reliant on browser SVG engine performance

---

## Testing

### Unit Tests

Test rendering utilities and component behavior:

```typescript
// frontend/tests/unit/renderUtils.test.ts
import { describe, it, expect } from 'vitest';
import { getVisibleSystems, createDefaultConfig } from '@/utils/renderUtils';
import type { System } from '@/wasm/layout';
import type { Viewport } from '@/types/Viewport';

describe('renderUtils', () => {
  it('creates default config', () => {
    const config = createDefaultConfig();
    
    expect(config.fontSize).toBe(40);
    expect(config.fontFamily).toBe('Bravura');
    expect(config.backgroundColor).toBe('#FFFFFF');
  });

  it('finds visible systems via binary search', () => {
    const systems: System[] = [
      { index: 0, bounding_box: { x_position: 0, y_position: 0, width: 1200, height: 280 }, ... },
      { index: 1, bounding_box: { x_position: 0, y_position: 300, width: 1200, height: 280 }, ... },
      { index: 2, bounding_box: { x_position: 0, y_position: 600, width: 1200, height: 280 }, ... },
    ];

    const viewport: Viewport = { x: 0, y: 250, width: 1200, height: 400 };
    const visible = getVisibleSystems(systems, viewport);

    expect(visible.length).toBe(2); // Systems 1 and 2
    expect(visible[0].index).toBe(1);
    expect(visible[1].index).toBe(2);
  });

  it('renders without errors', () => {
    const layout = loadFixture('violin_10_measures.json');
    const config = createDefaultConfig();
    const viewport = { x: 0, y: 0, width: 1200, height: 800 };

    const { container } = render(
      <LayoutRenderer layout={layout} config={config} viewport={viewport} />
    );

    expect(container.querySelector('svg')).toBeTruthy();
  });
});
```

---
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

Verify visual accuracy with happy-dom tests:

```typescript
// frontend/tests/integration/VisualComparison.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LayoutRenderer } from '@/components/LayoutRenderer';
import { createDefaultConfig } from '@/utils/renderUtils';
import type { GlobalLayout } from '@/wasm/layout';

describe('VisualComparison Tests', () => {
  it('renders single voice staff correctly', () => {
    const layout: GlobalLayout = loadFixture('violin_10_measures.json');
    const config = createDefaultConfig();
    const viewport = { x: 0, y: 0, width: 1200, height: 800 };

    const { container } = render(
      <LayoutRenderer layout={layout} config={config} viewport={viewport} />
    );

    // Verify SVG structure
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 1200 800');

    // Verify staff lines rendered
    const staffLines = container.querySelectorAll('line[stroke]');
    expect(staffLines.length).toBeGreaterThan(0);

    // Verify glyphs rendered
    const glyphs = container.querySelectorAll('text');
    expect(glyphs.length).toBeGreaterThan(0);
  });

  it('renders multi-staff layout with brace', () => {
    const layout: GlobalLayout = loadFixture('piano_8_measures.json');
    const config = createDefaultConfig();
    const viewport = { x: 0, y: 0, width: 1200, height: 800 };

    const { container } = render(
      <LayoutRenderer layout={layout} config={config} viewport={viewport} />
    );

    // Verify brace glyph rendered
    const braces = Array.from(container.querySelectorAll('text')).filter(
      (el) => el.textContent?.includes('\uE000') // Bravura brace
    );
    expect(braces.length).toBeGreaterThan(0);

    // Verify multiple staff groups
    const staffLines = container.querySelectorAll('line[stroke]');
    expect(staffLines.length).toBeGreaterThanOrEqual(10); // 2 staves × 5 lines
  });
});
```

---

### Performance Tests

Validate 60fps rendering with Vitest:

```typescript
// frontend/tests/performance/Virtualization.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LayoutRenderer } from '@/components/LayoutRenderer';
import { createDefaultConfig } from '@/utils/renderUtils';
import { getVisibleSystems } from '@/utils/renderUtils';
import type { GlobalLayout } from '@/wasm/layout';

describe('Performance Validation', () => {
  it('renders viewport in <16ms (60fps budget)', () => {
    const layout: GlobalLayout = loadFixture('score_100_measures.json');
    const config = createDefaultConfig();
    const viewport = { x: 0, y: 0, width: 1200, height: 800 };

    const startTime = performance.now();
    const { container } = render(
      <LayoutRenderer layout={layout} config={config} viewport={viewport} />
    );
    const renderTime = performance.now() - startTime;

    expect(renderTime).toBeLessThan(16);
  });

  it('queries visible systems in <1ms', () => {
    const layout: GlobalLayout = loadFixture('score_100_measures.json');
    const viewport = { x: 0, y: 0, width: 1200, height: 800 };

    const startTime = performance.now();
    const visibleSystems = getVisibleSystems(layout.systems, viewport);
    const queryTime = performance.now() - startTime;

    expect(queryTime).toBeLessThan(1);
    expect(visibleSystems.length).toBeGreaterThan(0);
  });

  it('keeps DOM node count <600 per viewport', () => {
    const layout: GlobalLayout = loadFixture('score_100_measures.json');
    const config = createDefaultConfig();
    const viewport = { x: 0, y: 0, width: 1200, height: 800 };

    const { container } = render(
      <LayoutRenderer layout={layout} config={config} viewport={viewport} />
    );

    const nodeCount = container.querySelectorAll('*').length;
    expect(nodeCount).toBeLessThan(600);
  });
});
```

---

## Debugging

### SVG Inspector (Browser DevTools)

View SVG structure:

1. Open DevTools → **Elements** tab
2. Find `<svg>` element with viewBox attribute
3. Inspect children: `<rect>` (background), `<line>` (staff lines), `<text>` (glyphs)
4. Verify **only visible systems rendered** (check DOM node count)

**Expected structure**:
```html
<svg viewBox="0 0 1200 800" width="100%" height="100%">
  <rect fill="#FFFFFF" x="0" y="0" width="1200" height="800" />
  <line x1="0" y1="100" x2="1200" y2="100" stroke="#000000" />
  <text x="50" y="100" font-family="Bravura">...</text>
</svg>
```

---

### Visual Debug Mode

Add debug overlay to see system boundaries:

```typescript
// Add to LayoutRenderer.tsx renderSVG()
const DEBUG_MODE = true;

if (DEBUG_MODE) {
  visibleSystems.forEach((system) => {
    const { x_position, y_position, width, height } = system.bounding_box;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x_position.toString());
    rect.setAttribute('y', y_position.toString());
    rect.setAttribute('width', width.toString());
    rect.setAttribute('height', height.toString());
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', 'red');
    rect.setAttribute('stroke-width', '2');
    svgElement.appendChild(rect);
  });
}
```

---

### Performance Profiling

Monitor render times with console warnings:

```typescript
// Already implemented in LayoutRenderer.tsx (T060)
private renderSVG(): void {
  const startTime = performance.now();
  
  // ... rendering logic ...
  
  const renderTime = performance.now() - startTime;
  if (renderTime > 16) {
    console.warn(
      `LayoutRenderer: Slow frame detected - ${renderTime.toFixed(2)}ms`,
      { viewport, systemCount, visibleSystemCount, renderTime }
    );
  }
}
```

**Expected output** (no warnings for normal viewports):
```
// No output = good performance
// Warning only if render exceeds 16ms (60fps budget)
```

---

## Troubleshooting

### Issue: SVG Not Rendering/Empty Output

**Symptom**: No notation visible, empty SVG element.

**Causes**:
1. Bravura font not loaded (glyphs render as missing characters)
2. Viewport Y out of range (no systems visible)
3. Layout or viewport is null/undefined

**Solution**:

```typescript
// 1. Verify font loaded
document.fonts.ready.then(() => {
  console.log('Fonts loaded:', document.fonts.check('40px Bravura'));
  // Trigger re-render if font was loading
});

// 2. Check viewport bounds
console.log('Viewport:', viewport);
console.log('Layout systems:', layout?.systems?.length);
const lastSystem = layout?.systems[layout.systems.length - 1];
console.log('Layout total height:', lastSystem?.bounding_box.y_position);

// 3. Verify visible systems
const visibleSystems = getVisibleSystems(layout.systems, viewport);
console.log('Visible systems:', visibleSystems.length);
```

---

### Issue: SVG Looks Pixelated/Blurry

**Symptom**: Notation appears pixelated or blurry on any display.

**Cause**: SVG is resolution-independent; this suggests incorrect fontSize or browser zoom.

**Solution**:

```typescript
// 1. Check fontSize in config
const config = createDefaultConfig();
console.log('Font size:', config.fontSize); // Should be 40 (staff space = 20 units)

// 2. Verify viewBox matches viewport
const svg = document.querySelector('svg');
console.log('ViewBox:', svg?.getAttribute('viewBox'));
// Should be "0 0 {viewport.width} {viewport.height}"

// 3. Check browser zoom level
console.log('Device pixel ratio:', window.devicePixelRatio);
// 1.0 = 100%, 2.0 = 200%, etc.
```

**Note**: SVG rendering is handled by the browser; blurriness is usually a config issue, not a display issue.

---

### Issue: Performance Below 60fps

**Symptom**: Scrolling feels laggy, slow frame warnings in console.

**Causes**:
1. Not using virtualization (rendering all systems, not just visible)
2. Viewport too large (too many DOM nodes)
3. Complex layout (multi-staff with many glyphs)

**Solution**:

```typescript
// 1. Verify virtualization working
const visibleSystems = getVisibleSystems(layout.systems, viewport);
console.log('Visible systems:', visibleSystems.length, '/', layout.systems.length);
// Should be 3-5 visible (not all 40)

// 2. Count DOM nodes
const container = document.querySelector('#score-container');
const nodeCount = container?.querySelectorAll('*').length;
console.log('DOM nodes:', nodeCount);
// Should be <600 (not 5000+)

// 3. Profile with Chrome DevTools
// Performance tab → Record → Scroll → Stop
// Check "Rendering" times (should be <10ms per frame)

// 4. Check render warnings in console
// "Slow frame detected - XXms" warnings indicate performance issues
```

---

## Next Steps

After integrating the renderer:

1. **Run all tests**: `npm test` (168 tests should pass)
2. **Profile performance**: Chrome DevTools → Performance → Record scroll
3. **Test interactive demo**: Load RendererDemo.tsx with 3 sample layouts
4. **Test on mobile devices**: iPad, Surface, Android tablet
5. **Validate zoom levels**: Test 0.25x, 1.0x, 2.0x, 4.0x zoom
6. **Test dark mode**: Verify color contrast and readability
7. **Review validation report**: See [VALIDATION.md](./VALIDATION.md) for comprehensive test results

---

## API Reference

For detailed implementation documentation, see:

- [LayoutRenderer.tsx](../../frontend/src/components/LayoutRenderer.tsx) - Main SVG renderer component
- [renderUtils.ts](../../frontend/src/utils/renderUtils.ts) - Configuration and rendering utilities
- [ScoreViewer.tsx](../../frontend/src/pages/ScoreViewer.tsx) - Integration component with scroll/zoom
- [ErrorBoundary.tsx](../../frontend/src/components/ErrorBoundary.tsx) - Error handling
- [RendererDemo.tsx](../../frontend/src/pages/RendererDemo.tsx) - Interactive demo page

**TypeScript Types**:
- `RenderConfig` - Renderer configuration (fontSize, colors, fontFamily)
- `Viewport` - Viewport definition (x, y, width, height in logical units)
- `GlobalLayout` - Layout structure from Rust engine (systems, total_height)
- `System` - Individual system with bounding_box and staff_groups

---

## Support

**Test Results**: [VALIDATION.md](./VALIDATION.md) - Comprehensive validation with 168 tests  
**Implementation Tasks**: [tasks.md](./tasks.md) - Complete task breakdown (74 tasks)  
**Technical Plan**: [plan.md](./plan.md) - Architecture and technical decisions  
**Layout Engine**: `specs/016-rust-layout-engine/` - Feature 016 Rust WASM layout engine  

**Issues**: GitHub Issues for bug reports  
**Documentation**: See `specs/017-layout-renderer/` for full Feature 017 specification
