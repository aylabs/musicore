# Musicore Backend

Rust backend for the Musicore music score editor implementing a hierarchical domain model using Domain-Driven Design and Hexagonal Architecture.

## Current Implementation Status

### ✅ Completed (Phase 1-8: Full Backend API)

**Phase 1-7: Domain Model**
- **Domain Entities**: Score, Instrument, Staff, Voice, Note
- **Value Objects**: Tick (960 PPQ), BPM, Pitch, Clef, KeySignature
- **Events**: Tempo, TimeSignature, Clef, KeySignature, Note
- **Multi-Staff Support**: Multiple staves per instrument
- **Polyphonic Voices**: Multiple voices per staff with overlap validation
- **Structural Events**: Global (tempo, time signature) and staff-scoped (clef, key signature)
- **Repository**: In-memory storage with thread-safe `Arc<Mutex>` implementation
- **Validation**: 11 invariants enforced (overlap prevention, duplicate events, required defaults)
- **Unit Tests**: 76 tests covering all domain logic

**Phase 8: REST API** ✅
- **Web Framework**: Axum 0.7 with Tokio async runtime
- **Endpoints**: 13 REST API endpoints (score CRUD, instruments, staves, voices, notes, structural events)
- **Error Handling**: Domain errors mapped to HTTP status codes (400/404/409/500)
- **Middleware**: CORS (permissive) and tracing via Tower-HTTP
- **Integration Tests**: 18 tests covering all endpoints and validation scenarios
- **Total Test Coverage**: 94 tests (76 unit + 18 integration) - all passing ✅

### 🚧 Next Phase

- **Phase 9**: Frontend React integration with TypeScript API client
- **Phase 10**: Documentation, Docker, performance profiling

## Prerequisites

- Rust 1.75+ (latest stable recommended)
- Cargo (comes with Rust)

### Installing Rust

If you don't have Rust installed:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

Verify installation:

```bash
cargo --version
rustc --version
```

## Getting Started

### 1. Build the Project

```bash
cargo build
```

### 2. Run the API Server

Start the REST API server (listens on `http://0.0.0.0:8080`):

```bash
cargo run
```

The server will start with:
- Base URL: `http://localhost:8080/api/v1`
- CORS: Enabled (permissive for development)
- Tracing: Request/response logging enabled

**Test the API:**

```bash
# Create a new score
curl -X POST http://localhost:8080/api/v1/scores \
  -H "Content-Type: application/json" \
  -d '{"title": "My Score"}'

# List all scores
curl http://localhost:8080/api/v1/scores

# Get a specific score (replace {id} with actual UUID)
curl http://localhost:8080/api/v1/scores/{id}
```

See [API Endpoints](#api-endpoints) section below for full endpoint documentation.

### 3. Run Tests

Run all tests (94 total: 76 unit + 18 integration):

```bash
cargo test
```

Run tests with output:

```bash
cargo test -- --nocapture
```

Run specific test file:

```bash
cargo test --test score_test
```

Run only integration tests:

```bash
cargo test --test api_integration_test
```

### 4. Check Code Quality

Run clippy for lints:

```bash
cargo clippy
```

Format code:

```bash
cargo fmt
```

## Using the Domain Model (Library Mode)

Since the API layer is not yet implemented, you can use the domain model programmatically:

### Creating a Score with Instruments and Notes

```rust
use musicore_backend::domain::{
    events::note::Note,
    instrument::Instrument,
    score::Score,
    value_objects::{Pitch, Tick},
};

fn main() {
    // Create a new score (initialized with 120 BPM, 4/4 at tick 0)
    let mut score = Score::new();
    
    // Add a piano instrument (comes with default staff and voice)
    let piano = Instrument::new("Piano".to_string());
    score.add_instrument(piano);
    
    // Access the default voice and add notes
    let voice = &mut score.instruments[0].staves[0].voices[0];
    
    // Add C4 quarter note at tick 0
    let note1 = Note::new(Tick::new(0), 960, Pitch::new(60).unwrap()).unwrap();
    voice.add_note(note1).unwrap();
    
    // Add E4 quarter note at tick 960
    let note2 = Note::new(Tick::new(960), 960, Pitch::new(64).unwrap()).unwrap();
    voice.add_note(note2).unwrap();
    
    println!("Score created with {} instruments", score.instruments.len());
    println!("Total notes: {}", voice.interval_events.len());
}
```

### Using the Repository

```rust
use musicore_backend::{
    adapters::persistence::in_memory::InMemoryScoreRepository,
    domain::score::Score,
    ports::persistence::ScoreRepository,
};

fn main() {
    let mut repo = InMemoryScoreRepository::new();
    
    // Create and save a score
    let score = Score::new();
    let score_id = score.id;
    repo.save(score).unwrap();
    
    // Retrieve it
    let retrieved = repo.find_by_id(score_id).unwrap();
    println!("Score found: {}", retrieved.is_some());
    
    // List all scores
    let all_scores = repo.list_all().unwrap();
    println!("Total scores: {}", all_scores.len());
}
```

## Project Structure

```
backend/
├── src/
│   ├── domain/           # Core domain logic (zero dependencies)
│   │   ├── events/       # Event types (Tempo, TimeSignature, Note, etc.)
│   │   ├── errors.rs     # Domain errors
│   │   ├── ids.rs        # Entity IDs (UUIDs)
│   │   ├── instrument.rs # Instrument entity
│   │   ├── score.rs      # Score aggregate root
│   │   ├── staff.rs      # Staff entity
│   │   ├── value_objects.rs # Tick, BPM, Pitch, Clef, KeySignature
│   │   └── voice.rs      # Voice entity
│   ├── ports/            # Interfaces (repository traits)
│   │   └── persistence.rs
│   ├── adapters/         # Infrastructure implementations
│   │   └── persistence/
│   │       └── in_memory.rs
│   └── lib.rs            # Library entry point
├── tests/                # Integration tests
│   ├── instrument_test.rs
│   ├── note_test.rs
│   ├── repository_test.rs
│   ├── score_test.rs
│   ├── staff_test.rs
│   ├── value_objects_test.rs
│   └── voice_test.rs
├── Cargo.toml            # Dependencies
└── README.md             # This file
```

## Architecture

### Hexagonal Architecture (Ports & Adapters)

- **Domain Layer**: Pure business logic, no external dependencies
- **Ports**: Interfaces the domain needs (e.g., `ScoreRepository` trait)
- **Adapters**: Implementations of ports (e.g., `InMemoryScoreRepository`)

### Domain-Driven Design

- **Aggregate Root**: `Score` controls all mutations
- **Entities**: `Instrument`, `Staff`, `Voice` with identity
- **Value Objects**: `Tick`, `BPM`, `Pitch` are immutable
- **Ubiquitous Language**: Music domain terminology throughout

## Key Features

### ✅ Precision & Fidelity (960 PPQ)

All timing uses integer arithmetic at 960 pulses per quarter note:

```rust
let tick = Tick::new(0);        // Start of score
let quarter_note = Tick::new(960);  // One quarter note later
let eighth_note = tick.add(480);    // Half a quarter note
```

### ✅ Validation Rules

- **Duration**: Notes must have `duration_ticks > 0`
- **Pitch**: Valid MIDI range 0-127
- **BPM**: Valid range 20-400
- **Overlap**: Same pitch cannot overlap in a voice (chords use different voices)
- **Duplicate Events**: No duplicate structural events at the same tick

### ✅ Default Initialization

- **Score**: 120 BPM, 4/4 time signature at tick 0
- **Staff**: Treble clef, C major key signature at tick 0
- **Instrument**: One default staff with one voice

## API Endpoints

The REST API is fully implemented with 13 endpoints following the OpenAPI 3.0 specification.

**Base URL**: `http://localhost:8080/api/v1`

### Score Management

```bash
# Create a new score
POST /api/v1/scores
Body: {"title": "My Score"}
Response: 201 Created, returns Score object with default tempo (120 BPM) and time signature (4/4)

# List all score IDs
GET /api/v1/scores
Response: ["uuid1", "uuid2", ...]

# Get full score hierarchy
GET /api/v1/scores/{id}
Response: Complete Score object with all instruments, staves, voices, notes, and events

# Delete a score
DELETE /api/v1/scores/{id}
Response: 204 No Content
```

### Domain Entities

```bash
# Add instrument to score
POST /api/v1/scores/{score_id}/instruments
Body: {"name": "Piano"}
Response: Instrument object with default staff and voice

# Add staff to instrument
POST /api/v1/scores/{score_id}/instruments/{instrument_id}/staves
Body: {}
Response: Staff object with default clef (treble) and key signature (C major)

# Add voice to staff
POST /api/v1/scores/{score_id}/instruments/{instrument_id}/staves/{staff_id}/voices
Body: {}
Response: Voice object

# Add note to voice
POST /api/v1/scores/{score_id}/instruments/{instrument_id}/staves/{staff_id}/voices/{voice_id}/notes
Body: {"tick": 0, "duration_ticks": 960, "pitch": 60}
Response: Note object (validates overlap and pitch range)
```

### Structural Events

```bash
# Add tempo change (global)
POST /api/v1/scores/{score_id}/structural-events/tempo
Body: {"tick": 1920, "bpm": 140}
Response: TempoEvent object (validates BPM 20-400)

# Add time signature change (global)
POST /api/v1/scores/{score_id}/structural-events/time-signature
Body: {"tick": 3840, "numerator": 3, "denominator": 4}
Response: TimeSignatureEvent object

# Add clef change (staff-scoped)
POST /api/v1/scores/{score_id}/instruments/{instrument_id}/staves/{staff_id}/structural-events/clef
Body: {"tick": 1920, "clef_type": "Bass"}
Response: ClefEvent object (Treble, Bass, Alto, Tenor)

# Add key signature change (staff-scoped)
POST /api/v1/scores/{score_id}/instruments/{instrument_id}/staves/{staff_id}/structural-events/key-signature
Body: {"tick": 1920, "key": "GMajor"}
Response: KeySignatureEvent object
```

### Error Responses

All endpoints return consistent error format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable description"
}
```

**HTTP Status Codes**:
- `200 OK` - Successful retrieval
- `201 Created` - Resource created successfully
- `204 No Content` - Successful deletion
- `400 Bad Request` - Validation error (invalid pitch, BPM, overlap, etc.)
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate event at same tick
- `500 Internal Server Error` - Storage error

See [contracts/score-api.yaml](../specs/001-score-model/contracts/score-api.yaml) for full OpenAPI 3.0 specification.

## Running Examples

Create a simple example file:

```bash
# Create examples directory
mkdir -p examples

# Create example
cat > examples/create_score.rs << 'EOF'
use musicore_backend::domain::{
    events::note::Note,
    instrument::Instrument,
    score::Score,
    value_objects::{Pitch, Tick},
};

fn main() {
    let mut score = Score::new();
    let mut piano = Instrument::new("Piano".to_string());
    
    // Add a C major chord (C-E-G)
    let voice = &mut piano.staves[0].voices[0];
    voice.add_note(Note::new(Tick::new(0), 960, Pitch::new(60).unwrap()).unwrap()).unwrap();
    voice.add_note(Note::new(Tick::new(0), 960, Pitch::new(64).unwrap()).unwrap()).unwrap();
    voice.add_note(Note::new(Tick::new(0), 960, Pitch::new(67).unwrap()).unwrap()).unwrap();
    
    score.add_instrument(piano);
    println!("✓ Created score with C major chord");
    println!("  Notes in voice: {}", score.instruments[0].staves[0].voices[0].interval_events.len());
}
EOF

# Run the example
cargo run --example create_score
```

## Development Workflow

### Test-First Development (TDD)

Following the constitution's Principle V, all features follow Red-Green-Refactor:

1. **Red**: Write failing test
2. **Green**: Implement minimum code to pass
3. **Refactor**: Clean up while keeping tests green

### Running Continuous Tests

Watch for file changes and auto-run tests:

```bash
cargo install cargo-watch
cargo watch -x test
```

## Dependencies

- `serde 1.0+` - JSON serialization at port boundaries
- `serde_json 1.0+` - JSON format support
- `thiserror 1.0+` - Error type derivation
- `uuid 1.0+` - Entity IDs with v4 generation

## Constitution Compliance

This implementation follows all five constitutional principles:

1. ✅ **Domain-Driven Design** - Ubiquitous language, aggregate root, bounded contexts
2. ✅ **Hexagonal Architecture** - Core domain independent, ports/adapters pattern
3. ✅ **API-First Development** - Contracts defined (Phase 8 implementation pending)
4. ✅ **Precision & Fidelity** - 960 PPQ integer arithmetic throughout
5. ✅ **Test-First Development** - 46 tests, all features tested before implementation

## Next Steps

1. ✅ **Phase 1-8**: Complete - Full backend with REST API
2. **Phase 9**: Frontend React integration with TypeScript API client
3. **Phase 10**: Documentation (Rust docs, JSDoc), Docker, performance profiling

## Troubleshooting

### Rust Not Found

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### Cargo Test Fails

```bash
# Clean build artifacts
cargo clean

# Rebuild
cargo build

# Run tests
cargo test
```

### Clippy Warnings

```bash
# Fix automatically where possible
cargo clippy --fix --allow-dirty

# Format code
cargo fmt
```

## Contributing

All changes must:
- Include unit tests
- Pass `cargo test`
- Pass `cargo clippy`
- Follow `cargo fmt` formatting
- Maintain hexagonal architecture boundaries

## License

See repository root for license information.

---

**Version**: 0.1.0 (Full Backend API)  
**Last Updated**: 2026-02-06  
**Status**: ✅ Phase 1-8 Complete (60/93 tasks, 64.5%) - API Ready for Frontend Integration  
**Test Coverage**: 94 tests passing (76 unit + 18 integration) - 100% pass rate
