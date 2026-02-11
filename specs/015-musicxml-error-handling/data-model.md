# Data Model: Resilient MusicXML Import

**Feature**: [015-musicxml-error-handling](spec.md)  
**Phase**: 1 - Design & Contracts  
**Date**: 2026-02-11

## Overview

This document defines the data structures for enhanced MusicXML import with warning collection, error recovery, and deterministic behavior. Extends existing `ImportResult` from Feature 006 to include warnings and partial import indicators.

## Core Entities

### ImportWarning

Represents a non-fatal issue encountered during MusicXML import.

**Purpose**: Provide detailed, actionable feedback about recovered errors, applied defaults, and skipped content without failing the import operation.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `severity` | `WarningSeverity` | Yes | Impact level: Info, Warning, Error |
| `category` | `WarningCategory` | Yes | Classification for grouping |
| `message` | `String` | Yes | Human-readable description |
| `measure_number` | `Option<i32>` | No | Specific measure context (1-indexed) |
| `instrument_name` | `Option<String>` | No | Instrument context (e.g., "Piano - Right Hand") |
| `staff_number` | `Option<i32>` | No | Staff within instrument (1-indexed) |
| `voice_number` | `Option<i32>` | No | Voice within staff (1-indexed) |

**Invariants**:
- `message` must be non-empty
- `measure_number` ≥ 1 if present
- `staff_number` ≥ 1 if present
- `voice_number` ≥ 1 if present

**Example Instances**:

```rust
// Overlapping note resolution
ImportWarning {
    severity: WarningSeverity::Warning,
    category: WarningCategory::OverlapResolution,
    message: "Overlapping C4 quarter notes at tick 480 - split into 2 voices".to_string(),
    measure_number: Some(5),
    instrument_name: Some("Piano".to_string()),
    staff_number: Some(1),
    voice_number: Some(1),
}

// Missing element with default applied
ImportWarning {
    severity: WarningSeverity::Info,
    category: WarningCategory::MissingElements,
    message: "No tempo specified - using 120 BPM default".to_string(),
    measure_number: Some(1),
    instrument_name: None,
    staff_number: None,
    voice_number: None,
}

// Partial import failure
ImportWarning {
    severity: WarningSeverity::Error,
    category: WarningCategory::PartialImport,
    message: "Failed to parse measures 47-52 - corrupted XML structure".to_string(),
    measure_number: Some(47),
    instrument_name: Some("Violin II".to_string()),
    staff_number: Some(1),
    voice_number: None,
}
```

---

### WarningSeverity (Enum)

**Variants**:

| Variant | Use Case | UI Treatment |
|---------|----------|--------------|
| `Info` | Defaults applied, non-critical adjustments | Gray/neutral icon, dismissible |
| `Warning` | Recovered errors, structural issues | Yellow/caution icon, review recommended |
| `Error` | Partial failures, skipped content | Red/error icon, attention required |

**Rationale**: Three levels provide sufficient granularity for user decision-making without overwhelming with complexity.

---

### WarningCategory (Enum)

**Variants**:

| Variant | Description | Example Message |
|---------|-------------|-----------------|
| `OverlapResolution` | Same-pitch notes overlapping in single voice | "Overlapping notes split into voices 1-2" |
| `MissingElements` | Required elements absent, defaults applied | "Missing time signature - using 4/4" |
| `StructuralIssues` | Malformed XML, encoding problems | "Skipped malformed lyrics in measure 8" |
| `PartialImport` | Content skipped due to unrecoverable errors | "Instrument truncated at measure 20" |

**Rationale**: Categories enable warning grouping in UI ("2 overlap warnings, 1 missing element") and targeted filtering.

---

### ImportResult (Extended)

Enhanced from Feature 006 to include warning information.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `score` | `Score` | Yes | Successfully imported score (may be partial) |
| `metadata` | `ImportMetadata` | Yes | File format, name, composer info |
| `statistics` | `ImportStatistics` | Yes | Extended with warning counts |
| `warnings` | `Vec<ImportWarning>` | Yes | Collected warnings (empty if perfect import) |
| `partial_import` | `bool` | Yes | True if some content was skipped |

**Changes from Feature 006**:
- Added `warnings` field (was always empty in original)
- Added `partial_import` flag (new)
- Extended `ImportStatistics` (see below)

---

### ImportStatistics (Extended)

**New Fields** (added to existing):

| Field | Type | Description |
|-------|------|-------------|
| `warning_count` | `usize` | Total warnings generated |
| `skipped_element_count` | `usize` | Number of XML elements skipped (malformed, unparseable) |

**Existing Fields** (unchanged):
- `instrument_count: usize`
- `staff_count: usize`
- `voice_count: usize`
- `note_count: usize`
- `duration_ticks: u32`

---

### ImportContext (Internal)

**Purpose**: Thread warning collection through parser and converter. Not exposed in public API.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `warnings` | `Vec<ImportWarning>` | Accumulated warnings |
| `current_measure` | `Option<i32>` | Current measure being parsed (for context) |
| `current_instrument` | `Option<String>` | Current instrument name (for context) |
| `current_staff` | `Option<i32>` | Current staff number (for context) |

**Methods**:

```rust
impl ImportContext {
    fn new() -> Self;
    
    fn warn(&mut self, 
            severity: WarningSeverity, 
            category: WarningCategory, 
            message: String);
    
    fn set_context(&mut self, 
                   measure: Option<i32>, 
                   instrument: Option<String>, 
                   staff: Option<i32>);
    
    fn finish(self) -> Vec<ImportWarning>;
}
```

---

## Relationships

```
ImportResult
├── score: Score                    (aggregate root, existing)
├── metadata: ImportMetadata        (existing)
├── statistics: ImportStatistics    (extended with warning counts)
├── warnings: Vec<ImportWarning>    (new collection)
└── partial_import: bool            (new flag)

ImportWarning
├── severity: WarningSeverity       (enum: Info/Warning/Error)
├── category: WarningCategory       (enum: 4 types)
└── context: measure/instrument/staff/voice (optional fields)

ImportContext (internal)
└── warnings: Vec<ImportWarning>    (accumulator)
```

## State Transitions

### Import Flow with Warning Collection

```
1. Create ImportContext
   → warnings = []

2. Parse XML (with recovery)
   → On malformed element: skip, ctx.warn(StructuralIssues)
   → On missing element: ctx.warn(MissingElements)
   → Continue parsing

3. Convert to Score (with recovery)
   → On overlapping notes: split voices, ctx.warn(OverlapResolution)
   → On missing defaults: apply, ctx.warn(MissingElements)
   → On unparseable instrument: skip, ctx.warn(PartialImport)

4. Build ImportResult
   → score = converted Score
   → warnings = ctx.finish()
   → partial_import = warnings.any(|w| w.category == PartialImport)
   → statistics = calculate with warning_count, skipped_element_count
```

### Warning Severity Escalation

| Condition | Severity |
|-----------|----------|
| Default applied successfully | Info |
| Element skipped, content intact | Warning |
| Instrument/section failed, others succeeded | Error (in that warning) |
| All instruments failed | Import fails completely (no Result returned) |

## Validation Rules

1. **ImportResult**:
   - `warnings.len() == statistics.warning_count`
   - `partial_import == true` iff any warning has `category == PartialImport`
   - `score` must pass existing domain validation (valid Timeline, no internal overlaps)

2. **ImportWarning**:
   - `message` non-empty
   - If `voice_number` present, then `staff_number` also present
   - If `staff_number` present, then `instrument_name` also present (when applicable)

3. **Determinism**:
   - Warnings must appear in deterministic order (sorted by measure_number, then staff_number)
   - Same input XML produces identical warnings array (same messages, same order)

## Serialization

### Rust (Serde)

```rust
#[derive(Serialize, Deserialize)]
pub struct ImportWarning {
    pub severity: WarningSeverity,
    pub category: WarningCategory,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub measure_number: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instrument_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub staff_number: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voice_number: Option<i32>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WarningSeverity {
    Info,
    Warning,
    Error,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WarningCategory {
    OverlapResolution,
    MissingElements,
    StructuralIssues,
    PartialImport,
}
```

### TypeScript (Contract)

See [contracts/ImportWarning.ts](contracts/ImportWarning.ts) for frontend interface definitions.

## Migration from Feature 006

**Breaking Changes**: None - extended types are backward compatible
- Old code receives empty `warnings` array
- Old code ignores `partial_import` flag if not checked
- `statistics` fields are additive (new counts alongside existing)

**Integration Points**:
- WASM bindings: `parse_musicxml()` returns extended `ImportResult` with warnings
- Frontend: `MusicXMLImportService.importFile()` receives warnings in result
- UI: ImportButton component displays warning panel when `warnings.length > 0`
