# Data Model: WASM Music Engine Interface

**Feature**: 011-wasm-music-engine  
**Date**: 2026-02-09  
**Purpose**: Define the TypeScript ↔ WebAssembly interface design

## Overview

The WASM module exposes the Rust music engine domain logic to JavaScript through a serialization-based API. Domain entities (Score, Instrument, Note, etc.) are serialized to JSON when crossing the WASM boundary, maintaining compatibility with existing frontend TypeScript types.

**Architecture Pattern**: Hexagonal Architecture with WASM Adapter
```
┌──────────────────────────────────────────────┐
│         Frontend (TypeScript/React)          │
│  ┌────────────────────────────────────────┐  │
│  │  WASM Wrapper (music-engine.ts)        │  │ ← New TypeScript wrapper
│  └────────────────┬───────────────────────┘  │
└─────────────────┬─┴───────────────────────────┘
                  │
         JSON serialization via
         serde_wasm_bindgen
                  │
┌─────────────────┴──────────────────────────────┐
│         Backend WASM (Rust)                    │
│  ┌──────────────────────────────────────────┐ │
│  │  WASM Adapter (src/adapters/wasm/)       │ │ ← New Rust adapter layer
│  │  - wasm-bindgen exports                  │ │
│  │  - Type conversion                       │ │
│  │  - Error handling                        │ │
│  └────────────────┬─────────────────────────┘ │
│                   │                            │
│  ┌────────────────┴─────────────────────────┐ │
│  │  Domain Core (src/domain/)               │ │ ← Unchanged
│  │  - Score, Instrument, Staff, Voice       │ │
│  │  - MusicXML parser                       │ │
│  │  - Validation logic                      │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

---

## Core Design Principles

1. **Preserve Existing Types**: Frontend TypeScript types (Score, Instrument, Note) remain unchanged
2. **JSON Serialization**: All data crossing WASM boundary is serialized to JSON (via serde_wasm_bindgen)
3. **Hexagonal Adapter**: WASM bindings live in `src/adapters/wasm/`, not polluting domain core
4. **Structured Errors**: Rust errors convert to JavaScript exceptions with type information
5. **Stateless Operations**: Each WASM call is independent (no persistent state in WASM)

---

## WASM Exports (Public API)

### Music Engine Core Operations

These functions replace the REST API endpoints for music domain operations.

#### `parse_musicxml(xml_bytes: Uint8Array): Score`

**Purpose**: Parse MusicXML file bytes into a Score domain object

**Input**: 
- `xml_bytes: Uint8Array` - Raw MusicXML file content (UTF-8)

**Output**: 
- `Score` - Serialized Score object (JSON)

**Errors**:
- `ParseError` - Invalid MusicXML structure, missing required elements
- `ValidationError` - Content violates domain rules (e.g., overlapping notes)

**Rust Signature**:
```rust
#[wasm_bindgen]
pub fn parse_musicxml(xml_bytes: &[u8]) -> Result<JsValue, JsValue> {
    let score = musicxml::parse(xml_bytes)
        .map_err(|e| to_wasm_error(e))?;
    Ok(serde_wasm_bindgen::to_value(&score)?)
}
```

**Usage Example** (TypeScript):
```typescript
import { parseMusicXML } from '@/services/wasm/music-engine';

const xmlBytes = await file.arrayBuffer();
const score = await parseMusicXML(new Uint8Array(xmlBytes));
// score is typed as Score interface
console.log(score.title, score.instruments.length);
```

---

#### `create_score(title?: string): Score`

**Purpose**: Create a new empty score with default structural events

**Input**: 
- `title?: string` - Optional score title (defaults to "Untitled")

**Output**: 
- `Score` - New score with:
  - Default tempo: 120 BPM at tick 0
  - Default time signature: 4/4 at tick 0
  - No instruments (empty array)

**Rust Signature**:
```rust
#[wasm_bindgen]
pub fn create_score(title: Option<String>) -> Result<JsValue, JsValue> {
    let score = Score::new(title.unwrap_or_else(|| "Untitled".to_string()));
    Ok(serde_wasm_bindgen::to_value(&score)?)
}
```

---

#### `add_instrument(score: Score, name: string): Score`

**Purpose**: Add an instrument to a score

**Input**: 
- `score: Score` - Current score (deserialized from JSON)
- `name: string` - Instrument name (e.g., "Piano", "Violin")

**Output**: 
- `Score` - Updated score with new instrument containing:
  - Default staff with treble clef
  - Default voice
  - Unique IDs generated

**Errors**:
- `ValidationError` - Invalid instrument name (empty, too long)

**Rust Signature**:
```rust
#[wasm_bindgen]
pub fn add_instrument(score: JsValue, name: String) -> Result<JsValue, JsValue> {
    let mut score: Score = serde_wasm_bindgen::from_value(score)?;
    score.add_instrument(name)
        .map_err(|e| to_wasm_error(e))?;
    Ok(serde_wasm_bindgen::to_value(&score)?)
}
```

**Note**: This is a **stateless operation** - the original Score object is not mutated. Frontend must replace the old score with the returned score.

---

#### `add_note(score: Score, voice_id: string, note: Note): Score`

**Purpose**: Add a note to a voice with domain validation

**Input**: 
- `score: Score` - Current score
- `voice_id: string` - UUID of the target voice
- `note: Note` - Note to add (tick, duration, pitch)

**Output**: 
- `Score` - Updated score with new note

**Errors**:
- `NoteOverlapError` - Note overlaps with existing note of same pitch in voice
- `InvalidPitchError` - MIDI pitch outside valid range (0-127)
- `VoiceNotFoundError` - Voice ID doesn't exist in score
- `InvalidTickError` - Negative tick or duration

**Rust Signature**:
```rust
#[wasm_bindgen]
pub fn add_note(
    score: JsValue, 
    voice_id: String, 
    note: JsValue
) -> Result<JsValue, JsValue> {
    let mut score: Score = serde_wasm_bindgen::from_value(score)?;
    let note: Note = serde_wasm_bindgen::from_value(note)?;
    let voice_id = Uuid::parse_str(&voice_id)
        .map_err(|_| to_wasm_error(DomainError::InvalidId))?;
    
    score.add_note_to_voice(voice_id, note)
        .map_err(|e| to_wasm_error(e))?;
    
    Ok(serde_wasm_bindgen::to_value(&score)?)
}
```

---

### Additional Operations (Feature Parity)

The following operations mirror existing REST API endpoints:

- ✅ `add_staff(score, instrument_id)` - Add staff to instrument
- ✅ `add_voice(score, staff_id)` - Add voice to staff  
- ✅ `add_tempo_event(score, tick, bpm)` - Add tempo change
- ✅ `add_time_signature_event(score, tick, numerator, denominator)` - Add time signature change
- ✅ `add_clef_event(score, staff_id, tick, clef_type)` - Add clef change
- ✅ `add_key_signature_event(score, staff_id, tick, key)` - Add key signature

*(Detailed signatures omitted for brevity - follow same pattern as above)*

---

## Domain Types (Shared)

These TypeScript interfaces remain **unchanged** from current frontend implementation. The WASM serialization produces objects that match these types exactly.

### Score

```typescript
interface Score {
  id: string;              // UUID
  title: string;
  ppq: number;             // Always 960 (Pulses Per Quarter note)
  instruments: Instrument[];
  structural_events: {
    tempo_changes: TempoEvent[];
    time_signatures: TimeSignatureEvent[];
  };
}
```

### Instrument

```typescript
interface Instrument {
  id: string;              // UUID
  name: string;
  staves: Staff[];
}
```

### Staff

```typescript
interface Staff {
  id: string;              // UUID
  voices: Voice[];
  events: {
    clefs: ClefEvent[];
    key_signatures: KeySignatureEvent[];
  };
}
```

### Voice

```typescript
interface Voice {
  id: string;              // UUID
  notes: Note[];
}
```

### Note

```typescript
interface Note {
  id: string;              // UUID
  tick: number;            // Absolute position in score (960 PPQ resolution)
  duration: number;        // Length in ticks
  pitch: number;           // MIDI pitch (0-127)
}
```

### Structural Events

```typescript
interface TempoEvent {
  tick: number;
  bpm: number;             // Beats per minute
}

interface TimeSignatureEvent {
  tick: number;
  numerator: number;       // e.g., 4 (in 4/4)
  denominator: number;     // e.g., 4 (in 4/4)
}

interface ClefEvent {
  tick: number;
  clef_type: 'treble' | 'bass' | 'alto' | 'tenor';
}

interface KeySignatureEvent {
  tick: number;
  key: string;             // e.g., "C", "G", "Dm", "F#"
}
```

**Serialization Contract**: Rust structs in `src/domain/` use `#[derive(Serialize, Deserialize)]` to produce JSON matching these TypeScript interfaces exactly. Field names and nesting structure are identical.

---

## Error Handling

### WASM Error Type

Errors crossing the WASM boundary are serialized to structured JavaScript objects.

**TypeScript Interface** (matches existing ApiError):
```typescript
interface WasmError {
  error: string;           // Error type (e.g., "NoteOverlapError")
  message: string;         // Human-readable message
  details?: object;        // Optional structured data
}
```

**Rust Implementation**:
```rust
// src/adapters/wasm/error_handling.rs

use serde::Serialize;
use wasm_bindgen::JsValue;
use crate::domain::errors::DomainError;

#[derive(Serialize)]
struct WasmError {
    error: String,
    message: String,
    details: Option<serde_json::Value>,
}

pub fn to_wasm_error(e: DomainError) -> JsValue {
    let wasm_error = match e {
        DomainError::NoteOverlap { voice_id, tick } => WasmError {
            error: "NoteOverlapError".to_string(),
            message: format!("Note overlaps with existing note at tick {}", tick),
            details: Some(json!({
                "voice_id": voice_id.to_string(),
                "tick": tick,
            })),
        },
        DomainError::InvalidPitch { value } => WasmError {
            error: "InvalidPitchError".to_string(),
            message: format!("MIDI pitch {} is outside valid range (0-127)", value),
            details: Some(json!({ "pitch": value })),
        },
        DomainError::ParseError { message } => WasmError {
            error: "ParseError".to_string(),
            message,
            details: None,
        },
        // ... more error types
    };
    
    serde_wasm_bindgen::to_value(&wasm_error).unwrap()
}
```

**JavaScript Usage**:
```typescript
try {
  const score = await addNote(currentScore, voiceId, note);
} catch (error: any) {
  if (error.error === 'NoteOverlapError') {
    console.error(`Cannot add note: ${error.message}`);
    console.log('Conflicting voice:', error.details.voice_id);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

---

## Memory Management

### Stateless Operations Pattern

**Key Principle**: WASM functions do not retain state between calls. Each operation receives a Score object, modifies it, and returns a new Score object.

**Workflow**:
1. TypeScript passes `score` (plain JavaScript object) to WASM
2. `serde_wasm_bindgen::from_value` deserializes to Rust `Score`
3. Domain logic operates on Rust `Score` (Rust owns memory)
4. `serde_wasm_bindgen::to_value` serializes updated `Score` back to JavaScript
5. JavaScript receives new `score` object (old object can be garbage collected)

**Memory Safety**:
- ✅ No manual `malloc`/`free` needed
- ✅ Rust ownership prevents double-free
- ✅ JavaScript garbage collection handles JS objects
- ✅ Serialization creates clean boundary (no shared pointers)

**Performance Trade-off**:
- ⚠️ Serialization overhead: ~1-2ms per operation for typical scores
- ✅ Acceptable: Still meets <100ms parse time requirement
- ✅ Simpler than manual memory management (fewer bugs)

---

## WASM Module Initialization

### Initialization Flow

```typescript
// frontend/src/services/wasm/loader.ts

import init, * as wasm from '/wasm/musiccore.js';

let wasmInitialized = false;
let wasmModule: typeof wasm | null = null;

export async function initWasm(): Promise<void> {
  if (wasmInitialized) return;
  
  try {
    // Load WASM binary and initialize
    wasmModule = await init('/wasm/musiccore_bg.wasm');
    wasmInitialized = true;
    console.log('WASM music engine loaded');
  } catch (error) {
    console.error('Failed to load WASM module:', error);
    throw new Error('WASM initialization failed. Browser may not support WebAssembly.');
  }
}

export function getWasmModule(): typeof wasm {
  if (!wasmInitialized || !wasmModule) {
    throw new Error('WASM module not initialized. Call initWasm() first.');
  }
  return wasmModule;
}
```

### App-level Initialization

```typescript
// frontend/src/App.tsx

import { initWasm } from './services/wasm/loader';

function App() {
  const [wasmReady, setWasmReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    initWasm()
      .then(() => setWasmReady(true))
      .catch((err) => setError(err.message));
  }, []);
  
  if (error) {
    return <div>Error: {error}. WebAssembly is required.</div>;
  }
  
  if (!wasmReady) {
    return <div>Loading music engine...</div>;
  }
  
  return <MainContent />;
}
```

---

## Migration Path (REST API → WASM)

### Before (REST API)

```typescript
// frontend/src/services/score-api.ts
import { ScoreApiClient } from './score-api';

const apiClient = new ScoreApiClient('http://localhost:8080');

async function loadScore(file: File): Promise<Score> {
  return await apiClient.uploadMusicXML(file);
}
```

### After (WASM)

```typescript
// frontend/src/services/wasm/music-engine.ts
import { parseMusicXML } from './music-engine';

async function loadScore(file: File): Promise<Score> {
  const xmlBytes = new Uint8Array(await file.arrayBuffer());
  return await parseMusicXML(xmlBytes);
}
```

**Key Changes**:
- ❌ Remove: Fetch calls to backend API
- ✅ Add: WASM function calls
- ✅ Preserve: Score interface type remains unchanged

---

## Implementation Checklist

### Backend (Rust)

- [ ] Create `src/adapters/wasm/mod.rs` with wasm-bindgen exports
- [ ] Create `src/adapters/wasm/bindings.rs` for type conversion helpers
- [ ] Create `src/adapters/wasm/error_handling.rs` for WasmError conversion
- [ ] Add `#[wasm_bindgen]` attributes to exported functions
- [ ] Ensure all domain types have `#[derive(Serialize, Deserialize)]`
- [ ] Add `wasm-bindgen` and `serde-wasm-bindgen` to Cargo.toml
- [ ] Configure Cargo.toml release profile for size optimization
- [ ] Remove `zip` crate (handle .mxl decompression in frontend)

### Frontend (TypeScript)

- [ ] Create `src/services/wasm/loader.ts` for WASM initialization
- [ ] Create `src/services/wasm/music-engine.ts` for typed wrapper functions
- [ ] Create `src/services/wasm/types.ts` for WASM-specific types (if needed)
- [ ] Update `src/services/import/MusicXMLImportService.ts` to use WASM
- [ ] Replace `ScoreApiClient` usage with WASM functions in components
- [ ] Add WASM initialization to App.tsx
- [ ] Configure Vite to copy WASM artifacts to public/wasm/
- [ ] Add error handling for WASM load failures (graceful degradation)

---

## Design Validation

### Hexagonal Architecture Compliance

✅ **Domain Core Isolated**: WASM adapter lives in `src/adapters/wasm/`, domain code in `src/domain/` has no WASM-specific logic

✅ **Port Pattern**: WASM exports act as a port (similar to HTTP API port)

✅ **Technology-Agnostic Domain**: Domain tests run in native Rust (`cargo test`) without WASM dependencies

### API-First Spirit Preserved

✅ **Contract-Driven**: TypeScript interfaces are the contract (JSON serialization enforces compatibility)

✅ **Separate Development**: WASM exports can be developed/tested independently from frontend

✅ **Future Clients**: WASM module can be consumed by Node.js, Electron, or mobile webviews (not tied to React)

### Test-First Development

✅ **Native Tests First**: Write domain logic tests in Rust (`cargo test`)

✅ **WASM Validation**: Run `wasm-pack test --headless` to validate browser compatibility

✅ **Integration Tests**: Frontend tests validate end-to-end TypeScript ↔ WASM flow

---

**Phase 1 Design Complete**: Data model defines WASM interface, memory management, and error handling. Ready to generate contracts/ and quickstart.md.
