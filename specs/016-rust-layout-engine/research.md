# Research: Rust Layout Engine

**Feature**: 016-rust-layout-engine  
**Date**: 2026-02-12  
**Status**: Phase 0 Complete

## Overview

This document resolves all technical uncertainties identified during planning. Each decision includes rationale, alternatives considered, and implementation guidance.

---

## Decision 1: SMuFL Font Metrics Integration

### Decision

**Embed Bravura font metrics JSON** in Rust binary at compile time using `include_str!()` macro. Parse metrics once during module initialization into static data structure.

### Rationale

- **Determinism**: Embedded metrics guarantee identical bounding boxes across all devices
- **Offline**: No network fetch, no runtime file I/O, works in WASM without filesystem
- **Performance**: Parse once at startup (10-20ms), reuse for all layout operations
- **Size**: Bravura metrics JSON ~50KB uncompressed, negligible WASM bundle impact

### Alternatives Considered

1. **Fetch metrics from CDN at runtime**
   - ❌ Rejected: Requires network, breaks offline-first principle
   - ❌ Rejected: Latency (200ms+) delays initial score rendering
   
2. **Ship TrueType font file, parse OpenType tables**
   - ❌ Rejected: Complex font parsing logic (TTF/OTF table reading)
   - ❌ Rejected: Font file 200KB+ vs 50KB for metrics JSON
   - ❌ Rejected: No benefit over pre-extracted metrics

3. **Hardcode bounding boxes for common glyphs**
   - ❌ Rejected: Incomplete (SMuFL has 2,400+ glyphs)
   - ❌ Rejected: Manual maintenance burden as font updates

### Implementation Notes

```rust
// backend/src/layout/metrics.rs
const BRAVURA_METRICS: &str = include_str!("../../../assets/bravura_metadata.json");

lazy_static! {
    static ref METRICS: HashMap<char, GlyphMetrics> = parse_metrics(BRAVURA_METRICS);
}

pub fn get_glyph_bbox(codepoint: char) -> BoundingBox {
    METRICS.get(&codepoint).map(|m| m.bounding_box).unwrap_or_default()
}
```

Source metrics from: https://github.com/steinbergmedia/bravura (official SMuFL reference font)

---

## Decision 2: Horizontal Spacing Algorithm

### Decision

**Duration-proportional spacing** with minimum separation constraint:

```rust
spacing_width = max(
    base_spacing + (duration_ticks / quarter_note_ticks) * duration_factor,
    minimum_spacing
)
```

**Default values**:
- `base_spacing = 20.0` logical units (2 staff spaces)
- `duration_factor = 40.0` (quarter note = 4 staff spaces additional)
- `minimum_spacing = 20.0` logical units (prevent collision)

### Rationale

- **Musical tradition**: Longer notes get more horizontal space (visual rhythm)
- **Simplicity**: Linear scaling is predictable and fast (O(n) for n notes)
- **Determinism**: Integer durations + floating point arithmetic = consistent results
- **Configurable**: Expose config struct for density adjustment

### Alternatives Considered

1. **Optical spacing (SpringLayout algorithm)**
   - ❌ Rejected: Complex iterative solver (100+ iterations)
   - ❌ Rejected: Non-deterministic (floating point accumulation varies)
   - ❌ Rejected: 10x slower (100ms budget insufficient)
   
2. **Fixed spacing (ignore durations)**
   - ❌ Rejected: Violates music notation conventions
   - ❌ Rejected: Whole notes and 16th notes can't have same width

3. **Logarithmic duration scaling**
   - ❌ Rejected: Overcorrects (whole notes become excessively wide)
   - ❌ Rejected: Less intuitive than linear proportional

### Implementation Notes

```rust
// backend/src/layout/spacer.rs
pub struct SpacingConfig {
    pub base_spacing: f32,        // Minimum space for any note
    pub duration_factor: f32,     // Multiplier for duration-based spacing
    pub minimum_spacing: f32,     // Collision prevention
}

pub fn compute_note_spacing(
    duration_ticks: u32,
    config: &SpacingConfig
) -> f32 {
    let proportional = config.base_spacing 
        + (duration_ticks as f32 / 960.0) * config.duration_factor;
    proportional.max(config.minimum_spacing)
}
```

Handle simultaneous events (chords): Group by `start_tick`, assign single x-position to entire vertical column.

---

## Decision 3: System Breaking Algorithm

### Decision

**Greedy measure-by-measure breaking** with max width constraint:

1. Start new system with first measure
2. For each subsequent measure:
   - Compute width if added to current system
   - If width ≤ max_system_width → add measure
   - If width > max_system_width → start new system with current measure
3. Single oversized measure gets its own system (enable horizontal scroll)

**Default**: `max_system_width = 800.0` logical units (~80 staff spaces)

### Rationale

- **Simplicity**: O(n) algorithm, single pass through measures
- **Determinism**: No optimization heuristics, predictable breaks
- **Measure boundaries**: Music notation always breaks at barlines
- **Performance**: <1ms for 200 measures (no iteration, no backtracking)

### Alternatives Considered

1. **Optimal line breaking (Knuth-Plass algorithm)**
   - ❌ Rejected: Designed for text, not music notation
   - ❌ Rejected: Dynamic programming O(n²) too slow for 200 measures
   - ❌ Rejected: "Badness" scoring doesn't map to music layout

2. **Fill-to-capacity (dynamic measure count per system)**
   - ❌ Rejected: Creates visual inconsistency (system 1: 5 measures, system 2: 2 measures)
   - ❌ Rejected: Same algorithm as greedy measure-by-measure

3. **Fixed measures per system**
   - ❌ Rejected: Doesn't handle variable measure widths (4/4 vs 12/8, dense vs sparse)
   - ❌ Rejected: Oversized measures overflow system bounds

### Implementation Notes

```rust
// backend/src/layout/breaker.rs
pub fn break_into_systems(
    measures: &[Measure],
    max_width: f32,
    spacer: &Spacer
) -> Vec<System> {
    let mut systems = vec![];
    let mut current_system = System::new(0);
    let mut current_width = 0.0;

    for measure in measures {
        let measure_width = spacer.compute_measure_width(measure);
        
        if current_width + measure_width > max_width && !current_system.is_empty() {
            systems.push(current_system);
            current_system = System::new(systems.len());
            current_width = 0.0;
        }
        
        current_system.add_measure(measure);
        current_width += measure_width;
    }
    
    if !current_system.is_empty() {
        systems.push(current_system);
    }
    
    systems
}
```

---

## Decision 4: Deterministic Serialization

### Decision

**Round floating point positions to 2 decimal places** before JSON serialization:

```rust
#[derive(Serialize)]
pub struct Point {
    #[serde(serialize_with = "round_f32")]
    pub x: f32,
    #[serde(serialize_with = "round_f32")]
    pub y: f32,
}

fn round_f32<S>(value: &f32, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_f32((value * 100.0).round() / 100.0)
}
```

### Rationale

- **Determinism**: Eliminates floating-point representation variance across platforms
- **Precision**: 0.01 logical units = 0.001 staff spaces, imperceptible at any zoom level
- **Caching safety**: SHA-256 hash of JSON is stable, cache hits guaranteed
- **Size**: Reduces JSON bloat from 15-digit floats to 4-5 digit values

### Alternatives Considered

1. **Fixed-point arithmetic (store coordinates as integers × 100)**
   - ❌ Rejected: Requires pervasive code changes (all f32 → i32)
   - ❌ Rejected: Breaks SMuFL metrics which are f32 in original JSON
   - ❌ Rejected: Serialization rounding achieves same goal with less code

2. **Use `ordered_float` crate for deterministic f32**
   - ❌ Rejected: Doesn't solve JSON serialization variance
   - ❌ Rejected: Overhead for arithmetic operations (wrapping/unwrapping)

3. **Serialize as raw bytes instead of JSON**
   - ❌ Rejected: Loses human-readable debugging
   - ❌ Rejected: No browser IndexedDB interop (requires custom deserializer)

### Implementation Notes

Apply rounding to all serialized types: `Point`, `BoundingBox` fields (x, y, width, height), `StaffLine` y_position, `GlyphRun` font_size. Internal computation uses full f32 precision; rounding happens only during serialization.

---

## Decision 5: Glyph Batching Strategy

### Decision

**Consecutive glyph grouping** with property comparison:

1. Iterate glyphs in left-to-right, top-to-bottom order
2. Start new `GlyphRun` with first glyph
3. For each subsequent glyph:
   - If `font_family`, `font_size`, `color`, `opacity` match current run → append
   - If any property differs → finalize current run, start new run
4. Result: Array of `GlyphRun` with maximal batching

### Rationale

- **Rendering efficiency**: Single Canvas `fillText()` or WebGL draw call per run
- **Simplicity**: O(n) single-pass algorithm, no lookahead
- **Natural grouping**: Noteheads are consecutive, accidentals are consecutive, etc.
- **No overhead**: Batching adds ~1ms for 2000 glyphs

### Alternatives Considered

1. **Spatial clustering (quad-tree grouping)**
   - ❌ Rejected: Breaks left-to-right drawing order (painter's algorithm)
   - ❌ Rejected: Complexity doesn't improve rendering (still need property match)

2. **Global batching by glyph type**
   - ❌ Rejected: Requires sorting all glyphs by type (breaks spatial locality)
   - ❌ Rejected: Canvas z-order issues (accidentals must draw before noteheads)

3. **Fixed batch size (e.g., max 100 glyphs per run)**
   - ❌ Rejected: Artificial constraint, no rendering benefit
   - ❌ Rejected: May split natural groupings (200 noteheads → 2 runs unnecessarily)

### Implementation Notes

```rust
// backend/src/layout/batcher.rs
pub fn batch_glyphs(glyphs: Vec<Glyph>) -> Vec<GlyphRun> {
    if glyphs.is_empty() {
        return vec![];
    }
    
    let mut runs = vec![];
    let mut current_run = GlyphRun::new(&glyphs[0]);
    
    for glyph in glyphs.into_iter().skip(1) {
        if current_run.can_batch(&glyph) {
            current_run.add_glyph(glyph);
        } else {
            runs.push(current_run);
            current_run = GlyphRun::new(&glyph);
        }
    }
    
    runs.push(current_run);
    runs
}
```

**Property extraction**: Glyphs don't store drawing properties directly. Infer from `source_reference`:
- Noteheads → Bravura, 40.0pt, black, 1.0 opacity
- Dynamics → Bravura, 32.0pt, black, 1.0 opacity
- Annotations → Arial, 24.0pt, gray, 0.8 opacity

---

## Decision 6: Performance Benchmarking

### Decision

**Criterion.rs benchmarks** + **Chrome DevTools profiling**:

1. **Criterion.rs** (Rust side):
   - Measure `compute_layout()` for fixtures (50, 100, 200 measures)
   - Measure subsystems: `spacer.rs`, `breaker.rs`, `positioner.rs`
   - Track regression: Fail CI if >10% slower than baseline

2. **Chrome DevTools** (WASM side):
   - Profile WASM execution in browser (Performance tab)
   - Measure total time from `layout_wasm.compute()` to result
   - Verify <100ms target on 2018 iPad (A12 benchmarks via BrowserStack)

### Rationale

- **Criterion standard**: Rust community standard, statistical rigor, regression detection
- **Real-world validation**: WASM profiling catches compilation overhead, JS interop cost
- **Incremental**: Benchmark each module independently for granular optimization
- **CI integration**: Automated performance gate prevents regressions

### Alternatives Considered

1. **Manual timing with `std::time::Instant`**
   - ❌ Rejected: No statistical analysis (mean, std dev, outlier detection)
   - ❌ Rejected: Manual baseline tracking (Criterion automates)

2. **Black-box benchmarking only (end-to-end)**
   - ❌ Rejected: Can't isolate bottlenecks (is spacer slow? breaker?)
   - ❌ Rejected: Optimization requires granular metrics

3. **Skip WASM benchmarking**
   - ❌ Rejected: WASM has 20-30% overhead vs native Rust
   - ❌ Rejected: Only WASM matters for production (users don't run native binary)

### Implementation Notes

```rust
// backend/benches/layout_bench.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_layout_50_measures(c: &mut Criterion) {
    let score = load_fixture("fixtures/piano_50_measures.json");
    c.bench_function("layout_50_measures", |b| {
        b.iter(|| compute_layout(black_box(&score), &LayoutConfig::default()))
    });
}

criterion_group!(benches, bench_layout_50_measures);
criterion_main!(benches);
```

Run: `cargo bench --bench layout_bench`

Chrome profiling: Record Performance, interact with score, analyze "WASM" flame graph.

---

## Summary

All technical decisions resolved. No outstanding "NEEDS CLARIFICATION" items. Ready for Phase 1 design (data-model.md, contracts/, quickstart.md).

**Key Takeaways**:
- SMuFL metrics embedded for determinism and offline capability
- Duration-proportional spacing balances tradition and performance
- Greedy system breaking is simple, deterministic, fast
- Serialization rounding ensures byte-identical caching
- Consecutive glyph batching maximizes rendering efficiency
- Criterion + Chrome DevTools provide comprehensive performance validation

**Next Phase**: Generate data-model.md with entity relationships and field descriptions.
