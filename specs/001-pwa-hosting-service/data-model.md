# Data Model: PWA Hosting Service

**Feature**: 001-pwa-hosting-service  
**Date**: 2026-03-12  
**Source**: research.md decisions

---

## Entities

### 1. HostingDecision

The outcome of the platform evaluation (FR-001, FR-002, FR-002b). A single record created at the start of implementation; referenced in `contracts/hosting-comparison.md`.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `platform` | enum | Chosen hosting platform | `cloudflare_pages \| netlify \| vercel \| github_pages` |
| `rationale` | string | Why this platform was chosen | Required |
| `evaluated_alternatives` | string[] | Platforms explicitly evaluated and rejected | Min 3 |
| `migration_date` | date | When migration to chosen platform was completed | ISO 8601 |
| `github_pages_retained` | boolean | Whether GitHub Pages is still served as fallback | Default: false |
| `custom_headers_verified` | boolean | COEP, COOP, Cache-Control headers confirmed live | Must be true before close |

**State transitions**: `draft → evaluated → implemented → verified`

---

### 2. UsageEvent

An anonymous analytics record collected via Umami Cloud. **No PII stored.** Events are recorded to the SaaS provider — this entity documents the schema used in `umami.track()` calls, not local storage.

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `event_type` | enum | Type of event | `page_view \| pwa_install \| pwa_standalone_session` |
| `timestamp` | string | ISO 8601 date (day precision, no time) | Format: `YYYY-MM-DD`; no sub-day precision to avoid fingerprinting |
| `geographic_region` | string | Country code only | ISO 3166-1 alpha-2; anonymised by Umami |
| `display_mode` | enum | How the app was opened | `standalone \| browser` |
| `source` | string | Launch context (for standalone only) | `home_screen`; omitted for browser sessions |

**Privacy constraints**:
- No IP address stored (Umami anonymises at ingestion)
- No user identifier, session ID, or persistent cookie
- `timestamp` truncated to day precision to prevent timing-based fingerprinting
- Collection is skipped entirely if `navigator.doNotTrack === '1'`

**Event lifecycle**: fired client-side → sent to Umami Cloud API → visible in dashboard. No local persistence.

---

### 3. AssetBudget

The CI-enforced size thresholds for the production build output. These are configuration values checked by the CI pipeline step — not runtime data, but documented here as the spec's source of truth.

| Asset category | Budget (transfer, compressed) | Enforcement | Notes |
|----------------|------------------------------|-------------|-------|
| Total initial payload | **2 MB** | CI fails if exceeded | Covers all assets fetched on first load: HTML, initial JS chunks, CSS, fonts loaded in critical path |
| Initial JS chunk (`vendor-core` + `main`) | 500 KB | CI warning at > 500 KB | Tone.js excluded (lazy-loaded) |
| Font payload (all weights, all families) | 300 KB | CI warning | After subsetting; ~48% reduction from baseline |
| WASM binary | 200 KB (compressed) | Info only | Expected ~180 KB with Cloudflare Brotli |

**Validation mechanism**: A CI step runs after `npm run build`, calculates compressed sizes of assets in `frontend/dist/`, and fails the pipeline if the total compressed initial payload exceeds 2 MB.

---

### 4. DeploymentPipeline

The GitHub Actions workflow (`deploy-pwa.yml`) extended for the new platform. This entity describes the pipeline's stages as observable state — not a data model, but documents the expected sequence and checkpoints.

| Stage | Inputs | Outputs | Gate |
|-------|--------|---------|------|
| Font subsetting | `public/fonts/*.woff2` | Subsetted `.woff2` files in-place | All fonts must subset without error |
| WASM build | `backend/src/` | `backend/pkg/*.wasm`, `*.js` | Build must pass `cargo check` |
| Frontend build | `frontend/src/`, WASM artifacts | `frontend/dist/` | Vite build must succeed |
| Asset budget check | `frontend/dist/` | Pass/Fail | Total compressed size < 2 MB |
| Deploy | `frontend/dist/` | Live URL on Cloudflare Pages | Deployment URL reachable |
| Smoke test | Live URL | Header assertions | COEP, COOP, Cache-Control headers present |

---

## Relationships

```
HostingDecision
  └── governs → DeploymentPipeline (which platform the pipeline deploys to)
  └── validated by → AssetBudget (budgets enforced in that pipeline)

UsageEvent
  └── collected during → live deployment (not a data relationship; documented for schema clarity)
  └── visible in → Umami Cloud dashboard

DeploymentPipeline
  └── enforces → AssetBudget (CI gate)
  └── produces → live deployment (on Cloudflare Pages)
```

---

## Validation Rules

- `HostingDecision.custom_headers_verified` MUST be `true` before the feature is closed (SC-003).
- `UsageEvent` MUST NOT be created if `isDoNotTrack()` returns `true`.
- `UsageEvent.timestamp` MUST be day-precision only (no hours/minutes/seconds).
- `AssetBudget` total compressed initial payload MUST NOT exceed 2 MB (FR-013, SC-005); CI fails otherwise.
- `DeploymentPipeline` MUST complete all stages in order; failure in Asset budget check stage MUST block deployment stage.
