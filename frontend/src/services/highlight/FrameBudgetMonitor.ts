/**
 * Feature 024: Playback & Display Performance Optimization
 * FrameBudgetMonitor - Tracks per-frame rendering time and triggers degradation
 *
 * Audio-first policy: when degraded, visual updates are skipped before audio quality.
 *
 * @see contracts/highlight-performance.ts IFrameBudgetMonitor
 * @see data-model.md FrameBudgetMonitor entity and degradation state machine
 */

export class FrameBudgetMonitor {
  readonly budgetMs: number;
  private consecutiveOverruns = 0;
  private consecutiveWithinBudget = 0;
  private _isDegraded = false;
  private frameCount = 0;

  /** Number of consecutive over-budget frames before degradation kicks in */
  private readonly degradationThreshold: number;

  constructor(budgetMs: number, degradationThreshold = 5) {
    this.budgetMs = budgetMs;
    this.degradationThreshold = degradationThreshold;
  }

  get isDegraded(): boolean {
    return this._isDegraded;
  }

  /**
   * Mark the start of a frame's work.
   * @returns Timestamp from performance.now()
   */
  startFrame(): number {
    return performance.now();
  }

  /**
   * Mark the end of a frame's work.
   * Updates internal counters and degradation state.
   * @param startTime - Timestamp returned by startFrame()
   */
  endFrame(startTime: number): void {
    const elapsed = performance.now() - startTime;

    if (elapsed > this.budgetMs) {
      this.consecutiveOverruns++;
      this.consecutiveWithinBudget = 0;

      if (
        this.consecutiveOverruns >= this.degradationThreshold &&
        !this._isDegraded
      ) {
        this._isDegraded = true;
      }
    } else {
      this.consecutiveWithinBudget++;
      this.consecutiveOverruns = 0;

      if (
        this.consecutiveWithinBudget >= this.degradationThreshold &&
        this._isDegraded
      ) {
        this._isDegraded = false;
      }
    }
  }

  /**
   * Check if this frame should be skipped (degradation active).
   * When degraded, returns true on alternating frames (halves update rate).
   */
  shouldSkipFrame(): boolean {
    if (!this._isDegraded) return false;
    this.frameCount++;
    return this.frameCount % 2 === 0;
  }

  /** Reset all counters (e.g., on playback stop) */
  reset(): void {
    this.consecutiveOverruns = 0;
    this.consecutiveWithinBudget = 0;
    this._isDegraded = false;
    this.frameCount = 0;
  }
}
