//! Verify that the courtesy flat for Eb4 in M21 LH (bass staff) of
//! Chopin Nocturne Op 9 No 2 actually appears in the layout output.
//!
//! The Nocturne is in 12/8 time with ticks_per_quarter = 960.
//! 12 eighth notes × 480 ticks/eighth = 5760 ticks/measure.
//! pickup_ticks = 480 (anacrusis).
//! M21 (1-based, measure_index=20): start = 480 + 19*5760 = 109920, end = 115680.

use musicore_backend::adapters::dtos::ScoreDto;
use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
use musicore_backend::layout::{LayoutConfig, compute_layout};
use musicore_backend::ports::importers::IMusicXMLImporter;
use std::path::Path;

const CONFIG: LayoutConfig = LayoutConfig {
    max_system_width: 2410.0,
    units_per_space: 20.0,
    system_spacing: 200.0,
    system_height: 200.0,
};

const TICKS_PER_MEASURE: u64 = 5760;
const PICKUP_TICKS: u64 = 480;
// M21 (1-based) → measure_index 20: start = pickup + (20-1)*5760 = 109920
const M21_START: u64 = PICKUP_TICKS + 19 * TICKS_PER_MEASURE; // 109920
const M21_END: u64 = PICKUP_TICKS + 20 * TICKS_PER_MEASURE; // 115680

/// SMuFL codepoints for accidentals
const FLAT: &str = "\u{E260}";
const SHARP: &str = "\u{E262}";
const NATURAL: &str = "\u{E261}";

fn load_chopin_layout() -> (serde_json::Value, serde_json::Value) {
    let importer = MusicXMLImporter::new();
    let result = importer
        .import_file(Path::new("../scores/Chopin_NocturneOp9No2.mxl"))
        .unwrap();
    let dto: ScoreDto = (&result.score).into();
    let json = serde_json::to_value(&dto).unwrap();
    let layout = compute_layout(&json, &CONFIG);
    let layout_json = serde_json::to_value(&layout).unwrap();
    (json, layout_json)
}

/// Dump all accidental glyphs in the system that contains M21, bass staff (index 1).
#[test]
fn test_m21_lh_has_flat_accidental() {
    let (_score_json, layout_json) = load_chopin_layout();

    // ── 1. Find the system containing M21 ──
    let systems = layout_json["systems"].as_array().expect("systems array");
    let system = systems
        .iter()
        .find(|s| {
            let st = s["tick_range"]["start_tick"].as_u64().unwrap_or(0);
            let et = s["tick_range"]["end_tick"].as_u64().unwrap_or(0);
            M21_START >= st && M21_START < et
        })
        .expect("No system contains M21");

    let sys_start = system["tick_range"]["start_tick"].as_u64().unwrap();
    let sys_end = system["tick_range"]["end_tick"].as_u64().unwrap();
    println!(
        "System tick_range: {}..{} (contains M21 {}..{})",
        sys_start, sys_end, M21_START, M21_END
    );

    // ── 2. Get bass staff (staff index 1) from the first staff group ──
    let staves = system["staff_groups"][0]["staves"]
        .as_array()
        .expect("staves array");
    assert!(
        staves.len() > 1,
        "Expected at least 2 staves (treble + bass), got {}",
        staves.len()
    );
    let bass_staff = &staves[1];

    // ── 3. Scan glyph_runs for accidental glyphs ──
    let mut accidental_glyphs: Vec<(String, f64, f64, f64)> = Vec::new(); // (name, x, y, font_size)

    for run in bass_staff["glyph_runs"].as_array().unwrap_or(&vec![]) {
        let font_size = run["font_size"].as_f64().unwrap_or(80.0);
        let opacity = run["opacity"].as_f64().unwrap_or(1.0);
        for glyph in run["glyphs"].as_array().unwrap_or(&vec![]) {
            let cp = glyph["codepoint"].as_str().unwrap_or("");
            let name = match cp {
                FLAT => "accidentalFlat",
                SHARP => "accidentalSharp",
                NATURAL => "accidentalNatural",
                _ => continue,
            };
            let x = glyph["position"]["x"].as_f64().unwrap_or(0.0);
            let y = glyph["position"]["y"].as_f64().unwrap_or(0.0);
            accidental_glyphs.push((name.to_string(), x, y, font_size));
            println!(
                "  Accidental: {} x={:.1} y={:.1} fs={:.0} op={:.1}",
                name, x, y, font_size, opacity
            );
        }
    }

    println!(
        "\nTotal accidental glyphs in bass staff of this system: {}",
        accidental_glyphs.len()
    );

    // Filter for flat accidentals specifically
    let flat_glyphs: Vec<_> = accidental_glyphs
        .iter()
        .filter(|(name, _, _, _)| name == "accidentalFlat")
        .collect();
    println!("Flat accidentals in bass staff: {}", flat_glyphs.len());
    for (name, x, y, fs) in &flat_glyphs {
        println!("  {} x={:.1} y={:.1} fs={:.0}", name, x, y, fs);
    }

    // ── 4. Assert at least one flat accidental exists ──
    assert!(
        !flat_glyphs.is_empty(),
        "Expected at least one flat accidental glyph in M21 LH (bass staff), but found none"
    );
}

/// Diagnostic: dump system tick ranges and M21 LH notes to find the right values.
#[test]
fn test_diagnostic_dump_tick_ranges() {
    let (_score_json, layout_json) = load_chopin_layout();
    let score_json = &_score_json;

    // Print score-level fields: pickup_ticks, time_signature, etc.
    println!("pickup_ticks: {}", score_json["pickup_ticks"]);
    println!(
        "global_structural_events keys sample: {}",
        &score_json["global_structural_events"]
    );

    let systems = layout_json["systems"].as_array().expect("systems array");
    println!("Total systems: {}", systems.len());
    for (i, sys) in systems.iter().enumerate() {
        let st = sys["tick_range"]["start_tick"].as_u64().unwrap_or(0);
        let et = sys["tick_range"]["end_tick"].as_u64().unwrap_or(0);
        println!("  System {}: tick_range {}..{}", i, st, et);
    }

    // Determine ticks_per_measure from system boundaries
    // First system might have pickup, so check second system
    let sys1_start = systems[1]["tick_range"]["start_tick"].as_u64().unwrap();
    let sys1_end = systems[1]["tick_range"]["end_tick"].as_u64().unwrap();
    println!(
        "\nSystem 1 range: {}..{} (span={})",
        sys1_start,
        sys1_end,
        sys1_end - sys1_start
    );

    // Print bass staff notes with ticks near expected M21 range
    let instruments = score_json["instruments"].as_array().expect("instruments");
    let empty_arr = vec![];
    let staves = instruments[0]["staves"].as_array().unwrap_or(&empty_arr);
    let bass_staff = &staves[1];
    let empty_arr2 = vec![];
    let voices = bass_staff["voices"].as_array().unwrap_or(&empty_arr2);
    let empty_arr3 = vec![];
    let notes = voices[0]["interval_events"]
        .as_array()
        .unwrap_or(&empty_arr3);

    // Print notes in tick range 110000..125000 (around expected M21)
    println!("\nBass notes with tick in 110000..125000:");
    for note in notes {
        let st = note["start_tick"]
            .as_u64()
            .or_else(|| note["start_tick"]["value"].as_u64())
            .unwrap_or(0);
        if st >= 110000 && st < 125000 {
            let pitch = note["pitch"]
                .as_u64()
                .or_else(|| note["pitch"]["midi_number"].as_u64())
                .unwrap_or(0);
            let spelling = &note["spelling"];
            let has_explicit = note["has_explicit_accidental"].as_bool();
            println!(
                "  tick={} pitch={} spelling={} has_explicit={:?}",
                st, pitch, spelling, has_explicit
            );
        }
    }

    // Also try finding notes with step=E, alter=-1 (Eb) in bass staff
    println!("\nAll Eb notes (step=E, alter=-1) in bass staff:");
    let mut eb_count = 0;
    for note in notes {
        let st = note["start_tick"]
            .as_u64()
            .or_else(|| note["start_tick"]["value"].as_u64())
            .unwrap_or(0);
        let step = note["spelling"]["step"].as_str().unwrap_or("");
        let alter = note["spelling"]["alter"].as_i64().unwrap_or(0);
        let pitch = note["pitch"]
            .as_u64()
            .or_else(|| note["pitch"]["midi_number"].as_u64())
            .unwrap_or(0);
        if step == "E" && alter == -1 && (pitch == 63 || pitch == 51 || pitch == 39) {
            let has_explicit = note["has_explicit_accidental"].as_bool();
            eb_count += 1;
            if eb_count <= 30 {
                println!(
                    "  tick={} pitch={} has_explicit={:?}",
                    st, pitch, has_explicit
                );
            }
        }
    }
    println!("  Total Eb notes in bass: {}", eb_count);
}

/// Check whether has_explicit_accidental appears in the serialized JSON
/// for Eb4 notes in M21 LH.
#[test]
fn test_m21_lh_eb4_has_explicit_accidental_in_json() {
    let (score_json, _layout_json) = load_chopin_layout();

    // Navigate the score JSON to find notes in M21 LH
    let instruments = score_json["instruments"]
        .as_array()
        .expect("instruments array");

    println!("Number of instruments: {}", instruments.len());

    let mut found_eb4_with_explicit = false;
    let mut found_eb4_without_explicit = false;
    let mut eb4_count = 0;

    for (inst_idx, inst) in instruments.iter().enumerate() {
        let empty_arr = vec![];
        let staves = inst["staves"].as_array().unwrap_or(&empty_arr);
        for (staff_idx, staff) in staves.iter().enumerate() {
            let empty_arr2 = vec![];
            let voices = staff["voices"].as_array().unwrap_or(&empty_arr2);
            for (voice_idx, voice) in voices.iter().enumerate() {
                let empty_arr3 = vec![];
                let notes = voice["interval_events"].as_array().unwrap_or(&empty_arr3);
                for note in notes {
                    let start_tick = note["start_tick"]
                        .as_u64()
                        .or_else(|| note["start_tick"]["value"].as_u64())
                        .unwrap_or(0);

                    // Check if note is in M21 range and on bass staff
                    if start_tick >= M21_START && start_tick < M21_END && staff_idx == 1 {
                        let pitch = note["pitch"]
                            .as_u64()
                            .or_else(|| note["pitch"]["midi_number"].as_u64())
                            .unwrap_or(0);

                        // Eb4 = MIDI 63
                        let spelling = &note["spelling"];
                        let step = spelling["step"].as_str().unwrap_or("");
                        let alter = spelling["alter"].as_i64().unwrap_or(0);
                        let has_explicit = note["has_explicit_accidental"].as_bool();

                        if pitch == 63 || (step == "E" && alter == -1) {
                            eb4_count += 1;
                            println!(
                                "  Eb4 note: inst={} staff={} voice={} tick={} pitch={} spelling={:?} has_explicit_accidental={:?}",
                                inst_idx,
                                staff_idx,
                                voice_idx,
                                start_tick,
                                pitch,
                                spelling,
                                has_explicit
                            );
                            if has_explicit == Some(true) {
                                found_eb4_with_explicit = true;
                            } else {
                                found_eb4_without_explicit = true;
                            }
                        }

                        // Also print all notes in M21 LH for context
                        println!(
                            "    M21 LH note: tick={} pitch={} step={} alter={} has_explicit={:?}",
                            start_tick, pitch, step, alter, has_explicit
                        );
                    }
                }
            }
        }
    }

    println!("\nEb4 notes found in M21 LH: {}", eb4_count);
    println!(
        "  With has_explicit_accidental=true: {}",
        found_eb4_with_explicit
    );
    println!(
        "  Without has_explicit_accidental: {}",
        found_eb4_without_explicit
    );
}
