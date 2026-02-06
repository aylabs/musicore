use musicore_backend::domain::{
    events::note::Note,
    instrument::Instrument,
    score::Score,
    value_objects::{Pitch, Tick},
};

/// Example: Create a simple score with a piano playing a C major scale
fn main() {
    println!("=== Creating a C Major Scale ===\n");

    // Create a new score (defaults to 120 BPM, 4/4 time)
    let mut score = Score::new();
    println!("✓ Created score with ID: {}", score.id);
    println!("  Default tempo: 120 BPM");
    println!("  Default time signature: 4/4\n");

    // Add a piano instrument
    let mut piano = Instrument::new("Piano".to_string());
    println!("✓ Created instrument: Piano");
    println!("  Default staff with treble clef, C major key");
    println!("  Default voice for notes\n");

    // Get the default voice
    let voice = &mut piano.staves[0].voices[0];

    // C major scale: C4, D4, E4, F4, G4, A4, B4, C5
    let scale_pitches = [60, 62, 64, 65, 67, 69, 71, 72];
    let quarter_note = 960; // Duration in ticks at 960 PPQ

    println!("Adding C major scale notes:");
    for (i, &pitch) in scale_pitches.iter().enumerate() {
        let tick = Tick::new(i as u32 * quarter_note);
        let note = Note::new(tick, quarter_note, Pitch::new(pitch).unwrap()).unwrap();
        voice.add_note(note).unwrap();
        
        let note_name = pitch_to_note_name(pitch);
        println!("  ✓ Added note: {} (MIDI {}) at tick {}", note_name, pitch, tick.value());
    }

    // Add the piano to the score
    score.add_instrument(piano);

    println!("\n=== Score Summary ===");
    println!("Instruments: {}", score.instruments.len());
    println!("Total notes: {}", score.instruments[0].staves[0].voices[0].interval_events.len());
    println!("\n✓ C major scale created successfully!");
}

/// Helper function to convert MIDI pitch to note name
fn pitch_to_note_name(pitch: u8) -> String {
    let note_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    let octave = (pitch / 12) as i32 - 1;
    let note = note_names[(pitch % 12) as usize];
    format!("{}{}", note, octave)
}
