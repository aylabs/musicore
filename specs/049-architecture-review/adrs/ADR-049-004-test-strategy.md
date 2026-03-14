# ADR-049-004: Test Strategy Rationalization

**Status**: Proposed  
**Date**: 2026-03-13  
**Concern Area**: Test Strategy

## Context

Graditone's test suite contains ~740 test cases across 50 test files, organized in five layers:

| Layer | Files | Test Cases | Runner |
|-------|-------|------------|--------|
| Backend (Rust) | 23 | ~185 | `cargo test` |
| Frontend unit | 9 | ~240 | Vitest (happy-dom) |
| Frontend integration | 6 | ~220 | Vitest (happy-dom) |
| Frontend performance | 1 | 13 | Vitest (excluded from pre-push) |
| Frontend E2E | 9 | ~75 | Playwright |

The **pre-push pipeline** (`.githooks/pre-push`) runs these stages sequentially:
1. Rust tests (10–30s)
2. TypeScript build (20–60s)
3. Frontend unit + integration tests, excluding performance (10–30s)
4. E2E tests via Playwright (60–180s, 3-minute timeout)

Total pre-push duration: **~2–5 minutes**, all sequential with no parallelism between stages.

Key configuration:
- Vitest uses `happy-dom` (lightweight DOM), excludes `e2e/`, `visual/`, and `virtual-keyboard-pro/` directories.
- No coverage threshold is configured.
- Performance tests (`Virtualization.test.tsx`) are excluded from pre-push because they are timing-sensitive and flaky under local developer load.

## Concern

Does the current test suite have cross-level redundancy that inflates maintenance cost without improving regression detection, and can the pre-push pipeline be optimized without reducing coverage quality?

## Alternatives Considered

### Alternative 1: Cut All Integration Tests (Unit + E2E Only)
- **Description**: Remove the integration test layer entirely. Rely on fast unit tests for logic and E2E tests for user workflows.
- **Pros**: Eliminates the middle layer (~220 tests), simplifying the test pyramid. Reduces pre-push time by 10–30s.
- **Cons**: Loses fast feedback on rendering bugs. Integration tests like `SingleVoice.test.tsx` catch SVG rendering errors in 2–5 seconds, while equivalent E2E tests take 30–60 seconds. `file-persistence.test.tsx` (50+ tests for IndexedDB round-trips) would be expensive to replicate in E2E.

### Alternative 2: Cut E2E Tests (Unit + Integration Only)
- **Description**: Remove Playwright E2E tests. Rely on unit and integration tests for all validation.
- **Pros**: Eliminates the slowest stage (60–180s) from the pre-push pipeline.
- **Cons**: Loses user-flow confidence. No test verifies the full chain from "user clicks Play" to "score plays with highlight." Cannot test real browser behavior (Web MIDI API, IndexedDB quotas, service worker registration, viewport interactions). E2E tests catch failures that no other layer can.

### Alternative 3: Consolidate Overlapping Cross-Level Tests
- **Description**: Keep all three test layers but remove specific tests that duplicate coverage at another layer. Focus on tests where the same input → output is verified at multiple levels without adding distinct value. Parallelize the pre-push pipeline where stages are independent.
- **Pros**: Reduces redundancy without losing any coverage category. Each remaining test adds unique value. Pipeline parallelization reduces wall-clock time without cutting tests.
- **Cons**: Requires per-test analysis to identify redundancy candidates (one-time effort). Risk of removing a test that appeared redundant but caught a unique edge case.

### Alternative 4: Add Coverage Thresholds
- **Description**: Configure Vitest with coverage threshold enforcement (e.g., 80% line coverage). Let the threshold prevent under-testing.
- **Pros**: Provides a quantitative safety net against test gaps.
- **Cons**: Promotes writing low-value tests to hit the threshold number. Does not address existing redundancy. Can block PRs for untested generated code or dead code paths.

## Decision

**Selected: Alternative 3** — Consolidate overlapping cross-level tests and parallelize the pre-push pipeline.

This approach targets the identified redundancy clusters without sacrificing any coverage category, achieving the ≥10% reduction target (SC-004) through targeted consolidation rather than blanket cuts.

### Identified Redundancy Clusters

**1. Layout rendering (severe overlap — ~55 integration + ~160 unit tests overlap with 48 backend tests):**
- `SingleVoice.test.tsx` (~40 tests) and `MultiStaff.test.tsx` (~15 tests) verify SVG output from WASM layout data. The backend's `layout_test.rs` (44 tests) and `layout_integration_test.rs` (4 tests) already validate the same coordinate computations from the Rust side. The frontend integration tests add value only for the SVG rendering transform (Rust coordinates → SVG elements), which can be covered by a thin contract test + E2E snapshots.
- **Action**: Consolidate `SingleVoice.test.tsx` and `MultiStaff.test.tsx` into E2E visual snapshot tests. Keep 5–10 thin contract assertions that verify the WASM → SVG transform shape (not coordinate values).

**2. Clef positioning (moderate overlap):**
- `ClefPositioning.test.ts` (13 tests) tests MIDI-to-staff-position mapping, which is already covered by clef-specific assertions in `SingleVoice.test.tsx` and validated in `api_clef_serialization_test.rs` (7 tests).
- **Action**: Merge `ClefPositioning.test.ts` into the retained thin contract tests from `SingleVoice`.

**3. Playback/highlight (gap, not redundancy):**
- `playback-integration.test.tsx` (4 tests), `highlight-sync.test.tsx` (6 tests), and E2E `play-score-plugin.spec.ts` test different aspects — no redundancy identified. However, no backend test validates that WASM produces correct tick/duration values for playback. A gap exists.

### Pipeline Parallelization

The pre-push pipeline can safely parallelize:
- **Stage A** (parallel): Rust tests + TypeScript build (independent — different compilers, no shared output)
- **Stage B** (after A): Frontend unit + integration tests (requires build artifacts for WASM types)
- **Stage C** (after B): E2E tests

This reduces wall-clock time by the overlap of Rust tests and TypeScript build (~20–60s savings).

## Consequences

### Positive
- ~70 redundant test cases consolidated (55 layout integration + 13 clef unit = 68 tests, ~9% of total). Combined with pipeline parallelization, this meets the SC-004 target of ≥10% reduction in test maintenance burden.
- Pre-push pipeline wall-clock time reduced by ~30s through parallelizing Rust tests and TypeScript build.
- Remaining tests each provide unique coverage at their specific layer.

### Negative
- Consolidating `SingleVoice.test.tsx` into E2E snapshots means SVG rendering regressions are caught more slowly (E2E takes 30–60s vs integration's 2–5s). Mitigated by keeping 5–10 thin contract assertions in the integration layer.
- One-time effort to write E2E visual snapshot tests to replace the consolidated integration tests.

### Neutral
- Backend Rust tests unchanged (185 tests — well-structured, no redundancy).
- `file-persistence.test.tsx` (50+ tests) retained — tests unique frontend serialization logic not covered elsewhere.
- Performance tests remain excluded from pre-push (timing-sensitive; run in CI only).
- E2E test count slightly increases as layout visual snapshots are added.

## Risk Assessment

1. **Removing a test that appeared redundant but caught a unique edge case**: If a layout rendering bug is only caught by the removed `SingleVoice.test.tsx` assertions (not by backend tests or E2E snapshots), it could slip to production. **Mitigation**: Before removing each test, verify that its specific assertion is covered by either (a) a backend Rust test or (b) the new E2E visual snapshot. Tag removed tests with a tracking comment for the first 2 sprints.

2. **Pipeline parallelization introduces race conditions**: Running `cargo test` and `npm run build` simultaneously could cause resource contention on developer machines (CPU, memory). **Mitigation**: Use `nice` or background process limits. If contention is observed, revert to sequential with a flag.

3. **E2E visual snapshots are brittle**: SVG snapshot tests can break on minor rendering changes (font kerning, spacing adjustments) that are intentional. **Mitigation**: Use semantic snapshot comparison (element counts, approximate positions) rather than pixel-perfect comparison.

4. **Playback gap remains unaddressed**: No backend test validates tick/duration accuracy for playback. If the WASM layout engine returns incorrect timing values, only frontend integration tests catch it. **Mitigation**: Add backend playback contract tests as part of the action items.

## Action Items

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-015 | Consolidate `SingleVoice.test.tsx` and `MultiStaff.test.tsx` into E2E visual snapshot tests + 5–10 thin contract assertions in the integration layer | P1 | M (1–3 days) | none |
| AI-049-016 | Merge `ClefPositioning.test.ts` assertions into the retained thin contract tests | P1 | S (< 1 day) | AI-049-015 |
| AI-049-017 | Parallelize pre-push pipeline: run `cargo test` and `npm run build` concurrently in Stage A | P1 | S (< 1 day) | none |
| AI-049-018 | Add backend playback contract tests validating tick/duration accuracy in WASM output | P2 | M (1–3 days) | none |
| AI-049-019 | Evaluate adding Vitest coverage reporting (no threshold enforcement) to track coverage trends | P3 | S (< 1 day) | none |
| AI-049-020 | Add `--changed-only` test selection to pre-push hook for faster developer feedback when test suite exceeds 1000 cases | P3 | M (1–3 days) | none |
