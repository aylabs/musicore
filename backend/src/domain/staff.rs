use crate::domain::{
    errors::DomainError,
    events::{
        clef::ClefEvent,
        key_signature::KeySignatureEvent,
        staff::StaffStructuralEvent,
    },
    ids::StaffId,
    value_objects::{Clef, KeySignature, Tick},
    voice::Voice,
};
use serde::{Deserialize, Serialize};

/// Staff contains voices and staff-scoped structural events
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Staff {
    pub id: StaffId,
    pub staff_structural_events: Vec<StaffStructuralEvent>,
    pub voices: Vec<Voice>,
}

impl Staff {
    /// Create a new staff with default clef (Treble) and key signature (C major) at tick 0
    pub fn new() -> Self {
        let mut staff = Self {
            id: StaffId::new(),
            staff_structural_events: Vec::new(),
            voices: Vec::new(),
        };

        // Add default clef (Treble) at tick 0
        let clef_event = ClefEvent::new(Tick::new(0), Clef::Treble);
        staff.staff_structural_events.push(StaffStructuralEvent::Clef(clef_event));

        // Add default key signature (C major = 0 sharps) at tick 0
        let key_event = KeySignatureEvent::new(Tick::new(0), KeySignature::new(0).unwrap());
        staff.staff_structural_events.push(StaffStructuralEvent::KeySignature(key_event));

        // Add one default voice
        staff.voices.push(Voice::new());

        staff
    }

    /// Add a clef event with duplicate tick validation
    pub fn add_clef_event(&mut self, event: ClefEvent) -> Result<(), DomainError> {
        // Check for duplicate clef event at the same tick
        for existing_event in &self.staff_structural_events {
            if let StaffStructuralEvent::Clef(existing_clef) = existing_event {
                if existing_clef.tick == event.tick {
                    return Err(DomainError::DuplicateError(
                        format!("Clef event already exists at tick {}", event.tick.value())
                    ));
                }
            }
        }

        self.staff_structural_events.push(StaffStructuralEvent::Clef(event));
        Ok(())
    }

    /// Add a key signature event with duplicate tick validation
    pub fn add_key_signature_event(&mut self, event: KeySignatureEvent) -> Result<(), DomainError> {
        // Check for duplicate key signature event at the same tick
        for existing_event in &self.staff_structural_events {
            if let StaffStructuralEvent::KeySignature(existing_key) = existing_event {
                if existing_key.tick == event.tick {
                    return Err(DomainError::DuplicateError(
                        format!("Key signature event already exists at tick {}", event.tick.value())
                    ));
                }
            }
        }

        self.staff_structural_events.push(StaffStructuralEvent::KeySignature(event));
        Ok(())
    }
}

impl Default for Staff {
    fn default() -> Self {
        Self::new()
    }
}
