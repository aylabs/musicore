/**
 * Unit tests for the analytics module.
 * Feature 001-pwa-hosting-service — US2 (T015)
 *
 * Run:   npx vitest run src/analytics/analytics.test.ts
 *
 * All 6 test scenarios from contracts/analytics-events.md are covered:
 *  1. isDoNotTrack() returns true when navigator.doNotTrack === '1'
 *  2. trackInstall() calls umami.track when DNT is off
 *  3. trackInstall() is a no-op when DNT is on
 *  4. trackStandaloneSession() is a no-op in browser (non-standalone) mode
 *  5. trackStandaloneSession() calls umami.track in standalone mode with DNT off
 *  6. All functions are no-ops when umami is undefined (no ReferenceError)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { isDoNotTrack, trackInstall, trackStandaloneSession } from './index';

// ---------- helpers ----------

function setDnt(value: string | null) {
  Object.defineProperty(navigator, 'doNotTrack', {
    get: () => value,
    configurable: true,
  });
}

function setDisplayMode(mode: 'standalone' | 'browser') {
  const matches = mode === 'standalone';
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(display-mode: standalone)' ? matches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function installUmami(trackMock = vi.fn()) {
  (globalThis as unknown as Record<string, unknown>).umami = { track: trackMock };
  return trackMock;
}

function removeUmami() {
  delete (globalThis as unknown as Record<string, unknown>).umami;
}

afterEach(() => {
  setDnt(null);
  removeUmami();
  vi.restoreAllMocks();
});

// ---------- tests ----------

describe('isDoNotTrack()', () => {
  it('returns true when navigator.doNotTrack is "1"', () => {
    setDnt('1');
    expect(isDoNotTrack()).toBe(true);
  });

  it('returns false when navigator.doNotTrack is null (not set)', () => {
    setDnt(null);
    expect(isDoNotTrack()).toBe(false);
  });

  it('returns false when navigator.doNotTrack is "0"', () => {
    setDnt('0');
    expect(isDoNotTrack()).toBe(false);
  });
});

describe('trackInstall()', () => {
  it('calls umami.track with pwa_install when DNT is off', () => {
    setDnt(null);
    const track = installUmami();
    setDisplayMode('browser');

    trackInstall();

    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith('pwa_install', expect.objectContaining({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
  });

  it('is a no-op when DNT is on', () => {
    setDnt('1');
    const track = installUmami();

    trackInstall();

    expect(track).not.toHaveBeenCalled();
  });

  it('is a no-op when umami is undefined (no ReferenceError thrown)', () => {
    setDnt(null);
    removeUmami();

    expect(() => trackInstall()).not.toThrow();
  });
});

describe('trackStandaloneSession()', () => {
  it('is a no-op in browser (non-standalone) display mode', () => {
    setDnt(null);
    const track = installUmami();
    setDisplayMode('browser');

    trackStandaloneSession();

    expect(track).not.toHaveBeenCalled();
  });

  it('calls umami.track with pwa_standalone_session in standalone mode, DNT off', () => {
    setDnt(null);
    const track = installUmami();
    setDisplayMode('standalone');

    trackStandaloneSession();

    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith('pwa_standalone_session', expect.objectContaining({
      source: 'home_screen',
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
  });

  it('is a no-op when umami is undefined in standalone mode (no ReferenceError thrown)', () => {
    setDnt(null);
    removeUmami();
    setDisplayMode('standalone');

    expect(() => trackStandaloneSession()).not.toThrow();
  });
});
