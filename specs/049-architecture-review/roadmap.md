# Architecture Improvement Roadmap

**Date**: 2026-03-13  
**Source**: ADRs 049-001 through 049-005

---

## Planning Cycle 1 (Immediate)

High-impact, low-to-medium effort items that address the most pressing scalability and stability concerns. All P1 items are included here.

| Rank | Action Item | ADR Source | Impact | Effort | Description |
|------|-------------|-----------|--------|--------|-------------|
| 1 | AI-049-021 | ADR-049-005 | High | M | Decompose App.tsx: extract `PluginController` — reduces merge-conflict risk for the highest-contention file |
| 2 | AI-049-003 | ADR-049-001 | High | S | Add try/catch error isolation to MIDI event fan-out — prevents one plugin from breaking all MIDI input |
| 3 | AI-049-002 | ADR-049-001 | High | S | Replace sequential plugin loading with `Promise.allSettled` — reduces init time for imported plugins |
| 4 | AI-049-024 | ADR-049-005 | High | S | Create CODEOWNERS file — enables automated review routing |
| 5 | AI-049-017 | ADR-049-004 | Med | S | Parallelize pre-push pipeline (Rust tests ∥ TypeScript build) — saves ~30s per push |
| 6 | AI-049-022 | ADR-049-005 | High | M | Decompose App.tsx: extract `MidiRouter` — completes god-component decomposition |
| 7 | AI-049-001 | ADR-049-001 | High | M | Switch non-core built-in plugins to lazy-loaded chunks — reduces initial bundle size |
| 8 | AI-049-008 | ADR-049-002 | Med | S | Document 5ms MIDI migration threshold in architecture guide |
| 9 | AI-049-015 | ADR-049-004 | Med | M | Consolidate layout integration tests into E2E visual snapshots + thin contract assertions |
| 10 | AI-049-016 | ADR-049-004 | Med | S | Merge ClefPositioning tests into retained contract tests |

## Planning Cycle 2 (Next Quarter)

P2 items and remaining P1 completion. Focus on documentation, monitoring, and gap-filling.

| Rank | Action Item | ADR Source | Impact | Effort | Description |
|------|-------------|-----------|--------|--------|-------------|
| 11 | AI-049-004 | ADR-049-001 | Med | S | Add degraded-mode UI for failed imported plugins (warning badge in plugin manager) |
| 12 | AI-049-005 | ADR-049-001 | Med | S | Document that plugin initialization order is undefined |
| 13 | AI-049-023 | ADR-049-005 | Med | S | Decompose App.tsx: extract `AudioManager` component |
| 14 | AI-049-009 | ADR-049-002 | Med | S | Add MIDI profiling instrumentation behind debug flag |
| 15 | AI-049-010 | ADR-049-002 | Low | S | Add README note explaining Rust MIDI prototype purpose |
| 16 | AI-049-012 | ADR-049-003 | Med | S | Document React migration threshold in architecture guide |
| 17 | AI-049-013 | ADR-049-003 | Med | S | Add React DevTools Profiler to pre-release checklist |
| 18 | AI-049-018 | ADR-049-004 | Med | M | Add backend playback contract tests (tick/duration accuracy) |
| 19 | AI-049-025 | ADR-049-005 | Med | S | Add IndexedDB storage quota check before score import |

## Planning Cycle 3 (Backlog)

P3 items — evaluated when triggered by growth thresholds or specific needs.

| Rank | Action Item | ADR Source | Impact | Effort | Description |
|------|-------------|-----------|--------|--------|-------------|
| 20 | AI-049-006 | ADR-049-001 | Low | M | Evaluate plugin lifecycle management (unload/dispose at runtime) |
| 21 | AI-049-014 | ADR-049-003 | Low | S | Evaluate `React.memo()` for shared plugin components |
| 22 | AI-049-019 | ADR-049-004 | Low | S | Evaluate Vitest coverage reporting (no threshold enforcement) |
| 23 | AI-049-020 | ADR-049-004 | Low | M | Add `--changed-only` test selection when suite exceeds 1000 cases |
| 24 | AI-049-026 | ADR-049-005 | Low | M | Create `docker-compose.prod.yml` with replicas and load balancer |
| 25 | AI-049-011 | ADR-049-002 | Low | M | Design TypeScript → WASM batch pipeline when algorithm exceeds 5ms threshold |
| 26 | AI-049-027 | ADR-049-005 | Low | M | Evaluate Nx/Turborepo when team >10 devs or build >10 minutes |
| 27 | AI-049-007 | ADR-049-001 | Low | L | Create plugin developer CLI scaffolding tool |

---

## Dependencies

```
AI-049-021 (PluginController) ──┬── AI-049-022 (MidiRouter)
                                └── AI-049-023 (AudioManager)

AI-049-002 (Promise.allSettled) ──── AI-049-004 (Degraded-mode UI)

AI-049-015 (Layout test consolidation) ──── AI-049-016 (Clef test merge)
```

All dependencies flow forward (dependent items are in the same or later planning cycle).

---

## Validation Checklist

- [X] All 27 action items from ADRs 001–005 appear in exactly one planning cycle
- [X] All P1 items (10) appear in Cycle 1
- [X] All P2 items (9) appear in Cycle 2
- [X] All P3 items (8) appear in Cycle 3
- [X] Dependencies satisfied: AI-049-022 and AI-049-023 depend on AI-049-021 (all Cycle 1/2); AI-049-004 depends on AI-049-002 (Cycle 2 after Cycle 1); AI-049-016 depends on AI-049-015 (Cycle 1)
- [X] Each item references its source ADR
