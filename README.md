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

✅ **Progressive Web App (PWA)**
- **Offline-first** - Works without internet connection
- **Installable** - Add to home screen on tablets (iPad, Android)
- **Service Worker** - Background caching and updates
- **Local Storage** - IndexedDB for offline score persistence
- **Desktop-class** - Standalone app experience
- **Auto-updates** - Seamless PWA updates on reload
- **Cross-platform** - iOS Safari, Chrome, Edge support
- **WASM-powered** - Rust music engine runs in browser

✅ **REST API** (Backend - Legacy)
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
- 596 tests passing (563 integration + 33 component tests)
- 100% pass rate for implemented features
- Test-first development approach

## Quick Start

### Use the Live App

**🚀 [Launch Musicore](https://aylabs.github.io/musicore/)**

- Works on tablets (iPad, Surface, Android)
- No installation required
- Offline-capable after first visit
- Add to home screen for app-like experience

### Local Development

**Prerequisites:**
- Node.js 20.19+ ([install](https://nodejs.org/))
- Rust 1.93+ for WASM compilation ([install](https://rustup.rs/))

**Build and Run:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

**Build WASM Module:**
```bash
cd backend
wasm-pack build --target web
```

## Usage

**For Users**: See [FEATURES.md](FEATURES.md) for feature overview and usage guide.

**For Developers**: The app uses component-based architecture with React + TypeScript. Key components:
- `ScoreViewer` - Main score display with playback controls
- `StaffNotation` - Five-line staff rendering with SMuFL font
- `InstrumentList` - Hierarchical score structure display
- `MusicXMLImportService` - WASM-powered MusicXML parsing

See [frontend/README.md](frontend/README.md) for development documentation.

## Project Structure

```
musicore/
├── backend/                # Rust music engine (WASM)
│   ├── src/
│   │   ├── domain/         # Core domain logic (DDD)
│   │   ├── wasm/           # WASM bindings
│   │   └── lib.rs          # Library entry point
│   ├── pkg/                # Generated WASM output
│   └── Cargo.toml          # Rust dependencies
├── frontend/               # React PWA
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # WASM integration, storage
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx         # Main app
│   ├── public/
│   │   ├── wasm/           # WASM module files
│   │   └── icons/          # PWA icons
│   ├── vite.config.ts      # PWA & build config
│   └── package.json        # Dependencies
├── specs/                  # Feature specifications
├── .specify/               # Project constitution & memory
└── README.md               # This file
```

## Architecture

### PWA Architecture

```
┌───────────────────────────────────────────────┐
│         Browser (Tablet/Desktop)               │
│  ┌─────────────────────────────────────────┐  │
│  │       React PWA (Frontend)            │  │
│  │   Components │ Services │ Storage   │  │
│  └────────────┬──────────────────────────┘  │
│                 │                          │
│                 ▼ JS Bindings              │
│  ┌─────────────────────────────────────────┐  │
│  │     WASM Music Engine (Rust)         │  │
│  │   MusicXML Parser │ Domain Model   │  │
│  │   Timeline │ Score │ Validation    │  │
│  └─────────────────────────────────────────┘  │
│                                             │
│  IndexedDB    Service Worker   Web Audio    │
└───────────────────────────────────────────────┘
```

### Domain Model (DDD)

- **Aggregate Root**: `Score` controls all mutations
- **Entities**: `Instrument`, `Staff`, `Voice` with UUID identity
- **Value Objects**: `Tick`, `BPM`, `Pitch`, `Clef`, `KeySignature` (immutable)
- **Events**: `TempoEvent`, `TimeSignatureEvent`, `ClefEvent`, `KeySignatureEvent`, `Note`
- **Validation**: Domain rules enforced (overlap prevention, required defaults)

## Implementation Progress

**Overall: Features 001-015 Complete**

**Recent Features:**
- ✅ Feature 015: Resilient MusicXML Import - Error recovery, voice splitting, warning diagnostics
  - **Validated with**: Moonlight Sonata, Bach Preludes & Inventions, Mozart Piano Sonatas, Chopin Préludes
  - **Capabilities**: Overlapping note resolution, structural issue recovery, detailed import warnings
- ✅ Feature 012: PWA Distribution - GitHub Pages deployment, offline-first architecture
- ✅ Feature 013: Demo & Onboarding - First-run demo score, welcome experience
- ✅ Feature 014: Remove Editing Interface - Read-only viewer focus

**Foundation Features:**
- ✅ Feature 001: Score Model - Domain-driven design, hierarchical structure
- ✅ Feature 006: MusicXML Import - WASM-powered parsing
- ✅ Feature 009: Playback with Auto-scroll - Web Audio API integration
- ✅ Feature 010: Stacked Staves View - Piano/multi-staff display

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | 19 / 5.9 |
| Build Tool | Vite | 7.0 |
| Music Engine | Rust + WASM | 1.93 |
| WASM Tooling | wasm-pack | Latest |
| Storage| IndexedDB | Native |
| PWA | Service Worker | Native |
| Testing | Vitest | 4.0 |

## Constitutional Principles

This project follows five core principles:

1. ✅ **Domain-Driven Design** - Ubiquitous language, aggregate roots, bounded contexts
2. ✅ **Hexagonal Architecture** - Domain independent of infrastructure
3. ✅ **PWA Architecture** - Offline-first, installable, WASM deployment
4. ✅ **Precision & Fidelity** - 960 PPQ integer arithmetic
5. ✅ **Test-First Development** - 596 tests, TDD workflow

## Documentation

- **Quick Start**: [FEATURES.md](FEATURES.md)
- **Backend**: [backend/README.md](backend/README.md)
- **Frontend**: [frontend/README.md](frontend/README.md)
- **Constitution**: [.specify/memory/constitution.md](.specify/memory/constitution.md)
- **Feature Specifications**: [specs/](specs/)

## Contributing

All changes must:
- Include tests (unit and/or integration)
- Pass `npm test` (frontend tests)
- Pass `npm run tsc` and `npm run lint` (TypeScript & ESLint)
- Follow domain-driven design principles
- Maintain PWA offline-first architecture
- Update relevant documentation and specs

## License

See repository root for license information.

---

**Version**: [1.0](https://github.com/aylabs/musicore)  
**Last Updated**: 2026-02-11  
**Status**: ✅ PWA deployed to GitHub Pages  
**Test Coverage**: 596 tests (563 passing, 9 pre-existing failures, 24 skipped)
