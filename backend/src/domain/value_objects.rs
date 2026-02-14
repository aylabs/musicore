use serde::{Deserialize, Serialize};

/// Represents a discrete time position at 960 PPQ resolution
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct Tick(u32);

impl Tick {
    pub fn new(value: u32) -> Self {
        Self(value)
    }

    pub fn value(&self) -> u32 {
        self.0
    }

    pub fn add(&self, duration: u32) -> Self {
        Self(self.0 + duration)
    }
}

/// Tempo value in beats per minute (BPM)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct BPM(u16);

impl BPM {
    pub fn new(value: u16) -> Result<Self, &'static str> {
        if value == 0 {
            return Err("BPM must be greater than 0");
        }
        if !(20..=400).contains(&value) {
            return Err("BPM must be in range 20-400");
        }
        Ok(Self(value))
    }

    pub fn value(&self) -> u16 {
        self.0
    }
}

/// MIDI pitch value (0-127)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct Pitch(u8);

impl Pitch {
    pub fn new(value: u8) -> Result<Self, &'static str> {
        if value > 127 {
            return Err("Pitch must be in range 0-127");
        }
        Ok(Self(value))
    }

    pub fn value(&self) -> u8 {
        self.0
    }
}

/// Musical clef types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Clef {
    Treble,
    Bass,
    Alto,
    Tenor,
}

/// Key signature represented as sharps/flats count
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeySignature(i8);

impl KeySignature {
    pub fn new(sharps: i8) -> Result<Self, &'static str> {
        if !(-7..=7).contains(&sharps) {
            return Err("KeySignature must be in range -7 (flats) to 7 (sharps)");
        }
        Ok(Self(sharps))
    }

    pub fn sharps(&self) -> i8 {
        self.0
    }
}
