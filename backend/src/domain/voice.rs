use crate::domain::{
    errors::DomainError,
    events::note::Note,
    ids::VoiceId,
};
use serde::{Deserialize, Serialize};

/// Voice contains interval events (notes) within a staff
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Voice {
    pub id: VoiceId,
    pub interval_events: Vec<Note>,
}

impl Voice {
    pub fn new() -> Self {
        Self {
            id: VoiceId::new(),
            interval_events: Vec::new(),
        }
    }

    /// Add a note to this voice with overlap validation
    pub fn add_note(&mut self, note: Note) -> Result<(), DomainError> {
        // Check for overlapping notes with the same pitch
        for existing_note in &self.interval_events {
            if existing_note.pitch == note.pitch && existing_note.overlaps_with(&note) {
                return Err(DomainError::ConstraintViolation(
                    format!("Note with pitch {} overlaps with existing note at the same pitch", note.pitch.value())
                ));
            }
        }

        self.interval_events.push(note);
        Ok(())
    }
}

impl Default for Voice {
    fn default() -> Self {
        Self::new()
    }
}
