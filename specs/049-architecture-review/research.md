# Research: Architecture Review

**Feature**: 049-architecture-review  
**Date**: 2026-03-13  
**Purpose**: Resolve all NEEDS CLARIFICATION items and research best practices for each ADR concern area.

---

## Research Task 1: Plugin Architecture Scalability

### Decision: The plugin architecture is evolving in the right direction but needs targeted improvements for trusted-community scale.

### Rationale

**Current strengths:**
- Additive-only API versioning (v1→v7) provides strict backward compatibility — v1 plugins run unchanged under v7 host.
- Build-time discovery via `import.meta.glob` eliminates registration boilerplate.
- ESLint boundary enforcement prevents plugins from importing core internals (restricted to `plugin-api/index.ts` only).
- ZIP import with validation (5MB limit checked both compressed and uncompressed, manifest shape validation, API version check, ID pattern enforcement) provides reasonable security for a trusted-community model.

**Identified gaps for scaling to 20+ plugins:**
1. **Bundle bloat**: Built-in plugins use `eager: true` glob — all 5 are bundled in the main chunk. Current total: ~75KB gzipped. Projected 20 plugins: ~250-300KB. Should switch to lazy-loaded chunks for non-core plugins.
2. **Sequential imported plugin loading**: The `loadPlugins()` loop uses sequential `await` — each imported plugin blocks the next. With 15 imported plugins at ~100-200ms each, initialization could take 1.5-3s, exceeding the 2s target. Should parallelize with `Promise.all`.
3. **Event fan-out fragility**: `midiPluginSubscribersRef.current.forEach(h => h(event))` has no error boundary — if one handler throws, subsequent handlers miss the event. Should wrap each callback in try/catch.
4. **No plugin lifecycle management**: Plugins cannot be unloaded at runtime. The module stays cached after import. For 20+ plugins, memory pressure grows linearly with no release mechanism.
5. **ESLint bypass paths**: Dynamic imports, path aliases, and props passed via PluginContext can circumvent boundary enforcement. For a trusted-community model this is tolerable but should be documented.
6. **No plugin developer tooling**: No CLI scaffolding, no local development server for testing plugins in isolation, no type-checking against the plugin API contract.

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Keep current architecture unchanged | Zero migration cost | Bundle and init scaling problems remain | Rejected |
| Lazy-load built-in plugins + parallel imported plugin loading | Low cost, high impact on init time | Slightly more complex loading logic | **Selected** |
| iframe-based plugin sandboxing | True security isolation | Massive complexity, breaks React component model, kills plugin DX | Rejected (not needed for trusted-community) |
| Web Worker plugins | CPU isolation | Cannot render React components, breaks entire plugin API | Rejected |

---

## Research Task 2: MIDI Processing Boundary

### Decision: Keep MIDI processing in TypeScript. Migrate only computational algorithms (chord recognition, performance analysis) to Rust/WASM if they exceed 5ms per event.

### Rationale

**Current MIDI complexity is low:**
- Total MIDI TypeScript: ~478 lines of production code (useMidiInput: 349, midiUtils: 78, ChordDetector: 51).
- Pure parsing functions (`parseMidiNoteOn`, `parseMidiNoteOff`) are O(1) — under 1μs per call.
- ChordDetector is O(n) reduce/filter — trivial for typical chord sizes (2-6 notes).
- useMidiInput complexity is driven by browser API state management (device enumeration, hotplug debouncing, cleanup), which cannot run in WASM regardless.

**WASM boundary cost is significant:**
- Each call across the WASM boundary (JS → WASM → JS) adds 2-10μs overhead.
- For real-time MIDI at 10ms latency budget, the boundary crossing alone could consume 1-10% of the budget.
- Serialization/deserialization of MIDI events (JS object → JSON → Rust struct → JSON → JS object) adds further overhead.
- Web MIDI API only exists in browser JavaScript — raw MIDI messages must be parsed in JS before any WASM call.

**When Rust migration would be justified:**
- Advanced chord recognition with harmonic analysis (music theory computations with large lookup tables).
- Real-time performance analysis (aggregating and scoring thousands of note events per session).
- Multi-instrument synchronization with temporal alignment algorithms.
- Any algorithm that processes aggregated data (not individual events) and takes >5ms in TypeScript.

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Keep all MIDI in TypeScript | Zero migration cost, browser API proximity | If algorithms grow complex, may hit perf ceiling | **Selected** (with migration threshold) |
| Move parsing to Rust/WASM | Consistent codebase with layout engine | Web MIDI API is JS-only; adds WASM boundary overhead for O(1) operations | Rejected |
| Hybrid: parse in TS, analyze in Rust | Best of both worlds for complex algorithms | Architecture complexity, two failure modes | Selected as future path if algorithms exceed threshold |
| Full Rust MIDI (WASI/system MIDI) | Complete Rust stack | Not applicable — this is a PWA, not a native app | Rejected |

---

## Research Task 3: Frontend Framework Fitness

### Decision: React remains the correct choice. No migration justified.

### Rationale

**React's fitness assessment:**
- React 19 with concurrent features is well-suited for the app's rendering model (SVG score display, frequent re-renders during playback).
- Bundle size: React 19 adds ~40KB gzipped — well within the overall budget, and smaller alternatives save only ~15-25KB.
- Plugin API is deeply coupled to React: `MusicorePlugin.Component` is `React.ComponentType`, plugin context uses React hooks, shared components (`StaffViewer`, `ScoreRenderer`, `ScoreSelector`) are React components. Migration cost is proportional to plugin count × component count.
- React ecosystem (React Testing Library, extensive third-party component libraries, ubiquitous developer familiarity) is a strong advantage for a trusted-community plugin model.

**Migration cost estimation (if it were needed):**
- 5 built-in plugins with React components: ~5 person-weeks.
- Plugin API contract redesign (framework-agnostic interfaces): ~2 person-weeks.
- All existing tests (38 unit + 22 integration + 9 E2E): ~3 person-weeks to rewrite.
- Any imported third-party plugins: broken, requiring SDK update by external developers.
- Total: ~10+ person-weeks for a framework migration — only justified if React were discontinued or had a critical, unworkable deficiency.

**What would be a blocking constraint?**
- React project discontinuation (extremely unlikely given Meta's investment).
- Critical rendering performance ceiling proven by benchmark (not observed; SVG rendering is layout-engine-bound, not React-bound).
- React licensing change that conflicts with project goals (settled in 2017 with MIT relicense).

### Alternatives Considered

| Alternative | Bundle Size | Plugin Coupling Impact | Migration Cost | Decision |
|-------------|------------|----------------------|----------------|----------|
| React 19 (stay) | ~40KB | None | $0 | **Selected** |
| Preact | ~4KB | Mostly compatible but edge cases in hooks/context | ~3 person-weeks | Rejected (savings don't justify risk) |
| Solid.js | ~7KB | Complete rewrite — different reactivity model | ~12 person-weeks | Rejected |
| Svelte 5 | ~2KB | Complete rewrite — compiler-based | ~15 person-weeks | Rejected |
| Web Components | ~0KB | Loses React ecosystem entirely | ~20 person-weeks | Rejected |

---

## Research Task 4: Test Strategy Rationalization

### Decision: Tests are justified overall. Optimize the pipeline by parallelizing and removing cross-level redundancy, not by cutting categories.

### Rationale

**Current test distribution (92 files):**
- Frontend unit: 38 files (~41%) — pure logic, hooks, services
- Frontend integration: 22 files (~24%) — component rendering, WASM boundary
- Frontend E2E: 9 files (~10%) — full user flows in real browser
- Backend (Rust): 23 files (~25%) — domain + layout logic

**Redundancy analysis:**
- MIDI processing: Good separation — `midiUtils.test.ts` tests parsing edge cases, `useMidiInput.test.ts` tests browser API interaction. Minimal overlap.
- Chord detection: `ChordDetector.test.ts` (grouping logic) and `ChordAnalyzer.test.ts` (classification) test different layers. Minimal overlap.
- Layout rendering: Integration tests (`LayoutRenderer.test.tsx`, `ScoreViewer.layout.test.tsx`) overlap with some backend layout tests. Both test "correct coordinates" but from different boundaries. Overlap is intentional (contract testing).
- Highlight system: 6 test files for highlight engine is extensive but each tests a distinct algorithm. No redundancy found.
- **Identified redundancy**: Some integration tests (`playback-integration.test.tsx`, `highlight-sync.test.tsx`) test scenarios that are also covered by E2E tests (`train-from-score.spec.ts`). However, integration tests run in 2-5 seconds while E2E tests run in 30-60 seconds — keeping both is faster for feedback.

**Pipeline optimization opportunities:**
1. **Pre-push is sequential**: Rust tests → build → unit tests → E2E. Total: ~2-5 minutes depending on machine. Could parallelize Rust tests and frontend build.
2. **E2E 3-minute timeout**: Reasonable safety valve. Not a bottleneck.
3. **Performance tests excluded from pre-push**: Correct — they're flaky under developer load. Run in CI only.
4. **Integration tests**: Some could be reclassified as unit tests (those that don't touch DOM or WASM boundary) to run faster.

**10% reduction target (SC-004) feasibility:**
- 92 files × 10% = ~9 files.
- Likely candidates: integration tests that duplicate E2E coverage and can be replaced by assertions within existing E2E specs. Estimated: 4-6 files.
- Additional candidates: layout rendering tests that duplicate Rust-side layout tests. Estimated: 2-3 files.
- Total reduction target: achievable with 6-9 file consolidations.

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Cut all integration tests (rely on unit + E2E only) | Fewer tests, faster pipeline | Loses fast feedback on rendering bugs | Rejected |
| Cut E2E tests (rely on unit + integration only) | Fastest pipeline | Loses user-flow confidence | Rejected |
| Consolidate overlapping cross-level tests | Reduces redundancy without losing coverage categories | Requires careful analysis per test | **Selected** |
| Add test coverage thresholds | Prevents under-testing | Can promote low-value tests to hit threshold | Rejected |

---

## Research Task 5: Scalability Readiness

### Decision: Architecture is well-positioned for developer scalability but needs specific investments for team growth beyond 10 developers.

### Rationale

**Developer scalability assessment:**
- Monorepo structure is appropriate for current size (~3-5 developers). Shared tooling, unified builds, and cross-package refactoring are straightforward.
- Plugin system naturally creates code ownership boundaries — each plugin can have a dedicated owner without merge conflicts.
- Spec-per-feature discipline (49 specs) provides excellent documentation trail for onboarding.
- Build times: Full frontend build + tests + E2E takes 2-5 minutes. With 30+ plugins (all built-in), Vite build could reach 3-5 minutes. Acceptable up to ~10 minutes.

**Developer scalability bottlenecks for 20+ devs:**
1. **Monorepo merge conflicts**: `frontend/src/App.tsx` is a bottleneck — it contains plugin initialization, MIDI routing, and audio setup. Multiple developers touching this file will conflict. Should be decomposed.
2. **Build times**: With 20+ built-in plugins using eager glob, the main bundle grows and HMR slows. Should migrate to lazy loading.
3. **Pre-push hook duration**: Full test suite (Rust + frontend + E2E) takes 2-5 minutes. With more plugins and tests, this could exceed 10 minutes. Should add `--changed-only` test selection.
4. **Code ownership**: No formal code ownership (CODEOWNERS) file. Should add CODEOWNERS for plugins/, backend/, frontend/src/services/.

**User scalability assessment (local-first, no-sync):**
- **Static asset serving**: PWA shell + WASM binary (~150KB gzipped) + React app (~200KB gzipped). CDN-served. Scales horizontally without limit.
- **IndexedDB storage**: Browser-dependent quotas (typically 50% of free disk space, minimum ~50MB on mobile). 100 MusicXML scores at ~50-500KB each = 5-50MB. Well within limits.
- **Service worker updates**: Workbox precache handles updates. No server coordination needed. Scales to unlimited users.
- **Backend API**: Only serves score catalog + static assets. Stateless. Can be CDN-cached. Trivially scalable.
- **No sync bottleneck**: Local-first means no concurrent write conflicts, no real-time channels, no backend database. Scalability is inherently unlimited for user count.

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| Keep monorepo as-is | Zero migration cost | Merge conflicts will increase | **Selected** (with targeted decomposition) |
| Split into multi-repo (backend, frontend, plugins) | Eliminates cross-repo conflicts | Increases CI complexity, versioning burden | Rejected |
| Nx/Turborepo monorepo tooling | Better incremental builds, caching | Learning curve, dependency on tooling ecosystem | Worth evaluating when team exceeds 10 devs |
| Add CODEOWNERS + branch protections | Low-cost ownership clarity | Slightly more process overhead | **Selected** — immediate action item |
