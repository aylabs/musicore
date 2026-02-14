# Quickstart Guide: Rust Layout Engine

**Feature**: 016-rust-layout-engine  
**For**: Developers implementing or consuming the layout engine  
**Last Updated**: 2026-02-12

---

## Overview

The Rust Layout Engine transforms a `CompiledScore` (domain model with musical events at 960 PPQ) into a `GlobalLayout` (spatial model with glyph positions in logical units). This guide covers setup, usage, and integration patterns.

**Key Concepts**:
- **Deterministic**: Same input always produces byte-identical output (enables caching)
- **Logical Units**: Resolution-independent coordinates (10 logical units = 1 staff space by default)
- **Virtualization**: Systems group 1-4 measures, enabling efficient rendering of long scores
- **Batching**: GlyphRuns group consecutive glyphs for minimal draw calls

---

## Quick Start

### 1. Build WASM Module (First Time Setup)

```bash
# Install wasm-pack if not installed
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Navigate to backend directory
cd backend

# Build WASM module for web target
wasm-pack build --target web --out-dir ../frontend/src/wasm

# Output: frontend/src/wasm/musicore_layout_bg.wasm (binary)
#         frontend/src/wasm/musicore_layout.js (bindings)
#         frontend/src/wasm/musicore_layout.d.ts (TypeScript types)
```

**Verification**:
```bash
ls -lh frontend/src/wasm/
# Should see: *.wasm (< 300KB gzipped), *.js, *.d.ts, package.json
```

---

### 2. Load WASM in Frontend

```typescript
// frontend/src/wasm/layout.ts
import init, { compute_layout, LayoutConfig } from "./musicore_layout";

let wasmInitialized = false;

/**
 * Initialize WASM module (call once during app startup).
 */
export async function initLayoutEngine(): Promise<void> {
  if (wasmInitialized) return;
  
  await init();
  wasmInitialized = true;
  console.log("Layout engine WASM module initialized");
}

/**
 * Compute layout from CompiledScore.
 * Throws if WASM not initialized.
 */
export function computeLayout(
  compiledScore: CompiledScore,
  config?: Partial<LayoutConfig>
): GlobalLayout {
  if (!wasmInitialized) {
    throw new Error("Layout engine not initialized. Call initLayoutEngine() first.");
  }
  
  const mergedConfig = mergeLayoutConfig(config);
  return compute_layout(compiledScore, mergedConfig);
}
```

**App Initialization**:
```typescript
// frontend/src/main.tsx
import { initLayoutEngine } from "./wasm/layout";

async function main() {
  // Initialize WASM before rendering React app
  await initLayoutEngine();
  
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  root.render(<App />);
}

main();
```

---

### 3. Compute Layout (Basic Usage)

```typescript
import { computeLayout } from "@/wasm/layout";
import type { GlobalLayout } from "@/specs/016-rust-layout-engine/contracts/GlobalLayout";

// Assume compiledScore loaded from IndexedDB or imported
const compiledScore: CompiledScore = await loadScore("moonlight-sonata");

// Compute with default config
const layout: GlobalLayout = computeLayout(compiledScore);

console.log(`Layout computed: ${layout.systems.length} systems`);
console.log(`Total dimensions: ${layout.totalWidth} × ${layout.totalHeight} logical units`);
```

**With Custom Config**:
```typescript
import { LAYOUT_PRESETS } from "@/specs/016-rust-layout-engine/contracts/LayoutConfig";

// Use preset for practice mode (generous spacing)
const layout = computeLayout(compiledScore, LAYOUT_PRESETS.PRACTICE);

// Or customize individual parameters
const layout = computeLayout(compiledScore, {
  maxSystemWidth: 750,
  spacing: {
    baseSpacing: 25,
    durationFactor: 45,
    minimumSpacing: 25,
  },
});
```

---

## Integration Patterns

### Pattern 1: Cache Layout in IndexedDB

**Rationale**: Layout computation is deterministic, so cache by score ID + config hash.

```typescript
import { SHA256 } from "crypto-js";

/**
 * Compute layout with caching.
 * Returns cached layout if available, otherwise computes and caches.
 */
export async function computeLayoutCached(
  scoreId: string,
  compiledScore: CompiledScore,
  config?: Partial<LayoutConfig>
): Promise<GlobalLayout> {
  const configHash = SHA256(JSON.stringify(config)).toString();
  const cacheKey = `layout:${scoreId}:${configHash}`;
  
  // Check cache first
  const cached = await db.layouts.get(cacheKey);
  if (cached) {
    console.log("Layout cache hit");
    return cached.layout;
  }
  
  // Compute layout
  const layout = computeLayout(compiledScore, config);
  
  // Store in cache
  await db.layouts.put({
    key: cacheKey,
    layout,
    timestamp: Date.now(),
  });
  
  console.log("Layout computed and cached");
  return layout;
}
```

---

### Pattern 2: Virtualized Rendering (Long Scores)

**Rationale**: Render only visible systems for 60fps scrolling.

```typescript
import { getVisibleSystems } from "@/specs/016-rust-layout-engine/contracts/LayoutUtils";

function renderScore(
  ctx: CanvasRenderingContext2D,
  layout: GlobalLayout,
  scrollX: number,
  scrollY: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const viewport = {
    x: scrollX,
    y: scrollY,
    width: canvasWidth,
    height: canvasHeight,
  };
  
  const visibleSystems = getVisibleSystems(layout, viewport);
  
  console.log(`Rendering ${visibleSystems.length}/${layout.systems.length} visible systems`);
  
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  for (const system of visibleSystems) {
    renderSystem(ctx, system, layout.unitsPerSpace);
  }
}

function renderSystem(
  ctx: CanvasRenderingContext2D,
  system: System,
  unitsPerSpace: number
) {
  // Render staff lines, glyphs, etc.
  // Implementation in next section
}
```

---

### Pattern 3: Hit Testing (Click Interaction)

**Rationale**: Find glyph at click position to highlight note.

```typescript
import { findGlyphAtPosition, pixelsToLogical } from "@/specs/016-rust-layout-engine/contracts/LayoutUtils";

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left + scrollX;
  const clickY = e.clientY - rect.top + scrollY;
  
  // Convert pixel coordinates to logical units
  const clickPosLogical = {
    x: pixelsToLogical(clickX, layout.unitsPerSpace, pixelsPerSpace),
    y: pixelsToLogical(clickY, layout.unitsPerSpace, pixelsPerSpace),
  };
  
  // Find glyph at position
  const glyph = findGlyphAtPosition(layout, clickPosLogical, viewport);
  
  if (glyph) {
    // Resolve to original note in CompiledScore
    const note = compiledScore
      .instruments.find(i => i.id === glyph.sourceReference.instrumentId)
      ?.staves[glyph.sourceReference.staffIndex]
      ?.voices[glyph.sourceReference.voiceIndex]
      ?.events[glyph.sourceReference.eventIndex];
    
    if (note) {
      highlightNote(note);
      showNoteInspector(note);
    }
  }
});
```

---

## Rendering Guide

### Step 1: Draw Staff Lines

```typescript
import { logicalToPixels } from "@/specs/016-rust-layout-engine/contracts/LayoutUtils";

function renderStaffLines(
  ctx: CanvasRenderingContext2D,
  staff: Staff,
  unitsPerSpace: number,
  pixelsPerSpace: number
) {
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  
  for (const line of staff.staffLines) {
    const y = logicalToPixels(line.yPosition, unitsPerSpace, pixelsPerSpace);
    const startX = logicalToPixels(line.startX, unitsPerSpace, pixelsPerSpace);
    const endX = logicalToPixels(line.endX, unitsPerSpace, pixelsPerSpace);
    
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}
```

---

### Step 2: Draw Structural Glyphs (Clefs, Key Sigs)

```typescript
function renderStructuralGlyphs(
  ctx: CanvasRenderingContext2D,
  staff: Staff,
  unitsPerSpace: number,
  pixelsPerSpace: number
) {
  ctx.font = `${logicalToPixels(40, unitsPerSpace, pixelsPerSpace)}px Bravura`;
  ctx.fillStyle = "#000000";
  
  for (const glyph of staff.structuralGlyphs) {
    const x = logicalToPixels(glyph.position.x, unitsPerSpace, pixelsPerSpace);
    const y = logicalToPixels(glyph.position.y, unitsPerSpace, pixelsPerSpace);
    
    ctx.fillText(glyph.codepoint, x, y);
  }
}
```

---

### Step 3: Draw Glyph Runs (Batched)

```typescript
function renderGlyphRuns(
  ctx: CanvasRenderingContext2D,
  staff: Staff,
  unitsPerSpace: number,
  pixelsPerSpace: number
) {
  for (const run of staff.glyphRuns) {
    // Set drawing properties once per run
    const fontSize = logicalToPixels(run.fontSize, unitsPerSpace, pixelsPerSpace);
    ctx.font = `${fontSize}px ${run.fontFamily}`;
    ctx.fillStyle = `rgba(${run.color.r}, ${run.color.g}, ${run.color.b}, ${run.opacity})`;
    
    // Draw all glyphs in run with single style
    for (const glyph of run.glyphs) {
      const x = logicalToPixels(glyph.position.x, unitsPerSpace, pixelsPerSpace);
      const y = logicalToPixels(glyph.position.y, unitsPerSpace, pixelsPerSpace);
      
      ctx.fillText(glyph.codepoint, x, y);
    }
  }
}
```

---

### Step 4: Complete System Rendering

```typescript
function renderSystem(
  ctx: CanvasRenderingContext2D,
  system: System,
  layout: GlobalLayout,
  pixelsPerSpace: number
) {
  for (const staffGroup of system.staffGroups) {
    // Draw bracket/brace if needed
    if (staffGroup.bracketType !== "None") {
      renderBracket(ctx, staffGroup, layout.unitsPerSpace, pixelsPerSpace);
    }
    
    for (const staff of staffGroup.staves) {
      renderStaffLines(ctx, staff, layout.unitsPerSpace, pixelsPerSpace);
      renderStructuralGlyphs(ctx, staff, layout.unitsPerSpace, pixelsPerSpace);
      renderGlyphRuns(ctx, staff, layout.unitsPerSpace, pixelsPerSpace);
    }
  }
}
```

---

## Testing

### Unit Tests (Rust)

```rust
// backend/tests/layout_test.rs
use musicore_layout::{compute_layout, LayoutConfig};
use musicore_domain::CompiledScore;

#[test]
fn test_layout_deterministic() {
    let score = load_fixture("piano_50_measures.json");
    let config = LayoutConfig::default();
    
    let layout1 = compute_layout(&score, &config);
    let layout2 = compute_layout(&score, &config);
    
    let json1 = serde_json::to_string(&layout1).unwrap();
    let json2 = serde_json::to_string(&layout2).unwrap();
    
    assert_eq!(json1, json2, "Layout must be deterministic");
}

#[test]
fn test_system_breaking() {
    let score = load_fixture("piano_50_measures.json");
    let config = LayoutConfig {
        max_system_width: 800.0,
        ..Default::default()
    };
    
    let layout = compute_layout(&score, &config);
    
    // Verify systems break at measure boundaries
    for system in &layout.systems {
        assert_eq!(system.tick_range.start_tick % 3840, 0, "System must start at measure boundary");
    }
}
```

---

### Integration Tests (TypeScript)

```typescript
// frontend/tests/wasm/layout.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { initLayoutEngine, computeLayout } from "@/wasm/layout";
import { countGlyphs, countGlyphRuns } from "@/specs/016-rust-layout-engine/contracts/LayoutUtils";

describe("Layout Engine WASM", () => {
  beforeAll(async () => {
    await initLayoutEngine();
  });

  it("computes layout for 50-measure piano score", () => {
    const score = loadFixture("piano_50_measures.json");
    const layout = computeLayout(score);

    expect(layout.systems.length).toBeGreaterThan(0);
    expect(layout.systems.length).toBeLessThanOrEqual(15); // ~4 measures per system
    expect(layout.unitsPerSpace).toBe(10);
  });

  it("produces byte-identical output for same input", () => {
    const score = loadFixture("piano_50_measures.json");
    
    const layout1 = computeLayout(score);
    const layout2 = computeLayout(score);
    
    expect(JSON.stringify(layout1)).toBe(JSON.stringify(layout2));
  });

  it("batches glyphs efficiently", () => {
    const score = loadFixture("piano_50_measures.json");
    const layout = computeLayout(score);
    
    const glyphs = countGlyphs(layout);
    const runs = countGlyphRuns(layout);
    const efficiency = glyphs / runs;
    
    expect(efficiency).toBeGreaterThan(10); // At least 10 glyphs per run average
  });
});
```

---

## Performance Optimization

### 1. Enable WASM Exceptions (Faster Error Handling)

```toml
# backend/Cargo.toml
[dependencies]
wasm-bindgen = { version = "0.2", features = ["enable-interning"] }
```

---

### 2. Use Release Build for Production

```bash
# Development (faster build, slower runtime)
wasm-pack build --target web --dev

# Production (slower build, optimized runtime)
wasm-pack build --target web --release
```

**Size comparison**:
- Debug: ~800KB uncompressed
- Release: ~300KB uncompressed, ~100KB gzipped

---

### 3. Profile WASM Execution

```typescript
// Chrome DevTools > Performance > Record
performance.mark("layout-start");
const layout = computeLayout(compiledScore);
performance.mark("layout-end");

performance.measure("layout-computation", "layout-start", "layout-end");

const measure = performance.getEntriesByName("layout-computation")[0];
console.log(`Layout computed in ${measure.duration.toFixed(2)}ms`);

// Target: <100ms for 50 measures, <200ms for 100 measures
```

---

## Troubleshooting

### Issue: "WASM module not initialized"

**Cause**: `computeLayout()` called before `initLayoutEngine()`.

**Solution**:
```typescript
// Ensure init called during app startup
await initLayoutEngine();
// Now safe to call computeLayout()
```

---

### Issue: Glyphs not rendering

**Cause**: Bravura font not loaded, or incorrect codepoint.

**Solution**:
```css
/* frontend/src/index.css */
@font-face {
  font-family: 'Bravura';
  src: url('/assets/fonts/Bravura.woff2') format('woff2');
}
```

Verify font loaded:
```typescript
document.fonts.ready.then(() => {
  console.log("Fonts loaded, safe to render");
  renderLayout();
});
```

---

### Issue: Layout different across devices

**Cause**: Floating-point precision variance.

**Solution**: Layout should be deterministic due to serialization rounding. If variance persists, check:
```typescript
// Verify both devices use same config
console.log(JSON.stringify(config));

// Verify same WASM version
console.log(wasmModule.version);
```

---

## Next Steps

1. **Implement layout module**: Follow [tasks.md](./tasks.md) (generated by `/speckit.tasks`)
2. **Add WASM build to CI**: `.github/workflows/build-wasm.yml`
3. **Integrate with renderer**: Use patterns from this guide in `ScoreRenderer.tsx`
4. **Add caching layer**: Implement `computeLayoutCached()` with IndexedDB

---

## References

- [Specification](./spec.md): Complete requirements and success criteria
- [Research](./research.md): Technical decisions and alternatives considered
- [Data Model](./data-model.md): Entity definitions and relationships
- [Contracts](./contracts/): TypeScript interfaces for WASM bindings
- [wasm-pack Book](https://rustwasm.github.io/docs/wasm-pack/): Official WASM packaging guide
- [SMuFL Specification](https://www.w3.org/2021/06/musicxml40/tutorial/smufl-codepoints/): Musical glyph codepoints
