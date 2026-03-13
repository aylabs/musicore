# Implementation Plan: PWA Hosting Service

**Branch**: `001-pwa-hosting-service` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-pwa-hosting-service/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Evaluate GitHub Pages hosting sustainability vs. alternatives, integrate a privacy-first SaaS analytics solution (no cookies, GDPR-compliant), and reduce the PWA initial transfer size to under 2 MB via compression, font subsetting, and JS code splitting — all enforced by a CI asset budget gate.

## Technical Context

**Language/Version**: TypeScript (React 18, Vite 7), Rust 1.93 (WASM), GitHub Actions  
**Primary Dependencies**: `vite-plugin-pwa` (v1.x), Workbox 7, wasm-pack; hosting TBD (Cloudflare Pages / Netlify / GitHub Pages); analytics TBD (Umami Cloud / Plausible)  
**Storage**: None (analytics data stored in SaaS provider; no new local storage)  
**Testing**: Vitest (unit), Playwright (e2e); CI asset size budget check (rollup-plugin-visualizer or vite-bundle-analyzer)  
**Target Platform**: Static file hosting with CDN (tablets + desktop browsers); GitHub Actions CI/CD  
**Project Type**: Web (frontend monorepo, `frontend/` + `.github/workflows/`)  
**Performance Goals**: Initial transfer < 2 MB compressed; TTI < 5 s on Lighthouse Slow 4G throttle  
**Constraints**: Free-tier hosting only (unless explicitly approved); zero ops infrastructure (SaaS analytics); GDPR-compliant without consent banner; existing installed PWAs must not break during migration  
**Scale/Scope**: Small project; font payload ~500 KB, WASM binary 440 KB uncompressed, total dist 4.6 MB; testers mailing list ~8 people, user base growing

### Current State Snapshot

| Asset | Uncompressed | Notes |
|-------|-------------|-------|
| WASM binary (`musicore_backend_bg.wasm`) | 440 KB | Served uncompressed on GitHub Pages (no Brotli) |
| Fonts (`/public/fonts/`) | ~500 KB | Inter, IBM Plex Sans, Space Grotesk — 4 weights × 3 families, all subsets unfiltered |
| Total `dist/` | 4.6 MB | Includes JS bundles, CSS, audio, icons |
| JS bundle (estimated) | ~300 KB | No code splitting currently; single main chunk |

### Known GitHub Pages Constraints

- **No custom HTTP response headers**: Cannot set `Cache-Control`, `Cross-Origin-Embedder-Policy`, or `Cross-Origin-Opener-Policy` — blocks future SharedArrayBuffer use for WASM threads
- **Gzip only**: No Brotli compression at CDN layer; WASM served at full 440 KB transfer size
- **Soft bandwidth limit**: 100 GB/month; no alerting mechanism before limit is reached
- **No `_headers` file support**: Unlike Netlify/Cloudflare Pages
- **No server-side logic**: Static files only
- **Deployment frequency**: Soft limit ~10 builds/hour; adequate for current cadence

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Impact | Status |
|-----------|--------|--------|
| I. Domain-Driven Design | No domain model changes — infrastructure only | ✅ N/A |
| II. Hexagonal Architecture | No backend changes | ✅ N/A |
| III. PWA Architecture | Directly strengthens it: better hosting, headers, offline, size | ✅ ALIGNED |
| IV. Precision & Fidelity | No timing/music logic changes | ✅ N/A |
| V. Test-First Development | CI asset budget check, analytics event tests, header tests MUST be written test-first | ⚠️ REQUIRED — tests must be planned before implementation |
| VI. Layout Engine Authority | No layout changes | ✅ N/A |
| VII. Regression Prevention | Any bugs found during migration (e.g., broken service worker scope) must result in a failing test before fix | ⚠️ REQUIRED — regression test protocol must be followed |

**GATE RESULT**: No violations. Principles V and VII require explicit test-first planning in tasks (not violations, just obligations).

## Project Structure

### Documentation (this feature)

```text
specs/001-pwa-hosting-service/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── hosting-comparison.md
│   └── analytics-events.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
# Option 2: Web application (frontend + CI/CD)
.github/workflows/
└── deploy-pwa.yml          # Modified: add asset budget check step; adapt for new host

frontend/
├── vite.config.ts          # Modified: add compression plugin, bundle size limit, code splitting
├── package.json            # Modified: add subsetting script dep, analytics snippet
├── public/
│   ├── fonts/              # Modified: replace with subsetted woff2 files
│   ├── _headers            # NEW (Netlify/Cloudflare): COEP, COOP, Cache-Control rules
│   └── wasm/               # Unchanged (WASM served with correct headers via _headers)
└── src/
    ├── analytics/          # NEW: analytics integration module (standalone detection, install event)
    └── ...

tests/
└── integration/
    └── test_asset_budget.py    # NEW: CI test asserting dist/ total < 2 MB compressed
    └── test_pwa_headers.py     # NEW: smoke test asserting required headers are served
```

**Structure Decision**: Web application pattern (`frontend/` + `.github/workflows/`). No backend changes. Analytics integration is a small frontend module in `src/analytics/`. Hosting-specific configuration (`_headers`) lives in `frontend/public/` so it is included in the build output.

## Phase 0 Research Findings

*All NEEDS CLARIFICATION items resolved. See [research.md](research.md) for full details.*

| Unknown | Resolution |
|---------|-----------|
| Which hosting platform? | **Cloudflare Pages** (free, unlimited bandwidth, COEP/COOP via `_headers` file, Brotli automatic) |
| Which analytics provider? | **Umami Cloud** (free Hobby tier — 100K events/month, no cookies, custom events, DNT, open source) |
| Font subsetting tool? | **pyftsubset** (fonttools) as pre-build npm script; Latin range `U+0000-024F`; ~48% font payload reduction |
| JS code splitting approach? | **Vite `manualChunks`** + `React.lazy()` to defer Tone.js (~300 KB) to playback view; ~52% initial bundle reduction |
| WASM compression? | **Cloudflare Brotli** (automatic at CDN edge); expected ~60% WASM transfer reduction (440 KB → ~180 KB) |

## Phase 1 Design Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| Data model | [data-model.md](data-model.md) | Entities: HostingDecision, UsageEvent, AssetBudget, DeploymentPipeline |
| Hosting comparison | [contracts/hosting-comparison.md](contracts/hosting-comparison.md) | Platform evaluation matrix + Cloudflare Pages `_headers` config |
| Analytics events | [contracts/analytics-events.md](contracts/analytics-events.md) | Event schemas, `analytics/index.ts` interface, unit test scenarios |
| Quickstart | [quickstart.md](quickstart.md) | Local dev setup, CI pipeline overview, smoke test, rollback plan |

## Post-Design Constitution Check

| Principle | Post-Design Status | Notes |
|-----------|-------------------|-------|
| I. DDD | ✅ N/A | No domain model changes |
| II. Hexagonal | ✅ N/A | No backend changes |
| III. PWA Architecture | ✅ STRENGTHENED | COEP/COOP headers unblock WASM threading; offline + installability fully preserved |
| IV. Precision | ✅ N/A | No timing changes |
| V. Test-First | ✅ PLANNED | `analytics/index.ts` unit tests + CI budget check + header smoke test — all specified in contracts |
| VI. Layout Engine | ✅ N/A | No layout changes |
| VII. Regression Prevention | ✅ PLANNED | Rollback plan documented in quickstart; regression test protocol defined |

**Post-design gate: PASS.** All principles satisfied or explicitly planned for. No violations.

## Estimated Size Impact (pre-implementation)

| Metric | Baseline | Target | Expected After |
|--------|---------|--------|----------------|
| Total `dist/` | 4.6 MB uncompressed | — | ~3.5 MB uncompressed |
| Total transfer (first load, Brotli) | ~3 MB est. | **< 2 MB** | ~1.6 MB |
| WASM transfer | 440 KB | — | ~180 KB (Cloudflare Brotli, −60%) |
| Font payload | ~500 KB | < 300 KB | ~260 KB (subsetting, −48%) |
| Initial JS chunk | ~580 KB | < 500 KB | ~280 KB (Tone.js deferred, −52%) |
| TTI (Slow 4G) | ~8–10 s | **< 5 s** | ~3–4 s |

