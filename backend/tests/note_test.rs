use musicore_backend::domain::{
    events::note::Note,
    value_objects::{Pitch, Tick},
};

#[test]
fn test_note_creation() {
    let note = Note::new(Tick::new(0), 480, Pitch::new(60).unwrap());
    assert!(note.is_ok());

    let note = note.unwrap();
    assert_eq!(note.start_tick, Tick::new(0));
    assert_eq!(note.duration_ticks, 480);
    assert_eq!(note.pitch, Pitch::new(60).unwrap());
}

#[test]
fn test_note_zero_duration_rejected() {
    let result = Note::new(Tick::new(0), 0, Pitch::new(60).unwrap());
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "duration_ticks must be greater than 0");
}

#[test]
fn test_note_end_tick() {
    let note = Note::new(Tick::new(0), 960, Pitch::new(60).unwrap()).unwrap();
    assert_eq!(note.end_tick(), Tick::new(960));

    let note2 = Note::new(Tick::new(480), 480, Pitch::new(64).unwrap()).unwrap();
    assert_eq!(note2.end_tick(), Tick::new(960));
}

#[test]
fn test_note_overlap_detection() {
    let note1 = Note::new(Tick::new(0), 960, Pitch::new(60).unwrap()).unwrap();
    let note2 = Note::new(Tick::new(480), 960, Pitch::new(64).unwrap()).unwrap();

    assert!(note1.overlaps_with(&note2));
    assert!(note2.overlaps_with(&note1));
}

#[test]
fn test_note_no_overlap() {
    let note1 = Note::new(Tick::new(0), 480, Pitch::new(60).unwrap()).unwrap();
    let note2 = Note::new(Tick::new(480), 480, Pitch::new(64).unwrap()).unwrap();

    assert!(!note1.overlaps_with(&note2));
    assert!(!note2.overlaps_with(&note1));
}

#[test]
fn test_note_same_start_overlaps() {
    let note1 = Note::new(Tick::new(0), 480, Pitch::new(60).unwrap()).unwrap();
    let note2 = Note::new(Tick::new(0), 960, Pitch::new(64).unwrap()).unwrap();

    assert!(note1.overlaps_with(&note2));
}
