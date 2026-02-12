use crate::domain::{
    ids::NoteId,
    value_objects::{Pitch, Tick},
};
use serde::{Deserialize, Serialize};

/// Note represents a musical note with timing and pitch
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Note {
    pub id: NoteId,
    pub start_tick: Tick,
    pub duration_ticks: u32,
    pub pitch: Pitch,
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
        })
    }

    pub fn end_tick(&self) -> Tick {
        self.start_tick.add(self.duration_ticks)
    }

    pub fn overlaps_with(&self, other: &Note) -> bool {
        // Two notes overlap if one starts before the other ends
        self.start_tick < other.end_tick() && other.start_tick < self.end_tick()
    }
}
