use musicore_backend::domain::{
    events::{
        clef::ClefEvent, key_signature::KeySignatureEvent, tempo::TempoEvent,
        time_signature::TimeSignatureEvent,
    },
    score::Score,
    staff::Staff,
    value_objects::{BPM, Clef, KeySignature, Tick},
};

// T048: Score - Prevent deletion of tick 0 tempo/time signature

#[test]
fn test_score_prevent_delete_tempo_at_tick_0() {
    let mut score = Score::new();

    let result = score.remove_tempo_event(Tick::new(0));
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        musicore_backend::domain::errors::DomainError::ConstraintViolation(_)
    ));
}

#[test]
fn test_score_prevent_delete_time_signature_at_tick_0() {
    let mut score = Score::new();

    let result = score.remove_time_signature_event(Tick::new(0));
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        musicore_backend::domain::errors::DomainError::ConstraintViolation(_)
    ));
}

#[test]
fn test_score_delete_tempo_at_non_zero_tick() {
    let mut score = Score::new();

    // Add tempo change at tick 960
    let tempo_event = TempoEvent::new(Tick::new(960), BPM::new(140).unwrap());
    score.add_tempo_event(tempo_event).unwrap();

    // Should allow deletion at non-zero tick
    let result = score.remove_tempo_event(Tick::new(960));
    assert!(result.is_ok());
}

#[test]
fn test_score_delete_time_signature_at_non_zero_tick() {
    let mut score = Score::new();

    // Add time signature change at tick 960
    let time_sig_event = TimeSignatureEvent::new(Tick::new(960), 3, 4);
    score.add_time_signature_event(time_sig_event).unwrap();

    // Should allow deletion at non-zero tick
    let result = score.remove_time_signature_event(Tick::new(960));
    assert!(result.is_ok());
}

#[test]
fn test_score_delete_nonexistent_tempo() {
    let mut score = Score::new();

    let result = score.remove_tempo_event(Tick::new(1000));
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        musicore_backend::domain::errors::DomainError::NotFound(_)
    ));
}

// T049: Score - Query structural events by tick range

#[test]
fn test_score_query_events_in_range() {
    let mut score = Score::new();

    // Add events at various ticks
    score
        .add_tempo_event(TempoEvent::new(Tick::new(960), BPM::new(140).unwrap()))
        .unwrap();
    score
        .add_tempo_event(TempoEvent::new(Tick::new(3840), BPM::new(100).unwrap()))
        .unwrap();
    score
        .add_time_signature_event(TimeSignatureEvent::new(Tick::new(1920), 3, 4))
        .unwrap();

    // Query range that includes multiple events
    let events = score.query_structural_events_in_range(Tick::new(500), Tick::new(2000));
    assert_eq!(events.len(), 2); // tempo at 960 and time_sig at 1920
}

#[test]
fn test_score_query_events_empty_range() {
    let score = Score::new();

    let events = score.query_structural_events_in_range(Tick::new(1000), Tick::new(2000));
    assert_eq!(events.len(), 0);
}

#[test]
fn test_score_query_events_at_tick_0() {
    let score = Score::new();

    let events = score.query_structural_events_in_range(Tick::new(0), Tick::new(0));
    assert_eq!(events.len(), 2); // Default tempo and time signature at tick 0
}

// T052: Staff - Prevent deletion of tick 0 clef/key signature

#[test]
fn test_staff_prevent_delete_clef_at_tick_0() {
    let mut staff = Staff::new();

    let result = staff.remove_clef_event(Tick::new(0));
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        musicore_backend::domain::errors::DomainError::ConstraintViolation(_)
    ));
}

#[test]
fn test_staff_prevent_delete_key_signature_at_tick_0() {
    let mut staff = Staff::new();

    let result = staff.remove_key_signature_event(Tick::new(0));
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        musicore_backend::domain::errors::DomainError::ConstraintViolation(_)
    ));
}

#[test]
fn test_staff_delete_clef_at_non_zero_tick() {
    let mut staff = Staff::new();

    // Add clef change at tick 960
    let clef_event = ClefEvent::new(Tick::new(960), Clef::Bass);
    staff.add_clef_event(clef_event).unwrap();

    // Should allow deletion at non-zero tick
    let result = staff.remove_clef_event(Tick::new(960));
    assert!(result.is_ok());
}

#[test]
fn test_staff_delete_key_signature_at_non_zero_tick() {
    let mut staff = Staff::new();

    // Add key signature change at tick 960
    let key_event = KeySignatureEvent::new(Tick::new(960), KeySignature::new(2).unwrap());
    staff.add_key_signature_event(key_event).unwrap();

    // Should allow deletion at non-zero tick
    let result = staff.remove_key_signature_event(Tick::new(960));
    assert!(result.is_ok());
}

#[test]
fn test_staff_delete_nonexistent_clef() {
    let mut staff = Staff::new();

    let result = staff.remove_clef_event(Tick::new(1000));
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        musicore_backend::domain::errors::DomainError::NotFound(_)
    ));
}

// T053: Staff - Query structural events by tick range

#[test]
fn test_staff_query_events_in_range() {
    let mut staff = Staff::new();

    // Add events at various ticks
    staff
        .add_clef_event(ClefEvent::new(Tick::new(960), Clef::Bass))
        .unwrap();
    staff
        .add_clef_event(ClefEvent::new(Tick::new(3840), Clef::Alto))
        .unwrap();
    staff
        .add_key_signature_event(KeySignatureEvent::new(
            Tick::new(1920),
            KeySignature::new(2).unwrap(),
        ))
        .unwrap();

    // Query range that includes multiple events
    let events = staff.query_structural_events_in_range(Tick::new(500), Tick::new(2000));
    assert_eq!(events.len(), 2); // clef at 960 and key_sig at 1920
}

#[test]
fn test_staff_query_events_empty_range() {
    let staff = Staff::new();

    let events = staff.query_structural_events_in_range(Tick::new(1000), Tick::new(2000));
    assert_eq!(events.len(), 0);
}

#[test]
fn test_staff_query_events_at_tick_0() {
    let staff = Staff::new();

    let events = staff.query_structural_events_in_range(Tick::new(0), Tick::new(0));
    assert_eq!(events.len(), 2); // Default clef and key signature at tick 0
}
