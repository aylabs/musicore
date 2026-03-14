//! MIDI parsing prototype — Architecture Review Spike (049)
//!
//! Mirrors the TypeScript `parseMidiNoteOn` and `parseMidiNoteOff` functions
//! from `frontend/src/services/recording/midiUtils.ts` to compare parsing
//! latency between Rust and TypeScript implementations.
//!
//! This module is spike code for ADR-049-002. It is NOT compiled into the
//! production WASM binary (no wasm-bindgen exports). It exists only for
//! benchmarking via `backend/benches/midi_latency.rs`.

/// Chromatic pitch class names using sharps.
const PITCH_CLASSES: [&str; 12] = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

/// Parsed MIDI note-on event, mirroring TypeScript's MidiNoteEvent.
#[derive(Debug, Clone, PartialEq)]
pub struct MidiNoteEvent {
    pub note_number: u8,
    pub velocity: u8,
    pub channel: u8,
    pub timestamp_ms: f64,
    pub label: String,
}

/// Converts a MIDI note number (0–127) to a scientific pitch label.
///
/// Formula: octave = note / 12 - 1; pitch_class = note % 12
/// Examples: 60 → "C4", 69 → "A4", 61 → "C#4"
pub fn midi_note_to_label(note_number: u8) -> String {
    let pitch_class = PITCH_CLASSES[(note_number % 12) as usize];
    let octave = (note_number as i8 / 12) - 1;
    format!("{}{}", pitch_class, octave)
}

/// Parses raw MIDI bytes and returns a structured note-on event, or None.
///
/// Status byte parsing (MIDI 1.0):
///   data[0] & 0xF0 == 0x90 and data[2] > 0  → note-on (returned)
///   data[0] & 0xF0 == 0x90 and data[2] == 0  → note-off (None)
///   all other status bytes                    → None
pub fn parse_midi_note_on(
    data: &[u8],
    session_start_ms: f64,
    event_time_ms: f64,
) -> Option<MidiNoteEvent> {
    if data.len() < 3 {
        return None;
    }

    let status_byte = data[0];
    let note_number = data[1];
    let velocity = data[2];

    let status_type = status_byte & 0xF0;

    if status_type != 0x90 {
        return None;
    }
    if velocity == 0 {
        return None;
    }

    let channel = (status_byte & 0x0F) + 1;

    Some(MidiNoteEvent {
        note_number,
        velocity,
        channel,
        timestamp_ms: event_time_ms - session_start_ms,
        label: midi_note_to_label(note_number),
    })
}

/// Parses raw MIDI bytes and returns the note number if it is a note-off event.
///
/// Note-off is either:
///   data[0] & 0xF0 == 0x80 (explicit note-off)
///   data[0] & 0xF0 == 0x90 and data[2] == 0 (velocity-0 note-on)
pub fn parse_midi_note_off(data: &[u8]) -> Option<u8> {
    if data.len() < 3 {
        return None;
    }
    let status_type = data[0] & 0xF0;
    let note_number = data[1];
    let velocity = data[2];

    if status_type == 0x80 {
        return Some(note_number);
    }
    if status_type == 0x90 && velocity == 0 {
        return Some(note_number);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_midi_note_to_label() {
        assert_eq!(midi_note_to_label(60), "C4");
        assert_eq!(midi_note_to_label(69), "A4");
        assert_eq!(midi_note_to_label(61), "C#4");
        assert_eq!(midi_note_to_label(72), "C5");
        assert_eq!(midi_note_to_label(0), "C-1");
        assert_eq!(midi_note_to_label(127), "G9");
    }

    #[test]
    fn test_parse_note_on() {
        let data = [0x90, 60, 100]; // channel 1, note 60, velocity 100
        let event = parse_midi_note_on(&data, 0.0, 100.0).unwrap();
        assert_eq!(event.note_number, 60);
        assert_eq!(event.velocity, 100);
        assert_eq!(event.channel, 1);
        assert_eq!(event.timestamp_ms, 100.0);
        assert_eq!(event.label, "C4");
    }

    #[test]
    fn test_parse_note_on_channel_10() {
        let data = [0x99, 36, 80]; // channel 10, note 36, velocity 80
        let event = parse_midi_note_on(&data, 50.0, 150.0).unwrap();
        assert_eq!(event.channel, 10);
        assert_eq!(event.timestamp_ms, 100.0);
    }

    #[test]
    fn test_velocity_zero_is_note_off() {
        let data = [0x90, 60, 0]; // velocity-0 note-on = note-off
        assert!(parse_midi_note_on(&data, 0.0, 0.0).is_none());
    }

    #[test]
    fn test_note_off_explicit() {
        let data = [0x80, 60, 64];
        assert!(parse_midi_note_on(&data, 0.0, 0.0).is_none());
        assert_eq!(parse_midi_note_off(&data), Some(60));
    }

    #[test]
    fn test_note_off_velocity_zero() {
        let data = [0x90, 72, 0];
        assert_eq!(parse_midi_note_off(&data), Some(72));
    }

    #[test]
    fn test_short_message_returns_none() {
        assert!(parse_midi_note_on(&[0x90, 60], 0.0, 0.0).is_none());
        assert!(parse_midi_note_off(&[0x80]).is_none());
    }

    #[test]
    fn test_non_note_message() {
        let data = [0xB0, 1, 64]; // control change
        assert!(parse_midi_note_on(&data, 0.0, 0.0).is_none());
        assert!(parse_midi_note_off(&data).is_none());
    }
}
