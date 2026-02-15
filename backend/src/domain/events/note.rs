use crate::domain::{
    ids::NoteId,
    value_objects::{NoteSpelling, Pitch, Tick},
};
use serde::{Deserialize, Serialize};

/// Note represents a musical note with timing and pitch
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Note {
    pub id: NoteId,
    pub start_tick: Tick,
    pub duration_ticks: u32,
    pub pitch: Pitch,
    /// Optional enharmonic spelling (e.g., D# vs Eb) preserved from MusicXML import
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spelling: Option<NoteSpelling>,
}

impl Note {
    pub fn new(start_tick: Tick, duration_ticks: u32, pitch: Pitch) -> Result<Self, &'static str> {
        if duration_ticks == 0 {
            return Err("duration_ticks must be greater than 0");
        }

        Ok(Self {
            id: NoteId::new(),
            start_tick,
            duration_ticks,
            pitch,
            spelling: None,
        })
    }

    /// Set the enharmonic spelling for this note (builder pattern)
    pub fn with_spelling(mut self, spelling: NoteSpelling) -> Self {
        self.spelling = Some(spelling);
        self
    }

    pub fn end_tick(&self) -> Tick {
        self.start_tick.add(self.duration_ticks)
    }

    pub fn overlaps_with(&self, other: &Note) -> bool {
        // Two notes overlap if one starts before the other ends
        self.start_tick < other.end_tick() && other.start_tick < self.end_tick()
    }
}
