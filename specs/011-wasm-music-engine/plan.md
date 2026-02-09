# Implementation Plan: WASM Music Engine Integration

**Branch**: `011-wasm-music-engine` | **Date**: 2026-02-09 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/011-wasm-music-engine/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Compile the Rust music engine (domain logic for MusicXML parsing, score validation, and domain operations) to WebAssembly and integrate it into the React frontend. This eliminates REST API network round-trips for music processing, enables offline functionality, and reduces server load by 80%+. The backend will retain HTTP endpoints for non-music operations (file storage, authentication), while the domain core runs client-side.

## Technical Context

**Language/Version**: Rust 2024 edition (backend), TypeScript 5.9 (frontend), WASM target via wasm32-unknown-unknown  
**Primary Dependencies**: 
- Backend: `wasm-bindgen` (JS interop), `serde` + `serde_json` (serialization), `quick-xml` (MusicXML parsing), `zip` (NEEDS CLARIFICATION: WASM compatibility)
- Frontend: React 19.2, Vite 6 (bundler with WASM support), TypeScript strict mode
**Storage**: In-memory for WASM (no persistence), REST API for server-side storage (out of scope for this feature)  
**Testing**: 
- Rust: `cargo test` (unit tests for domain logic), `wasm-pack test --headless` (browser WASM tests)
- Frontend: Vitest (integration tests), existing test suite must pass with WASM backend
**Target Platform**: Web browsers with WebAssembly support (Chrome 57+, Firefox 52+, Safari 11+, Edge 16+)  
**Project Type**: Web application (monorepo: `backend/` Rust + `frontend/` React)  
**Performance Goals**: 
- Parse typical MusicXML files (50-200 measures) in <100ms
- WASM module loads in <500ms on first page load
- Module bundle size <500KB gzipped
- Zero network latency for music domain operations
**Constraints**: 
- Offline-capable (WASM must work without backend connectivity)
- Browser memory limits (typically 2-4GB) - must handle large scores (1000+ measures)
- Functional parity with REST API (all existing frontend features must work identically)
- No breaking changes to frontend domain types (Score, Instrument, Note, etc.)
**Scale/Scope**: 
- ~40 Rust source files in `backend/src/domain/`
- MusicXML parser: ~2000 LOC
- Domain model: Score → Instrument → Staff → Voice → Note (5-level hierarchy)
- 12 API operations to replace with WASM calls (create score, add instrument, add note, parse MusicXML, etc.)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅ PASS

**Status**: Compliant  
**Justification**: Domain model (Timeline, Score, Instrument, Staff, Voice, Note) remains unchanged. WASM compilation preserves all domain entities and ubiquitous language. The domain logic is platform-agnostic - it doesn't know whether it's running in WASM or on a server.

**Action Required**: None

---

### II. Hexagonal Architecture ⚠️ NEEDS REVIEW

**Status**: Potential Concern - Requires Design Clarification  
**Issue**: Current backend follows hexagonal architecture with domain/ (core), ports/ (interfaces), and adapters/ (HTTP API). When compiling to WASM, we need to ensure:
1. Domain core remains technology-agnostic (no WASM-specific code in domain/)
2. WASM bindings act as an adapter (similar to HTTP adapter)
3. No direct coupling between domain and wasm-bindgen

**Resolution Path**: 
- Phase 0 research: Investigate wasm-bindgen architecture patterns
- Phase 1 design: Create WASM adapter layer separate from domain core
- Ensure domain tests can run both in native Rust (`cargo test`) and WASM (`wasm-pack test`)

**Action Required**: Resolve in research.md - document how WASM bindings fit into hexagonal architecture

---

### III. API-First Development ⚠️ ARCHITECTURAL SHIFT

**Status**: Intentional Evolution - Requires Justification  
**Issue**: Constitution mandates "Backend Exposes API, Frontend Consumes API". This feature eliminates the REST API layer for music domain operations.

**Justification**: 
- **Why**: Performance and offline capability are primary requirements (Feature 011 spec)
- **Contract Preservation**: TypeScript domain types remain the contract (Score, Instrument, Note interfaces)
- **Parallel Development**: Frontend consumes domain types directly via WASM, preserving contract-driven development
- **Future Clients**: WASM library can be packaged for other JavaScript clients (Node.js, Electron, mobile webviews)

**Trade-off Accepted**: 
- ✅ Gain: <100ms parse times (vs 200-500ms with REST API), offline capability, 80% server cost reduction
- ❌ Loss: Non-JavaScript clients cannot use music engine (acceptable - no such clients planned)

**Complexity Budget**: Adding WASM build pipeline, but removing HTTP API complexity for music operations (net neutral complexity)

**Action Required**: Document API evolution in data-model.md - WASM exports become the new "API contract"

---

### IV. Precision & Fidelity ✅ PASS

**Status**: Compliant  
**Justification**: WASM executes the same Rust code that currently runs on the server. 960 PPQ integer arithmetic is preserved identically. No floating-point timing introduced. WASM has full support for i64 operations needed for pulse calculations.

**Action Required**: None

---

### V. Test-First Development ✅ PASS (with additions)

**Status**: Compliant with Enhancements  
**Justification**: All existing domain tests remain valid. Added test requirements:
1. **WASM integration tests**: Verify TypeScript ↔ WASM boundary (serialization, error handling)
2. **Contract tests**: Ensure WASM exports match TypeScript type expectations
3. **Browser tests**: `wasm-pack test --headless` validates WASM execution environment
4. **Parity tests**: Validate identical behavior between WASM and previous REST API

**Action Required**: Define test strategy in quickstart.md - TDD workflow for WASM development

---

### Phase 0 Gate Evaluation

| Principle | Status | Blocker? | Resolution |
|-----------|--------|----------|------------|
| DDD | ✅ Pass | No | Domain model preserved |
| Hexagonal | ⚠️ Review | No | Design in Phase 1 (WASM adapter pattern) |
| API-First | ⚠️ Evolution | No | Justified architectural shift documented |
| Precision | ✅ Pass | No | Integer arithmetic preserved |
| Test-First | ✅ Pass | No | Enhanced with WASM test strategy |

**Result**: ✅ CLEARED FOR PHASE 0 RESEARCH

**Post-Design Re-Check Required**: After Phase 1 (data-model.md and contracts/), verify:
1. WASM adapter architecture maintains hexagonal boundaries
2. Contract definition via TypeScript interfaces maintains API-first spirit

## Project Structure

### Documentation (this feature)

```text
specs/011-wasm-music-engine/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command) - WASM tooling research
├── data-model.md        # Phase 1 output (/speckit.plan command) - WASM interface design
├── quickstart.md        # Phase 1 output (/speckit.plan command) - WASM build & integration guide
├── contracts/           # Phase 1 output (/speckit.plan command) - TypeScript ↔ WASM interface definitions
│   ├── wasm-exports.ts      # WASM public API surface
│   ├── domain-types.ts      # Shared domain types (Score, Instrument, Note, etc.)
│   └── error-handling.ts    # Error propagation between WASM and TypeScript
├── checklists/
│   └── requirements.md  # Spec validation checklist (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/              # ✅ Core music logic (compiles to WASM)
│   │   ├── score.rs         # Score aggregate root
│   │   ├── events/          # Note, tempo, time signature, clef, key signature
│   │   ├── voice.rs         # Voice with overlap validation
│   │   ├── staff.rs         # Staff with voices
│   │   ├── instrument.rs    # Instrument with staves
│   │   ├── importers/       # MusicXML parser
│   │   │   └── musicxml/    # quick-xml based parser (needs WASM compat check)
│   │   ├── value_objects.rs # PPQ, Tick, Pitch domain types
│   │   └── errors.rs        # Domain error types (must serialize to WASM)
│   ├── ports/               # ⚠️ May need WASM-specific port for JS interop
│   ├── adapters/
│   │   ├── api/             # ⚠️ REST API (remains for non-music operations)
│   │   ├── persistence/     # ⏸️ Not needed in WASM (in-memory only)
│   │   └── wasm/            # 🆕 NEW: WASM adapter layer (Phase 1)
│   │       ├── mod.rs       # wasm-bindgen exports
│   │       ├── bindings.rs  # JS ↔ Rust type conversion
│   │       └── error_handling.rs # Convert Rust errors to JS exceptions
│   ├── lib.rs               # ✏️ MODIFIED: Expose domain as library (not just binary)
│   └── main.rs              # ⏸️ HTTP server (unaffected, remains for backend)
├── Cargo.toml               # ✏️ MODIFIED: Add wasm-bindgen, conditional dependencies
├── Cargo-wasm.toml          # 🆕 NEW: WASM-specific build config (or use features)
└── tests/
    ├── unit/                # ✅ Existing domain tests (must pass in WASM)
    ├── integration/         # ⏸️ HTTP API tests (unaffected)
    └── wasm/                # 🆕 NEW: WASM-specific tests (wasm-pack test)

frontend/
├── src/
│   ├── services/
│   │   ├── score-api.ts     # ❌ DEPRECATED: Replace with WASM calls
│   │   ├── wasm/            # 🆕 NEW: WASM loader & wrapper (Phase 1)
│   │   │   ├── loader.ts    # Async WASM module loading
│   │   │   ├── music-engine.ts # TypeScript wrapper for WASM exports
│   │   │   └── types.ts     # Type definitions matching WASM exports
│   │   └── import/
│   │       └── MusicXMLImportService.ts # ✏️ MODIFIED: Use WASM instead of fetch()
│   ├── types/
│   │   └── score.ts         # ✅ Domain types (unchanged - remain the contract)
│   └── components/          # ⚠️ MODIFIED: Replace API client with WASM wrapper
├── public/
│   └── wasm/                # 🆕 NEW: WASM artifacts copied during build
│       ├── musicore_bg.wasm # Generated WASM binary
│       └── musicore.js      # Generated JS glue code
├── vite.config.ts           # ✏️ MODIFIED: Copy WASM files, configure MIME types
└── tests/
    ├── integration/         # ✏️ MODIFIED: Tests must pass with WASM backend
    └── wasm/                # 🆕 NEW: WASM integration tests

.github/
└── workflows/
    └── wasm-build.yml       # 🆕 NEW: CI pipeline for WASM build
```

**Structure Decision**: Web application monorepo with backend Rust code compiled to WASM. Key changes:
1. **Backend**: Add `src/adapters/wasm/` for wasm-bindgen exports (hexagonal adapter pattern)
2. **Frontend**: Add `src/services/wasm/` for WASM loading and TypeScript wrapper
3. **Build**: WASM files generated in `backend/target/wasm32-unknown-unknown/release/`, copied to `frontend/public/wasm/`
4. **Tests**: WASM-specific test suites in both backend (`wasm-pack test`) and frontend (Vitest)

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **API-First principle** - Eliminating REST API for music operations | Performance requirement: <100ms parse time (REST adds 200-500ms network latency). Offline capability: Users must work without connectivity. | Keeping REST API: Would require maintaining both WASM and HTTP implementations. Caching REST responses: Cannot handle offline scenarios. Service Worker proxy: Adds complexity without solving latency. |
| **New build pipeline** - wasm-pack, WASM artifact copying | WASM requires separate compilation target (wasm32-unknown-unknown). Rust → WASM requires wasm-bindgen for JS interop. | Using existing Cargo build: Cannot produce WASM binaries. Manual wasm-bindgen setup: wasm-pack automates best practices (optimization, size reduction). |
| **Dual test environments** - Native Rust tests + WASM browser tests | Must validate domain logic in native environment (faster feedback) AND validate WASM binary works in browser (catches platform-specific issues). | Native tests only: Won't catch WASM-specific issues (memory management, serialization). Browser tests only: Slow feedback loop for TDD. |

**Justification Summary**: Complexity added is necessary to achieve the feature requirements (performance, offline capability). The architectural shift from API-First to WASM-First is documented as an intentional evolution with clear trade-offs accepted (see Constitution Check section).
