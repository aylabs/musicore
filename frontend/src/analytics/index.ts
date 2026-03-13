/**
 * Analytics module — Umami Cloud integration.
 * Feature 001-pwa-hosting-service — US2 (T016)
 *
 * Privacy guarantees (FR-007):
 *  - All functions are no-ops when DNT is set.
 *  - All functions are no-ops when the Umami script has not loaded.
 *  - No function ever throws — analytics failures must never break app behavior.
 *  - No PII is collected. Timestamps are day-precision only.
 *
 * The Umami script is injected via a <script> tag in index.html and exposes
 * window.umami.track() globally. This module does NOT import Umami as an npm
 * package so the analytics layer remains removable without touching a build.
 */

// Umami's global API surface — declared here to avoid TypeScript errors.
// The actual value is provided at runtime by the injected script.js.
declare const umami: { track: (event: string, data?: Record<string, string>) => void } | undefined;

/**
 * Returns true if the user has enabled the Do Not Track browser setting.
 * Checks both navigator.doNotTrack (modern) and window.doNotTrack (legacy IE).
 */
export function isDoNotTrack(): boolean {
  const dnt =
    (typeof navigator !== 'undefined' && navigator.doNotTrack) ||
    (typeof window !== 'undefined' && (window as unknown as { doNotTrack?: string }).doNotTrack);
  return dnt === '1';
}

/**
 * Track a PWA install event (FR-005).
 * Call this after the user accepts the browser install prompt
 * (userChoice.outcome === 'accepted').
 */
export function trackInstall(): void {
  if (isDoNotTrack()) return;
  if (typeof umami === 'undefined') return;
  umami.track('pwa_install', {
    date: new Date().toISOString().split('T')[0],
  });
}

/**
 * Track a standalone-mode session (FR-005 — retention metric).
 * Call this once at app initialisation. The function is a no-op unless the
 * app is running in PWA standalone display mode (i.e., launched from the home
 * screen icon, not from a browser tab).
 */
export function trackStandaloneSession(): void {
  if (isDoNotTrack()) return;
  if (typeof window === 'undefined') return;
  if (!window.matchMedia('(display-mode: standalone)').matches) return;
  if (typeof umami === 'undefined') return;
  umami.track('pwa_standalone_session', {
    source: 'home_screen',
    date: new Date().toISOString().split('T')[0],
  });
}
