//! Criterion benchmarks for layout engine performance
//!
//! Tests layout computation time for various score sizes.
//! Success criteria: <100ms for 50 measures, <200ms for 100 measures, <400ms for 200 measures

use criterion::{Criterion, black_box, criterion_group, criterion_main};
use musicore_backend::layout::{LayoutConfig, compute_layout};
use std::fs;

/// Load test fixture from file
fn load_fixture(name: &str) -> serde_json::Value {
    let path = format!("tests/fixtures/{}", name);
    let content =
        fs::read_to_string(&path).unwrap_or_else(|_| panic!("Failed to load fixture: {}", path));
    serde_json::from_str(&content).expect("Failed to parse JSON fixture")
}

/// Benchmark layout computation for 50-measure piano score
///
/// Target: <100ms (SC-001)
fn bench_layout_50_measures(c: &mut Criterion) {
    let score = load_fixture("piano_50_measures.json");
    let config = LayoutConfig::default();

    c.bench_function("layout_50_measures", |b| {
        b.iter(|| compute_layout(black_box(&score), black_box(&config)));
    });
}

/// Benchmark layout computation for 100-measure piano score
///
/// Target: <200ms (SC-002)
fn bench_layout_100_measures(c: &mut Criterion) {
    let score = load_fixture("piano_100_measures.json");
    let config = LayoutConfig::default();

    c.bench_function("layout_100_measures", |b| {
        b.iter(|| compute_layout(black_box(&score), black_box(&config)));
    });
}

/// Benchmark layout computation for 200-measure piano score
///
/// Target: <400ms (SC-003)
fn bench_layout_200_measures(c: &mut Criterion) {
    let score = load_fixture("piano_200_measures.json");
    let config = LayoutConfig::default();

    c.bench_function("layout_200_measures", |b| {
        b.iter(|| compute_layout(black_box(&score), black_box(&config)));
    });
}

/// Benchmark layout computation for dense 30-measure score
///
/// Tests batching performance with 480 glyphs
fn bench_layout_dense_30_measures(c: &mut Criterion) {
    let score = load_fixture("piano_30_measures_dense.json");
    let config = LayoutConfig::default();

    c.bench_function("layout_30_measures_dense", |b| {
        b.iter(|| compute_layout(black_box(&score), black_box(&config)));
    });
}

criterion_group!(
    benches,
    bench_layout_50_measures,
    bench_layout_100_measures,
    bench_layout_200_measures,
    bench_layout_dense_30_measures
);
criterion_main!(benches);
