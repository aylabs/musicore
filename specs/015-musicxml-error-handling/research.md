# Research: Resilient MusicXML Import

**Feature**: [015-musicxml-error-handling](spec.md)  
**Phase**: 0 - Research & Decision Making  
**Date**: 2026-02-11

## Overview

This document captures research findings and technical decisions for implementing best-effort MusicXML parsing with error recovery, warning collection, and deterministic behavior.

## Research Areas

### 1. Forgiving XML Parsing Strategies

**Context**: Need to handle malformed XML elements without failing entire import (FR-007, FR-008)

**Findings**:

- **quick-xml** (current parser): Provides `read_event()` API that can skip over malformed elements by advancing buffer position
  - Error recovery: Catch parse errors, log position, continue with next element
  - Event-based parsing allows selective element processing
  - Missing closing tags: Can detect via event depth tracking, auto-close at document end
  
- **Character Encoding**: quick-xml supports encoding detection via BOM or XML declaration
  - Manual fallback strategy: Try parsing with UTF-8 → if fails, convert buffer with `encoding_rs` crate to ISO-8859-1/Windows-1252 and retry
  - Encoding detection success criteria: XML parsing completes without syntax errors (per clarification Q5)

- **Best Practice Pattern**: "Parse what you can, skip what you can't" with granular error context
  - Record skipped elements in warnings with line/position info
  - Continue parsing siblings after encountering malformed child
  - Only fail if entire document structure is unparseable

**Decision**: 
- Enhance `MusicXMLParser::parse()` with error recovery branches in event loop
- Add `encoding_rs` dependency for charset conversion fallback
- Extend `ImportError` type with `SkippedElement` variant for tracking

**Alternatives Considered**:
- Full DOM parser (roxmltree): Would fail on malformed XML, no recovery possible
- HTML parser (lol_html): Too permissive, might misinterpret music notation elements

---

### 2. Voice Splitting Algorithm for Overlapping Notes

**Context**: Need deterministic voice assignment when same-pitch notes overlap in single voice (FR-003, FR-004)

**Findings**:

- **MusicXML Specification**: Voices numbered 1-N within staff, polyphonic voices can overlap
  - Real-world issue: Exporters sometimes merge voices incorrectly or use voice=1 for all notes
  
- **Notation Software Approaches**:
  - **MuseScore**: Assigns notes to voices by layer order in internal format, splits on export conflict
  - **Finale**: Uses explicit voice assignment, overlaps flagged as notation errors
  - **Sibelius**: Automatic voice distribution by stem direction and timing
  
- **Algorithm Requirements** (from clarifications):
  - Primary sort: Start tick (earliest notes to voice 1) - ensures temporal ordering
  - Tiebreaker: Pitch (higher pitch to higher voice on simultaneous starts) - deterministic and musically natural
  - Maximum: 4 voices per staff (standard music notation limit)
  - Overflow: Skip notes requiring voice 5+ (keep earliest 4 voices)

- **Implementation Strategy**:
  1. Collect all notes for a staff across import
  2. Sort by (start_tick, pitch) tuple
  3. Assign voices using greedy algorithm: iterate sorted notes, assign to first voice without overlap
  4. If all 4 voices occupied at tick, record warning and skip note

**Decision**:
- Implement `VoiceDistributor` struct with `assign_voices(notes: Vec<Note>) -> Result<HashMap<VoiceId, Vec<Note>>, Warning>` 
- Use `BTreeMap<(Tick, Pitch), Note>` for deterministic iteration order
- Add `Voice::can_add_note(&self, note: &Note) -> bool` helper checking overlap without mutation

**Alternatives Considered**:
- Duration-based: Longer notes to voice 1 - rejected, not musically intuitive
- Pitch-only: Low to high assignment - rejected, breaks temporal logic
- Dynamic voice creation beyond 4 - rejected, violates music notation standards

---

### 3. Sensible Defaults for Missing Structural Elements

**Context**: Apply defaults for tempo, time signature, clef when MusicXML omits them (FR-005, FR-006)

**Findings**:

- **MusicXML Best Practices** (W3C MusicXML 3.1 spec):
  - Tempo: 120 BPM is MIDI standard default (quarter note = 120)
  - Time Signature: 4/4 (common time) is universal default in Western music
  - Clef: Context-dependent - treble for treble-range instruments, bass for bass-range
  
- **Clef Inference Strategy** (per clarification Q2):
  - Calculate mean MIDI pitch of first 100 notes in staff (ignore rests)
  - Threshold: MIDI 60 (C4/middle C)
  - If avg ≥ 60 → Treble clef, if avg < 60 → Bass clef
  - Rationale: C4 is standard dividing line between treble and bass ranges
  
- **Default Application Timing**:
  - Tempo: Apply at tick 0 if no explicit tempo marking in first measure
  - Time Signature: Apply at tick 0 if no attributes/time element found
  - Clef: Apply per-staff at tick 0 after parsing all notes for pitch calculation

- **Warning Messages**:
  - Include specific context: "Staff 1 (Piano - Right Hand): Missing clef definition, inferred Treble based on average pitch C5"
  - Record applied value explicitly in warning for debugging

**Decision**:
- Add `DefaultsApplicator` struct with `apply_tempo()`, `apply_time_signature()`, `infer_clef()` methods
- Implement clef inference as post-processing step after note collection
- Warnings categorized as `MissingElements` with severity `Info`

**Alternatives Considered**:
- First note pitch only: Rejected, not robust to initial rests or pickup measures
- Weighted by duration: Rejected, adds complexity without meaningful accuracy improvement
- Fixed clef per instrument family: Rejected, MusicXML doesn't always include instrument metadata

---

### 4. Warning Collection Without Failing Operations

**Context**: Collect warnings throughout import without short-circuiting on errors (FR-002)

**Findings**:

- **Rust Error Handling Patterns**:
  - `Result<T, E>`: Short-circuits on first error (current importer behavior)
  - `Result<T, Vec<Warning>>`: Accumulates warnings, fails only on critical errors
  - Builder pattern with warning buffer: Mutable state collects warnings during construction
  
- **Best Practice**: "Parse Result" pattern
  ```rust
  struct ImportResult {
      score: Score,
      warnings: Vec<ImportWarning>,
      partial: bool  // true if some content skipped
  }
  
  struct ImportContext {
      warnings: Vec<ImportWarning>,
      // ... other state
  }
  ```
  
- **Warning Structure** (per spec Key Entities):
  - severity: Info | Warning | Error (for partial failures)
  - category: OverlapResolution | MissingElements | StructuralIssues | PartialImport
  - message: Human-readable description
  - context: measure_number, instrument_name, staff_number, voice_number (all optional)

- **Collection Strategy**:
  - Parser passes `&mut ImportContext` through recursive descent
  - Each recovery action calls `ctx.warn(category, message, context)`
  - Converter returns `Result<Score, ImportError>` but critical errors still fail
  - Distinguish recoverable (warning) from irrecoverable (error) issues

**Decision**:
- Add `ImportWarning` struct in `errors.rs` with fields per spec
- Thread `ImportContext` through parser and converter
- Modify return types: `import_content() -> Result<ImportResult, ImportError>`
  - `Ok(ImportResult)` = successful import (possibly with warnings)
  - `Err(ImportError)` = complete failure (no valid content extractable per FR-015)

**Alternatives Considered**:
- Global warning vector: Rejected, not thread-safe, violates functional principles
- Callback-based: `on_warning(warning)` - rejected, complicates testing
- Separate validation pass: Rejected, requires double parsing

---

### 5. Deterministic Behavior in Error Recovery

**Context**: Same MusicXML must always produce identical score (FR-016, SC-008)

**Findings**:

- **Sources of Non-Determinism**:
  - HashMap iteration order: Rust `HashMap` is randomized for security
  - Floating-point rounding: Can vary across platforms
  - Thread/async execution order: Parallel parsing could vary
  - UUID generation: Would create different IDs each time
  
- **Deterministic Guarantees Needed**:
  - Voice assignments: Same notes always assigned to same voices
  - Default values: Same missing elements always get same defaults
  - Tick rounding: Non-integer ticks always round consistently (per clarification Q4)
  - Warning order: Warnings appear in consistent sequence
  
- **Implementation Strategies**:
  - Use `BTreeMap` instead of `HashMap` for deterministic iteration
  - Sort collections before processing: `notes.sort_by_key(|n| (n.start_tick, n.pitch))`
  - Integer-only arithmetic: Round non-integer ticks with `(value + 0.5).floor() as i32`
  - Warn if fractional part > 0.1: `if (value - rounded).abs() > 0.1 { warn!(...) }`
  - Sequential processing: No parallelism in parser (current implementation is single-threaded)
  - Stable entity IDs: Use deterministic ID generation based on input position, not random UUIDs
  
- **Testing Determinism**:
  - Parse same file N times (e.g., 10), serialize each Score to JSON
  - Assert byte-for-byte equality across all outputs
  - Include in integration test suite with Moonlight Sonata.mxl

**Decision**:
- Replace HashMap with BTreeMap in voice distribution logic
- Document ordering requirements in code comments
- Add determinism test as part of feature validation
- Use `.round()` for tick values, check fractional part for warning threshold

**Alternatives Considered**:
- Seeded random for IDs: Rejected, fragile and obscures intent
- Canonical serialization: Rejected, doesn't guarantee identical internal structure
- Timestamp-based IDs: Rejected, not deterministic

---

## Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| XML Parser | quick-xml 0.31+ | Already in use, supports event-based parsing with error recovery, good performance |
| Encoding Detection | encoding_rs 0.8+ | Standard Rust encoding conversion, handles common MusicXML charset issues |
| Warning Storage | Custom `ImportWarning` struct | Matches spec requirements, integrates with existing error types |
| Voice Distribution | Custom algorithm with BTreeMap | Deterministic, follows clarified assignment rules |
| Clef Inference | Custom pitch analysis | Simple, matches clarified algorithm (mean of first 100 notes) |
| Testing | cargo test (integration) + vitest (frontend) | Existing test infrastructure, adequate for determinism verification |

## Open Questions

None - all critical decisions resolved during research phase. Implementation can proceed.

## Next Steps (Phase 1)

1. Define data model for `ImportWarning` and enhanced `ImportResult`
2. Define TypeScript contracts for frontend warning display
3. Create quickstart guide for testing with Moonlight Sonata.mxl
4. Update agent context with new technologies (encoding_rs)
