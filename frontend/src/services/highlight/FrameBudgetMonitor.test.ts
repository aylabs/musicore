/**
 * Feature 024: Playback & Display Performance Optimization
 * Unit tests for FrameBudgetMonitor
 *
 * @see tasks.md T011
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FrameBudgetMonitor } from './FrameBudgetMonitor';

describe('FrameBudgetMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts not degraded', () => {
      const monitor = new FrameBudgetMonitor(8);
      expect(monitor.isDegraded).toBe(false);
    });

    it('stores budgetMs', () => {
      const monitor = new FrameBudgetMonitor(12);
      expect(monitor.budgetMs).toBe(12);
    });

    it('shouldSkipFrame returns false when not degraded', () => {
      const monitor = new FrameBudgetMonitor(8);
      expect(monitor.shouldSkipFrame()).toBe(false);
    });
  });

  describe('degradation after consecutive overruns', () => {
    it('does not degrade after fewer than threshold overruns', () => {
      const monitor = new FrameBudgetMonitor(8, 5);
      // Simulate 4 over-budget frames (under threshold of 5)
      for (let i = 0; i < 4; i++) {
        const start = performance.now();
        vi.advanceTimersByTime(10); // 10ms > 8ms budget
        monitor.endFrame(start);
      }
      expect(monitor.isDegraded).toBe(false);
    });

    it('degrades after 5 consecutive overruns', () => {
      const monitor = new FrameBudgetMonitor(8, 5);
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        vi.advanceTimersByTime(10);
        monitor.endFrame(start);
      }
      expect(monitor.isDegraded).toBe(true);
    });

    it('resets overrun count when a frame is within budget', () => {
      const monitor = new FrameBudgetMonitor(8, 5);
      // 4 overruns
      for (let i = 0; i < 4; i++) {
        const start = performance.now();
        vi.advanceTimersByTime(10);
        monitor.endFrame(start);
      }
      // 1 within budget - resets counter
      const start = performance.now();
      vi.advanceTimersByTime(5);
      monitor.endFrame(start);

      // 4 more overruns - should NOT be degraded (counter was reset)
      for (let i = 0; i < 4; i++) {
        const start2 = performance.now();
        vi.advanceTimersByTime(10);
        monitor.endFrame(start2);
      }
      expect(monitor.isDegraded).toBe(false);
    });
  });

  describe('recovery from degradation', () => {
    it('recovers after 5 consecutive within-budget frames', () => {
      const monitor = new FrameBudgetMonitor(8, 5);

      // Trigger degradation
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        vi.advanceTimersByTime(10);
        monitor.endFrame(start);
      }
      expect(monitor.isDegraded).toBe(true);

      // Recover
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        vi.advanceTimersByTime(5);
        monitor.endFrame(start);
      }
      expect(monitor.isDegraded).toBe(false);
    });

    it('does not recover with fewer than threshold within-budget frames', () => {
      const monitor = new FrameBudgetMonitor(8, 5);

      // Trigger degradation
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        vi.advanceTimersByTime(10);
        monitor.endFrame(start);
      }
      expect(monitor.isDegraded).toBe(true);

      // 4 within budget (not enough)
      for (let i = 0; i < 4; i++) {
        const start = performance.now();
        vi.advanceTimersByTime(5);
        monitor.endFrame(start);
      }
      expect(monitor.isDegraded).toBe(true);
    });
  });

  describe('shouldSkipFrame alternation', () => {
    it('alternates true/false when degraded', () => {
      const monitor = new FrameBudgetMonitor(8, 5);

      // Trigger degradation
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        vi.advanceTimersByTime(10);
        monitor.endFrame(start);
      }
      expect(monitor.isDegraded).toBe(true);

      // Should alternate: one skip, one process
      const results = [];
      for (let i = 0; i < 6; i++) {
        results.push(monitor.shouldSkipFrame());
      }
      // Alternating pattern starting from frame count 1
      const skipped = results.filter(r => r).length;
      const processed = results.filter(r => !r).length;
      expect(skipped).toBe(3);
      expect(processed).toBe(3);
    });

    it('returns false when not degraded', () => {
      const monitor = new FrameBudgetMonitor(8);
      expect(monitor.shouldSkipFrame()).toBe(false);
      expect(monitor.shouldSkipFrame()).toBe(false);
      expect(monitor.shouldSkipFrame()).toBe(false);
    });
  });

  describe('reset()', () => {
    it('clears all counters and degradation state', () => {
      const monitor = new FrameBudgetMonitor(8, 5);

      // Trigger degradation
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        vi.advanceTimersByTime(10);
        monitor.endFrame(start);
      }
      expect(monitor.isDegraded).toBe(true);

      monitor.reset();
      expect(monitor.isDegraded).toBe(false);
      expect(monitor.shouldSkipFrame()).toBe(false);
    });
  });

  describe('startFrame()', () => {
    it('returns a performance.now() timestamp', () => {
      const monitor = new FrameBudgetMonitor(8);
      const start = monitor.startFrame();
      expect(typeof start).toBe('number');
      expect(start).toBeGreaterThanOrEqual(0);
    });
  });
});
