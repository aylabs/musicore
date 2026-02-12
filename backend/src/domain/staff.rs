use crate::domain::{
    errors::DomainError,
    events::{clef::ClefEvent, key_signature::KeySignatureEvent, staff::StaffStructuralEvent},
    ids::{StaffId, VoiceId},
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
        staff
            .staff_structural_events
            .push(StaffStructuralEvent::Clef(clef_event));

        // Add default key signature (C major = 0 sharps) at tick 0
        let key_event = KeySignatureEvent::new(Tick::new(0), KeySignature::new(0).unwrap());
        staff
            .staff_structural_events
            .push(StaffStructuralEvent::KeySignature(key_event));

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
                    return Err(DomainError::DuplicateError(format!(
                        "Clef event already exists at tick {}",
                        event.tick.value()
                    )));
                }
            }
        }

        self.staff_structural_events
            .push(StaffStructuralEvent::Clef(event));
        Ok(())
    }

    /// Add a key signature event with duplicate tick validation
    pub fn add_key_signature_event(&mut self, event: KeySignatureEvent) -> Result<(), DomainError> {
        // Check for duplicate key signature event at the same tick
        for existing_event in &self.staff_structural_events {
            if let StaffStructuralEvent::KeySignature(existing_key) = existing_event {
                if existing_key.tick == event.tick {
                    return Err(DomainError::DuplicateError(format!(
                        "Key signature event already exists at tick {}",
                        event.tick.value()
                    )));
                }
            }
        }

        self.staff_structural_events
            .push(StaffStructuralEvent::KeySignature(event));
        Ok(())
    }

    /// Add an additional voice to the staff
    pub fn add_voice(&mut self, voice: Voice) {
        self.voices.push(voice);
    }

    /// Get a voice by ID (immutable)
    pub fn get_voice(&self, id: VoiceId) -> Result<&Voice, DomainError> {
        self.voices
            .iter()
            .find(|v| v.id == id)
            .ok_or_else(|| DomainError::NotFound(format!("Voice with id {} not found", id)))
    }

    /// Get a voice by ID (mutable)
    pub fn get_voice_mut(&mut self, id: VoiceId) -> Result<&mut Voice, DomainError> {
        self.voices
            .iter_mut()
            .find(|v| v.id == id)
            .ok_or_else(|| DomainError::NotFound(format!("Voice with id {} not found", id)))
    }

    /// Get the active clef at a specific tick
    pub fn get_clef_at(&self, tick: Tick) -> Option<&ClefEvent> {
        self.staff_structural_events
            .iter()
            .filter_map(|e| match e {
                StaffStructuralEvent::Clef(ce) if ce.tick <= tick => Some(ce),
                _ => None,
            })
            .max_by_key(|ce| ce.tick)
    }

    /// Get the active key signature at a specific tick
    pub fn get_key_signature_at(&self, tick: Tick) -> Option<&KeySignatureEvent> {
        self.staff_structural_events
            .iter()
            .filter_map(|e| match e {
                StaffStructuralEvent::KeySignature(ke) if ke.tick <= tick => Some(ke),
                _ => None,
            })
            .max_by_key(|ke| ke.tick)
    }

    /// Remove a clef event at a specific tick
    pub fn remove_clef_event(&mut self, tick: Tick) -> Result<(), DomainError> {
        if tick == Tick::new(0) {
            return Err(DomainError::ConstraintViolation(
                "Cannot delete required clef event at tick 0".to_string(),
            ));
        }

        let len_before = self.staff_structural_events.len();
        self.staff_structural_events
            .retain(|e| !matches!(e, StaffStructuralEvent::Clef(ce) if ce.tick == tick));

        if self.staff_structural_events.len() == len_before {
            return Err(DomainError::NotFound(format!(
                "Clef event not found at tick {}",
                tick.value()
            )));
        }

        Ok(())
    }

    /// Remove a key signature event at a specific tick
    pub fn remove_key_signature_event(&mut self, tick: Tick) -> Result<(), DomainError> {
        if tick == Tick::new(0) {
            return Err(DomainError::ConstraintViolation(
                "Cannot delete required key signature event at tick 0".to_string(),
            ));
        }

        let len_before = self.staff_structural_events.len();
        self.staff_structural_events
            .retain(|e| !matches!(e, StaffStructuralEvent::KeySignature(ke) if ke.tick == tick));

        if self.staff_structural_events.len() == len_before {
            return Err(DomainError::NotFound(format!(
                "Key signature event not found at tick {}",
                tick.value()
            )));
        }

        Ok(())
    }

    /// Query structural events within a tick range
    pub fn query_structural_events_in_range(
        &self,
        start_tick: Tick,
        end_tick: Tick,
    ) -> Vec<&StaffStructuralEvent> {
        self.staff_structural_events
            .iter()
            .filter(|e| {
                let event_tick = match e {
                    StaffStructuralEvent::Clef(ce) => ce.tick,
                    StaffStructuralEvent::KeySignature(ke) => ke.tick,
                };
                event_tick >= start_tick && event_tick <= end_tick
            })
            .collect()
    }
}

impl Default for Staff {
    fn default() -> Self {
        Self::new()
    }
}
