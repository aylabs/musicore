//! Grace note layout test: verifies that grace notes in Für Elise M26
//! are rendered at reduced font_size (60% of normal) and reduced opacity (0.5).

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

fn layout_fur_elise() -> serde_json::Value {
    let importer = MusicXMLImporter::new();
    let result = importer
        .import_file(Path::new("../scores/Beethoven_FurElise.mxl"))
        .unwrap();
    let dto: ScoreDto = (&result.score).into();
    let json = serde_json::to_value(&dto).unwrap();
    let layout = compute_layout(&json, &CONFIG);
    serde_json::to_value(&layout).unwrap()
}

/// Für Elise M26 contains two grace notes (F4, A4) before the principal C5.
/// These grace notes MUST have:
///   - font_size ≈ 48.0 (60% of standard 80.0)
///   - opacity ≈ 0.5
/// Normal notes MUST have font_size ≈ 80.0 and opacity 1.0 (or absent).
#[test]
fn test_grace_notes_have_reduced_font_size_and_opacity() {
    let layout = layout_fur_elise();

    // Collect all glyph runs across all systems/staff_groups/staves
    let systems = layout["systems"].as_array().expect("systems array");
    let mut grace_font_sizes: Vec<f64> = Vec::new();
    let mut grace_opacities: Vec<f64> = Vec::new();
    let mut normal_font_sizes: Vec<f64> = Vec::new();
    let mut normal_opacities: Vec<f64> = Vec::new();

    for system in systems {
        for sg in system["staff_groups"].as_array().unwrap_or(&vec![]) {
            for staff in sg["staves"].as_array().unwrap_or(&vec![]) {
                for run in staff["glyph_runs"].as_array().unwrap_or(&vec![]) {
                    let run_font_size = run["font_size"].as_f64().unwrap_or(80.0);
                    let run_opacity = run["opacity"].as_f64().unwrap_or(1.0);

                    // Grace-note runs: font_size < 60 (48 = 80*0.6)
                    if run_font_size < 60.0 && run_opacity < 0.9 {
                        grace_font_sizes.push(run_font_size);
                        grace_opacities.push(run_opacity);
                    } else if run_font_size >= 60.0 {
                        // Check only noteheads (not stems/beams which use special codepoints)
                        for glyph in run["glyphs"].as_array().unwrap_or(&vec![]) {
                            let cp = glyph["codepoint"].as_str().unwrap_or("");
                            let code = cp.chars().next().unwrap_or('\0') as u32;
                            // SMuFL noteheads range: U+E0A0-U+E0FF, combined note glyphs: U+E1D0-U+E1FF
                            if (0xE0A0..=0xE0FF).contains(&code)
                                || (0xE1D0..=0xE1FF).contains(&code)
                            {
                                normal_font_sizes.push(run_font_size);
                                normal_opacities.push(run_opacity);
                            }
                        }
                    }
                }
            }
        }
    }

    // There must be grace-note runs (Für Elise has grace notes in M26 and M29)
    assert!(
        !grace_font_sizes.is_empty(),
        "Expected grace-note GlyphRuns with font_size < 60 and opacity < 0.9, found none. \
         Grace notes are not being rendered at reduced size."
    );

    // Grace notes should be ~48.0 (80*0.6)
    for &fs in &grace_font_sizes {
        assert!(
            (fs - 48.0).abs() < 2.0,
            "Grace note font_size should be ~48.0 (60% of 80), got {fs}"
        );
    }

    // Grace notes should have opacity 0.5
    for &op in &grace_opacities {
        assert!(
            (op - 0.5).abs() < 0.1,
            "Grace note opacity should be ~0.5, got {op}"
        );
    }

    // Normal notes should be ~80.0 with full opacity
    assert!(
        !normal_font_sizes.is_empty(),
        "Expected normal note GlyphRuns"
    );
    for &fs in &normal_font_sizes {
        assert!(
            fs >= 60.0,
            "Normal note font_size should be >= 60.0, got {fs}"
        );
    }
    for &op in &normal_opacities {
        assert!(
            op >= 0.9,
            "Normal note opacity should be >= 0.9 (fully opaque), got {op}"
        );
    }
}

/// Grace note stems (U+0000) and beams (U+0001) must also have reduced opacity
/// and thinner dimensions (0.6x scaling).
#[test]
fn test_grace_note_stems_and_beams_have_reduced_opacity() {
    let layout = layout_fur_elise();
    let systems = layout["systems"].as_array().expect("systems array");

    let mut grace_stem_runs = 0u32;
    let mut grace_beam_runs = 0u32;
    let mut normal_stem_thickness_sum = 0.0f64;
    let mut normal_stem_count = 0u32;

    for system in systems {
        for sg in system["staff_groups"].as_array().unwrap_or(&vec![]) {
            for staff in sg["staves"].as_array().unwrap_or(&vec![]) {
                for run in staff["glyph_runs"].as_array().unwrap_or(&vec![]) {
                    let run_opacity = run["opacity"].as_f64().unwrap_or(1.0);
                    for glyph in run["glyphs"].as_array().unwrap_or(&vec![]) {
                        let cp = glyph["codepoint"].as_str().unwrap_or("");
                        let is_stem = cp == "\u{0000}" || cp == "\0";
                        let is_beam = cp == "\u{0001}" || cp == "\x01";

                        if is_stem && run_opacity < 0.9 {
                            grace_stem_runs += 1;
                            // Grace stem thickness should be ~0.9 (1.5 * 0.6)
                            let w = glyph["bounding_box"]["width"].as_f64().unwrap_or(0.0);
                            assert!(
                                w < 1.2,
                                "Grace stem width should be ~0.9 (1.5*0.6), got {w}"
                            );
                        } else if is_stem && run_opacity >= 0.9 {
                            let w = glyph["bounding_box"]["width"].as_f64().unwrap_or(0.0);
                            normal_stem_thickness_sum += w;
                            normal_stem_count += 1;
                        }

                        if is_beam && run_opacity < 0.9 {
                            grace_beam_runs += 1;
                            // Grace beam thickness should be ~6.0 (10.0 * 0.6)
                            let h = glyph["bounding_box"]["height"].as_f64().unwrap_or(0.0);
                            assert!(
                                h < 8.0,
                                "Grace beam thickness should be ~6.0 (10*0.6), got {h}"
                            );
                        }
                    }
                }
            }
        }
    }

    assert!(
        grace_stem_runs > 0,
        "Expected grace-note stem GlyphRuns with opacity < 0.9, found none"
    );
    assert!(
        grace_beam_runs > 0,
        "Expected grace-note beam GlyphRuns with opacity < 0.9, found none"
    );
    // Normal stems should be full thickness (1.5)
    if normal_stem_count > 0 {
        let avg_thickness = normal_stem_thickness_sum / normal_stem_count as f64;
        assert!(
            avg_thickness > 1.3,
            "Normal stem thickness should be ~1.5, avg was {avg_thickness}"
        );
    }
}
