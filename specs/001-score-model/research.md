# Research: Hierarchical Score Model

**Feature**: 001-score-model  
**Date**: 2026-02-06  
**Purpose**: Resolve technical unknowns from Technical Context before design phase

## Research Questions

From Technical Context, two areas require clarification:

1. **Primary Dependencies**: Rust DDD/hexagonal architecture libraries for domain modeling, serialization, and API  
2. **Storage**: Persistence strategy—in-memory for MVP vs external database

---

## Research 1: Rust DDD/Hexagonal Architecture Dependencies

### Decision: Minimal core dependencies, defer web framework until API design

**Chosen Approach**:
- **Core domain**: Pure Rust with zero external dependencies (aligns with hexagonal architecture)
- **Serialization**: `serde` (v1.0+) with `serde_json` for JSON serialization (standard, stable, no-std compatible)
- **Error handling**: `thiserror` (v1.0+) for domain error types (ergonomic, zero-cost abstractions)
- **API framework**: Defer to API contracts phase—candidates are `axum` (v0.7+) or `actix-web` (v4.0+)

**Rationale**:
- Hexagonal architecture principle II requires core domain to have "zero external dependencies"
- `serde` is justified because JSON serialization is a port concern (API boundary), not domain logic
- `thiserror` is a derive macro with no runtime cost—maintains Rust idioms for Result types
- Web framework decision deferred because API design (REST vs GraphQL) is determined in Phase 1 contracts

**Alternatives Considered**:
- ❌ **Heavy DDD frameworks** (e.g., `domain-patterns` crate): Overkill for Rust—language features (traits, enums, Result) already provide DDD building blocks
- ❌ **Immediate web framework selection**: Premature—should follow API contract design, not precede it
- ❌ **Async runtime (tokio)**: Only needed if async API chosen; defer until contracts phase determines I/O patterns

**Dependencies Matrix**:

| Dependency | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| `serde` | 1.0+ | Domain entity serialization | Port boundary concern (API), standard Rust practice |
| `serde_json` | 1.0+ | JSON format support | API contract format |
| `thiserror` | 1.0+ | Error type derivation | Zero-cost domain error ergonomics |
| TBD: `axum` or `actix-web` | Latest stable | HTTP API adapter | Deferred to contracts phase |

---

## Research 2: Storage Persistence Strategy

### Decision: In-memory with trait abstraction for future durability

**Chosen Approach**:
- **Phase 1 (MVP)**: In-memory storage using `HashMap<ScoreId, Score>` behind persistence port trait
- **Persistence Port**: Define `ScoreRepository` trait with CRUD operations (save, find, delete)
- **In-Memory Adapter**: Implement trait with `std::collections::HashMap` wrapped in `Arc<Mutex<_>>` for thread-safety
- **Future Durability**: Port trait enables swapping to PostgreSQL/SQLite adapter without domain changes

**Rationale**:
- Success criteria SC-001 requires "100 notes in <30 seconds"—in-memory easily satisfies this
- Hexagonal architecture enables persistence swap without touching domain code
- DDD aggregate pattern (Score as root) maps well to document storage (serialize entire Score)
- Early MVP focus: domain model correctness > durability (constitution emphasizes test-first over premature optimization)

**Alternatives Considered**:
- ❌ **PostgreSQL immediately**: Premature—adds deployment complexity before domain model validated
- ❌ **SQLite embedded**: Overkill for initial development; serialization overhead unnecessary for MVP
- ❌ **Event sourcing**: Interesting for music editing undo/redo, but spec explicitly marks "Out of Scope"
- ✓ **In-memory + port trait**: Simplest that validates architecture, swappable later

**Persistence Port Design** (deferred detail to data-model.md):

```rust
// Port trait (domain/ports/persistence.rs)
pub trait ScoreRepository {
    fn save(&mut self, score: Score) -> Result<(), PersistenceError>;
    fn find_by_id(&self, id: &ScoreId) -> Result<Option<Score>, PersistenceError>;
    fn delete(&mut self, id: &ScoreId) -> Result<(), PersistenceError>;
    fn list_all(&self) -> Result<Vec<ScoreId>, PersistenceError>;
}

// In-memory adapter (adapters/persistence/in_memory.rs)
pub struct InMemoryScoreRepository {
    store: Arc<Mutex<HashMap<ScoreId, Score>>>,
}
```

**Migration Path** (when durability required):
1. Implement `PostgresScoreRepository` adapter implementing same trait
2. Use `serde_json::to_string(score)` to serialize Score aggregate to JSONB column
3. Swap adapter in composition root—domain code unchanged
4. Add integration tests for PostgreSQL adapter

---

## Research 3: Best Practices for Rust DDD Domain Modeling

### Decision: Use Rust's type system for domain invariants

**Chosen Approach**:
- **Value Objects**: `newtype` pattern for domain primitives (e.g., `struct Tick(u32)`, `struct BPM(u16)`)
- **Entities**: Structs with private fields, builder pattern for creation with validation
- **Aggregate Root**: `Score` exposes methods for all mutations, encapsulates validation
- **Domain Events**: `enum` for event types (TempoEvent, TimeSignatureEvent, etc.)
- **Result Types**: Domain errors as enum, propagate with `?` operator

**Rationale**:
- Rust's ownership and type system naturally enforce invariants (e.g., `Tick(u32)` cannot be negative)
- Private struct fields + public methods = encapsulation (OOP-style in Rust)
- Builder pattern with validation at construction prevents invalid states (FR-017, FR-018 invariants)
- Enums for event types enable exhaustive pattern matching—compiler ensures all event types handled

**Example Pattern** (deferred implementation to Phase 1):

```rust
// Value object: cannot construct invalid Tick
pub struct Tick(u32);
impl Tick {
    pub fn new(value: u32) -> Self { Self(value) }
    pub fn value(&self) -> u32 { self.0 }
}

// Entity: encapsulation via private fields
pub struct Voice {
    id: VoiceId,
    events: Vec<IntervalEvent>, // sorted by start_tick
}

impl Voice {
    pub fn add_note(&mut self, note: Note) -> Result<(), DomainError> {
        // FR-023: Prevent overlap of same pitch in same voice
        if self.has_overlapping_note(&note) {
            return Err(DomainError::OverlappingNote { /* ... */ });
        }
        self.events.push(IntervalEvent::Note(note));
        self.events.sort_by_key(|e| e.start_tick());
        Ok(())
    }

    fn has_overlapping_note(&self, note: &Note) -> bool {
        // Implementation: check pitch + tick range overlap
    }
}
```

**Alternatives Considered**:
- ❌ **Anemic domain model** (public fields): Violates DDD encapsulation, cannot enforce invariants
- ❌ **Macro-heavy frameworks**: Rust ecosystem favors explicit code over magic; readability > brevity
- ✓ **Type-driven design**: Leverage Rust's strength—"make invalid states unrepresentable"

---

## Research 4: API Design Patterns (REST vs GraphQL)

### Decision: REST with JSON for simplicity, align with constitution

**Chosen Approach**:
- **Style**: RESTful HTTP API with JSON request/response bodies
- **Endpoints**: Resource-oriented URLs (`/scores`, `/scores/{id}/instruments`, etc.)
- **Methods**: Standard HTTP verbs (POST create, GET read, PUT/PATCH update, DELETE)
- **Error Responses**: JSON with error codes and messages

**Rationale**:
- Constitution III states "REST/GraphQL endpoints"—REST is simpler for initial implementation
- Frontend requirement is "retrieve score data"—REST GET operations straightforward
- Contract tests easier with REST (fixed endpoints) vs GraphQL (dynamic queries)
- GraphQL adds complexity (schema definition language, resolver architecture) without clear MVP benefit

**Alternatives Considered**:
- ❌ **GraphQL**: Flexibility overkill for hierarchical read (Score → Instrument → Staff → Voice), adds tooling complexity
- ❌ **gRPC**: Requires Protobuf, HTTP/2—mismatch with React frontend (prefers JSON over HTTP/1.1)
- ✓ **REST**: Industry standard, tooling mature, aligns with "simple start" (constitution governance)

**Contract Examples** (deferred detail to contracts/ phase):

```
POST   /api/v1/scores                 # Create new score
GET    /api/v1/scores/{score_id}      # Retrieve score with full hierarchy
POST   /api/v1/scores/{score_id}/instruments  # Add instrument to score
GET    /api/v1/scores/{score_id}/instruments/{inst_id}/staves/{staff_id}/voices/{voice_id}/notes
DELETE /api/v1/scores/{score_id}      # Delete entire score
```

---

## Summary of Decisions

| Question | Decision | Next Phase Action |
|----------|----------|-------------------|
| **Primary Dependencies** | serde, serde_json, thiserror; defer web framework | Update Technical Context; document in data-model.md |
| **Storage Strategy** | In-memory HashMap with ScoreRepository port trait | Design port trait in data-model.md; implement adapter in tasks |
| **Domain Modeling** | Rust type system + builder pattern for invariants | Design entity structs in data-model.md with validation |
| **API Style** | RESTful JSON over HTTP | Generate OpenAPI contract in contracts/ directory |

**Technical Context Updates Required**:
- Primary Dependencies: ✓ **serde 1.0+, serde_json 1.0+, thiserror 1.0+** (web framework TBD in contracts phase)
- Storage: ✓ **In-memory HashMap with ScoreRepository trait** (swappable to PostgreSQL later)

**Phase 0 Complete**: All NEEDS CLARIFICATION markers resolved. Ready for Phase 1 (Design & Contracts).
