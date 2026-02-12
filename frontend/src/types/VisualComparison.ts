/**
 * Visual Comparison Testing
 * Feature 017 - Automated renderer validation
 * 
 * Compares new renderer against existing renderer via pixel-diff analysis.
 * Used in integration tests to ensure visual accuracy <5% threshold.
 */

import type { CompiledScore } from './score';

/**
 * Result of visual comparison between two renderers.
 * 
 * @example
 * ```typescript
 * const result: ComparisonResult = {
 *   pixelDiffPercentage: 2.3,
 *   oldSnapshot: oldImageData,
 *   newSnapshot: newImageData,
 *   diffImage: diffImageData,
 *   passed: true  // <5% threshold
 * };
 * 
 * if (!result.passed) {
 *   await saveDiffImage(result.diffImage, 'test-failure.png');
 * }
 * ```
 */
export interface ComparisonResult {
  /**
   * Percentage of differing pixels (0-100).
   * 
   * - 0%: Exact match (rare due to anti-aliasing)
   * - <5%: Pass threshold (accounts for rendering differences)
   * - >5%: Fail threshold (indicates layout/position errors)
   * 
   * @example
   * ```typescript
   * pixelDiffPercentage: 2.3  // Pass (2.3% < 5%)
   * pixelDiffPercentage: 7.5  // Fail (7.5% > 5%)
   * ```
   */
  pixelDiffPercentage: number;
  
  /**
   * Snapshot from old (existing) renderer.
   * ImageData with RGBA pixel values.
   */
  oldSnapshot: ImageData;
  
  /**
   * Snapshot from new renderer being tested.
   * ImageData with RGBA pixel values.
   */
  newSnapshot: ImageData;
  
  /**
   * Diff image with red-highlighted differences.
   * 
   * - Matching pixels: Semi-transparent gray
   * - Differing pixels: Opaque red
   * 
   * Saved to test-results/ on failure for debugging.
   */
  diffImage: ImageData;
  
  /**
   * Whether comparison passed (<5% diff threshold).
   * 
   * @example
   * ```typescript
   * expect(result.passed).toBe(true);
   * ```
   */
  passed: boolean;
  
  /**
   * Human-readable description of comparison.
   * Includes score name, SVG dimensions, diff percentage.
   * 
   * @example
   * ```typescript
   * description: "Piano 10 measures (800x600): 2.3% pixel diff (PASS)"
   * ```
   */
  description: string;
}

/**
 * Automated visual comparison tool for renderer testing.
 * 
 * Renders same score on two SVG elements (old vs new renderer),
 * captures pixel data via intermediate canvas, computes diff percentage, generates report.
 * 
 * @example
 * ```typescript
 * const comparison = new VisualComparison(
 *   oldSvg,
 *   newSvg,
 *   5  // 5% threshold
 * );
 * 
 * const result = comparison.compareRenderers(score);
 * 
 * expect(result.passed).toBe(true);
 * expect(result.pixelDiffPercentage).toBeLessThan(5);
 * ```
 */
export interface VisualComparison {
  /**
   * SVG with existing renderer (baseline).
   * Must have same dimensions as newRenderer.
   */
  readonly oldRenderer: SVGSVGElement;
  
  /**
   * SVG with new renderer being tested.
   * Must have same dimensions as oldRenderer.
   */
  readonly newRenderer: SVGSVGElement;
  
  /**
   * Acceptable pixel diff percentage (default: 5%).
   * 
   * - Accounts for anti-aliasing differences
   * - Accounts for font hinting variations
   * - Accounts for sub-pixel rendering
   * 
   * @validation Must be in range [0, 100]
   */
  readonly diffThreshold: number;
  
  /**
   * Compares renderers by rendering same score and analyzing pixel diff.
   * 
   * Algorithm:
   * 1. Compute layout from score
   * 2. Render on both SVG elements
   * 3. Convert SVG to ImageData via intermediate canvas
   * 4. Compute pixel diff percentage
   * 5. Generate diff image with red highlights
   * 6. Return ComparisonResult with pass/fail
   * 
   * @param score - CompiledScore to render
   * @returns ComparisonResult with diff analysis
   * 
   * @throws Error if SVG elements have different dimensions
   * @throws Error if score is invalid
   * 
   * @example
   * ```typescript
   * const score = await loadFixture('piano_10_measures.json');
   * const result = comparison.compareRenderers(score);
   * 
   * if (!result.passed) {
   *   console.error(`Visual diff failed: ${result.pixelDiffPercentage}%`);
   *   await saveDiffImage(result.diffImage, 'failure.png');
   * }
   * ```
   */
  compareRenderers(score: CompiledScore): ComparisonResult;
  
  /**
   * Captures SVG pixel data for comparison by converting to ImageData.
   * 
   * Uses intermediate canvas to convert SVG to raster image.
   * 
   * @param svg - SVG element to capture
   * @returns ImageData with RGBA pixel values
   * 
   * @example
   * ```typescript
   * const snapshot = comparison.captureSnapshot(svg);
   * console.log(`Captured ${snapshot.width}x${snapshot.height} pixels`);
   * ```
   */
  captureSnapshot(svg: SVGSVGElement): ImageData;
  
  /**
   * Computes percentage of differing pixels between two images.
   * 
   * Algorithm:
   * - Iterate all pixels (RGBA quads)
   * - Compare RGB values (ignore alpha for notation)
   * - Count mismatches
   * - Return percentage: (diffPixels / totalPixels) * 100
   * 
   * @param img1 - First ImageData
   * @param img2 - Second ImageData (must match img1 dimensions)
   * @returns Percentage (0-100)
   * 
   * @throws Error if images have different dimensions
   * 
   * @example
   * ```typescript
   * const diff = comparison.computePixelDiff(oldSnapshot, newSnapshot);
   * console.log(`Pixel diff: ${diff.toFixed(2)}%`);
   * ```
   */
  computePixelDiff(img1: ImageData, img2: ImageData): number;
  
  /**
   * Generates red-highlighted diff image for debugging.
   * 
   * - Matching pixels: Semi-transparent original color
   * - Differing pixels: Opaque red (#FF0000)
   * 
   * @param img1 - First ImageData
   * @param img2 - Second ImageData
   * @returns ImageData with red-highlighted differences
   * 
   * @example
   * ```typescript
   * const diffImage = comparison.generateDiffImage(oldSnapshot, newSnapshot);
   * 
   * // Save to file for inspection
   * const canvas = document.createElement('canvas');
   * canvas.width = diffImage.width;
   * canvas.height = diffImage.height;
   * canvas.getContext('2d').putImageData(diffImage, 0, 0);
   * 
   * const blob = await canvas.convertToBlob();
   * await fs.writeFile('diff.png', blob);
   * ```
   */
  generateDiffImage(img1: ImageData, img2: ImageData): ImageData;
}

/**
 * Constructor options for VisualComparison.
 * 
 * @example
 * ```typescript
 * const options: VisualComparisonOptions = {
 *   oldRenderer: document.getElementById('old-svg') as SVGSVGElement,
 *   newRenderer: document.getElementById('new-svg') as SVGSVGElement,
 *   diffThreshold: 5  // 5% acceptable difference
 * };
 * 
 * const comparison = new VisualComparison(options);
 * ```
 */
export interface VisualComparisonOptions {
  /**
   * SVG with existing renderer (baseline).
   */
  oldRenderer: SVGSVGElement;
  
  /**
   * SVG with new renderer being tested.
   */
  newRenderer: SVGSVGElement;
  
  /**
   * Acceptable diff percentage (default: 5%).
   * 
   * @validation Must be in range [0, 100]
   */
  diffThreshold?: number;
}

/**
 * Saves ImageData to PNG file (test utility).
 * 
 * @param imageData - ImageData to save
 * @param filePath - Output path (e.g., 'test-results/diff.png')
 * 
 * @example
 * ```typescript
 * if (!result.passed) {
 *   await saveDiffImage(result.diffImage, 'test-results/piano-10-diff.png');
 * }
 * ```
 */
export async function saveDiffImage(
  imageData: ImageData,
  filePath: string
): Promise<void>;
