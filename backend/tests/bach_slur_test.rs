/// Test that slur arcs are generated for Bach Invention No. 1
/// The MusicXML has slurs (e.g., m16 F5 → m17 F5)
use musicore_backend::adapters::dtos::ScoreDto;
use musicore_backend::domain::importers::musicxml::{
    CompressionHandler, ImportContext, MusicXMLConverter, MusicXMLParser,
};
use musicore_backend::layout::{LayoutConfig, compute_layout};
use std::path::Path;

#[test]
fn test_bach_slur_arcs_generated() {
    let fixture_path = Path::new("../scores/Bach_InventionNo1.mxl");
    let xml_content =
        CompressionHandler::load_content(fixture_path).expect("Failed to load Bach Invention");

    let mut context = ImportContext::new();
    let doc =
        MusicXMLParser::parse(&xml_content, &mut context).expect("Failed to parse Bach Invention");
    let score =
        MusicXMLConverter::convert(doc, &mut context).expect("Failed to convert Bach Invention");

    // Verify slur_next links exist in domain
    let mut slur_next_count = 0;
    for inst in &score.instruments {
        for staff in &inst.staves {
            for voice in &staff.voices {
                for note in &voice.interval_events {
                    if note.slur_next.is_some() {
                        slur_next_count += 1;
                    }
                }
            }
        }
    }
    println!("Domain slur_next links: {}", slur_next_count);
    assert!(
        slur_next_count >= 10,
        "Bach has 15 slurs, expected >=10 slur_next links, got {}",
        slur_next_count
    );

    // Verify slur arcs in layout
    let score_dto = ScoreDto::from(&score);
    let score_json = serde_json::to_value(&score_dto).expect("Failed to serialize score");
    let config = LayoutConfig::default();
    let layout = compute_layout(&score_json, &config);

    let mut total_slur_arcs = 0;
    for system in &layout.systems {
        for staff_group in &system.staff_groups {
            for staff in &staff_group.staves {
                total_slur_arcs += staff.slur_arcs.len();
            }
        }
    }
    println!("Layout slur arcs: {}", total_slur_arcs);
    assert!(
        total_slur_arcs >= 10,
        "Expected >=10 slur arcs in layout, got {}",
        total_slur_arcs
    );
}
