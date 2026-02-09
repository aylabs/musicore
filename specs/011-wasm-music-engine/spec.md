# Feature Specification: WASM Music Engine Integration

**Feature Branch**: `011-wasm-music-engine`  
**Created**: 2026-02-09  
**Status**: Draft  
**Input**: User description: "compile Rust music engine to wasm and use it in the frontend instead of the API REST"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Score Parsing (Priority: P1)

When a user uploads a MusicXML file, the score is parsed instantly in the browser without waiting for server responses. The user sees their notation rendered immediately with no network latency.

**Why this priority**: This is the core value proposition - eliminating network round-trips for the most common operation (loading scores). Provides immediate user feedback and significantly improves perceived performance.

**Independent Test**: Can be fully tested by uploading a MusicXML file and measuring time to render. Delivers immediate value by making the app feel responsive. Success means sub-100ms parse times for typical scores.

**Acceptance Scenarios**:

1. **Given** user has a MusicXML file, **When** they upload it, **Then** the score is parsed and rendered in under 100ms (excluding rendering time)
2. **Given** user uploads an invalid MusicXML file, **When** parsing occurs, **Then** clear validation errors are shown immediately without server involvement
3. **Given** user uploads a large score (100+ measures), **When** parsing occurs, **Then** parse time remains under 500ms

---

### User Story 2 - Offline Score Editing (Priority: P2)

When a user loses internet connection or works offline intentionally, they can continue to load, edit, and play scores without any degradation in functionality. All music domain logic runs locally.

**Why this priority**: Enables true offline-first architecture. Users can work on planes, trains, or locations with poor connectivity. Represents a significant UX improvement over requiring constant server connectivity.

**Independent Test**: Disconnect from network, upload and play scores, verify all functionality works. Delivers value by enabling work in disconnected scenarios.

**Acceptance Scenarios**:

1. **Given** user is offline, **When** they upload a MusicXML file, **Then** it parses and displays correctly
2. **Given** user is offline, **When** they trigger playback, **Then** audio synthesis works without errors
3. **Given** user is working offline, **When** they reload the page, **Then** previously loaded scores are still accessible (via IndexedDB/localStorage)

---

### User Story 3 - Reduced Server Load (Priority: P3)

When multiple users are using the application simultaneously, server resources are conserved because music parsing and domain validation happen in browsers. This enables scaling to more users without proportionally increasing server costs.

**Why this priority**: Business value - reduced infrastructure costs and improved scalability. Lower priority because it's primarily a technical/business benefit rather than direct user-facing value.

**Independent Test**: Load test with 100 concurrent users, measure server CPU usage compared to REST API baseline. Delivers value by reducing hosting costs.

**Acceptance Scenarios**:

1. **Given** 100 concurrent users parsing scores, **When** monitoring server metrics, **Then** server CPU usage is <20% of REST API baseline
2. **Given** server experiences high load, **When** users parse scores, **Then** performance is not impacted (WASM runs client-side)
3. **Given** cold start scenario, **When** first user accesses app, **Then** no server warmup is needed for music parsing

---

### Edge Cases

- What happens when WASM module fails to load (network error, incompatible browser)?
- How does the system handle very large scores (1000+ measures) in-browser?
- What occurs when browser runs out of memory during score parsing?
- How are validation errors from WASM surfaced to the frontend?
- What happens when user's browser doesn't support WebAssembly?
- How do we handle version mismatches between WASM module and frontend expectations?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compile Rust music engine to WebAssembly targeting web browsers
- **FR-002**: Frontend MUST load WASM module asynchronously without blocking UI rendering
- **FR-003**: System MUST parse MusicXML files entirely in the browser using WASM
- **FR-004**: System MUST perform all domain model validation (voice overlap detection, tick validation) in WASM
- **FR-005**: Frontend MUST handle WASM loading failures gracefully with fallback messaging
- **FR-006**: System MUST expose JavaScript-compatible API from WASM module for all music operations
- **FR-007**: System MUST serialize/deserialize Score domain aggregates between JavaScript and WASM
- **FR-008**: System MUST maintain identical validation logic between WASM and backend (single source of truth)
- **FR-009**: Frontend MUST cache loaded WASM module for subsequent page loads
- **FR-010**: System MUST support all current API operations (parse, validate, get score) via WASM
- **FR-011**: System MUST provide error messages from WASM in user-friendly format (not Rust panic traces)
- **FR-012**: System MUST detect browsers without WASM support and display informative message

### Key Entities *(include if feature involves data)*

- **WASM Module**: Compiled Rust binary containing music domain logic, exposes JavaScript API
- **Score Representation**: Serializable format for passing Score aggregates between JavaScript and WASM (JSON)
- **Validation Result**: Contains success/failure status and detailed error messages from domain validation
- **Parser Context**: WASM-side state for tracking MusicXML parsing progress and errors

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Score parsing completes in under 100ms for typical files (50-200 measures) measured in-browser
- **SC-002**: Music processing capabilities load in under 500ms on first page load (bundle size <500KB gzipped)
- **SC-003**: All existing integration tests pass with new implementation (100% functional parity with previous architecture)
- **SC-004**: Application functions identically offline and online (no network-dependent features for core music operations)
- **SC-005**: Server CPU usage reduces by 80%+ for music parsing operations compared to previous architecture
- **SC-006**: Zero server-side parsing requests in production metrics after migration
- **SC-007**: 95%+ of browser sessions successfully load music processing capabilities (tracking via telemetry)

## Assumptions & Dependencies *(mandatory)*

### Assumptions

- Users have modern browsers with WebAssembly support (Chrome 57+, Firefox 52+, Safari 11+, Edge 16+)
- Current Rust music engine code can compile to wasm32-unknown-unknown target without major refactoring
- Rust crate dependencies support WebAssembly compilation
- MusicXML files are typically under 2MB in size
- Browser memory limits (typically 2-4GB) are sufficient for score parsing operations
- Network latency currently impacts user experience negatively (worth eliminating)

### Dependencies

- Rust toolchain with WebAssembly target installed
- wasm-bindgen or similar tool for generating JavaScript bindings
- Build pipeline modifications to produce WASM artifacts
- Current REST API remains available during transition period (for graceful degradation)
- Frontend build system supports WASM module loading

### Out of Scope

- Server-side features remain on REST API (file storage, user authentication, collaboration)
- Audio synthesis/playback logic (currently handled by Tone.js, not affected by this change)
- Mobile app native implementations (this feature targets web browsers only)
- Real-time collaborative editing (requires server coordination)
- Migration of existing user scores (data format remains unchanged)
