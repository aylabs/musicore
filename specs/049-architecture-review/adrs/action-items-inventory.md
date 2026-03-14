# Action Items Inventory: Architecture Review

**Date**: 2026-03-13  
**Source**: ADRs 049-001 through 049-005  
**Total Action Items**: 27

---

## ADR-049-001: Plugin Architecture (7 items)

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-001 | Switch non-core built-in plugins from `eager: true` glob to lazy-loaded dynamic `import()` chunks in `builtinPlugins.ts` | P1 | M | none |
| AI-049-002 | Replace sequential `await` loop in `App.tsx` plugin loading with `Promise.allSettled` for imported plugins | P1 | S | none |
| AI-049-003 | Wrap each MIDI event handler invocation in `App.tsx` fan-out with `try/catch` per handler, logging `(pluginId, error)` | P1 | S | none |
| AI-049-004 | Add degraded-mode UI: show warning badge in plugin manager if any imported plugin failed to load | P2 | S | AI-049-002 |
| AI-049-005 | Document that plugin initialization order is undefined (for imported plugin developers) | P2 | S | none |
| AI-049-006 | Evaluate plugin lifecycle management (unload/dispose at runtime) for memory pressure with 20+ active plugins | P3 | M | none |
| AI-049-007 | Create plugin developer CLI scaffolding tool for trusted-community contributors | P3 | L | none |

## ADR-049-002: MIDI Processing (4 items)

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-008 | Document the 5ms migration threshold in the project's architecture guide with a link to this ADR and the benchmark results | P1 | S | none |
| AI-049-009 | Add TypeScript MIDI profiling instrumentation (behind a debug flag) to measure real-world per-event latency in `midiUtils.ts` | P2 | S | none |
| AI-049-010 | Keep `backend/src/midi_prototype.rs` and `backend/benches/midi_latency.rs` as reference implementations; add a README note explaining their purpose | P2 | S | none |
| AI-049-011 | If/when a batch MIDI algorithm exceeding 5ms is identified, design the TypeScript → WASM batch pipeline following the Hybrid pattern | P3 | M | Triggered by profiling |

## ADR-049-003: Frontend Framework (3 items)

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-012 | Document the React migration threshold (discontinuation, proven perf ceiling, licensing change) in the project architecture guide | P2 | S | none |
| AI-049-013 | Add React rendering performance profiling (React DevTools Profiler) to the pre-release checklist for large score testing (~50+ visible measures) | P2 | S | none |
| AI-049-014 | Evaluate adding `React.memo()` to the 3 shared plugin components (StaffViewer, ScoreRenderer, ScoreSelector) to reduce unnecessary re-renders during playback | P3 | S | none |

## ADR-049-004: Test Strategy (6 items)

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-015 | Consolidate `SingleVoice.test.tsx` and `MultiStaff.test.tsx` into E2E visual snapshot tests + 5–10 thin contract assertions | P1 | M | none |
| AI-049-016 | Merge `ClefPositioning.test.ts` assertions into the retained thin contract tests | P1 | S | AI-049-015 |
| AI-049-017 | Parallelize pre-push pipeline: run `cargo test` and `npm run build` concurrently in Stage A | P1 | S | none |
| AI-049-018 | Add backend playback contract tests validating tick/duration accuracy in WASM output | P2 | M | none |
| AI-049-019 | Evaluate adding Vitest coverage reporting (no threshold enforcement) to track coverage trends | P3 | S | none |
| AI-049-020 | Add `--changed-only` test selection to pre-push hook for faster developer feedback when test suite exceeds 1000 cases | P3 | M | none |

## ADR-049-005: Scalability (7 items)

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-021 | Decompose App.tsx: extract `PluginController` component (~200 lines of plugin loading, navigation, dialogs) | P1 | M | none |
| AI-049-022 | Decompose App.tsx: extract `MidiRouter` hook/component (~100 lines of MIDI input distribution and plugin subscriber fan-out) | P1 | M | AI-049-021 |
| AI-049-023 | Decompose App.tsx: extract `AudioManager` component (~80 lines of Tone.js lazy loading and audio engine lifecycle) | P2 | S | AI-049-021 |
| AI-049-024 | Create CODEOWNERS file with ownership assignments for `frontend/`, `backend/`, `specs/`, `plugins-external/` | P1 | S | none |
| AI-049-025 | Add IndexedDB storage quota check before score import with user-friendly warning when approaching browser limits | P2 | S | none |
| AI-049-026 | Create `docker-compose.prod.yml` with Nginx reverse proxy, 2 backend replicas, health-check rolling updates, and resource limits | P3 | M | none |
| AI-049-027 | Evaluate Nx/Turborepo when team exceeds 10 developers or full build exceeds 10 minutes | P3 | M | Triggered by growth threshold |

---

## Summary by Priority

| Priority | Count | Effort Distribution |
|----------|-------|---------------------|
| P1 | 10 | 4S + 5M + 1L |
| P2 | 9 | 7S + 2M |
| P3 | 8 | 3S + 4M + 1L |
| **Total** | **27** | **14S + 11M + 2L** |
