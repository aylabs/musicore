/**
 * Layout-Driven Renderer Contracts
 * Feature 017 - Core renderer interface
 * 
 * Defines the contract for rendering music notation using
 * computed layout positions from Feature 016 (Rust Layout Engine).
 */

import type { GlobalLayout } from './types/GlobalLayout';
import type { System } from './types/System';
import type { StaffGroup } from './types/StaffGroup';
import type { Staff } from './types/Staff';
import type { GlyphRun } from './types/GlyphRun';
import type { RenderConfig } from './RenderConfig';
import type { Viewport } from './Viewport';

/**
 * Core renderer that transforms layout engine's computed positions
 * into Canvas 2D drawing operations.
 * 
 * @example
 * ```typescript
 * const renderer = new LayoutRenderer(canvasElement, {
 *   pixelsPerSpace: 10,
 *   fontFamily: 'Bravura',
 *   backgroundColor: '#FFFFFF',
 *   staffLineColor: '#000000',
 *   glyphColor: '#000000'
 * });
 * 
 * // On scroll event:
 * const viewport = { x: 0, y: scrollY, width: 800, height: 600 };
 * renderer.render(layout, viewport);
 * ```
 */
export interface LayoutRenderer {
  /**
   * Target canvas element for rendering.
   * Must be in DOM and have non-zero dimensions.
   */
  readonly canvas: HTMLCanvasElement;
  
  /**
   * Rendering configuration (colors, scaling, fonts).
   * Immutable after construction.
   */
  readonly config: RenderConfig;
  
  /**
   * Canvas 2D rendering context.
   * Cached from canvas.getContext('2d') for performance.
   */
  readonly ctx: CanvasRenderingContext2D;
  
  /**
   * Main rendering entry point.
   * Clears canvas, queries visible systems, renders them.
   * 
   * @param layout - Computed layout from Feature 016's computeLayout()
   * @param viewport - Visible region (scroll position + screen dimensions)
   * 
   * @throws Error if layout is null/undefined
   * @throws Error if viewport dimensions don't fit canvas
   * 
   * @example
   * ```typescript
   * const layout = computeLayout(score, { pageWidth: 800 });
   * const viewport = { x: 0, y: 0, width: 800, height: 600 };
   * renderer.render(layout, viewport);
   * ```
   */
  render(layout: GlobalLayout, viewport: Viewport): void;
  
  /**
   * Renders a single music system (staff group + glyphs).
   * Called by render() for each visible system.
   * 
   * @param system - System to render (from GlobalLayout.systems)
   * @param offsetX - X offset in pixels (typically 0 for left-aligned)
   * @param offsetY - Y offset in pixels (for viewport scrolling)
   * 
   * @internal
   */
  renderSystem(system: System, offsetX: number, offsetY: number): void;
  
  /**
   * Renders staff lines, braces, brackets for a group of staves.
   * 
   * @param staffGroup - Staff group from system.staffGroups
   * 
   * @internal
   */
  renderStaffGroup(staffGroup: StaffGroup): void;
  
  /**
   * Renders 5 horizontal staff lines using strokeRect().
   * 
   * @param staff - Staff from staffGroup.staves
   * 
   * @internal
   */
  renderStaff(staff: Staff): void;
  
  /**
   * Renders a batch of identical glyphs (e.g., noteheads) via fillText().
   * Leverages Feature 016's GlyphRun batching for performance.
   * 
   * @param run - Glyph run from system.glyphRuns
   * 
   * @internal
   */
  renderGlyphRun(run: GlyphRun): void;
  
  /**
   * Converts layout engine's logical units to screen pixels.
   * 
   * Formula: pixels = logical * (config.pixelsPerSpace / 20)
   * 
   * @param logical - Logical units from layout engine (staff space = 20)
   * @returns Screen pixels
   * 
   * @example
   * ```typescript
   * // Staff space (20 logical units) → 10 pixels at default zoom
   * const pixels = renderer.logicalToPixels(20); // 10
   * 
   * // Staff line spacing (5 logical units) → 2.5 pixels
   * const lineSpacing = renderer.logicalToPixels(5); // 2.5
   * ```
   */
  logicalToPixels(logical: number): number;
}

/**
 * Constructor options for LayoutRenderer.
 * 
 * @example
 * ```typescript
 * const options: LayoutRendererOptions = {
 *   canvas: document.getElementById('score-canvas') as HTMLCanvasElement,
 *   config: {
 *     pixelsPerSpace: 10,
 *     fontFamily: 'Bravura',
 *     backgroundColor: '#FFFFFF',
 *     staffLineColor: '#000000',
 *     glyphColor: '#000000'
 *   }
 * };
 * 
 * const renderer = new LayoutRenderer(options);
 * ```
 */
export interface LayoutRendererOptions {
  /**
   * Target canvas element for rendering.
   * Must be in DOM with non-zero width/height.
   */
  canvas: HTMLCanvasElement;
  
  /**
   * Rendering configuration.
   * See RenderConfig for validation rules.
   */
  config: RenderConfig;
}

/**
 * Query result from getVisibleSystems() virtualization.
 * 
 * @internal
 */
export interface VisibleSystemsResult {
  /**
   * Systems intersecting viewport (subset of GlobalLayout.systems).
   */
  systems: System[];
  
  /**
   * Start index in original systems array.
   */
  startIndex: number;
  
  /**
   * End index in original systems array (inclusive).
   */
  endIndex: number;
}

/**
 * Queries which systems intersect viewport using binary search.
 * 
 * @param systems - All systems from GlobalLayout.systems (must be sorted by y)
 * @param viewport - Visible region
 * @returns Subset of systems intersecting viewport
 * 
 * @performance O(log n) via binary search, <1ms for 200 systems
 * 
 * @example
 * ```typescript
 * const viewport = { x: 0, y: 500, width: 800, height: 600 };
 * const visible = getVisibleSystems(layout.systems, viewport);
 * // Returns systems with y in range [500-600]
 * ```
 */
export function getVisibleSystems(
  systems: System[],
  viewport: Viewport
): System[];
