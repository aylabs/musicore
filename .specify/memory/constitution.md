<!--
SYNC IMPACT REPORT - Constitution v1.0.0
Generated: 2026-02-06

VERSION CHANGE: Initial constitution → 1.0.0
BUMP RATIONALE: First formal ratification of project principles

PRINCIPLES ESTABLISHED:
  ✓ I. Domain-Driven Design
  ✓ II. Hexagonal Architecture  
  ✓ III. API-First Development
  ✓ IV. Precision & Fidelity
  ✓ V. Test-First Development (NON-NEGOTIABLE)

NEW SECTIONS ADDED:
  ✓ Technical Standards
  ✓ Development Workflow

TEMPLATE CONSISTENCY STATUS:
  ✅ plan-template.md - Constitution Check aligned (Phase gates)
  ✅ spec-template.md - Requirement structure supports DDD/API-first
  ✅ tasks-template.md - Test-first workflow integrated (tests before impl)
  ✅ checklist-template.md - To verify alignment
  ✅ agent-file-template.md - To verify alignment

FOLLOW-UP TODOS:
  - None - all placeholders filled with project-specific values
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
- **Adapters**: External systems (HTTP API, storage) connect via adapters implementing ports
- **Dependency Rule**: Dependencies flow inward—core domain has zero external dependencies

**Rationale**: Music engine core must be technology-agnostic and testable in isolation. Architecture enables library-first development and prevents framework coupling.

---

### III. API-First Development

Backend and frontend are developed independently with contracts as the integration point:

- **Backend Exposes API**: Music Timeline operations exposed via well-defined REST/GraphQL endpoints
- **Frontend Consumes API**: React frontend retrieves score data exclusively through backend API
- **Contract Tests**: API contracts validated before implementation (consumer/provider pattern)
- **API Versioning**: Breaking changes require MAJOR version bump; backward compatibility preferred

**Rationale**: Monorepo does not mean monolith. Clear API boundaries enable parallel development, independent testing, and future client diversity (CLI, mobile, etc.).

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
- **Frontend**: React 18+, TypeScript, modern bundler (Vite/Webpack)
- **Repository**: Monorepo with `backend/` and `frontend/` directories
- **Package Management**: Cargo for Rust, npm/pnpm/yarn for JavaScript
- **Commit Conventions**: Conventional Commits (feat, fix, docs, refactor, test, chore)

### Code Quality

- **Rust**: Clippy lints enforced; `cargo fmt` on save; no `unsafe` without justification
- **React**: ESLint + Prettier configured; prop types or TypeScript strict mode
- **Documentation**: Public API surfaces documented (Rust doc comments, JSDoc/TSDoc)
- **Error Handling**: Rust `Result` types propagated; frontend errors shown with actionable messages

### Performance Constraints

- **Frontend Responsiveness**: User edits MUST reflect UI feedback within 16ms (60fps target)
- **API Latency**: Backend operations SHOULD complete within 100ms for simple queries
- **Timeline Size**: Backend MUST handle scores with 10,000+ events without degradation

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

**Version**: 1.0.0 | **Ratified**: 2026-02-06 | **Last Amended**: 2026-02-06
