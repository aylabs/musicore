/**
 * Rendering Utilities
 * Feature 017 - Core utilities for SVG rendering
 * 
 * Provides configuration factories, viewport helpers, system virtualization,
 * and SVG element creation utilities.
 */

import type { RenderConfig } from '../types/RenderConfig';
import type { Viewport } from '../types/Viewport';
import type { System } from '../wasm/layout';

// ============================================================================
// RenderConfig Factories (Task T007)
// ============================================================================

/**
 * Creates default RenderConfig for typical tablet display.
 * 
 * @returns RenderConfig with standard values
 * 
 * @example
 * ```typescript
 * const config = createDefaultConfig();
 * const renderer = new LayoutRenderer(svg, config);
 * ```
 */
export function createDefaultConfig(): RenderConfig {
  return {
    fontSize: 20,
    fontFamily: 'Bravura',
    backgroundColor: '#FFFFFF',
    staffLineColor: '#000000',
    glyphColor: '#000000',
  };
}

/**
 * Creates dark mode RenderConfig variant.
 * 
 * @param fontSize - Optional zoom level (default: 20)
 * @returns RenderConfig with dark mode colors
 * 
 * @example
 * ```typescript
 * const darkConfig = createDarkModeConfig(24); // Dark mode + 1.2x zoom
 * const renderer = new LayoutRenderer(svg, darkConfig);
 * ```
 */
export function createDarkModeConfig(fontSize: number = 20): RenderConfig {
  return {
    fontSize,
    fontFamily: 'Bravura',
    backgroundColor: '#1E1E1E',
    staffLineColor: '#CCCCCC',
    glyphColor: '#FFFFFF',
  };
}

/**
 * Validates RenderConfig for correctness.
 * Throws Error if validation fails.
 * 
 * @param config - Configuration to validate
 * 
 * @throws Error if fontSize <= 0
 * @throws Error if fontFamily is empty
 * @throws Error if any color is invalid CSS
 * 
 * @example
 * ```typescript
 * const config: RenderConfig = createDefaultConfig();
 * validateRenderConfig(config); // OK
 * 
 * const invalid: RenderConfig = {
 *   fontSize: -5, // Invalid!
 *   fontFamily: '',
 *   backgroundColor: 'invalid-color',
 *   staffLineColor: '#000000',
 *   glyphColor: '#000000'
 * };
 * 
 * validateRenderConfig(invalid); // Throws Error
 * ```
 */
export function validateRenderConfig(config: RenderConfig): void {
  if (config.fontSize <= 0) {
    throw new Error(
      `RenderConfig.fontSize must be > 0, got ${config.fontSize}`
    );
  }

  if (!config.fontFamily || config.fontFamily.trim().length === 0) {
    throw new Error('RenderConfig.fontFamily must be non-empty');
  }

  // Validate colors using CSS.supports() for accurate CSS color validation
  const colors = [
    { name: 'backgroundColor', value: config.backgroundColor },
    { name: 'staffLineColor', value: config.staffLineColor },
    { name: 'glyphColor', value: config.glyphColor },
  ];

  for (const { name, value } of colors) {
    if (!isValidCSSColor(value)) {
      throw new Error(
        `RenderConfig.${name} must be valid CSS color, got "${value}"`
      );
    }
  }
}

/**
 * Checks if a string is a valid CSS color
 * 
 * Uses a temporary element to test if the browser accepts the color value.
 * Works in both browser and test environments (jsdom).
 * 
 * @param color - Color string to validate
 * @returns True if valid CSS color
 * 
 * @internal
 */
function isValidCSSColor(color: string): boolean {
  // Create a temporary element to test color validity
  const tempElement = document.createElement('div');
  tempElement.style.color = '';
  tempElement.style.color = color;
  
  // If the browser accepted the color, it will be non-empty
  // Empty string means the color was invalid and rejected
  return tempElement.style.color !== '';
}

// ============================================================================
// Viewport Utilities (Task T008)
// ============================================================================

/**
 * Creates viewport from SVG element viewBox dimensions.
 * 
 * @param svg - SVG element to measure viewBox
 * @param scrollY - Current scroll position in logical units (default: 0)
 * @returns Viewport matching SVG viewBox at scroll position
 * 
 * @example
 * ```typescript
 * const svg = document.getElementById('score-svg') as SVGSVGElement;
 * const viewport = createViewportFromSVG(svg, currentScrollY);
 * renderer.render(layout, viewport);
 * ```
 */
export function createViewportFromSVG(
  svg: SVGSVGElement,
  scrollY: number = 0
): Viewport {
  const viewBox = svg.viewBox.baseVal;
  
  return {
    x: viewBox.x,
    y: scrollY,
    width: viewBox.width,
    height: viewBox.height,
  };
}

/**
 * Checks if system bounding box intersects viewport.
 * Used internally by getVisibleSystems() for binary search.
 * 
 * @param systemY - System top Y coordinate (logical units)
 * @param systemHeight - System height (logical units)
 * @param viewport - Viewport to test against
 * @returns True if system is visible within viewport
 * 
 * @example
 * ```typescript
 * const viewport = { x: 0, y: 500, width: 800, height: 600 };
 * 
 * // System 1: y=0, height=200 (top of score)
 * intersectsViewport(0, 200, viewport); // false (above viewport)
 * 
 * // System 2: y=500, height=200 (at scroll position)
 * intersectsViewport(500, 200, viewport); // true (visible)
 * 
 * // System 3: y=1200, height=200 (below viewport)
 * intersectsViewport(1200, 200, viewport); // false (below viewport)
 * ```
 */
export function intersectsViewport(
  systemY: number,
  systemHeight: number,
  viewport: Viewport
): boolean {
  const systemBottom = systemY + systemHeight;
  const viewportBottom = viewport.y + viewport.height;

  // System intersects if:
  // - System bottom is below viewport top (systemBottom > viewport.y)
  // - System top is above viewport bottom (systemY < viewportBottom)
  return systemBottom > viewport.y && systemY < viewportBottom;
}

/**
 * Calculates total viewport area in square logical units.
 * Used for performance metrics (logical units/sec throughput).
 * 
 * @param viewport - Viewport to measure
 * @returns Area in square logical units
 * 
 * @example
 * ```typescript
 * const viewport = { x: 0, y: 0, width: 800, height: 600 };
 * const area = getViewportArea(viewport); // 480000 square logical units
 * ```
 */
export function getViewportArea(viewport: Viewport): number {
  return viewport.width * viewport.height;
}

/**
 * Validates viewport for correctness.
 * Throws Error if validation fails.
 * 
 * @param viewport - Viewport to validate
 * 
 * @throws Error if x or y is negative
 * @throws Error if width or height is <= 0
 * 
 * @example
 * ```typescript
 * const viewport: Viewport = { x: 0, y: 0, width: 800, height: 600 };
 * validateViewport(viewport); // OK
 * 
 * const viewport2: Viewport = { x: 0, y: -75, width: 800, height: 600 };
 * validateViewport(viewport2); // OK - negative Y allows showing glyphs above first system
 * 
 * const invalid: Viewport = { x: -10, y: 0, width: 0, height: 600 };
 * validateViewport(invalid); // Throws Error
 * ```
 */
export function validateViewport(viewport: Viewport): void {
  if (viewport.x < 0) {
    throw new Error(`Viewport.x must be >= 0, got ${viewport.x}`);
  }

  // Note: viewport.y CAN be negative to show glyphs above the first system
  // (e.g., clefs, structural elements positioned above staff)
  
  if (viewport.width <= 0) {
    throw new Error(`Viewport.width must be > 0, got ${viewport.width}`);
  }

  if (viewport.height <= 0) {
    throw new Error(`Viewport.height must be > 0, got ${viewport.height}`);
  }
}

// ============================================================================
// System Virtualization (Task T009)
// ============================================================================

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
 * // Returns systems with bounding boxes intersecting viewport
 * ```
 */
export function getVisibleSystems(
  systems: System[],
  viewport: Viewport
): System[] {
  if (systems.length === 0) {
    return [];
  }

  // Binary search to find first visible system
  let firstVisibleIndex = -1;
  let left = 0;
  let right = systems.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const system = systems[mid];
    const systemY = system.bounding_box.y;
    const systemHeight = system.bounding_box.height;

    if (intersectsViewport(systemY, systemHeight, viewport)) {
      // Found a visible system, but there might be an earlier one
      firstVisibleIndex = mid;
      right = mid - 1; // Search left for earlier visible systems
    } else if (systemY + systemHeight <= viewport.y) {
      // System is above viewport
      left = mid + 1;
    } else {
      // System is below viewport
      right = mid - 1;
    }
  }

  if (firstVisibleIndex === -1) {
    // No visible systems found
    return [];
  }

  // Collect all consecutive visible systems starting from firstVisibleIndex
  const visibleSystems: System[] = [];
  for (let i = firstVisibleIndex; i < systems.length; i++) {
    const system = systems[i];
    const systemY = system.bounding_box.y;
    const systemHeight = system.bounding_box.height;

    if (!intersectsViewport(systemY, systemHeight, viewport)) {
      // Reached first system below viewport
      break;
    }

    visibleSystems.push(system);
  }

  return visibleSystems;
}

// ============================================================================
// SVG Helper Functions (Task T010)
// ============================================================================

/**
 * SVG namespace constant for createElementNS().
 * 
 * @constant
 */
export const svgNS = 'http://www.w3.org/2000/svg';

/**
 * Creates an SVG element with proper namespace.
 * 
 * @param tagName - SVG tag name (e.g., 'line', 'text', 'g')
 * @returns SVG element
 * 
 * @example
 * ```typescript
 * const line = createSVGElement('line');
 * line.setAttribute('x1', '0');
 * line.setAttribute('y1', '10');
 * line.setAttribute('x2', '100');
 * line.setAttribute('y2', '10');
 * line.setAttribute('stroke', '#000000');
 * ```
 */
export function createSVGElement<K extends keyof SVGElementTagNameMap>(
  tagName: K
): SVGElementTagNameMap[K] {
  return document.createElementNS(svgNS, tagName);
}

/**
 * Creates an SVG <g> group element.
 * Convenience wrapper for createSVGElement('g').
 * 
 * @returns SVG group element
 * 
 * @example
 * ```typescript
 * const systemGroup = createSVGGroup();
 * systemGroup.setAttribute('transform', `translate(0, ${systemY})`);
 * systemGroup.appendChild(staffElement);
 * systemGroup.appendChild(glyphElement);
 * ```
 */
export function createSVGGroup(): SVGGElement {
  return createSVGElement('g');
}
