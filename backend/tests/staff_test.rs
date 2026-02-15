use musicore_backend::domain::{
    events::{clef::ClefEvent, key_signature::KeySignatureEvent},
    staff::Staff,
    value_objects::{Clef, KeySignature, Tick},
};

#[test]
fn test_staff_creation_with_defaults() {
    let staff = Staff::new();

    assert_eq!(staff.staff_structural_events.len(), 2); // Clef + Key Signature
    assert_eq!(staff.voices.len(), 1); // One default voice
}

#[test]
fn test_staff_default_clef_at_tick_0() {
    let staff = Staff::new();

    let clef_events: Vec<_> = staff
        .staff_structural_events
        .iter()
        .filter_map(|e| match e {
            musicore_backend::domain::events::staff::StaffStructuralEvent::Clef(ce) => Some(ce),
            _ => None,
        })
        .collect();

    assert_eq!(clef_events.len(), 1);
    assert_eq!(clef_events[0].tick, Tick::new(0));
    assert_eq!(clef_events[0].clef, Clef::Treble);
}

#[test]
fn test_staff_default_key_signature_at_tick_0() {
    let staff = Staff::new();

    let key_events: Vec<_> = staff
        .staff_structural_events
        .iter()
        .filter_map(|e| match e {
            musicore_backend::domain::events::staff::StaffStructuralEvent::KeySignature(ke) => {
                Some(ke)
            }
            _ => None,
        })
        .collect();

    assert_eq!(key_events.len(), 1);
    assert_eq!(key_events[0].tick, Tick::new(0));
    assert_eq!(key_events[0].key.sharps(), 0); // C major
}

#[test]
fn test_staff_add_clef_event() {
    let mut staff = Staff::new();
    let clef_event = ClefEvent::new(Tick::new(960), Clef::Bass);

    let result = staff.add_clef_event(clef_event);
    assert!(result.is_ok());

    let clef_events: Vec<_> = staff
        .staff_structural_events
        .iter()
        .filter(|e| {
            matches!(
                e,
                musicore_backend::domain::events::staff::StaffStructuralEvent::Clef(_)
            )
        })
        .collect();

    assert_eq!(clef_events.len(), 2); // Default + new one
}

#[test]
fn test_staff_reject_duplicate_clef_at_same_tick() {
    let mut staff = Staff::new();
    let clef_event = ClefEvent::new(Tick::new(0), Clef::Bass);

    let result = staff.add_clef_event(clef_event);
    assert!(result.is_err());
}

#[test]
fn test_staff_add_key_signature_event() {
    let mut staff = Staff::new();
    let key_event = KeySignatureEvent::new(Tick::new(960), KeySignature::new(2).unwrap());

    let result = staff.add_key_signature_event(key_event);
    assert!(result.is_ok());
}

#[test]
fn test_staff_reject_duplicate_key_signature_at_same_tick() {
    let mut staff = Staff::new();
    let key_event = KeySignatureEvent::new(Tick::new(0), KeySignature::new(1).unwrap());

    let result = staff.add_key_signature_event(key_event);
    assert!(result.is_err());
}
