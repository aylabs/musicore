// MusicXML to Domain Converter - Feature 006-musicxml-import
// Transforms MusicXML intermediate representation to domain entities

use crate::domain::score::Score;
use crate::domain::instrument::Instrument;
use crate::domain::staff::Staff;
use crate::domain::voice::Voice;
use crate::domain::events::note::Note;
use crate::domain::events::tempo::TempoEvent;
use crate::domain::events::time_signature::TimeSignatureEvent;
use crate::domain::events::key_signature::KeySignatureEvent;
use crate::domain::events::clef::ClefEvent;
use crate::domain::value_objects::{Tick, BPM};

use super::errors::ImportError;
use super::types::{MusicXMLDocument, PartData, MeasureData, NoteData, MeasureElement};
use super::timing::Fraction;
use super::mapper::ElementMapper;

/// Context for timing calculations during conversion
#[derive(Debug, Clone)]
struct TimingContext {
    /// Current divisions per quarter note from MusicXML
    divisions: i32,
    /// Current tick position in 960 PPQ
    current_tick: u32,
}

impl TimingContext {
    fn new() -> Self {
        Self {
            divisions: 480, // Default divisions
            current_tick: 0,
        }
    }

    fn set_divisions(&mut self, divisions: i32) {
        self.divisions = divisions;
    }

    fn advance_by_duration(&mut self, duration: i32) -> Result<(), ImportError> {
        let fraction = Fraction::from_musicxml(duration, self.divisions);
        let ticks = fraction.to_ticks()?;
        self.current_tick += ticks as u32;
        Ok(())
    }

    fn current_tick(&self) -> Tick {
        Tick::new(self.current_tick)
    }
}

/// Converts MusicXML documents to domain Score entities
pub struct MusicXMLConverter;

impl MusicXMLConverter {
    /// Converts MusicXMLDocument to Score
    ///
    /// # Arguments
    /// * `doc` - Parsed MusicXML document
    ///
    /// # Returns
    /// Score with all instruments, staves, voices, and events
    pub fn convert(doc: MusicXMLDocument) -> Result<Score, ImportError> {
        // Create Score with defaults (120 BPM, 4/4 time signature)
        let mut score = Score::new();

        // Set global tempo if specified in document
        if doc.default_tempo > 0.0 {
            let bpm = BPM::new(doc.default_tempo as u16).map_err(|e| ImportError::ValidationError {
                errors: vec![format!("Invalid tempo: {}", e)],
            })?;
            let tempo_event = TempoEvent::new(Tick::new(0), bpm);
            
            // Clear default tempo and add document tempo
            score.global_structural_events.clear();
            score.add_tempo_event(tempo_event)?;
            
            // Re-add default time signature
            let time_sig = TimeSignatureEvent::new(Tick::new(0), 4, 4);
            score.add_time_signature_event(time_sig)?;
        }

        // Convert each part to an Instrument
        for part_data in doc.parts {
            let instrument = Self::convert_part(part_data)?;
            score.add_instrument(instrument);
        }

        Ok(score)
    }

    /// Converts PartData to Instrument
    fn convert_part(part_data: PartData) -> Result<Instrument, ImportError> {
        let name = if part_data.name.is_empty() {
            format!("Instrument {}", part_data.id)
        } else {
            part_data.name.clone()
        };

        // Create instrument with default staff, then clear
        let mut instrument = Instrument::new(name);
        instrument.staves.clear();
        
        // Check staff count and route accordingly
        if part_data.staff_count <= 1 {
            // Single-staff instrument (US1)
            let staff = Self::convert_staff_for_single_staff(&part_data)?;
            instrument.add_staff(staff);
        } else {
            // Multi-staff instrument (US2) - e.g., piano grand staff
            let staves = Self::convert_multi_staff(&part_data)?;
            for staff in staves {
                instrument.add_staff(staff);
            }
        }

        Ok(instrument)
    }

    /// Converts PartData to multiple Staff entities for multi-staff instruments (US2)
    fn convert_multi_staff(part_data: &PartData) -> Result<Vec<Staff>, ImportError> {
        let mut staves = Vec::new();
        
        // Create a staff for each staff number (1-indexed in MusicXML)
        for staff_num in 1..=part_data.staff_count {
            let mut staff = Staff::new();
            
            // Clear default events - we'll add from attributes
            staff.staff_structural_events.clear();
            staff.voices.clear();
            
            // Extract attributes from first measure for this staff
            if let Some(first_measure) = part_data.measures.first() {
                if let Some(attrs) = &first_measure.attributes {
                    // Find clef for this staff number
                    if let Some(clef_data) = attrs.clefs.iter().find(|c| c.staff_number == staff_num) {
                        let clef = ElementMapper::map_clef(&clef_data.sign, clef_data.line)?;
                        let clef_event = ClefEvent::new(Tick::new(0), clef);
                        staff.add_clef_event(clef_event)?;
                    }
                    
                    // Key signature (shared across all staves)
                    if let Some(key_data) = &attrs.key {
                        let key_sig = ElementMapper::map_key(key_data.fifths, Some(&key_data.mode))?;
                        let key_event = KeySignatureEvent::new(Tick::new(0), key_sig);
                        staff.add_key_signature_event(key_event)?;
                    }
                }
            }
            
            // Convert measures to voice, filtering by staff number
            let voice = Self::convert_voice_for_staff(&part_data.measures, staff_num)?;
            staff.add_voice(voice);
            
            staves.push(staff);
        }
        
        Ok(staves)
    }

    /// Converts PartData to Staff for single-staff instruments (US1)
    fn convert_staff_for_single_staff(part_data: &PartData) -> Result<Staff, ImportError> {
        // Create staff with defaults (Treble clef, C major, 1 voice)
        let mut staff = Staff::new();
        
        // Clear default events - we'll add from attributes
        staff.staff_structural_events.clear();
        staff.voices.clear();

        // Extract attributes and events from first measure
        if let Some(first_measure) = part_data.measures.first() {
            if let Some(attrs) = &first_measure.attributes {
                // Add clef from first measure
                if let Some(clef_data) = attrs.clefs.first() {
                    let clef = ElementMapper::map_clef(&clef_data.sign, clef_data.line)?;
                    let clef_event = ClefEvent::new(Tick::new(0), clef);
                    staff.add_clef_event(clef_event)?;
                }
                
                // Add key signature from first measure
                if let Some(key_data) = &attrs.key {
                    let key_sig = ElementMapper::map_key(key_data.fifths, Some(&key_data.mode))?;
                    let key_event = KeySignatureEvent::new(Tick::new(0), key_sig);
                    staff.add_key_signature_event(key_event)?;
                }
            }
        }

        // Convert measures to voice with notes (no staff filtering for single staff)
        let voice = Self::convert_voice(&part_data.measures)?;
        staff.add_voice(voice);

        Ok(staff)
    }

    /// Converts measures to Voice with all notes (for single-staff instruments)
    fn convert_voice(measures: &[MeasureData]) -> Result<Voice, ImportError> {
        let mut voice = Voice::new();
        let mut timing_context = TimingContext::new();

        for measure in measures {
            // Process attributes first (update divisions, ignore structural events)
            if let Some(attrs) = &measure.attributes {
                if let Some(divisions) = attrs.divisions {
                    timing_context.set_divisions(divisions);
                }
                // Note: Tempo, time sig, clef, key are handled at Score/Staff level
                // They are not added to Voice - Voice only contains Notes
            }

            // Process musical elements (notes, rests, backup/forward)
            for element in &measure.elements {
                match element {
                    MeasureElement::Note(note_data) => {
                        let note = Self::convert_note(note_data, &mut timing_context)?;
                        voice.add_note(note)?;
                    }
                    MeasureElement::Rest(rest_data) => {
                        // Advance timing without creating note (rests are implicit)
                        timing_context.advance_by_duration(rest_data.duration)?;
                    }
                    MeasureElement::Backup(duration) => {
                        // Move timing cursor backward
                        let fraction = Fraction::from_musicxml(*duration, timing_context.divisions);
                        let ticks = fraction.to_ticks()?;
                        if timing_context.current_tick >= ticks as u32 {
                            timing_context.current_tick -= ticks as u32;
                        }
                    }
                    MeasureElement::Forward(duration) => {
                        // Move timing cursor forward
                        timing_context.advance_by_duration(*duration)?;
                    }
                }
            }
        }

        Ok(voice)
    }

    /// Converts measures to Voice with notes filtered by staff number (for multi-staff instruments)
    fn convert_voice_for_staff(measures: &[MeasureData], staff_num: usize) -> Result<Voice, ImportError> {
        let mut voice = Voice::new();
        let mut timing_context = TimingContext::new();

        for measure in measures {
            // Reset timing at start of each measure for this staff
            // (backup/forward in MusicXML applies globally, but we track per-staff)
            let measure_start_tick = timing_context.current_tick;
            
            // Process attributes first (update divisions, ignore structural events)
            if let Some(attrs) = &measure.attributes {
                if let Some(divisions) = attrs.divisions {
                    timing_context.set_divisions(divisions);
                }
            }

            // Process musical elements, filtering by staff number
            for element in &measure.elements {
                match element {
                    MeasureElement::Note(note_data) => {
                        // Only process notes for this staff
                        if note_data.staff == staff_num {
                            let note = Self::convert_note(note_data, &mut timing_context)?;
                            voice.add_note(note)?;
                        }
                        // Notes on other staves don't affect our timing
                    }
                    MeasureElement::Rest(rest_data) => {
                        // Only process rests for this staff
                        if rest_data.staff == staff_num {
                            timing_context.advance_by_duration(rest_data.duration)?;
                        }
                    }
                    MeasureElement::Backup(_duration) => {
                        // In multi-staff notation, backup is used to go back and write
                        // notes for the next staff. We ignore it since each staff tracks
                        // timing independently. Backup typically happens after all notes
                        // for staff 1, resetting to measure start to write staff 2.
                        // Reset to measure start for this staff
                        timing_context.current_tick = measure_start_tick;
                    }
                    MeasureElement::Forward(duration) => {
                        // Forward advances time (e.g., for multi-voice within same staff)
                        // Only apply if it's relevant to this staff's timing
                        timing_context.advance_by_duration(*duration)?;
                    }
                }
            }
        }

        Ok(voice)
    }

    /// Converts NoteData to Note
    fn convert_note(
        note_data: &NoteData,
        timing_context: &mut TimingContext,
    ) -> Result<Note, ImportError> {
        // Extract pitch
        let pitch_data = note_data.pitch.as_ref().ok_or_else(|| {
            ImportError::InvalidStructure {
                reason: "Note missing pitch data".to_string(),
            }
        })?;

        // Map pitch to domain Pitch value object
        let pitch = ElementMapper::map_pitch(pitch_data.step, pitch_data.octave, pitch_data.alter)?;

        // Calculate tick position and duration
        let tick = timing_context.current_tick();
        let fraction = Fraction::from_musicxml(note_data.duration, timing_context.divisions);
        let duration_ticks = fraction.to_ticks()?;

        // Advance timing cursor
        timing_context.advance_by_duration(note_data.duration)?;

        // Create Note using domain constructor
        let note = Note::new(tick, duration_ticks as u32, pitch)
            .map_err(|e: &'static str| ImportError::ValidationError {
                errors: vec![e.to_string()],
            })?;

        Ok(note)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::importers::musicxml::types::*;

    #[test]
    fn test_convert_single_part_to_score() {
        // T042: Convert MusicXMLDocument with 1 part → Score with 1 Instrument
        let mut doc = MusicXMLDocument::default();
        doc.version = "3.1".to_string();

        // Create part with basic attributes
        let mut part = PartData {
            id: "P1".to_string(),
            name: "Piano".to_string(),
            measures: Vec::new(),
            staff_count: 1,
        };

        // Create measure with attributes
        let measure = MeasureData {
            number: 1,
            attributes: Some(AttributesData {
                divisions: Some(480),
                key: Some(KeyData {
                    fifths: 0,
                    mode: "major".to_string(),
                }),
                time: Some(TimeSignatureData {
                    beats: 4,
                    beat_type: 4,
                }),
                clefs: vec![ClefData {
                    sign: "G".to_string(),
                    line: 2,
                    staff_number: 1,
                }],
                tempo: Some(120.0),
            }),
            elements: vec![MeasureElement::Note(NoteData {
                pitch: Some(PitchData {
                    step: 'C',
                    octave: 4,
                    alter: 0,
                }),
                duration: 480,
                voice: 1,
                staff: 1,
                note_type: Some("quarter".to_string()),
                is_chord: false,
            })],
        };

        part.measures.push(measure);
        doc.parts.push(part);

        // Convert to Score
        let result = MusicXMLConverter::convert(doc);
        assert!(result.is_ok(), "Conversion should succeed: {:?}", result.err());

        let score = result.unwrap();
        assert_eq!(score.instruments.len(), 1, "Expected 1 instrument");

        let instrument = &score.instruments[0];
        assert_eq!(instrument.name, "Piano");
        assert_eq!(instrument.staves.len(), 1, "Expected 1 staff");

        let staff = &instrument.staves[0];
        assert_eq!(staff.voices.len(), 1, "Expected 1 voice");

        let voice = &staff.voices[0];
        assert!(voice.interval_events.len() > 0, "Expected notes in voice");
    }

    #[test]
    fn test_timing_context_advance() {
        // T044: Verify timing context tracks tick position correctly
        let mut ctx = TimingContext::new();
        ctx.set_divisions(480);

        assert_eq!(ctx.current_tick().value(), 0);

        // Advance by quarter note (480 duration at 480 divisions = 960 ticks)
        ctx.advance_by_duration(480).unwrap();
        assert_eq!(ctx.current_tick().value(), 960);

        // Advance by another quarter note
        ctx.advance_by_duration(480).unwrap();
        assert_eq!(ctx.current_tick().value(), 1920);
    }

    #[test]
    fn test_convert_note() {
        // T046: Convert NoteData to Note with correct pitch and timing
        let mut timing_ctx = TimingContext::new();
        timing_ctx.set_divisions(480);

        let note_data = NoteData {
            pitch: Some(PitchData {
                step: 'C',
                octave: 4,
                alter: 0,
            }),
            duration: 480,
            voice: 1,
            staff: 1,
            note_type: Some("quarter".to_string()),
            is_chord: false,
        };

        let result = MusicXMLConverter::convert_note(&note_data, &mut timing_ctx);
        assert!(result.is_ok(), "Note conversion should succeed: {:?}", result.err());

        let note = result.unwrap();
        assert_eq!(note.pitch.value(), 60); // Middle C
        assert_eq!(note.start_tick.value(), 0);
        assert_eq!(note.duration_ticks, 960); // Quarter note at 960 PPQ

        // Timing context should have advanced
        assert_eq!(timing_ctx.current_tick().value(), 960);
    }

    #[test]
    fn test_convert_voice_with_multiple_notes() {
        // T048: Convert multiple notes to Voice
        let measures = vec![MeasureData {
            number: 1,
            attributes: Some(AttributesData {
                divisions: Some(480),
                key: None,
                time: None,
                clefs: vec![],
                tempo: None,
            }),
            elements: vec![
                MeasureElement::Note(NoteData {
                    pitch: Some(PitchData {
                        step: 'C',
                        octave: 4,
                        alter: 0,
                    }),
                    duration: 480,
                    voice: 1,
                    staff: 1,
                    note_type: Some("quarter".to_string()),
                    is_chord: false,
                }),
                MeasureElement::Note(NoteData {
                    pitch: Some(PitchData {
                        step: 'D',
                        octave: 4,
                        alter: 0,
                    }),
                    duration: 480,
                    voice: 1,
                    staff: 1,
                    note_type: Some("quarter".to_string()),
                    is_chord: false,
                }),
            ],
        }];

        let result = MusicXMLConverter::convert_voice(&measures);
        assert!(result.is_ok(), "Voice conversion should succeed: {:?}", result.err());

        let voice = result.unwrap();
        assert_eq!(voice.interval_events.len(), 2, "Expected 2 notes");

        // First note: C4 at tick 0
        assert_eq!(voice.interval_events[0].pitch.value(), 60);
        assert_eq!(voice.interval_events[0].start_tick.value(), 0);

        // Second note: D4 at tick 960
        assert_eq!(voice.interval_events[1].pitch.value(), 62);
        assert_eq!(voice.interval_events[1].start_tick.value(), 960);
    }
}
