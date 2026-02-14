use musicore_backend::domain::value_objects::{BPM, Clef, KeySignature, Pitch, Tick};

#[test]
fn test_tick_creation_and_operations() {
    let tick = Tick::new(0);
    assert_eq!(tick.value(), 0);

    let tick2 = Tick::new(960);
    assert_eq!(tick2.value(), 960);

    let tick3 = tick.add(480);
    assert_eq!(tick3.value(), 480);
}

#[test]
fn test_tick_ordering() {
    let tick1 = Tick::new(0);
    let tick2 = Tick::new(960);

    assert!(tick1 < tick2);
    assert!(tick2 > tick1);
    assert_eq!(tick1, Tick::new(0));
}

#[test]
fn test_bpm_valid_range() {
    assert!(BPM::new(120).is_ok());
    assert!(BPM::new(20).is_ok());
    assert!(BPM::new(400).is_ok());

    let bpm = BPM::new(120).unwrap();
    assert_eq!(bpm.value(), 120);
}

#[test]
fn test_bpm_invalid_values() {
    assert!(BPM::new(0).is_err());
    assert!(BPM::new(10).is_err());
    assert!(BPM::new(500).is_err());
}

#[test]
fn test_pitch_valid_range() {
    assert!(Pitch::new(0).is_ok());
    assert!(Pitch::new(60).is_ok());
    assert!(Pitch::new(127).is_ok());

    let pitch = Pitch::new(60).unwrap();
    assert_eq!(pitch.value(), 60);
}

#[test]
fn test_pitch_invalid_values() {
    assert!(Pitch::new(128).is_err());
    assert!(Pitch::new(255).is_err());
}

#[test]
fn test_clef_variants() {
    let treble = Clef::Treble;
    let bass = Clef::Bass;
    let _alto = Clef::Alto;
    let _tenor = Clef::Tenor;

    assert_eq!(treble, Clef::Treble);
    assert_ne!(treble, bass);
}

#[test]
fn test_key_signature_valid_range() {
    assert!(KeySignature::new(0).is_ok()); // C major
    assert!(KeySignature::new(7).is_ok()); // C# major (7 sharps)
    assert!(KeySignature::new(-7).is_ok()); // Cb major (7 flats)

    let c_major = KeySignature::new(0).unwrap();
    assert_eq!(c_major.sharps(), 0);
}

#[test]
fn test_key_signature_invalid_values() {
    assert!(KeySignature::new(8).is_err());
    assert!(KeySignature::new(-8).is_err());
}
