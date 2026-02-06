use musicore_backend::domain::{
    events::{
        clef::ClefEvent,
        key_signature::KeySignatureEvent,
    },
    instrument::Instrument,
    staff::Staff,
    value_objects::{Clef, KeySignature, Tick},
};

// Phase 4: Multi-Staff Instruments Tests

#[test]
fn test_instrument_add_second_staff() {
    let mut instrument = Instrument::new("Piano".to_string());
    assert_eq!(instrument.staves.len(), 1);
    
    let bass_staff = Staff::new();
    instrument.add_staff(bass_staff);
    
    assert_eq!(instrument.staves.len(), 2);
}

#[test]
fn test_instrument_get_staff_by_id() {
    let instrument = Instrument::new("Piano".to_string());
    let staff_id = instrument.staves[0].id;
    
    let result = instrument.get_staff(staff_id);
    assert!(result.is_ok());
}

#[test]
fn test_instrument_get_nonexistent_staff() {
    let instrument = Instrument::new("Piano".to_string());
    let fake_staff = Staff::new();
    
    let result = instrument.get_staff(fake_staff.id);
    assert!(result.is_err());
}

#[test]
fn test_instrument_get_staff_mut() {
    let mut instrument = Instrument::new("Piano".to_string());
    let staff_id = instrument.staves[0].id;
    
    let result = instrument.get_staff_mut(staff_id);
    assert!(result.is_ok());
    
    // Modify the staff via mutable reference
    let staff_mut = result.unwrap();
    let clef_event = ClefEvent::new(Tick::new(960), Clef::Bass);
    assert!(staff_mut.add_clef_event(clef_event).is_ok());
}

#[test]
fn test_multi_staff_instrument_independence() {
    let mut instrument = Instrument::new("Piano".to_string());
    let mut bass_staff = Staff::new();
    
    // Modify bass staff before adding
    let bass_clef = ClefEvent::new(Tick::new(0), Clef::Bass);
    bass_staff.staff_structural_events.clear(); // Clear defaults
    bass_staff.staff_structural_events.push(
        musicore_backend::domain::events::staff::StaffStructuralEvent::Clef(bass_clef)
    );
    
    instrument.add_staff(bass_staff);
    
    // First staff should still have treble clef
    assert_eq!(instrument.staves.len(), 2);
    
    let first_staff_clefs: Vec<_> = instrument.staves[0].staff_structural_events.iter()
        .filter_map(|e| match e {
            musicore_backend::domain::events::staff::StaffStructuralEvent::Clef(ce) => Some(ce),
            _ => None,
        })
        .collect();
    
    let second_staff_clefs: Vec<_> = instrument.staves[1].staff_structural_events.iter()
        .filter_map(|e| match e {
            musicore_backend::domain::events::staff::StaffStructuralEvent::Clef(ce) => Some(ce),
            _ => None,
        })
        .collect();
    
    // Verify they have different clefs
    assert_eq!(first_staff_clefs[0].clef, Clef::Treble);
    assert_eq!(second_staff_clefs[0].clef, Clef::Bass);
}

// Phase 5: Polyphonic Voices Tests

#[test]
fn test_staff_add_second_voice() {
    let mut staff = Staff::new();
    assert_eq!(staff.voices.len(), 1);
    
    let voice = musicore_backend::domain::voice::Voice::new();
    staff.add_voice(voice);
    
    assert_eq!(staff.voices.len(), 2);
}

#[test]
fn test_staff_get_voice_by_id() {
    let staff = Staff::new();
    let voice_id = staff.voices[0].id;
    
    let result = staff.get_voice(voice_id);
    assert!(result.is_ok());
}

#[test]
fn test_staff_get_nonexistent_voice() {
    let staff = Staff::new();
    let fake_voice = musicore_backend::domain::voice::Voice::new();
    
    let result = staff.get_voice(fake_voice.id);
    assert!(result.is_err());
}

#[test]
fn test_staff_get_voice_mut() {
    let mut staff = Staff::new();
    let voice_id = staff.voices[0].id;
    
    let result = staff.get_voice_mut(voice_id);
    assert!(result.is_ok());
}

#[test]
fn test_voice_has_overlapping_note_helper() {
    let mut voice = musicore_backend::domain::voice::Voice::new();
    let note1 = musicore_backend::domain::events::note::Note::new(
        Tick::new(0), 
        960, 
        musicore_backend::domain::value_objects::Pitch::new(60).unwrap()
    ).unwrap();
    
    voice.add_note(note1.clone()).unwrap();
    
    // Check overlap with same pitch
    let overlapping_note = musicore_backend::domain::events::note::Note::new(
        Tick::new(480), 
        960, 
        musicore_backend::domain::value_objects::Pitch::new(60).unwrap()
    ).unwrap();
    
    assert!(voice.has_overlapping_note(&overlapping_note));
    
    // Check no overlap with different pitch
    let non_overlapping_note = musicore_backend::domain::events::note::Note::new(
        Tick::new(480), 
        960, 
        musicore_backend::domain::value_objects::Pitch::new(64).unwrap()
    ).unwrap();
    
    assert!(!voice.has_overlapping_note(&non_overlapping_note));
}

// Phase 6: Global Structural Events Tests

#[test]
fn test_score_get_tempo_at_tick() {
    let mut score = musicore_backend::domain::score::Score::new();
    
    // Add tempo change at tick 960
    let tempo_event = musicore_backend::domain::events::tempo::TempoEvent::new(
        Tick::new(960), 
        musicore_backend::domain::value_objects::BPM::new(140).unwrap()
    );
    score.add_tempo_event(tempo_event).unwrap();
    
    // Query at tick 0 should return default 120 BPM
    let tempo_at_0 = score.get_tempo_at(Tick::new(0));
    assert!(tempo_at_0.is_some());
    assert_eq!(tempo_at_0.unwrap().bpm, musicore_backend::domain::value_objects::BPM::new(120).unwrap());
    
    // Query at tick 960 should return new 140 BPM
    let tempo_at_960 = score.get_tempo_at(Tick::new(960));
    assert!(tempo_at_960.is_some());
    assert_eq!(tempo_at_960.unwrap().bpm, musicore_backend::domain::value_objects::BPM::new(140).unwrap());
    
    // Query after tick 960 should still return 140 BPM
    let tempo_at_2000 = score.get_tempo_at(Tick::new(2000));
    assert!(tempo_at_2000.is_some());
    assert_eq!(tempo_at_2000.unwrap().bpm, musicore_backend::domain::value_objects::BPM::new(140).unwrap());
}

#[test]
fn test_score_get_time_signature_at_tick() {
    let mut score = musicore_backend::domain::score::Score::new();
    
    // Add time signature change at tick 3840
    let time_sig_event = musicore_backend::domain::events::time_signature::TimeSignatureEvent::new(
        Tick::new(3840), 
        3, 
        4
    );
    score.add_time_signature_event(time_sig_event).unwrap();
    
    // Query at tick 0 should return default 4/4
    let time_sig_at_0 = score.get_time_signature_at(Tick::new(0));
    assert!(time_sig_at_0.is_some());
    assert_eq!(time_sig_at_0.unwrap().numerator, 4);
    assert_eq!(time_sig_at_0.unwrap().denominator, 4);
    
    // Query at tick 3840 should return new 3/4
    let time_sig_at_3840 = score.get_time_signature_at(Tick::new(3840));
    assert!(time_sig_at_3840.is_some());
    assert_eq!(time_sig_at_3840.unwrap().numerator, 3);
    assert_eq!(time_sig_at_3840.unwrap().denominator, 4);
}

// Phase 7: Staff-Scoped Structural Events Tests

#[test]
fn test_staff_get_clef_at_tick() {
    let mut staff = Staff::new();
    
    // Add clef change at tick 1920
    let clef_event = ClefEvent::new(Tick::new(1920), Clef::Bass);
    staff.add_clef_event(clef_event).unwrap();
    
    // Query at tick 0 should return default Treble
    let clef_at_0 = staff.get_clef_at(Tick::new(0));
    assert!(clef_at_0.is_some());
    assert_eq!(clef_at_0.unwrap().clef, Clef::Treble);
    
    // Query at tick 1920 should return Bass
    let clef_at_1920 = staff.get_clef_at(Tick::new(1920));
    assert!(clef_at_1920.is_some());
    assert_eq!(clef_at_1920.unwrap().clef, Clef::Bass);
    
    // Query after tick 1920 should still return Bass
    let clef_at_3000 = staff.get_clef_at(Tick::new(3000));
    assert!(clef_at_3000.is_some());
    assert_eq!(clef_at_3000.unwrap().clef, Clef::Bass);
}

#[test]
fn test_staff_get_key_signature_at_tick() {
    let mut staff = Staff::new();
    
    // Add key signature change at tick 1920
    let key_event = KeySignatureEvent::new(
        Tick::new(1920), 
        KeySignature::new(2).unwrap() // D major (2 sharps)
    );
    staff.add_key_signature_event(key_event).unwrap();
    
    // Query at tick 0 should return default C major (0 sharps)
    let key_at_0 = staff.get_key_signature_at(Tick::new(0));
    assert!(key_at_0.is_some());
    assert_eq!(key_at_0.unwrap().key.sharps(), 0);
    
    // Query at tick 1920 should return D major (2 sharps)
    let key_at_1920 = staff.get_key_signature_at(Tick::new(1920));
    assert!(key_at_1920.is_some());
    assert_eq!(key_at_1920.unwrap().key.sharps(), 2);
}
