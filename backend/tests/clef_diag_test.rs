/// Diagnostic test for Für Elise clef changes and beams around m14-m15
use musicore_backend::domain::importers::musicxml::{
    CompressionHandler, ImportContext, MusicXMLConverter, MusicXMLParser,
};
use std::path::Path;

fn load_fur_elise() -> musicore_backend::domain::score::Score {
    let fixture_path = Path::new("../scores/Beethoven_FurElise.mxl");
    let xml = CompressionHandler::load_content(fixture_path).expect("load");
    let mut ctx = ImportContext::new();
    let doc = MusicXMLParser::parse(&xml, &mut ctx).expect("parse");
    MusicXMLConverter::convert(doc, &mut ctx).expect("convert")
}

#[test]
fn check_clef_events() {
    let score = load_fur_elise();

    // Print measure_end_ticks for m8-m16
    eprintln!("pickup_ticks={}", score.pickup_ticks);
    for (i, &end_tick) in score.measure_end_ticks.iter().enumerate() {
        if i >= 7 && i <= 16 {
            eprintln!("measure_end_ticks[{i}] = {end_tick}");
        }
    }

    for (ii, inst) in score.instruments.iter().enumerate() {
        for (si, staff) in inst.staves.iter().enumerate() {
            for event in &staff.staff_structural_events {
                if let musicore_backend::domain::events::staff::StaffStructuralEvent::Clef(ce) =
                    event
                {
                    eprintln!(
                        "inst={ii} staff={si} clef_tick={} clef={:?}",
                        ce.tick.value(),
                        ce.clef
                    );
                }
            }
        }
    }
}

#[test]
fn check_beam_info_m14_m15() {
    let score = load_fur_elise();
    // Show ALL LH notes from tick 17000 to 22000
    let inst = &score.instruments[0];
    let staff = &inst.staves[1]; // LH staff (index 1)
    for voice in &staff.voices {
        for note in &voice.interval_events {
            let tick = note.start_tick.value();
            if tick >= 17000 && tick < 22000 {
                eprintln!(
                    "LH note tick={tick} pitch={:?} dur={} beams={:?}",
                    note.pitch, note.duration_ticks, note.beams
                );
            }
        }
    }
}
