# ADR-049-005: Scalability Readiness

**Status**: Proposed  
**Date**: 2026-03-13  
**Concern Area**: Scalability

## Context

Graditone is a local-first PWA with no cloud sync. The architecture has two scalability dimensions:

### Developer Scalability (Current: ~3–5 developers)

- **Monorepo structure**: `backend/` (Rust), `frontend/` (React/TypeScript), `specs/` (49 feature specs), `plugins-external/`.
- **App.tsx bottleneck**: 878 lines, 30+ imports, 11 `useState`, 5 `useEffect`, 15+ distinct responsibilities (WASM init, theme management, plugin loading, audio engine, MIDI routing, recording view, debug mode, install banners, file state, tempo state, fullscreen mode). This is the highest merge-conflict risk file in the codebase.
- **No CODEOWNERS file**: No formal code ownership boundaries. Any developer can modify any file without automated review routing.
- **Pre-push pipeline**: 2–5 minutes, sequential. As tests and plugins grow, this will increase.
- **Build times**: Vite with manual chunks (Tone.js, Workbox, vendor-core). Current build: 20–60s. With 20+ built-in plugins using eager glob, HMR and build would slow.

### User Scalability (Current: local-first, no server-side state)

- **Static asset serving**: PWA shell + WASM binary (~150KB gzipped) + React app (~200KB gzipped). Served via Nginx in Docker.
- **Service worker caching**: Workbox with precaching (JS, CSS, WASM, fonts) + runtime caching (scores: network-first/7d, images: stale-while-revalidate/30d, fonts: cache-first/1y).
- **IndexedDB storage**: `graditone-db` v1, `scores` object store. Schema versioning (v6) with automatic cleanup of incompatible versions. Browser quota: typically 50% of free disk space (minimum ~50MB on mobile). 100 MusicXML scores at ~50–500KB each = 5–50MB — well within limits.
- **Docker deployment**: Single-instance docker-compose with no replicas, no load balancer, no resource limits. Backend is stateless REST API serving score catalog + static assets.
- **No real-time channels**: No WebSocket, no SSE, no collaborative editing. Each user runs independently.

## Concern

Can the codebase accommodate growth from ~3–5 developers to 20+ developers, and from a small user base to thousands of concurrent users, without architectural bottlenecks?

## Alternatives Considered

### Alternative 1: Keep Monorepo As-Is
- **Description**: Continue with the current monorepo structure without decomposition. Add CODEOWNERS for ownership clarity but make no structural changes.
- **Pros**: Zero migration cost. Monorepo benefits preserved: unified builds, cross-package refactoring, shared tooling, single CI pipeline.
- **Cons**: App.tsx merge conflicts will increase with team size. Build times grow with more plugins. No automated review routing without CODEOWNERS.

### Alternative 2: Keep Monorepo with Targeted Decomposition
- **Description**: Keep the monorepo but decompose App.tsx into focused modules, add CODEOWNERS, and document ownership boundaries. For user scaling, add a production Docker Compose with Nginx reverse proxy and multiple backend replicas.
- **Pros**: Low cost, high impact. App.tsx decomposition reduces merge conflicts (the primary developer scalability bottleneck) while preserving monorepo benefits. CODEOWNERS provides review routing. Docker scaling handles the stateless backend trivially.
- **Cons**: Decomposition is a refactoring effort (~1 week). CODEOWNERS requires ongoing maintenance as the team evolves.

### Alternative 3: Split into Multi-Repo (backend, frontend, plugins)
- **Description**: Separate the codebase into 3+ repositories with independent CI/CD pipelines and versioning.
- **Pros**: Eliminates cross-repo merge conflicts. Teams can release independently. Clear ownership boundaries.
- **Cons**: Increases CI complexity (cross-repo integration testing). Versioning burden (plugin API compatibility across repos). Shared tooling (linting, testing, formatting) must be duplicated. Pre-push validation becomes harder without shared git hooks. Loses the benefit of atomic cross-stack refactoring.

### Alternative 4: Adopt Nx/Turborepo Monorepo Tooling
- **Description**: Add monorepo build orchestration tools (Nx or Turborepo) for incremental builds, task caching, and affected-only test execution.
- **Pros**: Faster builds via caching (only rebuild changed packages). Affected-only testing reduces pre-push time. Project graph visualization helps with architecture understanding.
- **Cons**: Learning curve for the team. Dependency on the tooling ecosystem (Nx is funded by Nrwl/Herodevs, Turborepo by Vercel). Configuration overhead. Overkill for current team size (~3–5 developers).

## Decision

**Selected: Alternative 2** — Keep the monorepo with targeted decomposition, CODEOWNERS, and production Docker configuration.

This addresses the two concrete bottlenecks:

**For developer scalability**, App.tsx decomposition eliminates the highest-risk merge-conflict file. The proposed decomposition:
- Extract `PluginController` (plugin loading, navigation, import/delete, dialogs — ~200 lines)
- Extract `MidiRouter` (MIDI hardware input distribution, plugin subscriber fan-out — ~100 lines)  
- Extract `AudioManager` (Tone.js lazy loading, audio engine lifecycle — ~80 lines)
- Keep App.tsx as a thin shell (~300 lines): context providers, routing, and composition of extracted modules

CODEOWNERS adds automated review routing at near-zero cost.

**For user scalability**, the local-first architecture is inherently unlimited for user count — there is no shared state, no backend database, no real-time channels. The only server-side concern is static asset serving, which Nginx handles trivially. Adding a production Docker Compose with a reverse proxy and multiple backend instances handles the score catalog API for high concurrency.

**Threshold for Alternative 4** (Nx/Turborepo): Evaluate when the team exceeds 10 developers or full build time exceeds 10 minutes, whichever comes first.

## Consequences

### Positive
- App.tsx merge-conflict risk reduced from "Very High" to "Low" by decomposing from ~878 lines to ~300 lines.
- CODEOWNERS enables automated review assignment (clear ownership for `frontend/`, `backend/`, `specs/`, `plugins/`).
- Developer onboarding improved — smaller, focused files are easier to understand than a single 878-line god component.
- User scalability confirmed as a non-issue for local-first architecture — no server-side bottleneck exists.

### Negative
- App.tsx decomposition requires a focused refactoring sprint (~1 week). Risk of breaking plugin initialization order or MIDI event routing during extraction.
- CODEOWNERS requires maintenance when team composition changes.

### Neutral
- Monorepo structure unchanged — shared tooling, unified builds, and cross-package refactoring preserved.
- Build times unaffected by decomposition (same code, different file organization).
- Docker development configuration (`docker-compose.yml`) unchanged — production config is additive.
- Local-first storage model (IndexedDB) unchanged.

## Risk Assessment

1. **App.tsx decomposition breaks plugin initialization**: Extracting `PluginController` changes the component tree. If plugin initialization depends on App.tsx-level state being set before plugin components mount, the extraction could cause race conditions. **Mitigation**: Keep the existing `allPlugins` state in App.tsx and pass it as props to `PluginController`. Verify with the existing plugin load test (`frontend/tests/benchmarks/plugin-load.test.ts`).

2. **MIDI event routing breaks during MidiRouter extraction**: The MIDI fan-out pattern (`midiPluginSubscribersRef.current.forEach(h => h(event))`) uses a ref that must be shared with the plugin context object. Extracting it to a separate component requires lifting the ref or using context. **Mitigation**: Use a custom `useMidiRouter` hook that returns both the subscribe function and the dispatch function, keeping the ref internal.

3. **IndexedDB quota exceeded on mobile**: If users import many large MusicXML scores (100+ at 500KB each = ~50MB), mobile browsers with limited storage may deny IndexedDB writes. **Mitigation**: Add a storage quota check before import and display a user-friendly warning. Current usage patterns suggest this is unlikely (most users have <20 scores).

4. **Docker production scaling misconfigured**: Multiple backend replicas serving score catalog without proper health checks or graceful shutdown could drop requests during deploys. **Mitigation**: Configure docker-compose.prod.yml with health-check-based rolling updates and a 30s graceful shutdown period.

5. **Build times exceed 10-minute threshold before Nx/Turborepo evaluation**: If plugin count grows rapidly (20+ built-in plugins with eager loading), the Vite build could exceed 10 minutes before the team reaches 10 developers. **Mitigation**: ADR-049-001's lazy-loading action item (AI-049-001) reduces build size. If build time approaches 5 minutes, start the Nx/Turborepo evaluation early.

## Action Items

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-021 | Decompose App.tsx: extract `PluginController` component (~200 lines of plugin loading, navigation, dialogs) | P1 | M (1–3 days) | none |
| AI-049-022 | Decompose App.tsx: extract `MidiRouter` hook/component (~100 lines of MIDI input distribution and plugin subscriber fan-out) | P1 | M (1–3 days) | AI-049-021 |
| AI-049-023 | Decompose App.tsx: extract `AudioManager` component (~80 lines of Tone.js lazy loading and audio engine lifecycle) | P2 | S (< 1 day) | AI-049-021 |
| AI-049-024 | Create CODEOWNERS file with ownership assignments for `frontend/`, `backend/`, `specs/`, `plugins-external/` | P1 | S (< 1 day) | none |
| AI-049-025 | Add IndexedDB storage quota check before score import with user-friendly warning when approaching browser limits | P2 | S (< 1 day) | none |
| AI-049-026 | Create `docker-compose.prod.yml` with Nginx reverse proxy, 2 backend replicas, health-check rolling updates, and resource limits | P3 | M (1–3 days) | none |
| AI-049-027 | Evaluate Nx/Turborepo when team exceeds 10 developers or full build exceeds 10 minutes | P3 | M (1–3 days) | Triggered by growth threshold |
