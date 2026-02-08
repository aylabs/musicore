// Integration tests for MusicXML Import - Feature 006-musicxml-import

use musicore_backend::domain::importers::musicxml::{MusicXMLParser, CompressionHandler};
use std::path::Path;

#[test]
fn test_parse_simple_melody() {
    // T034: Parse simple_melody.musicxml → MusicXMLDocument with 1 part
    
    let fixture_path = Path::new("../tests/fixtures/musicxml/simple_melody.musicxml");
    
    // Load XML content
    let xml_content = CompressionHandler::load_content(fixture_path)
        .expect("Failed to load simple_melody.musicxml");
    
    // Parse into MusicXMLDocument
    let doc = MusicXMLParser::parse(&xml_content)
        .expect("Failed to parse simple_melody.musicxml");
    
    // Verify document structure
    assert_eq!(doc.parts.len(), 1, "Expected 1 part in simple_melody.musicxml");
    
    let part = &doc.parts[0];
    assert_eq!(part.id, "P1", "Expected part ID to be P1");
    assert_eq!(part.measures.len(), 2, "Expected 2 measures");
    
    // Verify first measure has attributes
    let measure1 = &part.measures[0];
    assert_eq!(measure1.number, 1);
    assert!(measure1.attributes.is_some(), "First measure should have attributes");
    
    if let Some(attrs) = &measure1.attributes {
        assert_eq!(attrs.divisions, Some(480), "Expected divisions=480");
        assert_eq!(attrs.clefs.len(), 1, "Expected 1 clef");
        assert_eq!(attrs.clefs[0].sign, "G");
        assert_eq!(attrs.clefs[0].line, 2);
        
        if let Some(time) = &attrs.time {
            assert_eq!(time.beats, 4);
            assert_eq!(time.beat_type, 4);
        } else {
            panic!("Expected time signature");
        }
        
        if let Some(key) = &attrs.key {
            assert_eq!(key.fifths, 0, "Expected C major (0 sharps/flats)");
        } else {
            panic!("Expected key signature");
        }
    }
    
    // Verify notes in first measure
    let note_count_m1 = measure1.elements.iter()
        .filter(|e| matches!(e, musicore_backend::domain::importers::musicxml::MeasureElement::Note(_)))
        .count();
    assert_eq!(note_count_m1, 4, "Expected 4 notes in first measure");
    
    // Verify second measure
    let measure2 = &part.measures[1];
    assert_eq!(measure2.number, 2);
    
    let note_count_m2 = measure2.elements.iter()
        .filter(|e| matches!(e, musicore_backend::domain::importers::musicxml::MeasureElement::Note(_)))
        .count();
    assert_eq!(note_count_m2, 4, "Expected 4 notes in second measure");
}

#[test]
fn test_parse_malformed_xml() {
    // T076: Import malformed.xml → verify ParseError with line number
    
    let fixture_path = Path::new("../tests/fixtures/musicxml/malformed.xml");
    
    let xml_content = CompressionHandler::load_content(fixture_path)
        .expect("Failed to load malformed.xml");
    
    let result = MusicXMLParser::parse(&xml_content);
    
    assert!(result.is_err(), "Expected parse error for malformed XML");
    
    if let Err(e) = result {
        match e {
            musicore_backend::domain::importers::musicxml::ImportError::ParseError { line, message, .. } => {
                assert!(line > 0, "Expected line number > 0");
                assert!(message.contains("XML parse error") || message.contains("parse"), 
                    "Expected parse error message, got: {}", message);
            }
            _ => panic!("Expected ParseError, got: {:?}", e),
        }
    }
}

#[test]
fn test_parse_note_with_pitch() {
    // Parse a document and verify pitch extraction
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>480</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>"#;
    
    let doc = MusicXMLParser::parse(xml).expect("Failed to parse");
    
    assert_eq!(doc.parts.len(), 1);
    let measure = &doc.parts[0].measures[0];
    
    match &measure.elements[0] {
        musicore_backend::domain::importers::musicxml::MeasureElement::Note(note) => {
            assert!(note.pitch.is_some());
            let pitch = note.pitch.as_ref().unwrap();
            assert_eq!(pitch.step, 'C');
            assert_eq!(pitch.octave, 4);
            assert_eq!(pitch.alter, 0);
            assert_eq!(note.duration, 480);
            assert_eq!(note.voice, 1);
        }
        _ => panic!("Expected Note element"),
    }
}

#[test]
fn test_parse_rest() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>480</divisions>
      </attributes>
      <note>
        <rest/>
        <duration>480</duration>
        <voice>1</voice>
      </note>
    </measure>
  </part>
</score-partwise>"#;
    
    let doc = MusicXMLParser::parse(xml).expect("Failed to parse");
    
    let measure = &doc.parts[0].measures[0];
    match &measure.elements[0] {
        musicore_backend::domain::importers::musicxml::MeasureElement::Rest(rest) => {
            assert_eq!(rest.duration, 480);
            assert_eq!(rest.voice, 1);
        }
        _ => panic!("Expected Rest element"),
    }
}

// ============================================================================
// User Story 2: Multi-Staff Piano Tests (T087-T089)
// ============================================================================

#[test]
fn test_import_piano_grand_staff_structure() {
    // T087: Import piano_grand_staff.musicxml → verify 1 instrument with 2 staves
    
    use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
    use musicore_backend::ports::importers::IMusicXMLImporter;
    
    let fixture_path = Path::new("../tests/fixtures/musicxml/piano_grand_staff.musicxml");
    
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(fixture_path)
        .expect("Failed to import piano_grand_staff.musicxml");
    
    let score = result.score;
    
    // Verify 1 instrument
    assert_eq!(score.instruments.len(), 1, 
        "Expected 1 instrument in piano grand staff");
    
    let instrument = &score.instruments[0];
    assert_eq!(instrument.name, "Instrument P1", 
        "Expected instrument name 'Instrument P1'");
    
    // Verify 2 staves
    assert_eq!(instrument.staves.len(), 2, 
        "Expected 2 staves in grand staff (treble + bass)");
    
    // Verify both staves have structural events
    let staff1 = &instrument.staves[0];
    let staff2 = &instrument.staves[1];
    
    assert!(!staff1.staff_structural_events.is_empty(), 
        "Staff 1 should have structural events");
    assert!(!staff2.staff_structural_events.is_empty(), 
        "Staff 2 should have structural events");
    
    // Verify both staves have voices
    assert_eq!(staff1.voices.len(), 1, "Staff 1 should have 1 voice");
    assert_eq!(staff2.voices.len(), 1, "Staff 2 should have 1 voice");
}

#[test]
fn test_piano_grand_staff_clefs() {
    // T088: Verify treble clef on staff 1, bass clef on staff 2
    
    use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
    use musicore_backend::ports::importers::IMusicXMLImporter;
    use musicore_backend::domain::value_objects::Clef;
    use musicore_backend::domain::events::staff::StaffStructuralEvent;
    
    let fixture_path = Path::new("../tests/fixtures/musicxml/piano_grand_staff.musicxml");
    
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(fixture_path)
        .expect("Failed to import piano_grand_staff.musicxml");
    
    let score = result.score;
    let instrument = &score.instruments[0];
    let staff1 = &instrument.staves[0];
    let staff2 = &instrument.staves[1];
    
    // Find clef events in staff 1
    let staff1_clef = staff1.staff_structural_events.iter()
        .find_map(|event| match event {
            StaffStructuralEvent::Clef(ce) => Some(&ce.clef),
            _ => None,
        })
        .expect("Staff 1 should have a clef");
    
    assert_eq!(*staff1_clef, Clef::Treble, 
        "Staff 1 should have Treble clef");
    
    // Find clef event in staff 2
    let staff2_clef = staff2.staff_structural_events.iter()
        .find_map(|event| match event {
            StaffStructuralEvent::Clef(ce) => Some(&ce.clef),
            _ => None,
        })
        .expect("Staff 2 should have a clef");
    
    assert_eq!(*staff2_clef, Clef::Bass, 
        "Staff 2 should have Bass clef");
}

#[test]
fn test_piano_grand_staff_note_separation() {
    // T089: Verify notes in different staves are separated correctly
    
    use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
    use musicore_backend::ports::importers::IMusicXMLImporter;
    use musicore_backend::domain::value_objects::{Pitch, Tick};
    
    let fixture_path = Path::new("../tests/fixtures/musicxml/piano_grand_staff.musicxml");
    
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(fixture_path)
        .expect("Failed to import piano_grand_staff.musicxml");
    
    let score = result.score;
    let instrument = &score.instruments[0];
    let staff1 = &instrument.staves[0];
    let staff2 = &instrument.staves[1];
    
    // Get notes from each staff
    let staff1_notes = &staff1.voices[0].interval_events;
    let staff2_notes = &staff2.voices[0].interval_events;
    
    // Verify note count (piano_grand_staff.musicxml has 4 treble notes, 2 bass notes)
    assert_eq!(staff1_notes.len(), 4, 
        "Staff 1 (treble) should have 4 notes");
    assert_eq!(staff2_notes.len(), 2, 
        "Staff 2 (bass) should have 2 notes");
    
    // Verify pitch ranges (treble notes should be higher than bass notes)
    // Staff 1: C5, E5, G5, C5 (MIDI 72, 76, 79, 72)
    // Staff 2: C3, G2 (MIDI 48, 43)
    
    assert_eq!(staff1_notes[0].pitch, Pitch::new(72).unwrap(), "First treble note should be C5 (MIDI 72)");
    assert_eq!(staff1_notes[1].pitch, Pitch::new(76).unwrap(), "Second treble note should be E5 (MIDI 76)");
    assert_eq!(staff1_notes[2].pitch, Pitch::new(79).unwrap(), "Third treble note should be G5 (MIDI 79)");
    assert_eq!(staff1_notes[3].pitch, Pitch::new(72).unwrap(), "Fourth treble note should be C5 (MIDI 72)");
    
    assert_eq!(staff2_notes[0].pitch, Pitch::new(48).unwrap(), "First bass note should be C3 (MIDI 48)");
    assert_eq!(staff2_notes[1].pitch, Pitch::new(43).unwrap(), "Second bass note should be G2 (MIDI 43)");
    
    // Verify all treble notes are higher pitch than all bass notes
    let min_treble_pitch = staff1_notes.iter().map(|n| n.pitch.value()).min().unwrap();
    let max_bass_pitch = staff2_notes.iter().map(|n| n.pitch.value()).max().unwrap();
    
    assert!(min_treble_pitch > max_bass_pitch, 
        "Treble notes should be in higher pitch range than bass notes");
    
    // Verify timing (notes should start at measure boundaries)
    assert_eq!(staff1_notes[0].start_tick, Tick::new(0), 
        "First treble note should start at tick 0");
    assert_eq!(staff2_notes[0].start_tick, Tick::new(0), 
        "First bass note should start at tick 0");
}

// ============================================================================
// User Story 1: Integration Tests (T075-T077)
// ============================================================================

#[test]
fn test_import_simple_melody_full() {
    // T075: Import simple_melody.musicxml → verify 8 notes, 1 instrument
    
    use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
    use musicore_backend::ports::importers::IMusicXMLImporter;
    
    let fixture_path = Path::new("../tests/fixtures/musicxml/simple_melody.musicxml");
    
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(fixture_path)
        .expect("Failed to import simple_melody.musicxml");
    
    let score = result.score;
    
    // Verify 1 instrument
    assert_eq!(score.instruments.len(), 1, 
        "Expected 1 instrument in simple melody");
    
    let instrument = &score.instruments[0];
    assert_eq!(instrument.staves.len(), 1, 
        "Expected 1 staff in simple melody");
    
    // Verify notes
    let staff = &instrument.staves[0];
    assert_eq!(staff.voices.len(), 1, "Expected 1 voice");
    
    let notes = &staff.voices[0].interval_events;
    assert_eq!(notes.len(), 8, 
        "Expected 8 notes in simple melody (4 per measure × 2 measures)");
    
    // Verify statistics
    assert_eq!(result.statistics.instrument_count, 1);
    assert_eq!(result.statistics.staff_count, 1);
    assert_eq!(result.statistics.voice_count, 1);
    assert_eq!(result.statistics.note_count, 8);
    
    // Verify global structural events (tempo, time signature)
    assert!(!score.global_structural_events.is_empty(), 
        "Should have global structural events");
}

#[test]
fn test_import_malformed_xml_error() {
    // T076: Import malformed.xml → verify ParseError with line number
    
    use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
    use musicore_backend::ports::importers::IMusicXMLImporter;
    use musicore_backend::domain::importers::musicxml::ImportError;
    
    let fixture_path = Path::new("../tests/fixtures/musicxml/malformed.xml");
    
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(fixture_path);
    
    assert!(result.is_err(), "Expected error for malformed XML");
    
    if let Err(e) = result {
        // Downcast Box<dyn Error> to ImportError
        let import_err = e.downcast_ref::<ImportError>();
        assert!(import_err.is_some(), "Expected ImportError type");
        
        if let Some(ImportError::ParseError { line, message, .. }) = import_err {
            assert!(*line > 0, "Expected line number > 0, got {}", line);
            assert!(!message.is_empty(), "Expected non-empty error message");
            println!("Parse error at line {}: {}", line, message);
        } else {
            panic!("Expected ParseError variant, got {:?}", import_err);
        }
    }
}

#[test]
fn test_import_compressed_mxl() {
    // T077: Import .mxl compressed file → verify decompression works
    
    use musicore_backend::domain::importers::musicxml::MusicXMLImporter;
    use musicore_backend::ports::importers::IMusicXMLImporter;
    
    // Create a test .mxl file from simple_melody.musicxml
    let source_path = Path::new("../tests/fixtures/musicxml/simple_melody.musicxml");
    let mxl_path = Path::new("/tmp/test_simple_melody.mxl");
    
    // Create .mxl by zipping the XML file with proper structure
    use std::fs::File;
    use std::io::{Write, Read};
    
    // Read the source XML
    let mut xml_content = String::new();
    File::open(source_path)
        .expect("Failed to open source XML")
        .read_to_string(&mut xml_content)
        .expect("Failed to read source XML");
    
    // Create a proper .mxl ZIP file with META-INF/container.xml
    {
        let file = File::create(mxl_path).expect("Failed to create .mxl file");
        let mut zip = zip::ZipWriter::new(file);
        
        let options = zip::write::FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        
        // Add META-INF/container.xml
        let container_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<container>
  <rootfiles>
    <rootfile full-path="simple_melody.xml"/>
  </rootfiles>
</container>"#;
        
        zip.start_file("META-INF/container.xml", options)
            .expect("Failed to add container.xml to ZIP");
        zip.write_all(container_xml.as_bytes())
            .expect("Failed to write container.xml");
        
        // Add the main score XML
        zip.start_file("simple_melody.xml", options)
            .expect("Failed to add score file to ZIP");
        zip.write_all(xml_content.as_bytes())
            .expect("Failed to write score XML to ZIP");
        
        zip.finish().expect("Failed to finalize ZIP");
    }
    
    // Import the .mxl file
    let importer = MusicXMLImporter::new();
    let result = importer.import_file(mxl_path)
        .expect("Failed to import .mxl file");
    
    // Verify decompression worked
    let score = result.score;
    assert_eq!(score.instruments.len(), 1, 
        "Expected 1 instrument after decompression");
    
    let instrument = &score.instruments[0];
    let staff = &instrument.staves[0];
    let notes = &staff.voices[0].interval_events;
    
    assert_eq!(notes.len(), 8, 
        "Expected 8 notes after decompression");
    
    // Verify metadata shows it was compressed
    assert!(result.metadata.format.contains("MusicXML"), 
        "Metadata should indicate MusicXML format");
    
    // Clean up
    std::fs::remove_file(mxl_path).ok();
}
