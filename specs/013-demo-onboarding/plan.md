# Implementation Plan: Demo Music Onboarding

**Branch**: `013-demo-onboarding` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/013-demo-onboarding/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement first-run onboarding with pre-loaded Canon D demo music and default stacked view mode to eliminate setup friction for new users. This feature detects first launch, automatically loads Pachelbel's Canon in D from bundled MusicXML assets into the music library, sets view mode to stacked (showing all instruments), and persists view mode preference across sessions. Musicians will be able to start playing with a real score within 5 seconds of launching the app for the first time, experiencing all core features (playback, tempo control, score viewing) without needing to find or import music.

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend), Rust 1.75+ (backend WASM module - limited changes)  
**Primary Dependencies**: 
- Existing: React 19.2, Vite 7.3, WASM music engine (Feature 011), local-storage service (Feature 011), stacked view components (Feature 010)
- New: None (uses existing infrastructure)
**Storage**: Browser Local Storage (for first-run flag and view mode preference), IndexedDB (for demo score storage, already implemented in Feature 011)  
**Testing**: Vitest (unit tests for first-run detection, view mode persistence), React Testing Library (integration tests for onboarding flow), manual testing on fresh browser profiles  
**Target Platform**: Tablet devices (iPad, Surface, Android) running modern browsers with Local Storage and IndexedDB support  
**Project Type**: Web application (PWA) - frontend enhancement to existing React app  
**Performance Goals**: 
- First launch to playable Canon D: <5 seconds
- Demo score bundle size: <500KB (single MusicXML file)
- First-run detection latency: <10ms (synchronous localStorage read)
- View mode restoration latency: <10ms (synchronous localStorage read)
- Score parsing and render: <3 seconds (reuses existing WASM parser from Feature 011)
**Constraints**: 
- Offline-capable (must work without network, bundled asset)
- Browser local storage limits (typically 5-10MB, more than sufficient for preferences)
- IndexedDB quota (Canon D ~200KB MusicXML, well within limits)
- iOS Safari localStorage persistence (works reliably in standalone PWA mode from Feature 012)
- Must not interfere with user's imported music library
**Scale/Scope**: 
- 1 bundled MusicXML file (Canon D, ~200KB)
- First-run detection logic (~50 lines TypeScript)
- View mode persistence service (~100 lines TypeScript)
- Onboarding initialization hook (~150 lines TypeScript)
- Demo loader utility (~80 lines TypeScript)
- Optional: "Reload Demo" UI component (~100 lines TypeScript/React)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Domain-Driven Design ✅ PASS

**Status**: Compliant  
**Justification**: Onboarding and user preferences are application-layer concerns, not music domain logic. The feature adds infrastructure for first-run detection and preference storage without modifying domain entities (Score, Instrument, Note, Timeline, etc.). Canon D is loaded as a standard Score entity through existing domain interfaces. View mode preference is a UI state concern correctly separated from domain models.

**Action Required**: None

---

### II. Hexagonal Architecture ✅ PASS

**Status**: Compliant  
**Justification**: Feature respects hexagonal boundaries:
- First-run detection and preference storage are adapters using browser Local Storage (port: persistence)
- Demo score loading uses existing domain ports (Score repository from Feature 011)
- View mode state management is UI layer infrastructure
- Domain core (WASM music engine) remains unmodified and independent of onboarding logic
- Canon D MusicXML is parsed through same domain ports as user-imported files

**Action Required**: None

---

### III. Progressive Web Application Architecture ✅ PASS

**Status**: Compliant  
**Justification**: Feature enhances PWA user experience on tablets:
- ✅ Offline-First: Canon D bundled with app (available offline via service worker from Feature 012)
- ✅ PWA Requirements: Improves installable app first-run experience on tablets
- ✅ Client-Side Processing: Demo loading and view mode persistence use browser storage (no network required)
- ✅ Target Platform: Optimized for tablet first-run experience (large screen, stacked view default)
- Enhances PWA value proposition by removing setup friction on tablet installation

**Action Required**: None

---

### IV. Precision & Fidelity ✅ PASS

**Status**: Compliant  
**Justification**: Onboarding infrastructure does not touch music timing or 960 PPQ calculations. Canon D MusicXML is parsed through existing WASM engine (Feature 011) which maintains precision. View mode preference is UI presentation logic with no impact on domain timing fidelity.

**Action Required**: None

---

### V. Test-First Development ✅ PASS

**Status**: Compliant  
**Justification**: Testing strategy defined in spec.md and will be detailed in tasks.md:
- Unit tests for first-run detection logic (localStorage read/write)
- Unit tests for view mode persistence service
- Integration tests for onboarding flow (fresh install → Canon D loaded → stacked view active)
- Mock localStorage in tests for deterministic first-run simulation
- Manual testing on fresh browser profiles/devices for real-world validation
- All acceptance scenarios from spec.md have corresponding test cases

**Action Required**: Write tests before implementation (TDD workflow)

## Project Structure

### Documentation (this feature)

```text
specs/013-demo-onboarding/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/
├── public/
│   └── demo/                           # NEW: Bundled demo assets
│       └── CanonD.musicxml             # NEW: Canon D MusicXML file (~200KB)
├── src/
│   ├── services/
│   │   ├── storage/
│   │   │   └── preferences.ts          # NEW: View mode preference persistence
│   │   ├── onboarding/
│   │   │   ├── firstRunDetection.ts    # NEW: First-run detection logic
│   │   │   └── demoLoader.ts           # NEW: Canon D bundled asset loader
│   │   └── wasm/
│   │       └── music-engine.ts         # MODIFIED: Add demo score loading support
│   ├── hooks/
│   │   └── useOnboarding.ts            # NEW: React hook for onboarding initialization
│   ├── components/
│   │   └── demo/
│   │       └── ReloadDemoButton.tsx    # NEW: Optional "Load Demo" UI (P3)
│   └── App.tsx                         # MODIFIED: Initialize onboarding on mount
└── tests/
    ├── unit/
    │   ├── firstRunDetection.test.ts   # NEW: First-run detection tests
    │   ├── preferences.test.ts         # NEW: View mode persistence tests
    │   └── demoLoader.test.ts          # NEW: Demo asset loading tests
    └── integration/
        └── onboarding-flow.test.tsx    # NEW: End-to-end onboarding test

backend/                                 # NO CHANGES (demo loaded client-side)
```

**Structure Decision**: Web application structure (Option 2). This feature is primarily frontend enhancement for user onboarding experience. Canon D MusicXML is bundled as a static asset in `frontend/public/demo/` and loaded client-side via existing WASM parser. View mode preference and first-run state persist in browser Local Storage using new service modules. No backend changes required since demo loading reuses existing WASM music engine bindings from Feature 011.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: No violations - Constitution Check fully passes (all gates ✅). No complexity justification required.

---

## Post-Design Constitution Re-Evaluation

*Re-evaluated after Phase 1 design completion (research, data-model, contracts, quickstart)*

### I. Domain-Driven Design ✅ PASS (RE-CONFIRMED)

**Post-Design Validation**: 
- ✅ Domain entities (Score, Instrument, Note, Timeline) remain unchanged
- ✅ Demo score uses existing Score entity model (no new domain concepts)
- ✅ First-run and view mode handling correctly isolated to application/infrastructure layers
- ✅ Contracts use technology-agnostic interfaces (ports), not implementation details
- ✅ Ubiquitous language maintained (Score, Instrument, not "demo record" or "bundled file")

**Data Model Review**: All entities in data-model.md are infrastructure concerns (FirstRunState, ViewModePreference, DemoScoreMetadata extends Score). No domain logic leakage.

**Status**: ✅ PASS

---

### II. Hexagonal Architecture ✅ PASS (RE-CONFIRMED)

**Post-Design Validation**:
- ✅ Ports defined in contracts/ (IFirstRunStorage, IViewModePreferenceStorage, IDemoLoaderService, IOnboardingService)
- ✅ Adapters separated from domain (LocalStorage adapter, fetch adapter for demo loading)
- ✅ Dependencies flow inward: domain defines ports, adapters implement them
- ✅ Core domain (WASM music engine) has zero new dependencies
- ✅ Service orchestrator (OnboardingService) coordinates ports without framework coupling

**Contracts Review**: storage.ts and services.ts define clean port boundaries. Pseudo-code implementations show proper adapter separation.

**Status**: ✅ PASS

---

### III. Progressive Web Application Architecture ✅ PASS (RE-CONFIRMED)

**Post-Design Validation**:
- ✅ Offline-First: Demo bundled in public/ (served by service worker from Feature 012)
- ✅ Client-Side Processing: Demo parsing via WASM (no network required after initial load)
- ✅ PWA Enhancement: Improves first-run UX for installed tablet app
- ✅ Target Platform: Optimized for tablet onboarding (stacked view default for large screens)
- ✅ Browser Storage: Uses Local Storage and IndexedDB (PWA-compatible persistence)

**Quickstart Review**: Implementation patterns confirm offline capability and PWA integration.

**Status**: ✅ PASS

---

### IV. Precision & Fidelity ✅ PASS (RE-CONFIRMED)

**Post-Design Validation**:
- ✅ No changes to 960 PPQ resolution (domain core untouched)
- ✅ Demo score parsed through same WASM engine that maintains precision
- ✅ View mode preference purely presentational (no impact on timing calculations)
- ✅ First-run state infrastructure has no music timing dependencies

**Contract Review**: No timing-related interfaces defined. All contracts are infrastructure concerns.

**Status**: ✅ PASS

---

### V. Test-First Development ✅ PASS (RE-CONFIRMED)

**Post-Design Validation**:
- ✅ Unit tests defined in quickstart.md for all adapters and services
- ✅ Integration tests defined for end-to-end onboarding flow
- ✅ Contract tests planned (verify adapter implementation of ports)
- ✅ Manual QA checklist provided (device testing, offline scenarios)
- ✅ Acceptance criteria mapped to test locations in contracts/README.md
- ✅ TDD workflow documented (write tests → implement → verify)

**Quickstart Review**: Comprehensive testing section with example tests for all components. Mocking strategies defined. Performance validation scripts included.

**Status**: ✅ PASS

---

**Constitution Re-Evaluation Result**: All principles pass post-design. No violations introduced during detailed design phase. Feature ready for implementation (Phase 2: tasks.md generation).
