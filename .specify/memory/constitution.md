<!--
SYNC IMPACT REPORT - Constitution v2.3.0
Generated: 2026-02-14

VERSION CHANGE: 2.2.0 → 2.3.0
BUMP RATIONALE: MINOR - Added new Principle VI (Layout Engine Authority) establishing separation of concerns between layout calculation and rendering

PRINCIPLES STATUS:
  ✓ I. Domain-Driven Design (UNCHANGED)
  ✓ II. Hexagonal Architecture (UNCHANGED)
  ✓ III. Progressive Web Application Architecture (UNCHANGED)
  ✓ IV. Precision & Fidelity (UNCHANGED)
  ✓ V. Test-First Development (UNCHANGED)
  + VI. Layout Engine Authority (NEW) - Establishes layout as sole authority over spatial geometry

NEW PRINCIPLE ADDITIONS:
  + VI. Layout Engine Authority - Layout engine calculates all spatial geometry (positions, spacing, bounding boxes)
      - Renderer prohibited from modifying logical coordinates
      - All hit-testing uses layout-provided geometry
      - Visual transforms (scale, translate, pixel snapping) permitted if they don't alter logical coordinates
      - Rationale: Deterministic rendering, single source of truth, testable layout logic independent of UI

ARCHITECTURAL IMPACT:
  + Reinforces Hexagonal Architecture (Principle II) by clarifying renderer as infrastructure adapter
  + Supports PWA Architecture (Principle III) by enabling WASM-based layout calculation
  + Enhances testability aligned with Test-First Development (Principle V)
  + Backend layout module (Rust) computes geometry; frontend renderer (React/SVG) displays only

TEMPLATE CONSISTENCY STATUS:
  ⚠️ plan-template.md - REQUIRES UPDATE
      - Add Principle VI (Layout Engine Authority) to Constitution Check section
      - Update examples to show layout geometry separation
  
  ⚠️ spec-template.md - MINOR UPDATE NEEDED
      - Add guidance on layout vs rendering concerns in technical approach
  
  ⚠️ tasks-template.md - MINOR UPDATE NEEDED
      - Split layout calculation tasks from rendering tasks where applicable
  
  ✅ checklist-template.md - No changes needed (principle-agnostic)
  ✅ agent-file-template.md - No changes needed (principle-agnostic)

EXISTING FEATURES IMPACT:
  ✅ specs/018-rust-layout-engraving/ - ALREADY COMPLIANT (layout engine in Rust, renderer in React)
      - Phase 5 implementation (2026-02-14) moved bracket geometry calculation from renderer to layout engine
      - Demonstrates Principle VI compliance pattern
  ⚠️ specs/002-staff-notation-view/ - May contain renderer-side layout calculations (audit recommended)
  ⚠️ specs/010-stacked-staves-view/ - May compute positioning in renderer (audit recommended)
  
  MIGRATION STRATEGY:
    - New features MUST compute geometry in backend layout module
    - Existing features should be audited and refactored to comply when modified
    - Renderer code reviews MUST verify no geometry calculations present

FOLLOW-UP TODOS:
  1. Audit existing renderer code (StaffNotationView, StackedStavesView) for geometry calculations
  2. Update template files to reflect Principle VI
  3. Document layout/renderer boundary in architecture docs
  4. Add layout engine compliance check to PR review checklist

COMPLIANCE PATTERNS:
  ✅ CORRECT: Backend calculates {x, y, width, height, scale} → Frontend renders at provided coordinates
  ❌ VIOLATION: Frontend calculates centerY, gap offsets, bounding boxes → Backend receives renderer decisions
  ✅ PERMITTED: Frontend applies CSS transforms, viewport zooming, pixel-perfect snapping (does not modify logical geometry)
-->

# Musicore Constitution

## Project Context

**Musicore** is a tablet-native app for interactive scores, designed for practice and performance. The application empowers musicians with dynamic score interaction—high-fidelity display, real-time annotations, playback integration, and performance assistance. Interactive scores respond to user input, adapt to practice needs, and enhance live performance workflows. While score manipulation capabilities exist, they serve interactive engagement rather than full composition/engraving.

**Target Users**: Musicians (students, professionals, hobbyists, ensembles) using tablets for practice sessions, rehearsals, and live performances.

**Core Scenarios**: Interactive score reading, real-time annotations (fingerings/bowings/markings), playback/tempo integration, repeat/navigation aids, hands-free page turns, performance mode display, annotation sync across devices, ensemble part viewing.

**Non-Goals**: Full music notation editor/engraver (e.g., Finale/Sibelius replacement), professional publishing/typesetting, orchestral score layout tools, composition-focused workflows.

---

## Core Principles

### I. Domain-Driven Design

The Music Timeline and all music entities MUST be modeled using Domain-Driven Design principles:

- **Ubiquitous Language**: All code, documentation, and discussions use consistent music domain terminology (Timeline, Event, Structural Event, Interval Event, PPQ, etc.)
- **Bounded Contexts**: Clear separation between music engine core domain and infrastructure concerns
- **Aggregates**: Timeline acts as the aggregate root; all event modifications go through the Timeline
- **Entity Modeling**: Music concepts are first-class domain entities, not data structures

**Rationale**: Interactive score platforms require deep domain understanding of notation, performance techniques, and musical workflows. Technical abstractions must not leak into the problem space. DDD ensures the codebase speaks the language of musicians and music theory, whether displaying scores, processing annotations, or providing practice and performance assistance.

---

### II. Hexagonal Architecture

The backend MUST follow hexagonal (ports & adapters) architecture:

- **Core Domain**: Music Timeline logic is independent of frameworks, databases, and UI
- **Ports**: Define interfaces for what the domain needs (persistence, events) and offers (commands, queries)
- **Adapters**: External systems (WASM bindings, storage) connect via adapters implementing ports
- **Dependency Rule**: Dependencies flow inward—core domain has zero external dependencies

**Rationale**: Music engine core must be technology-agnostic and testable in isolation. Architecture enables library-first development and prevents framework coupling. WASM bindings act as an adapter layer, preserving hexagonal boundaries.

---

### III. Progressive Web Application Architecture

The application MUST be architected as a Progressive Web Application (PWA) targeting tablet devices:

- **Target Platform**: Tablet devices (iPad, Surface, Android tablets) with modern browser support
- **WASM Deployment**: Rust music engine compiled to WebAssembly and executed in-browser via wasm-pack
- **Offline-First**: Core interactive score operations (score parsing, display rendering, annotation, playback, performance aids) function without network connectivity
- **PWA Requirements**: Web app manifest, service worker for offline support, installable, responsive design optimized for tablet form factors
- **Client-Side Processing**: Domain logic (MusicXML parsing, score validation, annotation processing, interactive utilities) runs locally via WASM module
- **Contract Definition**: TypeScript interfaces define contracts between WASM module and frontend (similar to API contracts)

**Rationale**: Tablet devices are the primary platform for interactive scores during practice and performance. Musicians require instant score loading, offline capability (rehearsal spaces and performance venues often lack reliable WiFi), and app-like experience. WASM enables deploying the Rust music engine directly in the browser, eliminating network latency (<100ms parse times vs 200-500ms with REST API) critical for seamless musical workflows. PWA architecture provides installable, offline-capable experience while maintaining web distribution simplicity and avoiding app store friction.

---

### IV. Precision & Fidelity

Music Timeline MUST operate at 960 PPQ (pulses per quarter note) resolution without precision loss:

- **Fixed Resolution**: 960 PPQ is immutable; no runtime resolution changes allowed
- **Integer Arithmetic**: All timing calculations use integer pulse counts—no floating-point timing
- **Structural Events**: Events without duration (time signature, tempo changes) anchored at exact pulse positions
- **Interval Events**: Events with duration (notes, chords) span exact pulse ranges

**Rationale**: Music timing is non-negotiable. Floating-point errors accumulate and destroy rhythmic accuracy. 960 PPQ is a MIDI standard that supports common musical subdivisions (triplets, 16th notes, 32nds).

---

### V. Test-First Development (NON-NEGOTIABLE)

All features follow strict Test-Driven Development:

- **Red-Green-Refactor**: Write test → Verify it fails → Implement → Verify it passes → Clean up
- **No Code Without Tests**: Implementation PRs without corresponding tests are rejected
- **Contract Tests**: API endpoints require contract tests (backend provides what frontend expects)
- **Domain Tests**: Core music logic tested in isolation without infrastructure dependencies

**Rationale**: Interactive score correctness is critical—wrong timing, notation display errors, or annotation failures break user trust during practice and performance. Tests document behavior, prevent regressions, and validate hexagonal boundaries.

---

### VI. Layout Engine Authority

The layout engine MUST be the sole authority over spatial geometry, with strict separation from rendering:

- **Single Source of Truth**: Layout engine (backend Rust module) calculates all spatial geometry: positions (x, y coordinates), spacing, bounding boxes, collision results, and element relationships
- **Renderer Prohibition**: Renderer (frontend React/SVG components) MUST NOT modify, calculate, or derive logical coordinates, spacing, bounding boxes, or any spatial relationships
- **Permitted Transforms**: Renderer MAY apply visual transforms (CSS scale, translate, pixel snapping for display sharpness) that do NOT alter logical coordinates exported by layout engine
- **Hit-Testing Authority**: All hit-testing, collision detection, and spatial queries MUST use geometry provided by layout engine; renderer cannot perform its own spatial calculations

**Rationale**: Deterministic rendering and single source of truth prevent renderer-specific bugs and enable testable layout logic independent of UI framework. Layout calculations in backend Rust are unit-testable with exact assertions, while renderer calculations would require integration tests with browser quirks. Separation supports hexagonal architecture (Principle II) by treating renderer as pure infrastructure adapter that displays geometry without making spatial decisions. Enables WASM-based layout (Principle III) to provide complete geometric data to any renderer implementation.

---

## Technical Standards

### Technology Stack

- **Backend**: Rust (latest stable), Cargo workspace
- **WASM Compilation**: wasm-pack (latest), wasm-bindgen (for JS interop), target web
- **Frontend**: React 18+, TypeScript, modern bundler (Vite/Webpack with WASM support)
- **Target Platform**: Tablet devices (iPad Pro, Surface Pro, Android tablets: Samsung Galaxy Tab, etc.) - Chrome 57+, Safari 11+, Edge 16+
- **PWA Infrastructure**: Web app manifest, service worker, IndexedDB for offline storage, responsive CSS (tablet-optimized breakpoints)
- **Repository**: Monorepo with `backend/` (Rust domain + WASM bindings) and `frontend/` (React PWA) directories
- **Package Management**: Cargo for Rust, npm/pnpm/yarn for JavaScript
- **Commit Conventions**: Conventional Commits (feat, fix, docs, refactor, test, chore)

### Code Quality

- **Rust**: Clippy lints enforced; `cargo fmt` on save; no `unsafe` without justification
- **React**: ESLint + Prettier configured; prop types or TypeScript strict mode
- **Documentation**: Public API surfaces documented (Rust doc comments, JSDoc/TSDoc)
- **Error Handling**: Rust `Result` types propagated; frontend errors shown with actionable messages

### Performance Constraints

- **Frontend Responsiveness**: User interactions (page turns, annotations, zoom) MUST reflect UI feedback within 16ms (60fps target)
- **WASM Operations**: Core music operations (parse, validate, annotation processing) MUST complete within 100ms for typical scores
- **Score Display**: Initial score rendering MUST complete within 200ms for session start (practice/performance)
- **Offline Capability**: All interactive score features (score display, annotations, playback, metronome, performance aids) MUST work without network connectivity
- **Timeline Size**: Music engine MUST handle scores with 10,000+ events (large orchestral works, multi-movement pieces) without degradation
- **WASM Bundle Size**: Module bundle SHOULD be <500KB gzipped for fast initial load on tablets
- **Tablet Optimization**: Touch targets minimum 44×44px, gesture-friendly controls (pinch-zoom, swipe page turns), portrait/landscape support, legible notation at arm's length viewing distance

---

## Development Workflow

### Branching Strategy

- **Main Branch**: `main` is always deployable; protected with required reviews
- **Feature Branches**: All work happens in `feature/###-short-description` branches
- **PR Requirements**: Pull requests MUST include tests, pass CI, and update relevant specs

### Review Process

- **Code Reviews**: All PRs require at least one approval before merge
- **Constitution Compliance**: Reviewers verify adherence to principles (DDD, hexagonal, test-first)
- **Breaking Changes**: Any API contract changes flagged in PR description and require team discussion

### Quality Gates

- **CI Pipeline**: Tests (unit, integration, contract), lints, format checks
- **Test Coverage**: Not a hard threshold, but all critical paths MUST have test coverage
- **Benchmarks**: Performance-sensitive code includes benchmarks where applicable

---

## Governance

This constitution supersedes all other development practices. Amendments require:

1. Documentation of proposed change with rationale
2. Team review and approval via PR to constitution file
3. Migration plan for affected code/specs if principle changes impact existing features

**Compliance Verification**: All PRs and code reviews MUST verify adherence to principles. Violations require explicit justification in commit messages or PR descriptions.

**Complexity Budget**: Introducing complexity (new dependencies, architecture patterns) requires demonstrating alignment with constitution or requesting an amendment.

**Runtime Guidance**: For implementation-specific guidance during feature development, refer to `.github/agents/` files (e.g., `speckit.implement.agent.md`).

---

**Version**: 2.3.0 | **Ratified**: 2026-02-06 | **Last Amended**: 2026-02-14
