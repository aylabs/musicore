use crate::domain::{
    errors::DomainError,
    events::{
        global::GlobalStructuralEvent,
        tempo::TempoEvent,
        time_signature::TimeSignatureEvent,
    },
    ids::ScoreId,
    instrument::Instrument,
    value_objects::{BPM, Tick},
};
use serde::{Deserialize, Serialize};

/// Score is the aggregate root containing all musical elements
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Score {
    pub id: ScoreId,
    pub global_structural_events: Vec<GlobalStructuralEvent>,
    pub instruments: Vec<Instrument>,
}

impl Score {
    /// Create a new score with default tempo (120 BPM) and time signature (4/4) at tick 0
    pub fn new() -> Self {
        let mut score = Self {
            id: ScoreId::new(),
            global_structural_events: Vec::new(),
            instruments: Vec::new(),
        };

        // Add default tempo (120 BPM) at tick 0
        let tempo_event = TempoEvent::new(Tick::new(0), BPM::new(120).unwrap());
        score.global_structural_events.push(GlobalStructuralEvent::Tempo(tempo_event));

        // Add default time signature (4/4) at tick 0
        let time_sig_event = TimeSignatureEvent::new(Tick::new(0), 4, 4);
        score.global_structural_events.push(GlobalStructuralEvent::TimeSignature(time_sig_event));

        score
    }

    /// Add a tempo event with duplicate tick validation
    pub fn add_tempo_event(&mut self, event: TempoEvent) -> Result<(), DomainError> {
        // Check for duplicate tempo event at the same tick
        for existing_event in &self.global_structural_events {
            if let GlobalStructuralEvent::Tempo(existing_tempo) = existing_event {
                if existing_tempo.tick == event.tick {
                    return Err(DomainError::DuplicateError(
                        format!("Tempo event already exists at tick {}", event.tick.value())
                    ));
                }
            }
        }

        self.global_structural_events.push(GlobalStructuralEvent::Tempo(event));
        Ok(())
    }

    /// Add a time signature event with duplicate tick validation
    pub fn add_time_signature_event(&mut self, event: TimeSignatureEvent) -> Result<(), DomainError> {
        // Check for duplicate time signature event at the same tick
        for existing_event in &self.global_structural_events {
            if let GlobalStructuralEvent::TimeSignature(existing_time_sig) = existing_event {
                if existing_time_sig.tick == event.tick {
                    return Err(DomainError::DuplicateError(
                        format!("Time signature event already exists at tick {}", event.tick.value())
                    ));
                }
            }
        }

        self.global_structural_events.push(GlobalStructuralEvent::TimeSignature(event));
        Ok(())
    }

    /// Add an instrument to the score
    pub fn add_instrument(&mut self, instrument: Instrument) {
        self.instruments.push(instrument);
    }
}

impl Default for Score {
    fn default() -> Self {
        Self::new()
    }
}
