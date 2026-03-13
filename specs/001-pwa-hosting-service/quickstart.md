# Quickstart: PWA Hosting Service

**Feature**: 001-pwa-hosting-service  
**Date**: 2026-03-12

This guide covers what a developer needs to work on, test, and verify this feature locally and in CI.

---

## Prerequisites

- Node.js 22 (matches CI)
- Python 3.10+ with `pip` (for font subsetting)
- Rust stable 1.93 + `wasm-pack` (existing requirement)
- Cloudflare account (free) with Pages project created
- Umami Cloud account (free Hobby tier) with a site created

---

## 1. Font Subsetting (local)

Install font subsetting tool:
```bash
pip install fonttools
```

Run subsetting (as part of build, or standalone):
```bash
cd frontend
npm run subset-fonts   # Reads public/fonts/*.woff2, writes *.woff2 in-place
```

Verify output sizes are reduced vs. originals:
```bash
ls -lh frontend/public/fonts/*.woff2
# Each file should be 40-60% smaller than the pre-subsetting baseline
```

---

## 2. Build with Code Splitting (local)

Standard build now includes code splitting configuration:
```bash
cd frontend
npm run build
```

Inspect chunk output:
```bash
ls -lh frontend/dist/assets/
# Expect separate chunks:
#   index-*.js        (main app entry)
#   vendor-core-*.js  (React, idb, fflate, pitchy)
#   workbox-*.js      (Workbox service worker libraries)
#   tone-audio-*.js   (Tone.js — only loaded on playback navigation)
```

---

## 3. Verify Asset Budget Gate (local)

Run the budget check to ensure the build is within the 2 MB compressed limit:
```bash
cd frontend
npm run check-budget   # Fails if total compressed initial payload > 2 MB
```

The budget check measures compressed sizes of assets that load on first visit (excludes lazy chunks).

---

## 4. Analytics Integration (local dev)

Set your Umami website ID in a local `.env.local`:
```bash
# frontend/.env.local (not committed)
VITE_UMAMI_WEBSITE_ID=your-site-id-from-umami-cloud
```

In development, analytics events are mocked (Umami script is not loaded in `dev` mode). To test the real integration, build and preview:
```bash
cd frontend
npm run build && npm run preview
# Open http://localhost:4173 — Umami script will load if VITE_UMAMI_WEBSITE_ID is set
```

Open the browser DevTools Network tab and verify:
- `script.js` from `cloud.umami.is` is fetched
- On page load: `pwa_standalone_session` event is NOT fired (browser mode, not standalone)
- On simulated install: call `window.__trackInstall()` in console to trigger event manually

---

## 5. Cloudflare Pages Deployment (local verify)

Verify the `_headers` file is included in the dist output:
```bash
npm run build
cat frontend/dist/_headers   # Must exist and contain COEP/COOP rules
```

Confirm headers are served correctly after deployment:
```bash
curl -I https://graditone.com | grep -E 'Cross-Origin|Cache-Control'
# Expected output:
# cross-origin-embedder-policy: require-corp
# cross-origin-opener-policy: same-origin
# cache-control: public, max-age=3600   (for index.html)
```

---

## 6. CI Pipeline Overview

```
push to main
  │
  ├─ subset-fonts       (pip install fonttools && npm run subset-fonts)
  ├─ build-wasm         (wasm-pack build --target web --release)
  ├─ copy-wasm          (cp backend/pkg/* frontend/public/wasm/)
  ├─ build-frontend     (npm run build)
  ├─ check-budget       (npm run check-budget) ← FAILS CI if > 2 MB
  └─ deploy             (cloudflare/pages-action → graditone.com)
```

The `check-budget` step runs BEFORE deployment. A budget failure blocks the release.

---

## 7. Smoke Test: Headers (post-deployment)

A smoke test in `tests/integration/test_pwa_headers.py` verifies required headers are served:

```bash
cd /path/to/repo
pytest tests/integration/test_pwa_headers.py -v
# Verifies:
#   - Cross-Origin-Embedder-Policy: require-corp
#   - Cross-Origin-Opener-Policy: same-origin
#   - Cache-Control on /sw.js: no-cache
#   - Cache-Control on /assets/*: public, max-age=31536000, immutable
```

Set the target URL in environment:
```bash
PWA_URL=https://graditone.com pytest tests/integration/test_pwa_headers.py
```

---

## 8. Rollback Plan

If the Cloudflare Pages deployment causes issues with existing installed PWAs:

1. Re-enable GitHub Pages in repo settings (already exists, just re-point DNS)
2. Remove `CNAME` transfer from Cloudflare — restore GitHub Pages CNAME
3. Existing service workers will resume updating from GitHub Pages origin
4. Root cause must be documented and a regression test written before retry (Principle VII)

---

## Key URLs and Secrets

| Item | Value / Location |
|------|-----------------|
| Cloudflare Pages project | `graditone` (dashboard.cloudflare.com) |
| Umami Cloud dashboard | `cloud.umami.is` |
| GitHub Actions secrets | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `VITE_UMAMI_WEBSITE_ID` |
| `_headers` file | `frontend/public/_headers` |
| Font subsetting script | `frontend/scripts/subset-fonts.mjs` |
| Asset budget script | `frontend/scripts/check-budget.mjs` |
| Analytics module | `frontend/src/analytics/index.ts` |
