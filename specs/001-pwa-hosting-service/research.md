# Research: PWA Hosting Service

**Feature**: 001-pwa-hosting-service  
**Date**: 2026-03-12  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## 1. Hosting Platform Selection

### Decision
**Cloudflare Pages** (free tier)

### Rationale
Cloudflare Pages is the only free-tier platform that satisfies all hard requirements simultaneously: unlimited bandwidth, custom HTTP headers (COEP/COOP) via a `_headers` file, automatic Brotli compression at CDN edge, native GitHub integration, and free custom domain. It directly eliminates all blocking GitHub Pages limitations without introducing cost or operational overhead.

### Platform Comparison

| Criterion | GitHub Pages | Cloudflare Pages | Netlify (Free) | Vercel (Hobby) |
|-----------|-------------|-----------------|----------------|----------------|
| Free bandwidth | Unlimited (fair use) | **Unlimited** | ~30 GB/month | 100 GB/month |
| COEP/COOP custom headers | ❌ Impossible | ✅ `_headers` file | ✅ `_headers` file | ✅ `vercel.json` |
| Brotli compression | ❌ Gzip only | ✅ Automatic at edge | ✅ Automatic | ✅ Automatic |
| GitHub Actions CI/CD | ✅ Native | ✅ Native Git push | ✅ Native Git push | ✅ Native Git push |
| Custom CNAME (free) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| WASM PWA support | ⚠️ No COEP header | ✅ Full | ✅ Full | ✅ Full |
| Free builds/month | Unlimited | 500 | 300 | Unlimited |

### Alternatives Considered

- **Netlify**: Also satisfies requirements but 30 GB/month bandwidth cap introduces risk as user base grows. Cloudflare's unlimited bandwidth is strictly better.
- **Vercel**: 100 GB/month cap; Hobby tier prohibits commercial use (Graditone could be considered commercial). Ruled out.
- **GitHub Pages (stay)**: Cannot set COEP/COOP headers — FR-003 cannot be satisfied. Ruled out regardless of conditional clarification.

### Migration Safety

Existing installed PWAs will not break because:
1. The custom domain (`graditone.com`) is preserved — only the origin server changes.
2. The service worker `scope` and `start_url` are domain-relative, so they survive hosting changes.
3. Cloudflare Pages propagates CNAME updates globally within minutes; no downtime window required.

### Header Configuration on Cloudflare Pages

File: `frontend/public/_headers` (included in Vite build output as-is):

```
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/wasm/*
  Cache-Control: public, max-age=31536000, immutable
  Cross-Origin-Resource-Policy: cross-origin

/
  Cache-Control: public, max-age=3600

/sw.js
  Cache-Control: no-cache
```

---

## 2. Analytics Solution

### Decision
**Umami Cloud** (free Hobby tier — 100K events/month)

### Rationale
Umami Cloud is the only evaluated provider with a genuinely permanent free tier (100K events/month) that covers Graditone's current scale. It is open-source, GDPR-compliant without cookies, supports custom events for install and standalone-session tracking, and ships a < 2 KB analytics script. As the user base grows, the Pro tier ($20/month at 1M events) is a natural upgrade path.

### Analytics Comparison

| Feature | Umami Cloud | Plausible | Fathom | Pirsch |
|---------|------------|-----------|--------|--------|
| Free tier | **100K events/mo** | None (30-day trial) | None (7-day trial) | None (30-day trial) |
| Paid entry price | $20/mo (1M events) | €9/mo | $15/mo | $6/mo (10K views) |
| Custom events | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| No cookies / no consent banner | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| DNT signal respected | ✅ Yes | Not explicit | ✅ Yes | Not explicit |
| Script size | < 2 KB | ~1 KB | ~2 KB | Unknown |
| Open source | ✅ Yes | ✅ Yes | ❌ No | ❌ No |

### Event Tracking Design

Three event types needed (see `contracts/analytics-events.md` for full schema):

| Event | Trigger | Mechanism |
|-------|---------|-----------|
| `pwa_standalone_session` | App loads in `standalone` display mode | `window.matchMedia('(display-mode: standalone)').matches` |
| `pwa_install` | User accepts browser install prompt | `beforeinstallprompt` → `userChoice.outcome === 'accepted'` |
| `page_view` | Every route change | Automatic via Umami script |

### Integration Snippet (reference implementation)

```html
<!-- In frontend/index.html <head> -->
<script defer src="https://cloud.umami.is/script.js"
        data-website-id="REPLACE_WITH_SITE_ID"
        data-do-not-track="true"></script>
```

```typescript
// In frontend/src/analytics/index.ts
declare const umami: { track: (event: string, data?: Record<string, string>) => void };

export function trackStandaloneSession(): void {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    umami.track('pwa_standalone_session', { source: 'home_screen' });
  }
}

export function trackInstall(): void {
  umami.track('pwa_install', { date: new Date().toISOString().split('T')[0] });
}

export function isDoNotTrack(): boolean {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1';
}
```

The `data-do-not-track="true"` attribute on the script tag makes Umami respect the browser DNT signal automatically.

---

## 3. Font Subsetting

### Decision
`pyftsubset` (Python `fonttools` library) invoked as a pre-build npm script; Latin unicode range `U+0000-00FF,U+0100-017F` (Basic Latin + Latin-1 Supplement + Latin Extended-A).

### Rationale
`pyftsubset` is the industry standard for font subsetting, widely used in Google Fonts' own pipeline. It produces optimal woff2 output with Brotli recompression. No Vite plugin exists that matches its quality and control. Running it as a pre-build script integrates cleanly into the existing `npm run build` pipeline without CI complexity.

### Expected Size Reduction

| Font family | Current weight (~KB per file) | After subsetting (~KB per file) | Reduction |
|-------------|-------------------------------|----------------------------------|-----------|
| Inter (4 weights) | ~60–70 KB each → ~260 KB total | ~20–25 KB each → ~88 KB total | ~66% |
| IBM Plex Sans (4 weights) | ~70–80 KB each → ~300 KB total | ~22–28 KB each → ~100 KB total | ~66% |
| Space Grotesk (4 weights) | ~50–60 KB each → ~220 KB total | ~16–20 KB each → ~72 KB total | ~66% |
| **Total fonts** | **~500 KB** | **~260 KB** | **~48%** |

*Note: The total ~500 KB reported in `du` may already include some compression; subsetting alone targets character set reduction, independent of compression. Combined with Cloudflare Brotli, further transfer-size reduction is expected.*

### Automation

Pre-build script: `frontend/scripts/subset-fonts.mjs`  
Unicode target: `U+0000-024F` (Latin, Latin Extended-A/B — covers all music terminology and UI copy)  
GitHub Actions step: `pip install fonttools` + `npm run subset-fonts`

### Alternatives Considered

- `glyphhanger`: Crawls HTML to discover used glyphs — overly complex for this use case and requires a running server.
- Vite font plugins: No production-quality Vite plugin for woff2 subsetting exists; the npm script is simpler and more reliable.

---

## 4. JavaScript Code Splitting

### Decision
Vite 7 `build.rollupOptions.output.manualChunks` with manual chunk map; Tone.js deferred to a `tone-audio` chunk loaded only when the playback view is navigated to via `React.lazy()`.

### Rationale
Tone.js is the largest non-WASM dependency (~300 KB uncompressed). It is only required in playback/metronome views — users browsing or reading scores never load it. Deferring it via `React.lazy()` + a named Rollup chunk reduces the initial bundle by ~50%, directly improving TTI.

### Recommended `vite.config.ts` additions

```typescript
build: {
  target: 'esnext',
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-core': ['react', 'react-dom', 'idb', 'pitchy', 'fflate'],
        'workbox': ['workbox-window', 'workbox-routing', 'workbox-strategies',
                    'workbox-precaching', 'workbox-expiration'],
        'tone-audio': ['tone'],
      },
    },
  },
  chunkSizeWarningLimit: 500,
}
```

Playback component lazy import:
```typescript
const PlaybackView = React.lazy(() => import('./views/PlaybackView'));
```

### Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Initial JS chunk | ~580 KB | ~280 KB (−52%) |
| Tone.js chunk (lazy) | included in initial | ~300 KB (deferred) |
| Initial TTI (Slow 4G sim.) | ~8–10 s | ~4–5 s |

### Alternatives Considered

- `build.modulePreload`: Controls prefetching but does not defer loading — not a substitute for lazy chunks.
- Dynamic `import('tone')` at call site only: Achieves the same split but without explicit chunk naming; named chunks are preferred for cache predictability.

---

## 5. WASM Compression

### Decision
No code change required. Cloudflare Pages applies Brotli compression automatically at the CDN edge to all served assets, including `.wasm` files.

### Expected Impact

| Asset | Uncompressed | Brotli compressed (estimated) | Reduction |
|-------|-------------|-------------------------------|-----------|
| `musicore_backend_bg.wasm` (440 KB) | 440 KB transfer | ~170–180 KB transfer | ~60% |

WASM binary compresses extremely well with Brotli (typical 55–65% ratio for Rust WASM). No wasm-opt or additional tooling needed beyond ensuring Cloudflare serves with correct `Content-Type: application/wasm` header (Cloudflare does this automatically).

---

## Summary of All Decisions

| Topic | Decision | Key Rationale |
|-------|----------|---------------|
| Hosting platform | **Cloudflare Pages** (free) | Unlimited bandwidth, COEP/COOP headers, Brotli, GitHub-native |
| Analytics | **Umami Cloud** (free Hobby tier) | Only truly free tier, custom events, no cookies, DNT, open source |
| Font subsetting | **pyftsubset** pre-build script | Industry standard, ~48% font payload reduction, no Vite plugin needed |
| JS splitting | **Vite manualChunks** + React.lazy | Defer Tone.js 300 KB; ~52% initial bundle reduction |
| WASM compression | **Cloudflare Brotli** (automatic) | ~60% WASM transfer reduction, zero implementation cost |
