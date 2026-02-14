/**
 * Utility functions for working with layout data structures.
 * Includes hit testing, coordinate conversion, and bounding box operations.
 */

import type {
  BoundingBox,
  Point,
  System,
  Glyph,
  GlobalLayout,
  TickRange,
} from '../wasm/layout';

/**
 * Check if a point is inside a bounding box.
 *
 * @param box Bounding box to test
 * @param point Point to test
 * @returns True if point is inside box (inclusive)
 */
export function containsPoint(box: BoundingBox, point: Point): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

/**
 * Check if two bounding boxes intersect.
 *
 * @param box1 First bounding box
 * @param box2 Second bounding box
 * @returns True if boxes overlap
 */
export function intersects(box1: BoundingBox, box2: BoundingBox): boolean {
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

/**
 * Find all systems visible in a viewport.
 * Used for virtualized rendering (only render visible systems).
 *
 * @param layout Complete layout to search
 * @param viewport Viewport bounding box (typically current scroll region)
 * @returns Array of systems intersecting viewport
 *
 * @example
 * ```typescript
 * const visibleSystems = getVisibleSystems(layout, {
 *   x: scrollX,
 *   y: scrollY,
 *   width: canvasWidth,
 *   height: canvasHeight
 * });
 * ```
 */
export function getVisibleSystems(layout: GlobalLayout, viewport: BoundingBox): System[] {
  return layout.systems.filter((system) => intersects(system.bounding_box, viewport));
}

/**
 * Find glyph at a specific click position using hit testing.
 * Searches visible systems only for performance.
 *
 * @param layout Complete layout to search
 * @param clickPos Click position in logical units
 * @param viewport Current viewport (optional, improves performance)
 * @returns Glyph at position or undefined if none found
 *
 * @example
 * ```typescript
 * canvas.addEventListener('click', (e) => {
 *   const clickPos = { x: e.offsetX, y: e.offsetY };
 *   const glyph = findGlyphAtPosition(layout, clickPos);
 *   if (glyph) {
 *     highlightNote(glyph.source_reference);
 *   }
 * });
 * ```
 */
export function findGlyphAtPosition(
  layout: GlobalLayout,
  clickPos: Point,
  viewport?: BoundingBox
): Glyph | undefined {
  // Optimize by searching only visible systems
  const systemsToSearch = viewport
    ? getVisibleSystems(layout, viewport)
    : layout.systems;

  // Search systems in reverse order (top system wins for overlaps)
  for (const system of systemsToSearch) {
    if (!containsPoint(system.bounding_box, clickPos)) {
      continue;
    }

    // Search all staff groups in system
    for (const staffGroup of system.staff_groups) {
      for (const staff of staffGroup.staves) {
        // Check structural glyphs first (clefs, key sigs, time sigs)
        for (const glyph of staff.structural_glyphs) {
          if (containsPoint(glyph.bounding_box, clickPos)) {
            return glyph;
          }
        }

        // Check glyph runs
        for (const run of staff.glyph_runs) {
          for (const glyph of run.glyphs) {
            if (containsPoint(glyph.bounding_box, clickPos)) {
              return glyph;
            }
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Find system containing a specific musical tick position.
 * Uses binary search for O(log n) performance.
 *
 * @param layout Complete layout to search
 * @param tick Tick position in 960 PPQ (from CompiledScore)
 * @returns System containing tick or undefined if out of range
 *
 * @example
 * ```typescript
 * const system = findSystemAtTick(layout, 1920); // Find system at tick 1920 (beat 2)
 * ```
 */
export function findSystemAtTick(layout: GlobalLayout, tick: number): System | undefined {
  // Binary search on tick_range
  let left = 0;
  let right = layout.systems.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const system = layout.systems[mid];

    if (tick < system.tick_range.start_tick) {
      right = mid - 1;
    } else if (tick >= system.tick_range.end_tick) {
      left = mid + 1;
    } else {
      return system; // tick is in [startTick, endTick)
    }
  }

  return undefined;
}

/**
 * Convert logical units to pixels for rendering.
 *
 * @param logicalUnits Value in logical units
 * @param unitsPerSpace Scaling factor from layout (default: 10.0)
 * @param pixelsPerSpace Target pixel size of staff space (e.g., 12px for zoom level)
 * @returns Value in pixels
 *
 * @example
 * ```typescript
 * const pixelX = logicalToPixels(glyph.position.x, layout.units_per_space, 12);
 * ```
 */
export function logicalToPixels(
  logicalUnits: number,
  unitsPerSpace: number,
  pixelsPerSpace: number
): number {
  return (logicalUnits * pixelsPerSpace) / unitsPerSpace;
}

/**
 * Convert pixels to logical units for hit testing.
 *
 * @param pixels Value in pixels
 * @param unitsPerSpace Scaling factor from layout (default: 10.0)
 * @param pixelsPerSpace Current pixel size of staff space
 * @returns Value in logical units
 *
 * @example
 * ```typescript
 * const logicalPos = pixelsToLogical(e.offsetX, layout.units_per_space, 12);
 * ```
 */
export function pixelsToLogical(
  pixels: number,
  unitsPerSpace: number,
  pixelsPerSpace: number
): number {
  return (pixels * unitsPerSpace) / pixelsPerSpace;
}

/**
 * Check if a tick range is contained within another tick range.
 *
 * @param outer Outer tick range
 * @param inner Inner tick range
 * @returns True if inner is completely contained within outer
 */
export function containsTickRange(outer: TickRange, inner: TickRange): boolean {
  return inner.start_tick >= outer.start_tick && inner.end_tick <= outer.end_tick;
}

/**
 * Calculate the duration in ticks covered by a tick range.
 *
 * @param range Tick range
 * @returns Duration in ticks (960 PPQ)
 */
export function tickRangeDuration(range: TickRange): number {
  return range.end_tick - range.start_tick;
}

/**
 * Convert tick range duration to musical duration string.
 * Assumes 4/4 time signature and 960 PPQ.
 *
 * @param range Tick range
 * @returns Human-readable duration (e.g., "4 beats", "1 measure")
 *
 * @example
 * ```typescript
 * const duration = formatTickRangeDuration({ start_tick: 0, end_tick: 3840 });
 * // Returns: "4 beats" (1 measure in 4/4)
 * ```
 */
export function formatTickRangeDuration(range: TickRange): string {
  const ticks = tickRangeDuration(range);
  const quarterNotes = ticks / 960;

  if (quarterNotes === 1) {
    return '1 beat';
  } else if (quarterNotes % 4 === 0) {
    const measures = quarterNotes / 4;
    return measures === 1 ? '1 measure' : `${measures} measures`;
  } else {
    return `${quarterNotes} beats`;
  }
}

/**
 * Count total number of glyphs in a layout.
 * Useful for performance monitoring and statistics.
 *
 * @param layout Complete layout to count
 * @returns Total glyph count (structural + run glyphs)
 */
export function countGlyphs(layout: GlobalLayout): number {
  let count = 0;

  for (const system of layout.systems) {
    for (const staffGroup of system.staff_groups) {
      for (const staff of staffGroup.staves) {
        count += staff.structural_glyphs.length;
        for (const run of staff.glyph_runs) {
          count += run.glyphs.length;
        }
      }
    }
  }

  return count;
}

/**
 * Count total number of glyph runs in a layout.
 * Lower run count = better batching efficiency.
 *
 * @param layout Complete layout to count
 * @returns Total glyph run count
 */
export function countGlyphRuns(layout: GlobalLayout): number {
  let count = 0;

  for (const system of layout.systems) {
    for (const staffGroup of system.staff_groups) {
      for (const staff of staffGroup.staves) {
        count += staff.glyph_runs.length;
      }
    }
  }

  return count;
}

/**
 * Calculate batching efficiency ratio.
 * Higher ratio = better batching (more glyphs per run).
 *
 * @param layout Complete layout to analyze
 * @returns Efficiency ratio (glyphs per run)
 *
 * @example
 * ```typescript
 * const efficiency = calculateBatchingEfficiency(layout);
 * console.log(`Batching efficiency: ${efficiency.toFixed(1)} glyphs per run`);
 * // Good: >20 glyphs/run, Poor: <5 glyphs/run
 * ```
 */
export function calculateBatchingEfficiency(layout: GlobalLayout): number {
  const totalGlyphs = countGlyphs(layout);
  const totalRuns = countGlyphRuns(layout);
  return totalRuns > 0 ? totalGlyphs / totalRuns : 0;
}
