<!--
SYNC IMPACT REPORT - Constitution v2.0.0
Generated: 2026-02-10

VERSION CHANGE: 1.0.0 → 2.0.0
BUMP RATIONALE: MAJOR - Backward incompatible architectural shift from API-First to PWA-First architecture

PRINCIPLES MODIFIED:
  ✓ I. Domain-Driven Design (UNCHANGED)
  ✓ II. Hexagonal Architecture (UNCHANGED)
  ⚠️ III. API-First Development → III. Progressive Web Application Architecture (REPLACED)
      - BREAKING: Removes mandate for REST API as primary integration point
      - NEW: Establishes PWA, WASM, and tablet-first as architectural foundations
      - REASON: Eliminates network latency, enables offline capability, targets tablet platform
  ✓ IV. Precision & Fidelity (UNCHANGED)
  ✓ V. Test-First Development (UNCHANGED)

TECHNICAL STANDARDS UPDATES:
  + Target Platform: Explicitly defined as tablet devices (iPad, Surface, Android tablets)
  + Technology Stack: Added WASM compilation requirement (wasm-pack, wasm-bindgen)
  + Performance Constraints: Added offline capability and instant response requirements

TEMPLATE CONSISTENCY STATUS:
  ⚠️ plan-template.md - REQUIRES UPDATE
      - Constitution Check section must reflect new Principle III (PWA Architecture)
      - Target Platform line should mention tablet focus
      - Update example gates from "API-First" to "PWA Architecture"
  
  ⚠️ spec-template.md - MINOR UPDATE NEEDED
      - User story examples should emphasize offline scenarios where applicable
      - No structural changes required
  
  ⚠️ tasks-template.md - MINOR UPDATE NEEDED
      - Remove references to "API routing" in example tasks
      - Add WASM build tasks in examples where relevant
  
  ✅ checklist-template.md - No changes needed (principle-agnostic)
  ✅ agent-file-template.md - No changes needed (principle-agnostic)

EXISTING FEATURES REQUIRING MIGRATION GUIDANCE:
  ⚠️ specs/001-score-model/ - References API-First in plan.md (60+ mentions)
  ⚠️ specs/002-staff-notation-view/ - Constitution Check validates API-First
  ⚠️ specs/004-save-load-scores/ - Plan assumes REST API integration
  ⚠️ specs/005-chord-symbols/ - API-First exemption documented
  ⚠️ specs/006-musicxml-import/ - Constitution Check passes API-First gate
  ⚠️ specs/007-clef-notation/ - Minimal API enhancement noted
  ⚠️ specs/008-tempo-change/ - API-First validated as "no backend changes"
  ⚠️ specs/009-playback-scroll-highlight/ - Preserves API-First development
  ⚠️ specs/010-stacked-staves-view/ - API-First Development passes
  ✅ specs/011-wasm-music-engine/ - ALREADY ALIGNED (⚠️ ARCHITECTURAL SHIFT documented)
  
  MIGRATION STRATEGY: 
    - Existing features remain valid as implemented (REST API is not removed)
    - NEW features starting 2026-02-10 onwards default to WASM-first approach
    - Constitution Check in new features validates PWA Architecture (Principle III) instead of API-First
    - Legacy "API-First" references in old plans are historical and need not be updated

FOLLOW-UP TODOS:
  1. Update .specify/templates/plan-template.md Constitution Check section (replace III. API-First with III. PWA Architecture)
  2. Add tablet/PWA guidance to plan-template.md Target Platform examples
  3. Review tasks-template.md and replace API routing examples with WASM build examples
  4. Document PWA manifest and service worker requirements in a new guide (optional)
  5. Consider adding WASM build verification to CI/CD pipeline (optional)

DEPRECATION NOTICE:
  - REST API endpoints for music domain operations are NOT removed but are considered legacy
  - Future features should use WASM bindings instead of REST API for music operations
  - Non-music operations (authentication, file storage, collaboration) may still use REST API
-->

# Musicore Constitution

## Core Principles

### I. Domain-Driven Design

The Music Timeline and all music entities MUST be modeled using Domain-Driven Design principles:

- **Ubiquitous Language**: All code, documentation, and discussions use consistent music domain terminology (Timeline, Event, Structural Event, Interval Event, PPQ, etc.)
- **Bounded Contexts**: Clear separation between music engine core domain and infrastructure concerns
- **Aggregates**: Timeline acts as the aggregate root; all event modifications go through the Timeline
- **Entity Modeling**: Music concepts are first-class domain entities, not data structures

**Rationale**: Music editing requires deep domain understanding; technical abstractions must not leak into the problem space. DDD ensures the codebase speaks the language of musicians and music theory.

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
- **Offline-First**: Core music editing operations (parsing, score manipulation, playback) function without network connectivity
- **PWA Requirements**: Web app manifest, service worker for offline support, installable, responsive design optimized for tablet form factors
- **Client-Side Processing**: Domain logic (MusicXML parsing, score validation, music operations) runs locally via WASM module
- **Contract Definition**: TypeScript interfaces define contracts between WASM module and frontend (similar to API contracts)

**Rationale**: Tablet devices are the primary goal platform for Musicore music editing workflows. WASM enables deploying the Rust music engine directly in the browser, eliminating network latency (<100ms parse times vs 200-500ms with REST API) and enabling offline capability. PWA architecture provides app-like experience with instant loading and offline support while maintaining web distribution simplicity and avoiding app store friction.

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

**Rationale**: Music editor correctness is critical—wrong timing or event handling breaks user trust. Tests document behavior, prevent regressions, and validate hexagonal boundaries.

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

- **Frontend Responsiveness**: User edits MUST reflect UI feedback within 16ms (60fps target)
- **WASM Operations**: Core music operations (parse, validate, transform) MUST complete within 100ms for typical scores
- **Offline Capability**: Music editing operations (create score, add notes, parse MusicXML, playback) MUST work without network connectivity
- **Timeline Size**: Music engine MUST handle scores with 10,000+ events without degradation
- **WASM Bundle Size**: Module bundle SHOULD be <500KB gzipped for fast initial load on tablets
- **Tablet Optimization**: Touch targets minimum 44×44px, gesture-friendly controls, portrait/landscape support

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

**Version**: 2.0.0 | **Ratified**: 2026-02-06 | **Last Amended**: 2026-02-10
