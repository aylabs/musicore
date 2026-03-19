#!/usr/bin/env python3
"""Check if notation dots appear in the layout output for M63 of Für Elise."""
import subprocess, json, sys, os

# Build a small Rust test program that outputs layout JSON for inspection
# Instead, let's check via the actual score JSON and layout config
# We'll use the existing test infrastructure pattern

# Actually, let's just create a Rust test and run it
test_code = r'''
use musicore_backend::adapters::dtos::ScoreDto;
use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
use musicore_backend::layout::{compute_layout, LayoutConfig};
use musicore_backend::ports::importers::IMusicXMLImporter;
use std::path::Path;

fn main() {
    let config = LayoutConfig {
        max_system_width: 2410.0,
        units_per_space: 20.0,
        system_spacing: 200.0,
        system_height: 200.0,
    };
    let importer = MusicXMLImporter::new();
    let result = importer
        .import_file(Path::new("../scores/Beethoven_FurElise.mxl"))
        .unwrap();
    let dto: ScoreDto = (&result.score).into();
    let json = serde_json::to_value(&dto).unwrap();
    let layout = compute_layout(&json, &config);
    let layout_json = serde_json::to_value(&layout).unwrap();

    let systems = layout_json["systems"].as_array().unwrap();
    for (si, system) in systems.iter().enumerate() {
        for sg in system["staff_groups"].as_array().unwrap_or(&vec![]) {
            for (staff_idx, staff) in sg["staves"].as_array().unwrap_or(&vec![]).iter().enumerate() {
                if let Some(dots) = staff["notation_dots"].as_array() {
                    if !dots.is_empty() {
                        println!("System {} Staff {}: {} dots", si, staff_idx, dots.len());
                        for (di, dot) in dots.iter().enumerate() {
                            let x = dot["x"].as_f64().unwrap_or(0.0);
                            let y = dot["y"].as_f64().unwrap_or(0.0);
                            let r = dot["radius"].as_f64().unwrap_or(0.0);
                            println!("  dot[{}]: x={:.1}, y={:.1}, r={:.1}", di, x, y, r);
                        }
                    }
                }
            }
        }
    }
}
'''

print("Use the Rust test approach instead - see slur_direction_test.rs pattern")
