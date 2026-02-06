# Data Model: Hierarchical Score Model

**Feature**: 001-score-model  
**Date**: 2026-02-06  
**Purpose**: Define domain entities, relationships, validation rules, and state transitions

---

## Entity Overview

```
Score (Aggregate Root)
 ├── id: ScoreId
 ├── global_structural_events: Vec<GlobalStructuralEvent>
 │      ├── TempoEvent { tick: Tick, bpm: BPM }
 │      └── TimeSignatureEvent { tick: Tick, numerator: u8, denominator: u8 }
 │
 └── instruments: Vec<Instrument>
        └── Instrument
             ├── id: InstrumentId
             ├── name: String
             └── staves: Vec<Staff>
                    └── Staff
                         ├── id: StaffId
                         ├── staff_structural_events: Vec<StaffStructuralEvent>
                         │      ├── ClefEvent { tick: Tick, clef: Clef }
                         │      └── KeySignatureEvent { tick: Tick, key: KeySignature }
                         │
                         └── voices: Vec<Voice>
                                └── Voice
                                     ├── id: VoiceId
                                     └── interval_events: Vec<IntervalEvent>
                                            └── Note { start_tick: Tick, duration_ticks: u32, pitch: Pitch }
```

---

## Value Objects

### Tick

**Purpose**: Represents a discrete time position in the timeline at 960 PPQ resolution.

**Fields**:
- `value: u32` - Tick position (0 = start of score, 960 = one quarter note later)

**Invariants**:
- Always non-negative (enforced by u32 type)
- Immutable once created

**Implementation Notes**:
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Tick(u32);

impl Tick {
    pub fn new(value: u32) -> Self { Self(value) }
    pub fn value(&self) -> u32 { self.0 }
    pub fn add(&self, duration: u32) -> Self { Self(self.0 + duration) }
}
```

---

### BPM (Beats Per Minute)

**Purpose**: Tempo value in beats per minute.

**Fields**:
- `value: u16` - BPM value (typical range 40-240)

**Invariants**:
- Must be > 0
- Reasonable range: 20-400 BPM (validation at construction)

**Implementation Notes**:
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BPM(u16);

impl BPM {
    pub fn new(value: u16) -> Result<Self, DomainError> {
        if value == 0 || value > 400 {
            return Err(DomainError::InvalidBPM(value));
        }
        Ok(Self(value))
    }
    pub fn value(&self) -> u16 { self.0 }
}
```

---

### Pitch

**Purpose**: Musical pitch as MIDI note number.

**Fields**:
- `value: u8` - MIDI note number (0-127, where 60 = Middle C)

**Invariants**:
- Must be in range 0-127 (enforced by MIDI standard)

**Implementation Notes**:
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Pitch(u8);

impl Pitch {
    pub fn new(value: u8) -> Result<Self, DomainError> {
        if value > 127 {
            return Err(DomainError::InvalidPitch(value));
        }
        Ok(Self(value))
    }
    pub fn value(&self) -> u8 { self.0 }
}
```

---

### Clef

**Purpose**: Staff clef type.

**Values**: Treble, Bass, Alto, Tenor

**Implementation Notes**:
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Clef {
    Treble,
    Bass,
    Alto,
    Tenor,
}
```

---

### KeySignature

**Purpose**: Musical key signature.

**Fields**:
- `sharps: i8` - Number of sharps (positive) or flats (negative), range -7 to +7

**Invariants**:
- Must be in range -7 to +7

**Implementation Notes**:
```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct KeySignature {
    sharps: i8, // -7 (7 flats) to +7 (7 sharps)
}

impl KeySignature {
    pub fn new(sharps: i8) -> Result<Self, DomainError> {
        if sharps < -7 || sharps > 7 {
            return Err(DomainError::InvalidKeySignature(sharps));
        }
        Ok(Self { sharps })
    }
    pub fn c_major() -> Self { Self { sharps: 0 } }
}
```

---

## Entities

### Score (Aggregate Root)

**Purpose**: Root entity containing the entire musical composition.

**Fields**:
- `id: ScoreId` - Unique identifier (UUID)
- `global_structural_events: Vec<GlobalStructuralEvent>` - Tempo and time signature events
- `instruments: Vec<Instrument>` - Instruments in the score

**Invariants** (FR-017):
- MUST have at least one TempoEvent at tick 0
- MUST have at least one TimeSignatureEvent at tick 0
- No duplicate structural events of same type at same tick

**Methods**:
- `new() -> Self` - Creates score with default tempo (120 BPM) and time signature (4/4) at tick 0
- `add_tempo_event(tick: Tick, bpm: BPM) -> Result<(), DomainError>` - Validates no duplicate at same tick
- `add_time_signature_event(tick: Tick, numerator: u8, denominator: u8) -> Result<(), DomainError>`
- `get_tempo_at(tick: Tick) -> BPM` - Returns active tempo at given tick
- `get_time_signature_at(tick: Tick) -> TimeSignature` - Returns active time signature
- `add_instrument(name: String) -> InstrumentId` - Creates instrument with one default staff
- `get_instrument(&self, id: InstrumentId) -> Option<&Instrument>`
- `get_instrument_mut(&mut self, id: InstrumentId) -> Option<&mut Instrument>`

**State Transitions**:
1. **Created** → has default global structural events at tick 0, empty instruments list
2. **Populated** → instruments added, notes added to voices
3. **Modified** → structural events changed, notes added/removed

---

### Instrument

**Purpose**: Represents a musical instrument containing one or more staves.

**Fields**:
- `id: InstrumentId` - Unique identifier
- `name: String` - Instrument name (e.g., "Piano", "Violin")
- `staves: Vec<Staff>` - Staves belonging to this instrument

**Invariants** (FR-003):
- MUST have at least one Staff

**Methods**:
- `new(name: String) -> Self` - Creates instrument with one default staff
- `add_staff() -> StaffId` - Adds new staff with default structural events
- `get_staff(&self, id: StaffId) -> Option<&Staff>`
- `get_staff_mut(&mut self, id: StaffId) -> Option<&mut Staff>`

**Relationships**:
- Parent: Score (one-to-many)
- Children: Staff (one-to-many)

---

### Staff

**Purpose**: Represents a musical staff with five lines.

**Fields**:
- `id: StaffId` - Unique identifier
- `staff_structural_events: Vec<StaffStructuralEvent>` - Clef and key signature events
- `voices: Vec<Voice>` - Voices in this staff

**Invariants** (FR-018):
- MUST have at least one ClefEvent at tick 0
- MUST have at least one KeySignatureEvent at tick 0
- MUST have at least one Voice (FR-004)
- No duplicate structural events of same type at same tick

**Methods**:
- `new() -> Self` - Creates staff with default clef (Treble) and key (C major) at tick 0, one voice
- `add_clef_event(tick: Tick, clef: Clef) -> Result<(), DomainError>`
- `add_key_signature_event(tick: Tick, key: KeySignature) -> Result<(), DomainError>`
- `get_clef_at(tick: Tick) -> Clef`
- `get_key_signature_at(tick: Tick) -> KeySignature`
- `add_voice() -> VoiceId`
- `get_voice(&self, id: VoiceId) -> Option<&Voice>`
- `get_voice_mut(&mut self, id: VoiceId) -> Option<&mut Voice>`

**Relationships**:
- Parent: Instrument (one-to-many)
- Children: Voice (one-to-many)

---

### Voice

**Purpose**: Represents an independent melodic line within a staff.

**Fields**:
- `id: VoiceId` - Unique identifier
- `interval_events: Vec<IntervalEvent>` - Notes and other interval events, sorted by start_tick

**Invariants** (FR-023):
- Notes with same pitch MUST NOT overlap in time within same voice
- Notes with different pitches MAY overlap (chords) (FR-022)

**Methods**:
- `new() -> Self` - Creates empty voice
- `add_note(note: Note) -> Result<(), DomainError>` - Validates no overlap with same pitch, inserts sorted
- `remove_note(id: NoteId) -> Result<(), DomainError>`
- `get_notes_in_range(start: Tick, end: Tick) -> Vec<&Note>` - Query notes within tick range
- `validate_no_overlap(&self, note: &Note) -> Result<(), DomainError>` - Private helper

**Relationships**:
- Parent: Staff (one-to-many)
- Children: IntervalEvent (one-to-many)

---

## Event Types

### GlobalStructuralEvent (Enum)

**Purpose**: Events scoped globally to the Score.

**Variants**:
```rust
pub enum GlobalStructuralEvent {
    Tempo(TempoEvent),
    TimeSignature(TimeSignatureEvent),
}
```

---

### TempoEvent

**Purpose**: Defines tempo change at a specific tick.

**Fields**:
- `tick: Tick` - When tempo change occurs
- `bpm: BPM` - Tempo in beats per minute

**Invariants**:
- Only one TempoEvent per tick (enforced by Score)
- At least one at tick 0 (enforced by Score::new())

---

### TimeSignatureEvent

**Purpose**: Defines time signature change at a specific tick.

**Fields**:
- `tick: Tick` - When time signature change occurs
- `numerator: u8` - Top number (beats per measure)
- `denominator: u8` - Bottom number (note value for beat)

**Invariants**:
- Only one TimeSignatureEvent per tick (enforced by Score)
- At least one at tick 0 (default 4/4, enforced by Score::new())
- Denominator must be power of 2 (1, 2, 4, 8, 16)

---

### StaffStructuralEvent (Enum)

**Purpose**: Events scoped to a specific Staff.

**Variants**:
```rust
pub enum StaffStructuralEvent {
    Clef(ClefEvent),
    KeySignature(KeySignatureEvent),
}
```

---

### ClefEvent

**Purpose**: Defines clef change for a staff at a specific tick.

**Fields**:
- `tick: Tick` - When clef change occurs
- `clef: Clef` - Clef type

**Invariants**:
- Only one ClefEvent per tick per staff (enforced by Staff)
- At least one at tick 0 (default Treble, enforced by Staff::new())

---

### KeySignatureEvent

**Purpose**: Defines key signature change for a staff at a specific tick.

**Fields**:
- `tick: Tick` - When key signature change occurs
- `key_signature: KeySignature` - Key signature

**Invariants**:
- Only one KeySignatureEvent per tick per staff (enforced by Staff)
- At least one at tick 0 (default C major, enforced by Staff::new())

---

### IntervalEvent (Enum)

**Purpose**: Events with duration, belonging to a Voice.

**Variants**:
```rust
pub enum IntervalEvent {
    Note(Note),
    // Future: Rest, Chord (as single event), etc.
}
```

---

### Note

**Purpose**: Musical note with pitch and duration.

**Fields**:
- `id: NoteId` - Unique identifier (UUID)
- `start_tick: Tick` - When note starts
- `duration_ticks: u32` - How long note lasts (in ticks)
- `pitch: Pitch` - Note pitch (MIDI number)

**Invariants** (FR-020, FR-021):
- `start_tick` MUST be >= 0 (enforced by Tick type using u32)
- `duration_ticks` MUST be > 0
- Within voice: cannot overlap with another note of same pitch (FR-023)

**Methods**:
- `new(start_tick: Tick, duration_ticks: u32, pitch: Pitch) -> Result<Self, DomainError>` - Validates duration > 0
- `end_tick(&self) -> Tick` - Calculates start_tick + duration_ticks
- `overlaps_with(&self, other: &Note) -> bool` - Checks if tick ranges overlap

**Relationships**:
- Parent: Voice (one-to-many)

---

## Validation Rules

### Score-Level Validation

1. **Initialize required global structural events** (FR-017):
   - Score::new() creates TempoEvent(tick=0, bpm=120) and TimeSignatureEvent(tick=0, 4/4)
   - Delete operations on tick 0 events are rejected

2. **No duplicate structural events** (FR-019):
   - Before adding TempoEvent or TimeSignatureEvent, check no event of same type exists at same tick
   - Return `DomainError::DuplicateStructuralEvent` if violation detected

### Staff-Level Validation

1. **Initialize required staff structural events** (FR-018):
   - Staff::new() creates ClefEvent(tick=0, Treble) and KeySignatureEvent(tick=0, C major)
   - Delete operations on tick 0 events are rejected

2. **No duplicate structural events** (FR-019):
   - Before adding ClefEvent or KeySignatureEvent, check no event of same type exists at same tick
   - Return `DomainError::DuplicateStructuralEvent` if violation detected

### Voice-Level Validation

1. **Note duration positive** (FR-021):
   - Note::new() validates duration_ticks > 0
   - Return `DomainError::InvalidDuration` if zero or negative

2. **No overlap of same pitch** (FR-023):
   - Voice::add_note() checks all existing notes for same pitch
   - If any note with same pitch overlaps in time, return `DomainError::OverlappingNote`
   - Overlap check: `note1.start_tick < note2.end_tick && note2.start_tick < note1.end_tick`

3. **Allow overlap of different pitches** (FR-022):
   - Voice::add_note() only checks overlap if pitch matches—different pitches can overlap (chords)

---

## Domain Errors

```rust
#[derive(Debug, thiserror::Error)]
pub enum DomainError {
    #[error("Invalid BPM value: {0} (must be 1-400)")]
    InvalidBPM(u16),
    
    #[error("Invalid pitch value: {0} (must be 0-127)")]
    InvalidPitch(u8),
    
    #[error("Invalid key signature: {0} sharps/flats (must be -7 to +7)")]
    InvalidKeySignature(i8),
    
    #[error("Invalid note duration: must be > 0")]
    InvalidDuration,
    
    #[error("Duplicate structural event of type {event_type} at tick {tick}")]
    DuplicateStructuralEvent { event_type: String, tick: u32 },
    
    #[error("Overlapping notes with same pitch {pitch} at ticks {start_tick}-{end_tick}")]
    OverlappingNote { pitch: u8, start_tick: u32, end_tick: u32 },
    
    #[error("Cannot delete required structural event at tick 0")]
    CannotDeleteInitialEvent,
    
    #[error("Entity not found: {entity_type} with id {id}")]
    EntityNotFound { entity_type: String, id: String },
}
```

---

## Persistence Port

```rust
/// Port trait for Score persistence (adapters implement this)
pub trait ScoreRepository {
    fn save(&mut self, score: Score) -> Result<(), PersistenceError>;
    fn find_by_id(&self, id: &ScoreId) -> Result<Option<Score>, PersistenceError>;
    fn delete(&mut self, id: &ScoreId) -> Result<(), PersistenceError>;
    fn list_all(&self) -> Result<Vec<ScoreId>, PersistenceError>;
}

#[derive(Debug, thiserror::Error)]
pub enum PersistenceError {
    #[error("Storage backend error: {0}")]
    StorageError(String),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
}
```

**Implementation**: In-memory adapter uses `HashMap<ScoreId, Score>` wrapped in `Arc<Mutex<_>>` for thread-safe access.

---

## Serialization

All domain entities derive `serde::Serialize` and `serde::Deserialize`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Score {
    id: ScoreId,
    global_structural_events: Vec<GlobalStructuralEvent>,
    instruments: Vec<Instrument>,
}
```

**Rationale**: Enables JSON API responses and future file-based persistence without domain code changes.

---

## Summary

**Entities**: Score (aggregate root), Instrument, Staff, Voice, Note  
**Value Objects**: Tick, BPM, Pitch, Clef, KeySignature  
**Events**: GlobalStructuralEvent (Tempo, TimeSignature), StaffStructuralEvent (Clef, KeySignature), IntervalEvent (Note)  
**Invariants**: 11 validation rules enforced at construction and mutation  
**Persistence**: Repository port trait with in-memory adapter (swappable to database)  
**Errors**: Domain-specific error enum with `thiserror` for ergonomics

**Next Phase**: Generate API contracts in contracts/ directory based on entity operations.
