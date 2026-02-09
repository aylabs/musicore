import { describe, it, expect } from 'vitest';
import { ScrollController } from './ScrollController';
import type { ScrollConfig } from '../../types/playback';

/**
 * Feature 009 - Playback Scroll and Highlight: T008
 * ScrollController Unit Tests
 * 
 * Tests scroll position calculation logic for auto-scroll during playback
 */
describe('ScrollController', () => {
  const defaultConfig: ScrollConfig = {
    targetPositionRatio: 0.3,
    pixelsPerTick: 0.1,
    viewportWidth: 1200,
    totalWidth: 5000,
    currentScrollX: 0,
  };

  describe('calculateScrollPosition', () => {
    it('should return scroll position clamped to 0 for note at beginning', () => {
      const result = ScrollController.calculateScrollPosition(0, defaultConfig);
      
      // Note at tick 0 = 0px, target position would be -360px, clamped to 0
      expect(result.scrollX).toBe(0);
      expect(result.shouldScroll).toBe(true);
      expect(result.nearEnd).toBe(false);
    });

    it('should position note at 30% from left edge', () => {
      const currentTick = 5000;  // Note at 500px (5000 * 0.1)
      const result = ScrollController.calculateScrollPosition(currentTick, defaultConfig);
      
      // Expected: 500 - (1200 * 0.3) = 500 - 360 = 140
      expect(result.scrollX).toBeCloseTo(140, 1);
      expect(result.shouldScroll).toBe(true);
      expect(result.nearEnd).toBe(false);
    });

    it('should clamp scroll to maximum when near end', () => {
      const currentTick = 50000;  // Note at 5000px (at/beyond end of score)
      const result = ScrollController.calculateScrollPosition(currentTick, defaultConfig);
      
      const maxScrollX = defaultConfig.totalWidth - defaultConfig.viewportWidth;
      expect(result.scrollX).toBe(maxScrollX);  // 5000 - 1200 = 3800
      expect(result.nearEnd).toBe(true);
    });

    it('should not scroll when score fits in viewport', () => {
      const shortScoreConfig: ScrollConfig = {
        ...defaultConfig,
        totalWidth: 1000,  // Shorter than viewport width (1200)
      };
      
      const result = ScrollController.calculateScrollPosition(5000, shortScoreConfig);
      
      expect(result.scrollX).toBe(0);
      expect(result.shouldScroll).toBe(false);
      expect(result.nearEnd).toBe(false);
    });

    it('should handle edge case when note is exactly at viewport width', () => {
      const currentTick = 12000; // Note at 1200px (exactly viewport width)
      const result = ScrollController.calculateScrollPosition(currentTick, defaultConfig);
      
      // Expected: 1200 - 360 = 840
      expect(result.scrollX).toBeCloseTo(840, 1);
      expect(result.shouldScroll).toBe(true);
    });

    it('should mark as near end when remaining width < 70% of viewport', () => {
      // Place note such that remaining score width < 70% of viewport
      // totalWidth = 5000, viewportWidth = 1200, 70% = 840
      // Note should be at position where (5000 - noteX) < 840
      // noteX > 4160, so tick > 41600
      const currentTick = 42000; // Note at 4200px
      const result = ScrollController.calculateScrollPosition(currentTick, defaultConfig);
      
      expect(result.nearEnd).toBe(true);
    });

    it('should support different target position ratios', () => {
      const customConfig: ScrollConfig = {
        ...defaultConfig,
        targetPositionRatio: 0.5, // 50% from left (center)
      };
      
      const currentTick = 5000; // Note at 500px
      const result = ScrollController.calculateScrollPosition(currentTick, customConfig);
      
      // Expected: 500 - (1200 * 0.5) = 500 - 600 = -100 → clamped to 0
      expect(result.scrollX).toBe(0);
    });

    it('should support different pixels per tick values', () => {
      const zoomedConfig: ScrollConfig = {
        ...defaultConfig,
        pixelsPerTick: 0.2, // Zoomed in (more pixels per tick)
      };
      
      const currentTick = 2500; // Note at 500px (2500 * 0.2)
      const result = ScrollController.calculateScrollPosition(currentTick, zoomedConfig);
      
      // Expected: 500 - 360 = 140
      expect(result.scrollX).toBeCloseTo(140, 1);
    });
  });

  describe('isManualScroll', () => {
    it('should return true if enough time elapsed since last auto-scroll', () => {
      const lastAutoScrollTime = Date.now() - 200;  // 200ms ago
      const result = ScrollController.isManualScroll(lastAutoScrollTime, 100);
      
      expect(result).toBe(true);
    });

    it('should return false if recent auto-scroll', () => {
      const lastAutoScrollTime = Date.now() - 50;  // 50ms ago
      const result = ScrollController.isManualScroll(lastAutoScrollTime, 100);
      
      expect(result).toBe(false);
    });

    it('should use default threshold of 100ms', () => {
      const lastAutoScrollTime = Date.now() - 150; // 150ms ago
      const result = ScrollController.isManualScroll(lastAutoScrollTime);
      
      expect(result).toBe(true);
    });

    it('should handle edge case at exact threshold', () => {
      const lastAutoScrollTime = Date.now() - 100; // Exactly 100ms ago
      const result = ScrollController.isManualScroll(lastAutoScrollTime, 100);
      
      // At threshold, should be considered manual (elapsed === threshold)
      expect(result).toBe(false); // Just at threshold, not > threshold
    });

    it('should support custom thresholds', () => {
      const lastAutoScrollTime = Date.now() - 150; // 150ms ago
      const result = ScrollController.isManualScroll(lastAutoScrollTime, 200);
      
      expect(result).toBe(false); // 150 < 200
    });
  });
});
