# Quickstart: Architecture Review (049)

## What is this feature?

A structured review of five architectural concerns producing Architecture Decision Records (ADRs) and a prioritized improvement roadmap. The review is analytical with two targeted technical spikes.

## Deliverables

1. **5 ADRs** — one per concern area (all Status: Proposed):
   - `adrs/ADR-049-001-plugin-architecture.md`: Plugin Architecture — lazy-load + parallel loading + error boundaries
   - `adrs/ADR-049-002-midi-processing.md`: MIDI Processing Boundary — keep in TypeScript, 5ms migration threshold
   - `adrs/ADR-049-003-frontend-framework.md`: Frontend Framework — stay on React 19
   - `adrs/ADR-049-004-test-strategy.md`: Test Strategy — consolidate cross-level redundancy, parallelize pipeline
   - `adrs/ADR-049-005-scalability.md`: Scalability Readiness — decompose App.tsx, add CODEOWNERS

2. **2 Technical Spikes** (code artifacts):
   - MIDI latency benchmark: `backend/src/midi_prototype.rs` (Rust prototype) + `backend/benches/midi_latency.rs` (criterion benchmark). Results: 35ns/call Rust native, confirming WASM boundary overhead dominates.
   - Plugin load test: `frontend/tests/benchmarks/plugin-load.test.ts` (10 tests, all passing). Results: 20 plugins init in ~20ms, error isolation confirmed.

3. **1 Roadmap** — `roadmap.md`: 27 action items across 3 planning cycles (10 P1, 9 P2, 8 P3)

4. **1 Action Items Inventory** — `adrs/action-items-inventory.md`: Master list of all 27 action items

5. **1 Baseline Metrics** — `adrs/baseline-metrics.md`: Codebase metrics used as evidence across all ADRs

## How to navigate the output

### Reading the ADRs

Each ADR follows the template in [contracts/adr-template.md](contracts/adr-template.md). Start with the **Decision** section for the recommendation, then read **Consequences** for trade-offs.

- **P1 ADRs** (read first): ADR-049-001 (Plugin), ADR-049-002 (MIDI)
- **P2 ADRs**: ADR-049-003 (Framework), ADR-049-004 (Tests), ADR-049-005 (Scalability)

### Understanding the roadmap

`roadmap.md` sequences all action items from all ADRs:
- **Cycle 1 (Immediate)**: 10 items — App.tsx decomposition, MIDI error isolation, parallel plugin loading, CODEOWNERS, pipeline parallelization
- **Cycle 2 (Next Quarter)**: 9 items — documentation, profiling, gap-filling
- **Cycle 3 (Backlog)**: 8 items — evaluated when triggered by growth thresholds

### Running the spikes

**MIDI benchmark** (requires Rust toolchain):
```bash
cd backend && cargo bench --bench midi_latency
```

**Plugin load test** (requires Node.js):
```bash
cd frontend && npx vitest run tests/benchmarks/plugin-load.test.ts
```

## Key files

| File | Purpose |
|------|---------|
| [spec.md](spec.md) | Full specification with acceptance criteria |
| [research.md](research.md) | Research findings for all 5 concern areas |
| [tasks.md](tasks.md) | 48 tasks across 9 phases (all complete) |
| [roadmap.md](roadmap.md) | Prioritized improvement roadmap |
| [adrs/action-items-inventory.md](adrs/action-items-inventory.md) | Master list of 27 action items |
| [adrs/baseline-metrics.md](adrs/baseline-metrics.md) | Codebase metrics baseline |
| [contracts/adr-template.md](contracts/adr-template.md) | Required ADR format |
| [contracts/roadmap-template.md](contracts/roadmap-template.md) | Required roadmap format |

## Key codebase files analyzed

| File | Relevance |
|------|-----------|
| `frontend/src/App.tsx` | Plugin initialization, MIDI routing, event fan-out (878 lines, 15+ responsibilities) |
| `frontend/src/plugin-api/types.ts` | Plugin API type surface (1,082 lines, ~30 types) |
| `frontend/src/services/plugins/builtinPlugins.ts` | Build-time plugin discovery (eager glob) |
| `frontend/src/services/recording/midiUtils.ts` | MIDI message parsing (88 lines, O(1) functions) |
| `frontend/src/services/chord/ChordDetector.ts` | Chord detection (54 lines, O(n)) |
| `.githooks/pre-push` | Sequential test pipeline (2–5 min) |
| `backend/src/midi_prototype.rs` | Rust MIDI prototype (spike artifact) |
| `backend/benches/midi_latency.rs` | Criterion benchmark (spike artifact) |
| `frontend/tests/benchmarks/plugin-load.test.ts` | Plugin load test (spike artifact) |

## Constitution compliance

All 7 constitution principles pass. Key points:
- Test-First (V): MIDI spike and plugin load test include tests.
- Layout Engine Authority (VI): Not affected — no alternative layout engines proposed.
- Regression Prevention (VII): Test strategy ADR preserves regression detection while reducing redundancy.
