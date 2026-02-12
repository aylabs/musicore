use musicore_backend::domain::instrument::Instrument;

#[test]
fn test_instrument_creation() {
    let instrument = Instrument::new("Piano".to_string());

    assert_eq!(instrument.name, "Piano");
    assert_eq!(instrument.staves.len(), 1); // One default staff
}

#[test]
fn test_instrument_default_staff_initialized() {
    let instrument = Instrument::new("Guitar".to_string());

    let staff = &instrument.staves[0];
    assert_eq!(staff.voices.len(), 1);
    assert_eq!(staff.staff_structural_events.len(), 2); // Clef + Key
}

#[test]
fn test_instrument_name_stored() {
    let instrument = Instrument::new("Violin".to_string());
    assert_eq!(instrument.name, "Violin");

    let instrument2 = Instrument::new("Cello".to_string());
    assert_eq!(instrument2.name, "Cello");
}
