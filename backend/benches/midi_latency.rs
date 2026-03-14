//! MIDI latency benchmark — Architecture Review Spike (049)
//!
//! Compares Rust MIDI parsing latency for 10,000 operations to establish
//! baseline performance for ADR-049-002. The TypeScript comparison is
//! documented separately (measured via browser performance.now()).
//!
//! Run: cd backend && cargo bench --bench midi_latency

use criterion::{Criterion, black_box, criterion_group, criterion_main};
use musicore_backend::midi_prototype::{
    midi_note_to_label, parse_midi_note_off, parse_midi_note_on,
};

/// Benchmark parsing 10,000 note-on messages (the SC-005 representative workload).
fn bench_parse_note_on_10k(c: &mut Criterion) {
    // Simulate a stream of note-on messages across the full MIDI range
    let messages: Vec<[u8; 3]> = (0..10_000)
        .map(|i| {
            let note = (i % 128) as u8;
            let velocity = ((i % 127) + 1) as u8; // 1–127, never zero
            [0x90, note, velocity]
        })
        .collect();

    c.bench_function("parse_note_on_10k", |b| {
        b.iter(|| {
            for (i, msg) in messages.iter().enumerate() {
                black_box(parse_midi_note_on(
                    msg,
                    0.0,
                    i as f64 * 0.5, // 0.5ms between events
                ));
            }
        });
    });
}

/// Benchmark parsing 10,000 note-off messages.
fn bench_parse_note_off_10k(c: &mut Criterion) {
    let messages: Vec<[u8; 3]> = (0..10_000)
        .map(|i| {
            let note = (i % 128) as u8;
            [0x80, note, 64]
        })
        .collect();

    c.bench_function("parse_note_off_10k", |b| {
        b.iter(|| {
            for msg in messages.iter() {
                black_box(parse_midi_note_off(msg));
            }
        });
    });
}

/// Benchmark note-to-label conversion for 10,000 calls.
fn bench_note_to_label_10k(c: &mut Criterion) {
    c.bench_function("note_to_label_10k", |b| {
        b.iter(|| {
            for i in 0..10_000u32 {
                black_box(midi_note_to_label((i % 128) as u8));
            }
        });
    });
}

/// Benchmark a single parse_note_on call to measure per-call overhead.
fn bench_parse_note_on_single(c: &mut Criterion) {
    let msg = [0x90u8, 60, 100];
    c.bench_function("parse_note_on_single", |b| {
        b.iter(|| {
            black_box(parse_midi_note_on(black_box(&msg), 0.0, 100.0));
        });
    });
}

criterion_group!(
    midi_benches,
    bench_parse_note_on_10k,
    bench_parse_note_off_10k,
    bench_note_to_label_10k,
    bench_parse_note_on_single,
);
criterion_main!(midi_benches);
