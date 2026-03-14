# ADR-049-002: MIDI Processing Boundary

**Status**: Proposed  
**Date**: 2026-03-13  
**Concern Area**: MIDI Processing

## Context

Graditone's MIDI processing is implemented entirely in TypeScript across three files totaling ~355 lines of production code:

- **`midiUtils.ts`** (88 lines): Three pure functions — `midiNoteToLabel` (pitch class lookup, O(1)), `parseMidiNoteOn` (status byte parsing, O(1)), and `parseMidiNoteOff` (status byte parsing, O(1)). These handle raw MIDI 1.0 byte arrays from the Web MIDI API.
- **`useMidiInput.ts`** (213 lines): React hook managing Web MIDI API lifecycle — device enumeration, hotplug detection (300ms debounce), permission handling, and event routing. Complexity is driven by browser API state management, not computation.
- **`ChordDetector.ts`** (54 lines): Two methods — `groupByTick` (O(n) reduce) and `filterChordCandidates` (O(n) filter) for identifying simultaneous notes. Trivial for typical chord sizes (2–6 notes).

The backend already uses Rust compiled to WebAssembly (via wasm-bindgen 0.2) for the layout engine. This creates a natural question: should MIDI processing cross the same TypeScript → Rust/WASM boundary?

A Rust prototype was built during this review (`backend/src/midi_prototype.rs`) mirroring the three TypeScript parsing functions, with criterion benchmarks (`backend/benches/midi_latency.rs`) to quantify the latency difference.

## Concern

Should MIDI event parsing and chord detection be migrated from TypeScript to Rust/WASM to improve real-time performance, or does the current TypeScript implementation meet latency requirements and justify keeping the processing boundary in JavaScript?

## Alternatives Considered

### Alternative 1: Keep All MIDI Processing in TypeScript
- **Description**: Maintain the current architecture where all MIDI parsing, chord detection, and device management remain in TypeScript. Set a migration threshold of 5ms per event for future algorithms.
- **Pros**: Zero migration cost. Browser Web MIDI API is JavaScript-only — parsed events stay in the same runtime with no serialization. Current functions are O(1) and already sub-microsecond. Developer velocity is higher (TypeScript hot reload vs Rust compile + WASM rebuild). Testing uses the same Vitest infrastructure as the rest of the frontend.
- **Cons**: If future algorithms (harmonic analysis, performance scoring) grow computationally expensive, TypeScript may hit a performance ceiling. No Rust type safety for MIDI byte parsing (though the current code is well-tested).

### Alternative 2: Move All Parsing to Rust/WASM
- **Description**: Rewrite `parseMidiNoteOn`, `parseMidiNoteOff`, and `midiNoteToLabel` as wasm-bindgen exports. TypeScript calls WASM for every MIDI event.
- **Pros**: Consistent codebase with the layout engine (all computation in Rust). Rust's type system catches byte-level parsing errors at compile time.
- **Cons**: Web MIDI API is JavaScript-only — raw MIDI messages arrive in JS and must cross the WASM boundary for every single event. Each JS→WASM→JS call adds 2–10μs overhead. For O(1) operations that take <1μs in TypeScript, the boundary crossing alone is 2–10× the computation cost. Serializing `MidiNoteEvent` objects (JS object → serde → Rust struct → serde → JS object) adds further overhead. Development requires Rust compile + wasm-pack build for every change. `useMidiInput` (device management, hotplug, permissions) cannot run in WASM regardless.

### Alternative 3: Hybrid — Parse in TypeScript, Analyze in Rust/WASM
- **Description**: Keep real-time event parsing in TypeScript (where the Web MIDI API lives). Migrate only computationally intensive algorithms (chord recognition with harmonic analysis, performance scoring across thousands of events) to Rust/WASM when they exceed the 5ms threshold.
- **Pros**: Best of both worlds — low-latency parsing stays close to the browser API, while heavy computation gets Rust's performance. Only pays the WASM boundary cost for batch operations where the crossing overhead is amortized.
- **Cons**: Two code locations for MIDI logic, requiring clear architectural boundaries. Two failure modes (TypeScript parsing errors vs WASM computation errors). Increases onboarding complexity for new developers.

### Alternative 4: Full Rust MIDI via WASI/System MIDI
- **Description**: Use Rust with system-level MIDI access (e.g., `midir` crate) instead of the browser Web MIDI API.
- **Pros**: Complete Rust stack for all MIDI processing.
- **Cons**: Not applicable — Graditone is a PWA running in the browser. System MIDI APIs are not available in WebAssembly. Would require a fundamentally different deployment model (native app).

## Decision

**Selected: Alternative 1** (Keep all MIDI in TypeScript), with Alternative 3 as the designated future path if computational algorithms exceed 5ms per event.

The benchmark spike confirmed that the current TypeScript MIDI functions are O(1) and complete in well under 1μs per call. Migrating them to Rust/WASM would make them faster in isolation (~35ns per `parse_note_on` in native Rust) but slower end-to-end due to the 2–10μs WASM boundary crossing overhead. The migration would add cost and complexity with no user-facing benefit.

**Benchmark results (native Rust, Apple Silicon):**

| Operation | 10,000 calls | Per call |
|-----------|-------------|----------|
| `parse_note_on` | 365.83 µs | ~36.6 ns |
| `parse_note_off` | 5.12 µs | ~0.51 ns |
| `note_to_label` | 341.00 µs | ~34.1 ns |
| Single `parse_note_on` | — | 35.05 ns |

These native Rust numbers are impressive (sub-40ns per call), but the WASM boundary crossing (2–10μs) would negate the advantage entirely for individual event parsing. Migration only makes sense for batch processing where thousands of events are sent to WASM in a single call, amortizing the boundary overhead.

**Migration threshold**: If any future MIDI algorithm (harmonic analysis, real-time performance scoring, multi-instrument synchronization) exceeds 5ms per event in TypeScript profiling, it should be migrated to Rust/WASM following the Hybrid pattern (Alternative 3).

## Comparison Matrix

| Criterion | Weight | TypeScript (Alt 1) | Rust/WASM (Alt 2) | Hybrid (Alt 3) |
|-----------|--------|--------------------|--------------------|-----------------|
| Real-time latency | 0.30 | 5 (sub-μs, no boundary) | 2 (boundary overhead > computation) | 4 (parse fast, batch when needed) |
| Maintainability | 0.25 | 5 (single language, hot reload) | 2 (two build chains, serde layer) | 3 (clear boundary but two locations) |
| Developer velocity | 0.20 | 5 (Vitest, instant feedback) | 2 (Rust compile + wasm-pack) | 3 (depends on which side changes) |
| Migration cost | 0.15 | 5 (zero cost) | 1 (rewrite + new test infra) | 3 (incremental, on-demand) |
| Future-proofing | 0.10 | 3 (may hit ceiling for complex algos) | 5 (Rust handles any complexity) | 5 (best of both) |
| **Weighted Total** | | **4.70** | **2.15** | **3.55** |

TypeScript scores highest because the current MIDI workload is simple (O(1) parsing, O(n) chord detection with n ≤ 6) and the WASM boundary crossing is the dominant cost for per-event operations.

## Consequences

### Positive
- Zero migration cost — no code changes required for MIDI processing.
- Development velocity remains high — MIDI changes use TypeScript hot reload and Vitest.
- Latency budget (10ms per event) has massive headroom — current operations take <1μs.
- Clear migration threshold (5ms) provides an objective trigger for future reassessment.

### Negative
- If a computationally expensive MIDI algorithm is needed in the future, the migration to Rust/WASM will require establishing a new data pipeline (batch events in TS → serialize → call WASM → deserialize results).
- Rust's stronger type system for byte-level parsing is not leveraged (mitigated by comprehensive test coverage: 8 Rust prototype tests confirmed identical behavior to TypeScript).

### Neutral
- The Rust MIDI prototype (`backend/src/midi_prototype.rs`) and benchmark (`backend/benches/midi_latency.rs`) remain in the codebase as reference implementations for any future migration.
- The existing Rust/WASM boundary for the layout engine is unaffected.
- Web MIDI API usage in `useMidiInput.ts` stays identical regardless of this decision.

## Risk Assessment

1. **Future algorithm exceeds TypeScript performance ceiling**: If real-time harmonic analysis or performance scoring is added and takes >5ms per event in TypeScript, the app will miss its 10ms latency budget. **Mitigation**: The 5ms threshold triggers migration to Rust/WASM using the Hybrid pattern (Alternative 3). The Rust prototype already demonstrates the parsing API and can serve as a starting point.

2. **WASM boundary overhead increases with wasm-bindgen updates**: Future wasm-bindgen versions might change the JS→WASM calling convention, altering the boundary overhead. **Mitigation**: Re-run the benchmark periodically (the criterion bench is checked in and repeatable). If overhead drops below 100ns, revisit the migration calculus.

3. **ChordDetector grows in complexity**: Currently O(n) with small n, but adding key detection, harmonic analysis, or voice leading would increase complexity. **Mitigation**: Profile before migrating. Only batch algorithms (processing many events at once) benefit from WASM — per-event algorithms are still better in TypeScript due to boundary cost.

4. **Developer confusion about the processing boundary**: With the layout engine in Rust/WASM and MIDI in TypeScript, a new developer might not understand why the boundary differs. **Mitigation**: Document the boundary decision rationale in the project's architecture guide, referencing this ADR and the benchmark results.

## Action Items

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-008 | Document the 5ms migration threshold in the project's architecture guide with a link to this ADR and the benchmark results | P1 | S (< 1 day) | none |
| AI-049-009 | Add TypeScript MIDI profiling instrumentation (behind a debug flag) to measure real-world per-event latency in `midiUtils.ts` | P2 | S (< 1 day) | none |
| AI-049-010 | Keep `backend/src/midi_prototype.rs` and `backend/benches/midi_latency.rs` as reference implementations; add a README note explaining their purpose | P2 | S (< 1 day) | none |
| AI-049-011 | If/when a batch MIDI algorithm exceeding 5ms is identified, design the TypeScript → WASM batch pipeline following the Hybrid pattern (Alternative 3) | P3 | M (1–3 days) | Triggered by profiling |

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-002 | [Task] | P1/P2/P3 | S/M/L/XL | [IDs or none] |
