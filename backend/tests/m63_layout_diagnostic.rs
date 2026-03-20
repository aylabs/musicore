//! Diagnostic: dump notehead, accidental, and dot positions for the M63 chord.

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

#[test]
fn test_m63_layout_positions() {
    let importer = MusicXMLImporter::new();
    let result = importer
        .import_file(Path::new("../scores/Beethoven_FurElise.mxl"))
        .unwrap();
    let dto: ScoreDto = (&result.score).into();
    let json = serde_json::to_value(&dto).unwrap();
    let layout = compute_layout(&json, &CONFIG);
    let layout_json = serde_json::to_value(&layout).unwrap();

    // System 11 contains M63 — check it
    for sys_idx in [11, 13] {
        let system = &layout_json["systems"][sys_idx];
        let staff = &system["staff_groups"][0]["staves"][0];
        println!("=== System {} ===", sys_idx);

        // Dump barlines
        if let Some(barlines) = staff["bar_lines"].as_array() {
            for (bi, barline) in barlines.iter().enumerate() {
                if let Some(segs) = barline["segments"].as_array() {
                    for seg in segs {
                        let x = seg["x_position"].as_f64().unwrap_or(0.0);
                        println!("barline[{}]: x={:.1}", bi, x);
                    }
                }
            }
        }

        // Dump glyphs with accidentals/noteheads in high x range (last measure)
        if let Some(glyph_runs) = staff["glyph_runs"].as_array() {
            for (ri, run) in glyph_runs.iter().enumerate() {
                let font_size = run["font_size"].as_f64().unwrap_or(0.0);
                let opacity = run["opacity"].as_f64().unwrap_or(1.0);
                if let Some(glyphs) = run["glyphs"].as_array() {
                    for (gi, glyph) in glyphs.iter().enumerate() {
                        let x = glyph["position"]["x"].as_f64().unwrap_or(0.0);
                        let y = glyph["position"]["y"].as_f64().unwrap_or(0.0);
                        let cp = glyph["codepoint"].as_str().unwrap_or("?");

                        let name = match cp {
                            "\u{E0A4}" => "noteheadBlack",
                            "\u{E262}" => "accidentalSharp",
                            "\u{E260}" => "accidentalFlat",
                            "\u{E261}" => "accidentalNatural",
                            _ => continue,
                        };
                        println!(
                            "  Run[{}] glyph[{}]: {} x={:.1} y={:.1} fs={:.0} op={:.1}",
                            ri, gi, name, x, y, font_size, opacity
                        );
                    }
                }
            }
        }

        // Dump dots
        if let Some(dots) = staff["notation_dots"].as_array() {
            for (di, dot) in dots.iter().enumerate() {
                let x = dot["x"].as_f64().unwrap_or(0.0);
                let y = dot["y"].as_f64().unwrap_or(0.0);
                println!("  dot[{}]: x={:.1} y={:.1}", di, x, y);
            }
        }
    }
}
