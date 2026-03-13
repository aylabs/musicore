# Tasks: PWA Hosting Service

**Input**: Design documents from `/specs/001-pwa-hosting-service/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅  
**Feature**: 001-pwa-hosting-service | **Branch**: `001-pwa-hosting-service`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[US1/US2/US3]**: Which user story this task belongs to
- All file paths are absolute from repo root

---

## Phase 1: Setup (External Accounts & Secrets)

**Purpose**: Create external accounts and configure repository secrets that all user stories depend on. Steps T001–T002 are manual (browser/dashboard) actions; T003–T004 are repository configuration.

- [ ] T001 Create Cloudflare Pages project in Cloudflare dashboard: link to GitHub repo `graditone/graditone`, set build output directory to `frontend/dist`, configure custom domain `graditone.com`
- [ ] T002 [P] Create Umami Cloud Hobby account at `cloud.umami.is`, add site for `graditone.com`, note the website ID (format: UUID) for use in T004
- [ ] T003 [P] Add GitHub Actions repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in repo Settings → Secrets and variables → Actions
- [ ] T004 [P] Add GitHub Actions repository secret `VITE_UMAMI_WEBSITE_ID` (value from T002); create `frontend/.env.local` with `VITE_UMAMI_WEBSITE_ID=<id>` for local development (`.env.local` is git-ignored)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: One foundational blocker before any user story: the hosting comparison decision must be formally recorded (FR-002b, SC-001). Research already done in Phase 0 — this phase closes the decision gate.

**⚠️ CRITICAL**: All three user stories depend on Phase 1 completion. US1 also sets WASM compression (Brotli) automatically for US3.

- [ ] T005 Record `migration_date` in `specs/001-pwa-hosting-service/contracts/hosting-comparison.md` HostingDecision entity — update the Migration Checklist to mark completed items as steps T001 and T003 are done, confirming Cloudflare Pages project exists before US1 implementation begins

**Checkpoint**: External accounts ready, secrets configured, hosting decision recorded → US1, US2, US3 can now begin (US1 should complete first to enable Brotli for US3 verification)

---

## Phase 3: User Story 1 - Evaluate and Optimise PWA Hosting Platform (Priority: P1) 🎯 MVP

**Goal**: Migrate the CI/CD pipeline and deploy the PWA to Cloudflare Pages with correct HTTP security headers (COEP, COOP, Cache-Control), replacing GitHub Pages deployment. Cloudflare automatically applies Brotli compression to all assets including WASM.

**Independent Test**: Deploy succeeds on push to `main`; `curl -I https://graditone.com` returns `cross-origin-embedder-policy: require-corp` and `cross-origin-opener-policy: same-origin`; PWA passes browser installability audit; WASM loads without cross-origin errors.

### Tests for User Story 1 (Constitution Principle V — write test FIRST, confirm it FAILS)

- [ ] T006 [US1] Write integration smoke test `tests/integration/test_pwa_headers.py` that GETs `https://graditone.com` and asserts: `cross-origin-embedder-policy: require-corp`, `cross-origin-opener-policy: same-origin`, `cache-control: no-cache` on `/sw.js`, `cache-control` contains `immutable` on `/assets/*`; run test against current deployment and **confirm it FAILS** (GitHub Pages does not serve COEP/COOP)

### Implementation for User Story 1

- [ ] T007 [P] [US1] Create `frontend/public/_headers` with COEP, COOP, per-path Cache-Control rules, and `Cross-Origin-Resource-Policy: cross-origin` on `/wasm/*` per `contracts/hosting-comparison.md` Selected Platform Configuration section
- [ ] T008 [US1] Update `.github/workflows/deploy-pwa.yml`: replace Stage 3 GitHub Pages steps (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`) with `cloudflare/pages-action@v1` step using `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` secrets, `projectName: graditone`, `directory: frontend/dist`
- [ ] T009 [US1] Remove GitHub Pages-specific `permissions: pages: write` and `id-token: write` entries from `deploy-pwa.yml` (no longer needed); keep `contents: write` for version-bump step
- [ ] T010 [US1] Verify `_headers` file is copied into `frontend/dist/` by Vite build: run `npm run build` locally and confirm `cat frontend/dist/_headers` contains COEP/COOP rules
- [ ] T011 [US1] Trigger deployment: push a commit to `main` and confirm Cloudflare Pages build succeeds in GitHub Actions log in under 5 minutes; verify `graditone.com` is live
- [ ] T012 [US1] Transfer CNAME `graditone.com` DNS from GitHub Pages to Cloudflare Pages custom domain; verify DNS propagation with `dig graditone.com`
- [ ] T013 [US1] Run `tests/integration/test_pwa_headers.py` against production URL `https://graditone.com`; confirm all header assertions now **PASS** (T006 test turns green)
- [ ] T014 [US1] Manually verify PWA installability on a tablet browser: navigate to `https://graditone.com`, confirm install prompt appears; confirm WASM music engine loads without console cross-origin errors

**Checkpoint**: US1 complete — Cloudflare Pages is live, COEP/COOP headers verified, WASM Brotli compression active automatically, installed PWAs continue to work.

---

## Phase 4: User Story 2 - Track PWA Usage and Installs (Priority: P2)

**Goal**: Integrate Umami Cloud analytics with zero cookies and GDPR compliance. Track page views automatically, plus two custom events: `pwa_install` (acquisition) and `pwa_standalone_session` (retention). All collection is skipped for Do Not Track users.

**Independent Test**: Build and preview locally with Umami script loaded; in DevTools Network tab verify `script.js` fetches from `cloud.umami.is`; call `window.umami.track('pwa_install', {...})` in console; event appears in Umami Cloud dashboard Events view; reload with `navigator.doNotTrack = '1'` and confirm no events are sent.

### Tests for User Story 2 (Constitution Principle V — write tests FIRST, confirm they FAIL)

- [ ] T015 [P] [US2] Write Vitest unit tests in `frontend/src/analytics/analytics.test.ts` covering all 6 scenarios from `contracts/analytics-events.md` Test Scenarios table: `isDoNotTrack()` returns true when DNT=1; `trackInstall()` calls `umami.track` when DNT off; `trackInstall()` is no-op when DNT on; `trackStandaloneSession()` is no-op in browser mode; `trackStandaloneSession()` calls `umami.track` in standalone mode with DNT off; all functions are no-ops when `umami` is undefined (no ReferenceError); run `npx vitest run src/analytics/analytics.test.ts` and **confirm all 6 tests FAIL** (module does not exist yet)

### Implementation for User Story 2

- [ ] T016 [US2] Create `frontend/src/analytics/index.ts` implementing the three exported functions from `contracts/analytics-events.md`: `isDoNotTrack(): boolean`, `trackInstall(): void`, `trackStandaloneSession(): void`; all functions must be no-ops when DNT is set or when `umami` is undefined
- [ ] T017 [P] [US2] Add Umami script tag to `frontend/index.html` `<head>`: `<script defer src="https://cloud.umami.is/script.js" data-website-id="%VITE_UMAMI_WEBSITE_ID%" data-do-not-track="true"></script>` — Vite replaces `%VITE_UMAMI_WEBSITE_ID%` at build time from the env variable
- [ ] T018 [US2] Add `beforeinstallprompt` event listener to `frontend/src/main.tsx` (or a dedicated `frontend/src/hooks/useInstallPrompt.ts` hook); capture deferred prompt; call `trackInstall()` from `analytics/index.ts` when `userChoice.outcome === 'accepted'`
- [ ] T019 [US2] Call `trackStandaloneSession()` from `analytics/index.ts` once at app initialisation in `frontend/src/main.tsx` immediately after the React root is rendered (fires only when `display-mode: standalone` matches)
- [ ] T020 [US2] Run Vitest unit tests: `npx vitest run src/analytics/analytics.test.ts`; confirm all 6 tests now **PASS**
- [ ] T021 [US2] Smoke test analytics integration: run `npm run build && npm run preview`; open `http://localhost:4173` in browser; open DevTools Network tab; confirm Umami `script.js` is loaded; open Umami Cloud dashboard and verify at least one page view appears within 30 seconds

**Checkpoint**: US2 complete — Umami analytics live, page views tracked automatically, install and standalone-session events fire correctly, DNT respected, no cookies, no consent banner required.

---

## Phase 5: User Story 3 - Reduce PWA Initial Download Size (Priority: P3)

**Goal**: Reduce the compressed initial transfer size from ~3 MB to under 2 MB via three independent optimizations: (1) Latin font subsetting (~48% font reduction), (2) Tone.js code splitting (~52% initial JS reduction), (3) CI asset budget gate enforcing the 2 MB cap. Cloudflare Brotli (from US1) delivers ~60% WASM compression automatically.

**Independent Test**: Run `npm run build && npm run check-budget`; script exits 0; total compressed initial transfer reported < 2 MB. Confirm the Tone.js chunk (`tone-audio-*.js`) exists in `frontend/dist/assets/` and is absent from the initial network waterfall in browser DevTools.

### Tests for User Story 3 (Constitution Principle V — write CI gate FIRST, confirm it FAILS)

- [ ] T022 [US3] Write `frontend/scripts/check-budget.mjs`: calculate gzip-compressed sizes of all initial-load assets in `frontend/dist/` (exclude lazy chunks containing `tone-audio`); exit with code 1 if total exceeds 2 MB, printing per-asset sizes; add npm script `"check-budget": "node scripts/check-budget.mjs"` to `frontend/package.json`
- [ ] T023 [US3] Establish baseline: run `npm run build` then `npm run check-budget` against the CURRENT unoptimised build; **confirm the check FAILS** with reported total > 2 MB; record per-asset baseline sizes in `specs/001-pwa-hosting-service/baseline-metrics.md` (WASM ~440KB, fonts ~500KB, JS ~580KB)

### Implementation for User Story 3

- [ ] T024 [P] [US3] Create `frontend/scripts/subset-fonts.mjs`: for each `frontend/public/fonts/*.woff2`, run `pyftsubset` with `--unicodes=U+0000-024F` (Latin, Latin Extended-A/B) producing subsetted files in-place; add npm script `"subset-fonts": "node scripts/subset-fonts.mjs"` to `frontend/package.json`
- [ ] T025 [US3] Update `frontend/package.json` `"build"` script to run font subsetting before Vite: `"build": "npm run subset-fonts && tsc -b && vite build"`; verify locally that all 12 font files (3 families × 4 weights) are reduced in size after `npm run build`
- [ ] T026 [P] [US3] Update `frontend/vite.config.ts` `build` section: add `rollupOptions.output.manualChunks` mapping `vendor-core` (react, react-dom, idb, pitchy, fflate), `workbox` (all workbox-* packages), and `tone-audio` (tone); add `chunkSizeWarningLimit: 500` per `research.md` JS code splitting decision
- [ ] T027 [US3] Wrap playback-related view(s) in `frontend/src/App.tsx` (or router) with `React.lazy(() => import('./views/PlaybackView'))` and `<Suspense>`; dynamic import ensures Tone.js is only loaded in the `tone-audio` chunk when the user navigates to playback; verify in `frontend/dist/assets/` that `tone-audio-*.js` chunk exists separately
- [ ] T028 [US3] Add font subsetting install step to `.github/workflows/deploy-pwa.yml` before the "Build frontend" stage: `pip install fonttools` (Python is pre-installed on `ubuntu-latest`); confirm the step runs in CI by pushing a branch
- [ ] T029 [US3] Add asset budget check step to `.github/workflows/deploy-pwa.yml` immediately after "Build frontend with PWA" step and before "Deploy" step: `run: npm run check-budget` with `working-directory: frontend`; pipeline fails if budget exceeded, blocking deployment
- [ ] T030 [US3] Run full optimised build locally: `npm run build`; run `npm run check-budget`; confirm it now **PASSES** (< 2 MB); record final per-asset sizes in `specs/001-pwa-hosting-service/baseline-metrics.md` under "After" column; verify Lighthouse Slow 4G TTI < 5 s using browser DevTools throttling

**Checkpoint**: US3 complete — font payload reduced ≥40%, initial JS bundle reduced ≥30%, CI blocks future regressions above 2 MB, Cloudflare Brotli delivers WASM at ~180 KB transfer.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation updates and final end-to-end validation across all three user stories.

- [ ] T031 [P] Update `README.md` root: replace GitHub Pages references with Cloudflare Pages; add Umami analytics badge/mention under the PWA section; update "Status" line to reflect new hosting
- [ ] T032 [P] Update `frontend/README.md` (if exists): add `npm run subset-fonts` and `npm run check-budget` to the available scripts table; note `VITE_UMAMI_WEBSITE_ID` env variable requirement
- [ ] T033 [P] Update `FEATURES.md`: amend Feature 012 (PWA Distribution) entry to note Cloudflare Pages as hosting platform; add analytics as a new capability entry under the PWA section
- [ ] T034 Update `specs/001-pwa-hosting-service/spec.md` Status from `Draft` to `Implemented`; mark all acceptance scenarios that have been verified
- [ ] T035 Run full `quickstart.md` validation on a clean checkout: follow every step end-to-end (`pip install fonttools`, `.env.local` setup, `npm run build`, `npm run check-budget`, `pytest tests/integration/test_pwa_headers.py`); confirm no steps are missing or broken

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately; T002, T003, T004 are parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 — formalises the decision gate
- **Phase 3 (US1)**: Depends on Phase 2 (secrets must exist); T007 and T006 are parallel
- **Phase 4 (US2)**: Depends on Phase 1 (VITE_UMAMI_WEBSITE_ID secret); T015 and T017 are parallel; **independent of US1**
- **Phase 5 (US3)**: Depends on Phase 1; **benefits from US1 completion** (Cloudflare Brotli) for accurate final verification but code changes are independent; T024 and T026 are parallel
- **Phase 6 (Polish)**: Depends on US1 + US2 + US3 completion; T031, T032, T033 are parallel

### User Story Dependencies

- **US1 (P1)**: No dependency on US2 or US3 — start immediately after Phase 2
- **US2 (P2)**: No dependency on US1 or US3 — start after Phase 1 (needs Umami site ID)
- **US3 (P3)**: No dependency on US2; US1 should complete first so Brotli is active for final T030 verification; code changes (T024–T029) can be done in parallel with US1

### Within Each User Story

- Tests (T006, T015, T022–T023) MUST be written and **confirmed FAILING** before implementation starts (Principle V)
- T007 (`_headers` creation) can run in parallel with T006 (test writing) since they touch different files
- Font subsetting (T024–T025) and code splitting (T026–T027) are independent and can be parallelised within US3

### Critical Path

```
T001 → T003 → T005 → T006 (write, fail) → T007+T008+T009 → T010 → T011 → T012 → T013 → T014
                      └─ T015 (write, fail) → T016+T017 → T018 → T019 → T020 → T021
                      └─ T022+T023 (write, fail) → T024+T026 → T025 → T027 → T028 → T029 → T030
```

---

## Parallel Execution Examples

### Phase 1 — All parallel after T001

```bash
# After T001 (Cloudflare project created) — run T002, T003, T004 together:
Task: "Create Umami Cloud account and add site"              # T002
Task: "Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID"  # T003
Task: "Add VITE_UMAMI_WEBSITE_ID secret + .env.local"       # T004
```

### Phase 3 (US1) — Test writing and _headers creation in parallel

```bash
# T006 and T007 can run simultaneously (different files):
Task: "Write tests/integration/test_pwa_headers.py"  # T006
Task: "Create frontend/public/_headers"              # T007
```

### Phase 5 (US3) — Font and JS optimizations in parallel

```bash
# T024 and T026 touch different files — run together:
Task: "Create frontend/scripts/subset-fonts.mjs"     # T024
Task: "Update frontend/vite.config.ts manualChunks"  # T026
```

### Polish — Three doc updates in parallel

```bash
# T031, T032, T033 touch different files — run together:
Task: "Update README.md with Cloudflare Pages"       # T031
Task: "Update frontend/README.md scripts table"      # T032
Task: "Update FEATURES.md PWA section"               # T033
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (US1) — Cloudflare Pages deployment with COEP/COOP headers
3. **STOP and VALIDATE**: `tests/integration/test_pwa_headers.py` passes; PWA installs on tablet
4. This alone delivers: scalable hosting, Brotli WASM compression (~60%), and correct security headers

### Incremental Delivery

1. ✅ Phase 1 + 2 → Accounts and secrets ready  
2. ✅ Phase 3 (US1) → Hosting migrated, WASM Brotli active, installability verified (**Demo point**)  
3. ✅ Phase 4 (US2) → Analytics live, install + retention tracking visible in dashboard (**Demo point**)  
4. ✅ Phase 5 (US3) → Bundle < 2 MB, font subsetting, code splitting, CI gate (**Demo point**)  
5. ✅ Phase 6 → Documentation and final validation

### Parallel Team Strategy

With two developers after Phase 1 + 2 complete:
- Developer A: US1 (hosting migration) → US3 (bundle optimization)
- Developer B: US2 (analytics integration, fully independent)

---

## Notes

- **[P]** tasks = different files, no incomplete task dependencies; safe to run concurrently
- **Test-first requirement** (Principle V): T006, T015, T022–T023 MUST be written and confirmed FAILING before their corresponding implementation tasks
- **Regression prevention** (Principle VII): If any bug is found during migration (e.g., service worker scope breaks), follow the BUG FIX template from the tasks template — document → create failing test → fix → verify → commit both
- No backend (Rust) changes in this feature; all work is in `frontend/`, `.github/workflows/`, and `tests/integration/`
- `data-do-not-track="true"` on the Umami script tag is the mechanism for FR-007 (DNT signal); the `analytics/index.ts` module also checks `navigator.doNotTrack` as a defence-in-depth guard
