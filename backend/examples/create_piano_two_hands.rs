use musicore_backend::domain::{
    events::note::Note,
    instrument::Instrument,
    score::Score,
    staff::Staff,
    value_objects::{BPM, Pitch, Tick},
};

/// Example: Create a piano score with treble and bass clefs playing a C major chord
fn main() {
    println!("=== Creating Piano with Treble and Bass Clefs ===\n");

    // Create a new score
    let mut score = Score::new();
    println!("✓ Created score with ID: {}", score.id);

    // Add tempo change to 80 BPM for a slower feel
    let tempo_event = musicore_backend::domain::events::tempo::TempoEvent::new(
        Tick::new(0),
        BPM::new(80).unwrap(),
    );
    score.add_tempo_event(tempo_event).unwrap();
    println!("✓ Set tempo to 80 BPM\n");

    // Create a piano with two staves
    let mut piano = Instrument::new("Piano".to_string());
    println!("✓ Created Piano instrument");

    // Add a second staff for bass clef (default is treble)
    let bass_staff = Staff::new();
    piano.add_staff(bass_staff);
    println!("  Added treble clef staff (default)");
    println!("  Added bass clef staff\n");

    // Right hand (treble clef): C5, E5, G5 (high C major chord)
    println!("Right hand (treble clef) - C major chord:");
    let treble_voice = &mut piano.staves[0].voices[0];
    let right_hand_notes = [
        (72, "C5"), // MIDI 72 = C5
        (76, "E5"), // MIDI 76 = E5
        (79, "G5"), // MIDI 79 = G5
    ];

    for &(pitch, name) in &right_hand_notes {
        let note = Note::new(Tick::new(0), 3840, Pitch::new(pitch).unwrap()).unwrap(); // 3840 = whole note
        treble_voice.add_note(note).unwrap();
        println!("  ✓ Added note: {} (MIDI {})", name, pitch);
    }

    // Left hand (bass clef): C3, E3, G3 (low C major chord)
    println!("\nLeft hand (bass clef) - C major chord:");
    let bass_voice = &mut piano.staves[1].voices[0];
    let left_hand_notes = [
        (48, "C3"), // MIDI 48 = C3
        (52, "E3"), // MIDI 52 = E3
        (55, "G3"), // MIDI 55 = G3
    ];

    for &(pitch, name) in &left_hand_notes {
        let note = Note::new(Tick::new(0), 3840, Pitch::new(pitch).unwrap()).unwrap();
        bass_voice.add_note(note).unwrap();
        println!("  ✓ Added note: {} (MIDI {})", name, pitch);
    }

    // Add the piano to the score
    score.add_instrument(piano);

    println!("\n=== Score Summary ===");
    println!("Instruments: {}", score.instruments.len());
    println!("Staves: {}", score.instruments[0].staves.len());
    println!(
        "Right hand notes: {}",
        score.instruments[0].staves[0].voices[0]
            .interval_events
            .len()
    );
    println!(
        "Left hand notes: {}",
        score.instruments[0].staves[1].voices[0]
            .interval_events
            .len()
    );
    println!("\n✓ Two-staff piano score created successfully!");
}
