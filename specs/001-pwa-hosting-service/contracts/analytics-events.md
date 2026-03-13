# Contract: Analytics Events

**Feature**: 001-pwa-hosting-service  
**Date**: 2026-03-12  
**Provider**: Umami Cloud (Hobby free tier)  
**Purpose**: Defines all analytics event types, their schemas, and firing conditions (FR-005, FR-006, FR-007, FR-008)

---

## Privacy Constraints (apply to ALL events)

- **No PII**: No names, email addresses, device IDs, or persistent identifiers
- **No cookies**: Umami uses IP anonymisation and no cookies by default
- **Do Not Track**: If `navigator.doNotTrack === '1'` or `window.doNotTrack === '1'`, NO events are fired
- **Timestamp precision**: Day-precision only (`YYYY-MM-DD`) — no sub-day timestamps in custom event data
- **Geographic data**: Country-level only (collected by Umami from anonymised IP; team never accesses raw IP)

---

## HTML Integration

```html
<!-- frontend/index.html — inside <head> -->
<script
  defer
  src="https://cloud.umami.is/script.js"
  data-website-id="__UMAMI_WEBSITE_ID__"
  data-do-not-track="true"
></script>
```

- `data-do-not-track="true"`: Umami respects browser DNT signal automatically when this attribute is set
- `__UMAMI_WEBSITE_ID__`: Replaced at build time via `.env` variable `VITE_UMAMI_WEBSITE_ID`

---

## Event Definitions

### EVENT: `page_view`

**Type**: Automatic (fired by Umami script on navigation)  
**Trigger**: Every route change (React Router location change)  
**Custom data**: None — Umami captures page path, referrer, and display mode automatically  
**Fired for DNT users**: No (blocked by `data-do-not-track`)

---

### EVENT: `pwa_install`

**Type**: Custom  
**Trigger**: User accepts browser install prompt (`userChoice.outcome === 'accepted'`)  
**Purpose**: Count total PWA acquisitions (FR-005)

**Schema**:
```typescript
{
  event_type: 'pwa_install',   // fixed
  date: string,                // YYYY-MM-DD — day the install was accepted
}
```

**Firing code** (`frontend/src/analytics/index.ts`):
```typescript
export function trackInstall(): void {
  if (isDoNotTrack()) return;
  if (typeof umami === 'undefined') return;
  umami.track('pwa_install', {
    date: new Date().toISOString().split('T')[0],
  });
}
```

**When to call**: Inside `beforeinstallprompt` handler, after `deferredPrompt.userChoice` resolves to `'accepted'`.

---

### EVENT: `pwa_standalone_session`

**Type**: Custom  
**Trigger**: App loaded in `standalone` display mode (i.e., from home screen icon)  
**Purpose**: Measure retention — count how many times installed users actually open and use the app (FR-005, clarification Q4)

**Schema**:
```typescript
{
  event_type: 'pwa_standalone_session',   // fixed
  source: 'home_screen',                  // fixed — future: 'shortcut', 'notification'
  date: string,                           // YYYY-MM-DD
}
```

**Firing code** (`frontend/src/analytics/index.ts`):
```typescript
export function trackStandaloneSession(): void {
  if (isDoNotTrack()) return;
  if (!window.matchMedia('(display-mode: standalone)').matches) return;
  if (typeof umami === 'undefined') return;
  umami.track('pwa_standalone_session', {
    source: 'home_screen',
    date: new Date().toISOString().split('T')[0],
  });
}
```

**When to call**: Once at app initialisation (e.g., in `main.tsx` after React hydration), not on every navigation.

---

## Analytics Module Interface

File: `frontend/src/analytics/index.ts`

```typescript
export function isDoNotTrack(): boolean;
export function trackInstall(): void;
export function trackStandaloneSession(): void;
```

**Invariants**:
- All exported functions are no-ops if `isDoNotTrack()` returns `true`
- All exported functions are no-ops if Umami script has not loaded (`typeof umami === 'undefined'`)
- No function throws — analytics failures are always silent (never break app functionality)
- No function imports Umami as an npm package (script tag injection only, to keep analytics removable)

---

## Dashboard: Expected Metrics

After 7+ days of data collection, the Umami Cloud dashboard MUST show (SC-004, FR-008):

| Metric | Umami view | How derived |
|--------|-----------|-------------|
| Daily active users (browser) | Visitors graph | Automatic from page views |
| Total installs | Events → `pwa_install` count | Custom event count |
| Standalone sessions (daily) | Events → `pwa_standalone_session` count | Custom event count |
| Pages visited | Pages table | Automatic |
| Geographic distribution | Countries map | Automatic (country-level, anonymised) |
| Install → retention ratio | Manual: standalone sessions / installs | Derived from two event counts |

---

## Test Scenarios (Principle V — Test-First)

The analytics module (`frontend/src/analytics/index.ts`) MUST have unit tests covering:

| Test | Assertion |
|------|-----------|
| `isDoNotTrack()` returns `true` when `navigator.doNotTrack === '1'` | Function returns true |
| `trackInstall()` calls `umami.track` when DNT is off | `umami.track` called with `'pwa_install'` |
| `trackInstall()` is a no-op when DNT is on | `umami.track` NOT called |
| `trackStandaloneSession()` is a no-op when display mode is `browser` | `umami.track` NOT called |
| `trackStandaloneSession()` calls `umami.track` in `standalone` mode, DNT off | `umami.track` called with `'pwa_standalone_session'` |
| All functions are no-ops when `umami` is undefined | No `ReferenceError` thrown |
