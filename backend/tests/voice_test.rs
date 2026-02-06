use musicore_backend::domain::{
    events::note::Note,
    value_objects::{Pitch, Tick},
    voice::Voice,
};

#[test]
fn test_voice_creation() {
    let voice = Voice::new();
    assert_eq!(voice.interval_events.len(), 0);
}

#[test]
fn test_voice_add_note() {
    let mut voice = Voice::new();
    let note = Note::new(Tick::new(0), 480, Pitch::new(60).unwrap()).unwrap();
    
    let result = voice.add_note(note);
    assert!(result.is_ok());
    assert_eq!(voice.interval_events.len(), 1);
}

#[test]
fn test_voice_add_multiple_notes_different_pitches() {
    let mut voice = Voice::new();
    let note1 = Note::new(Tick::new(0), 480, Pitch::new(60).unwrap()).unwrap();
    let note2 = Note::new(Tick::new(0), 480, Pitch::new(64).unwrap()).unwrap();
    
    assert!(voice.add_note(note1).is_ok());
    assert!(voice.add_note(note2).is_ok());
    assert_eq!(voice.interval_events.len(), 2);
}

#[test]
fn test_voice_reject_overlapping_same_pitch() {
    let mut voice = Voice::new();
    let note1 = Note::new(Tick::new(0), 960, Pitch::new(60).unwrap()).unwrap();
    let note2 = Note::new(Tick::new(480), 960, Pitch::new(60).unwrap()).unwrap();
    
    assert!(voice.add_note(note1).is_ok());
    let result = voice.add_note(note2);
    assert!(result.is_err());
    assert_eq!(voice.interval_events.len(), 1);
}

#[test]
fn test_voice_allow_sequential_same_pitch() {
    let mut voice = Voice::new();
    let note1 = Note::new(Tick::new(0), 480, Pitch::new(60).unwrap()).unwrap();
    let note2 = Note::new(Tick::new(480), 480, Pitch::new(60).unwrap()).unwrap();
    
    assert!(voice.add_note(note1).is_ok());
    assert!(voice.add_note(note2).is_ok());
    assert_eq!(voice.interval_events.len(), 2);
}
