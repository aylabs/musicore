/**
 * Feature 024: Playback & Display Performance Optimization
 * Unit tests for deviceDetection
 *
 * @see tasks.md T012
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectDeviceProfile } from './deviceDetection';

describe('detectDeviceProfile', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;
  const originalInnerWidth = globalThis.innerWidth;

  beforeEach(() => {
    matchMediaMock = vi.fn();
    globalThis.matchMedia = matchMediaMock as unknown as typeof globalThis.matchMedia;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'innerWidth', {
      value: originalInnerWidth,
      writable: true,
      configurable: true,
    });
  });

  function setupMatchMedia(pointer: string, hover: string) {
    matchMediaMock.mockImplementation((query: string) => {
      if (query === '(pointer: coarse)') {
        return { matches: pointer === 'coarse' };
      }
      if (query === '(hover: none)') {
        return { matches: hover === 'none' };
      }
      return { matches: false };
    });
  }

  function setInnerWidth(width: number) {
    Object.defineProperty(globalThis, 'innerWidth', {
      value: width,
      writable: true,
      configurable: true,
    });
  }

  it('identifies desktop (pointer:fine, hover:hover, >768px)', () => {
    setupMatchMedia('fine', 'hover');
    setInnerWidth(1920);

    const profile = detectDeviceProfile();
    expect(profile.isMobile).toBe(false);
    expect(profile.targetFrameIntervalMs).toBe(16);
    expect(profile.frameBudgetMs).toBe(12);
  });

  it('identifies tablet (pointer:coarse, hover:none, >768px)', () => {
    setupMatchMedia('coarse', 'none');
    setInnerWidth(1024);

    const profile = detectDeviceProfile();
    expect(profile.isMobile).toBe(true);
    expect(profile.targetFrameIntervalMs).toBe(33);
    expect(profile.frameBudgetMs).toBe(8);
  });

  it('identifies phone (pointer:coarse, hover:none, ≤768px)', () => {
    setupMatchMedia('coarse', 'none');
    setInnerWidth(375);

    const profile = detectDeviceProfile();
    expect(profile.isMobile).toBe(true);
    expect(profile.targetFrameIntervalMs).toBe(33);
    expect(profile.frameBudgetMs).toBe(8);
  });

  it('uses viewport width fallback: small viewport overrides fine pointer', () => {
    setupMatchMedia('fine', 'hover');
    setInnerWidth(768); // Exactly at threshold

    const profile = detectDeviceProfile();
    expect(profile.isMobile).toBe(true);
    expect(profile.targetFrameIntervalMs).toBe(33);
    expect(profile.frameBudgetMs).toBe(8);
  });

  it('does not trigger mobile for fine pointer with large viewport', () => {
    setupMatchMedia('fine', 'hover');
    setInnerWidth(769);

    const profile = detectDeviceProfile();
    expect(profile.isMobile).toBe(false);
  });

  it('treats coarse pointer without hover:none as desktop if viewport is large', () => {
    // e.g., a Surface with touch screen + mouse
    setupMatchMedia('coarse', 'hover');
    setInnerWidth(1920);

    const profile = detectDeviceProfile();
    // coarse + hover:hover doesn't pass the (coarse && noHover) check
    // viewport > 768 so fallback doesn't kick in either
    expect(profile.isMobile).toBe(false);
  });
});
