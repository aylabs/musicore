// Test: verify cross-system incoming tie arcs are generated for Bach Invention No. 1

use musicore_backend::adapters::dtos::ScoreDto;
use musicore_backend::domain::importers::musicxml::{
    CompressionHandler, ImportContext, MusicXMLConverter, MusicXMLParser,
};
use musicore_backend::layout::{LayoutConfig, compute_layout};
use std::path::Path;

#[test]
fn test_bach_cross_system_incoming_tie_arcs() {
    let fixture_path = Path::new("../scores/Bach_InventionNo1.mxl");
    let xml_content =
        CompressionHandler::load_content(fixture_path).expect("Failed to load Bach Invention");

    let mut context = ImportContext::new();
    let doc =
        MusicXMLParser::parse(&xml_content, &mut context).expect("Failed to parse Bach Invention");
    let score =
        MusicXMLConverter::convert(doc, &mut context).expect("Failed to convert Bach Invention");

    let score_dto = ScoreDto::from(&score);
    let score_json = serde_json::to_value(&score_dto).expect("Failed to serialize score");

    for width in [1200.0_f32, 1500.0, 1800.0, 2400.0] {
        let config = LayoutConfig {
            max_system_width: width,
            ..LayoutConfig::default()
        };
        let layout = compute_layout(&score_json, &config);

        let mut incoming_count = 0;
        let mut outgoing_count = 0;
        let mut same_system_count = 0;

        for system in &layout.systems {
            let sys_width = system.bounding_box.width;
            for staff_group in &system.staff_groups {
                for (_staff_idx, staff) in staff_group.staves.iter().enumerate() {
                    for arc in &staff.tie_arcs {
                        let is_outgoing = (arc.end.x - sys_width).abs() < 1.0;
                        let is_incoming = arc.start.x < 250.0;

                        if is_outgoing && !is_incoming {
                            outgoing_count += 1;
                        } else if is_incoming && !is_outgoing {
                            incoming_count += 1;
                        } else {
                            same_system_count += 1;
                        }
                    }
                }
            }
        }

        eprintln!(
            "width={:.0}: {} systems, same={}, outgoing={}, incoming={}",
            width,
            layout.systems.len(),
            same_system_count,
            outgoing_count,
            incoming_count
        );
    }
}
