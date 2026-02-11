# 🎵 Musicore

**🚀 Live App**: [https://aylabs.github.io/musicore/](https://aylabs.github.io/musicore/)

A tablet-native app for interactive scores, designed for practice and performance.

[![Rust](https://img.shields.io/badge/Rust-1.93-orange)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)
[![WASM](https://img.shields.io/badge/WASM-WebAssembly-654FF0)](https://webassembly.org/)

---

## Overview

Musicore is a tablet-native app for interactive scores, designed for practice and performance. Built as a Progressive Web Application (PWA) with Rust music engine compiled to WebAssembly, implementing a hierarchical domain model with precise timing (960 PPQ) and comprehensive validation. Delivers offline-capable, tablet-optimized experience following constitutional principles of domain-driven design, hexagonal architecture, and test-first practices.

**For a quick feature overview**, see [FEATURES.md](FEATURES.md).

### Features

✅ **Domain Model**
- Hierarchical score structure: Score → Instrument → Staff → Voice → Note
- Global structural events: Tempo, Time Signature
- Staff-scoped structural events: Clef, Key Signature
- Multi-staff instruments (e.g., piano with treble and bass clefs)
- Polyphonic voices with overlap validation
- 960 PPQ (Pulses Per Quarter note) precision

✅ **Staff Notation View** (Frontend)
- Five-line staff rendering with SMuFL music font (Bravura)
- Accurate pitch-to-position mapping for treble and bass clefs
- Proportional spacing based on MIDI ticks
- Interactive note selection (click to highlight)
- Virtual scrolling for long scores (1000+ notes at 60fps)
- Responsive viewport with auto-resizing
- Ledger lines for notes outside staff range
- Barlines at measure boundaries

✅ **Score File Persistence** (Feature 004)
- Save scores to JSON files (.musicore.json)
- Load scores from browser file picker
- Create new empty scores with default settings
- Unsaved changes warnings (on load, new score, browser close)
- 100% data fidelity (round-trip preservation)
- Keyboard shortcuts: Ctrl+S (save), Ctrl+O (load), Ctrl+N (new)
- Human-readable JSON format
- 3-layer validation: syntax, structure, domain rules

✅ **REST API** (Backend)
- 13 endpoints for complete score management
- Axum web framework with Tokio async runtime
- Thread-safe in-memory repository
- Error handling with proper HTTP status codes
- CORS and tracing middleware

✅ **React Frontend**
- TypeScript with strict type checking
- Component-based UI (ScoreViewer, InstrumentList, NoteDisplay, StaffNotation)
- Real-time API integration
- Note display with MIDI pitch and note names
- Complete CRUD operations for scores, instruments, and notes

✅ **Testing**
- 223 tests passing (97 file persistence + 126 others)
- 100% pass rate
- Test-first development approach

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Build and start both backend and frontend
docker-compose up --build

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8080/api/v1
```

### Option 2: Local Development

**Prerequisites:**
- Rust 1.75+ ([install](https://rustup.rs/))
- Node.js 18+ ([install](https://nodejs.org/))

**Start Backend:**
```bash
cd backend
cargo run
# Runs on http://localhost:8080
```

**Start Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Usage

### Staff Notation Component

The `StaffNotation` component renders notes on a five-line musical staff with SMuFL glyphs:

```tsx
import { StaffNotation } from './components/notation/StaffNotation';

const notes = [
  { id: 'note-1', pitch: 60, start_tick: 0, duration_ticks: 960 },    // Middle C
  { id: 'note-2', pitch: 64, start_tick: 960, duration_ticks: 960 },  // E4
  { id: 'note-3', pitch: 67, start_tick: 1920, duration_ticks: 960 }, // G4
];

function App() {
  return (
    <StaffNotation 
      notes={notes} 
      clef="Treble" 
      viewportWidth={1200}  // Optional, auto-detects by default
      viewportHeight={200}
    />
  );
}
```

**Features:**
- **Pitch Accuracy**: MIDI pitch 60 (Middle C) → C4 (1 ledger line below treble staff)
- **Proportional Spacing**: Notes positioned by `start_tick * 0.1 pixels/tick`
- **Interactive**: Click notes to select (blue highlight)
- **Virtual Scrolling**: Handles 1000+ notes efficiently
- **Responsive**: Adapts to container width automatically

### Score File Persistence

Save and load musical scores to/from JSON files using browser File API:

```tsx
import { ScoreViewer } from './components/ScoreViewer';
import { FileStateProvider } from './services/state/FileStateContext';

function App() {
  return (
    <FileStateProvider>
      <ScoreViewer />
    </FileStateProvider>
  );
}
```

**Features:**
- **Save**: Click "Save" button or press `Ctrl+S` / `⌘S` to download score as `.musicore.json`
- **Load**: Click "Load" button or press `Ctrl+O` / `⌘O` to open file picker
- **New Score**: Click "New" button or press `Ctrl+N` / `⌘N` to create empty score
- **Unsaved Changes**: Automatic warnings when loading/creating with unsaved changes
- **Browser Warning**: Prevents accidental data loss on page close/navigation
- **Data Fidelity**: 100% round-trip preservation (all data saved and restored exactly)
- **Validation**: 3-layer validation (JSON syntax, structure, domain rules)

**File Format:**
The JSON format matches the API response from `GET /api/v1/scores/:id`:
```json
{
  "id": "uuid-v4-string",
  "global_structural_events": [
    { "Tempo": { "tick": 0, "bpm": 120 } },
    { "TimeSignature": { "tick": 0, "numerator": 4, "denominator": 4 } }
  ],
  "instruments": [
    {
      "id": "uuid",
      "name": "Piano",
      "instrument_type": "piano",
      "staves": [...]
    }
  ]
}
```

See [specs/004-save-load-scores/quickstart.md](specs/004-save-load-scores/quickstart.md) for testing guide.

## Project Structure

```
musicore/
├── backend/                # Rust API server
│   ├── src/
│   │   ├── domain/         # Core domain logic (DDD)
│   │   ├── ports/          # Repository traits
│   │   ├── adapters/       # API & persistence implementations
│   │   └── main.rs         # Server entry point
│   ├── tests/              # Unit & integration tests
│   ├── examples/           # Example usage scripts
│   ├── Dockerfile
│   └── README.md           # Backend documentation
├── frontend/               # React + TypeScript UI
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API client
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx         # Main app
│   ├── Dockerfile
│   ├── nginx.conf
│   └── README.md           # Frontend documentation
├── specs/                  # Specifications & docs
│   └── 001-score-model/
│       ├── spec.md         # Feature specification
│       ├── data-model.md   # Domain entities
│       ├── contracts/      # OpenAPI specs
│       └── tasks.md        # Implementation tasks
├── docker-compose.yml      # Full stack orchestration
└── README.md               # This file
```

## Architecture

### Hexagonal Architecture (Ports & Adapters)

```
┌─────────────────────────────────────────┐
│           Frontend (React)               │
│  ┌────────────────────────────────────┐ │
│  │   Components   │   API Client      │ │
│  └────────────────┴───────────────────┘ │
└────────────────┬────────────────────────┘
                 │ HTTP/JSON
                 ▼
┌─────────────────────────────────────────┐
│         Backend (Rust + Axum)            │
│  ┌────────────────────────────────────┐ │
│  │  Adapters (API │ Persistence)      │ │
│  ├────────────────────────────────────┤ │
│  │           Ports (Traits)            │ │
│  ├────────────────────────────────────┤ │
│  │       Domain Logic (DDD)            │ │
│  │  Score │ Instrument │ Staff │ Voice │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Domain Model (DDD)

- **Aggregate Root**: `Score` controls all mutations
- **Entities**: `Instrument`, `Staff`, `Voice` with UUID identity
- **Value Objects**: `Tick`, `BPM`, `Pitch`, `Clef`, `KeySignature` (immutable)
- **Events**: `TempoEvent`, `TimeSignatureEvent`, `ClefEvent`, `KeySignatureEvent`, `Note`
- **Validation**: 11 invariants enforced (overlap, duplicates, required defaults)

## API Endpoints

**Base URL**: `http://localhost:8080/api/v1`

### Score Management
- `POST /scores` - Create score
- `GET /scores` - List all scores
- `GET /scores/{id}` - Get score with full hierarchy
- `DELETE /scores/{id}` - Delete score

### Domain Entities
- `POST /scores/{id}/instruments` - Add instrument
- `POST /scores/{id}/instruments/{id}/staves` - Add staff
- `POST /scores/{id}/instruments/{id}/staves/{id}/voices` - Add voice
- `POST /scores/{id}/.../voices/{id}/notes` - Add note

### Structural Events
- `POST /scores/{id}/structural-events/tempo` - Add tempo change
- `POST /scores/{id}/structural-events/time-signature` - Add time signature
- `POST /scores/{id}/.../staves/{id}/structural-events/clef` - Add clef change
- `POST /scores/{id}/.../staves/{id}/structural-events/key-signature` - Add key signature

See [backend/README.md](backend/README.md) for full API documentation.

## Development

### Running Tests

```bash
# Backend tests (94 tests)
cd backend
cargo test

# Frontend type checking
cd frontend
npm run tsc

# Integration tests only
cd backend
cargo test --test api_integration_test
```

### Running Examples

```bash
cd backend

# C major scale example
cargo run --example create_c_major_scale

# Two-hand piano example
cargo run --example create_piano_two_hands
```

### Code Quality

```bash
# Backend
cd backend
cargo clippy          # Linting
cargo fmt            # Formatting

# Frontend
cd frontend
npm run lint         # ESLint
```

## Implementation Progress

**Overall: 101/127 tasks (79.5%)**

**Feature 001 - Score Model:**
- ✅ Phase 1: Setup (7/7)
- ✅ Phase 2: Foundational (5/5)
- ✅ Phase 3: User Story 1 MVP (24/24)
- ✅ Phase 4: User Story 2 (4/4) - Multi-staff
- ✅ Phase 5: User Story 3 (5/5) - Polyphony
- ✅ Phase 6: User Story 4 (4/4) - Global events
- ✅ Phase 7: User Story 5 (4/4) - Staff events
- ✅ Phase 8: API Layer (20/20)
- ✅ Phase 9: Frontend Integration (10/10)
- 🚧 Phase 10: Polish (7/10) - In progress

**Feature 004 - Score File Persistence:**
- ✅ Phase 1: Setup (4/4)
- ✅ Phase 2: Foundational (4/4)
- ✅ Phase 3: US1 - Save (6/6)
- ✅ Phase 4: US2 - Load (8/8)
- ✅ Phase 5: US3 - New Score (4/4)
- 🚧 Phase 6: Polish (5/9) - In progress
  - ✅ T029: Integration tests (full workflow)
  - ✅ T030: Round-trip fidelity tests
  - ✅ T031: Performance tests
  - ✅ T032: Keyboard shortcuts (Ctrl+S, Ctrl+O, Ctrl+N)
  - ✅ T033: beforeunload warning
  - ⏳ T034: Manual testing (requires running app)
  - ✅ T035: Documentation updates
  - ⏳ T036: Code cleanup
  - ⏳ T037: Performance profiling (requires running app)

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend API | Rust + Axum | 1.93 / 0.7 |
| Runtime | Tokio | 1.0 |
| Frontend | React + TypeScript | 18 / 5.0 |
| Build Tool | Vite | 6.0 |
| Serialization | Serde | 1.0 |
| HTTP Client | Fetch API | Native |
| Testing | Cargo Test | Built-in |
| Containerization | Docker | 20+ |

## Constitutional Principles

This project follows five core principles:

1. ✅ **Domain-Driven Design** - Ubiquitous language, aggregate roots, bounded contexts
2. ✅ **Hexagonal Architecture** - Domain independent of infrastructure
3. ✅ **API-First Development** - OpenAPI contracts define interfaces
4. ✅ **Precision & Fidelity** - 960 PPQ integer arithmetic
5. ✅ **Test-First Development** - 94 tests, TDD workflow

## Documentation

- **Backend**: [backend/README.md](backend/README.md)
- **Frontend**: [frontend/README.md](frontend/README.md)
- **Feature 001 - Score Model**:
  - [specs/001-score-model/spec.md](specs/001-score-model/spec.md) - Specification
  - [specs/001-score-model/data-model.md](specs/001-score-model/data-model.md) - Domain entities
  - [specs/001-score-model/contracts/score-api.yaml](specs/001-score-model/contracts/score-api.yaml) - API contracts
- **Feature 004 - Score File Persistence**:
  - [specs/004-save-load-scores/spec.md](specs/004-save-load-scores/spec.md) - Specification
  - [specs/004-save-load-scores/plan.md](specs/004-save-load-scores/plan.md) - Implementation plan
  - [specs/004-save-load-scores/quickstart.md](specs/004-save-load-scores/quickstart.md) - Testing guide
  - [specs/004-save-load-scores/contracts/score-file.json](specs/004-save-load-scores/contracts/score-file.json) - File format example

## Contributing

All changes must:
- Include tests (unit and/or integration)
- Pass `cargo test` (backend)
- Pass `npm run tsc` and `npm run lint` (frontend)
- Follow hexagonal architecture boundaries
- Maintain domain model purity
- Update documentation

## License

See repository root for license information.

---

**Version**: 0.1.0  
**Last Updated**: 2026-02-06  
**Status**: ✅ Phase 1-9 Complete, Phase 10 In Progress  
**Test Coverage**: 94 tests passing (100% pass rate)
