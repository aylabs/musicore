# TypeScript Contracts: Layout Engine WASM Bindings

This directory contains TypeScript interface definitions for the Rust Layout Engine WASM module. These contracts ensure type-safe communication between Rust and TypeScript across the WASM boundary.

## Files

- **[GlobalLayout.ts](./GlobalLayout.ts)**: Core layout data structures (GlobalLayout, System, Staff, Glyph, etc.)
- **[LayoutConfig.ts](./LayoutConfig.ts)**: Configuration options for layout computation (spacing, system breaking, fonts)
- **[LayoutUtils.ts](./LayoutUtils.ts)**: Utility functions for hit testing, coordinate conversion, and layout analysis

## Usage

### 1. Import Types

```typescript
import type {
  GlobalLayout,
  System,
  Glyph,
  BoundingBox,
} from "@/specs/016-rust-layout-engine/contracts/GlobalLayout";

import type {
  LayoutConfig,
  SpacingConfig,
} from "@/specs/016-rust-layout-engine/contracts/LayoutConfig";

import {
  findGlyphAtPosition,
  getVisibleSystems,
  logicalToPixels,
} from "@/specs/016-rust-layout-engine/contracts/LayoutUtils";
```

### 2. Compute Layout (WASM)

```typescript
// Assuming WASM module loaded via wasm-pack
import init, { compute_layout } from "@/wasm/musicore_layout";

await init(); // Initialize WASM module

const compiledScore = /* ... load CompiledScore ... */;

const config: LayoutConfig = {
  maxSystemWidth: 800,
  unitsPerSpace: 10,
  spacing: {
    baseSpacing: 20,
    durationFactor: 40,
    minimumSpacing: 20,
  },
};

const layout: GlobalLayout = compute_layout(compiledScore, config);
```

### 3. Render Layout (Canvas)

```typescript
import { getVisibleSystems, logicalToPixels } from "./LayoutUtils";

function renderLayout(
  ctx: CanvasRenderingContext2D,
  layout: GlobalLayout,
  viewport: BoundingBox,
  pixelsPerSpace: number
) {
  const visibleSystems = getVisibleSystems(layout, viewport);

  for (const system of visibleSystems) {
    for (const staffGroup of system.staffGroups) {
      for (const staff of staffGroup.staves) {
        // Draw staff lines
        for (const line of staff.staffLines) {
          const y = logicalToPixels(line.yPosition, layout.unitsPerSpace, pixelsPerSpace);
          const startX = logicalToPixels(line.startX, layout.unitsPerSpace, pixelsPerSpace);
          const endX = logicalToPixels(line.endX, layout.unitsPerSpace, pixelsPerSpace);

          ctx.strokeStyle = "black";
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.stroke();
        }

        // Draw glyph runs (batched rendering)
        for (const run of staff.glyphRuns) {
          ctx.font = `${run.fontSize}px ${run.fontFamily}`;
          ctx.fillStyle = `rgba(${run.color.r}, ${run.color.g}, ${run.color.b}, ${run.opacity})`;

          for (const glyph of run.glyphs) {
            const x = logicalToPixels(glyph.position.x, layout.unitsPerSpace, pixelsPerSpace);
            const y = logicalToPixels(glyph.position.y, layout.unitsPerSpace, pixelsPerSpace);

            ctx.fillText(glyph.codepoint, x, y);
          }
        }
      }
    }
  }
}
```

### 4. Hit Testing (Click Events)

```typescript
import { findGlyphAtPosition, pixelsToLogical } from "./LayoutUtils";

canvas.addEventListener("click", (e) => {
  const clickPosLogical = {
    x: pixelsToLogical(e.offsetX, layout.unitsPerSpace, pixelsPerSpace),
    y: pixelsToLogical(e.offsetY, layout.unitsPerSpace, pixelsPerSpace),
  };

  const glyph = findGlyphAtPosition(layout, clickPosLogical, viewport);

  if (glyph) {
    console.log("Clicked glyph:", glyph.codepoint);
    console.log("Source reference:", glyph.sourceReference);

    // Highlight corresponding note in CompiledScore
    const note = findNoteByReference(compiledScore, glyph.sourceReference);
    highlightNote(note);
  }
});
```

### 5. Performance Monitoring

```typescript
import { countGlyphs, countGlyphRuns, calculateBatchingEfficiency } from "./LayoutUtils";

const stats = {
  systems: layout.systems.length,
  glyphs: countGlyphs(layout),
  runs: countGlyphRuns(layout),
  efficiency: calculateBatchingEfficiency(layout),
};

console.log(`Layout stats: ${stats.systems} systems, ${stats.glyphs} glyphs`);
console.log(`Batching efficiency: ${stats.efficiency.toFixed(1)} glyphs/run`);
// Good efficiency: >20 glyphs/run means effective batching
```

## Testing Contracts

### Unit Tests (TypeScript)

```typescript
import { describe, it, expect } from "vitest";
import { containsPoint, intersects } from "./LayoutUtils";

describe("LayoutUtils", () => {
  it("containsPoint detects point inside box", () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    const point = { x: 50, y: 50 };
    expect(containsPoint(box, point)).toBe(true);
  });

  it("containsPoint detects point outside box", () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    const point = { x: 150, y: 50 };
    expect(containsPoint(box, point)).toBe(false);
  });

  it("intersects detects overlapping boxes", () => {
    const box1 = { x: 0, y: 0, width: 100, height: 100 };
    const box2 = { x: 50, y: 50, width: 100, height: 100 };
    expect(intersects(box1, box2)).toBe(true);
  });
});
```

### Integration Tests (WASM)

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import init, { compute_layout } from "@/wasm/musicore_layout";
import { isValidLayoutConfig, mergeLayoutConfig } from "./LayoutConfig";

describe("WASM Layout Integration", () => {
  beforeAll(async () => {
    await init();
  });

  it("computes layout with default config", () => {
    const compiledScore = loadFixture("piano_50_measures.json");
    const layout = compute_layout(compiledScore);

    expect(layout.systems.length).toBeGreaterThan(0);
    expect(layout.totalWidth).toBeGreaterThan(0);
    expect(layout.unitsPerSpace).toBe(10);
  });

  it("validates config before computation", () => {
    const invalidConfig = { maxSystemWidth: -100 }; // Invalid
    expect(isValidLayoutConfig(invalidConfig)).toBe(false);

    const validConfig = mergeLayoutConfig({ maxSystemWidth: 750 });
    expect(isValidLayoutConfig(validConfig)).toBe(true);
  });

  it("produces deterministic layout", () => {
    const compiledScore = loadFixture("piano_50_measures.json");

    const layout1 = compute_layout(compiledScore);
    const layout2 = compute_layout(compiledScore);

    expect(JSON.stringify(layout1)).toBe(JSON.stringify(layout2));
  });
});
```

## Contract Validation

These contracts are validated by:

1. **Rust-side tests**: `backend/tests/layout_test.rs` verifies serialization to JSON matches TypeScript expectations
2. **TypeScript tests**: `frontend/tests/wasm/layout.test.ts` verifies WASM bindings return correct types
3. **E2E tests**: Full rendering pipeline tests ensure contracts work end-to-end

## Maintenance

- **Adding new fields**: Update both Rust struct and TypeScript interface, add migration note in comments
- **Breaking changes**: Version contracts (e.g., `GlobalLayoutV2.ts`), maintain backward compatibility
- **Deprecation**: Mark deprecated fields with `@deprecated` JSDoc tag, schedule removal after 2 releases

## References

- [Rust WASM Guide](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen Types](https://rustwasm.github.io/wasm-bindgen/reference/types.html)
- [SMuFL Codepoints](https://www.w3.org/2021/06/musicxml40/tutorial/smufl-codepoints/)
