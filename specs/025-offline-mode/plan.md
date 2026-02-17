# Implementation Plan: Offline Mode Parity

**Branch**: `025-offline-mode` | **Date**: 2026-02-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-offline-mode/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Make all user-facing features work identically offline and online. Current gaps: demo score loading on first offline visit (fetches from server), score loading fallback to REST API when not in IndexedDB, backend sync on import making REST calls, and unclear offline status messaging. Solution: precache demo MusicXML in service worker, remove REST API fallbacks for local operations (import, demo, display), eliminate backend sync requirement, update OfflineBanner to communicate full functionality.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Rust 1.75+ (backend WASM module, no changes expected)  
**Primary Dependencies**: React 18+, vite-plugin-pwa, Workbox (service worker), IndexedDB (via custom wrapper), WASM music engine (already compiled), Tone.js (audio playback)  
**Storage**: IndexedDB for score persistence, Service Worker cache for assets (app shell, WASM module, demo MusicXML), network-first with fallback for score data (currently unused)  
**Testing**: Vitest (frontend unit/integration tests), manual offline testing (airplane mode), Network tab monitoring (verify zero REST calls)  
**Target Platform**: Tablet devices (iPad Pro, Surface Pro, Android tablets) with PWA support, Chrome 57+, Safari 11+, Edge 16+  
**Project Type**: Web application (frontend PWA + WASM backend)  
**Performance Goals**: Demo load <2s offline (matching online), MusicXML import <100ms (already achieved via WASM), zero network-related error messages  
**Constraints**: Offline-first architecture, requires one prior online visit to install service worker, tablet-optimized UI (touch targets 44×44px minimum), no backend sync required  
**Scale/Scope**: Local-only operation (no multi-device sync), typical user library ~50 scores (<50MB IndexedDB storage), demo MusicXML ~50KB

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Domain-Driven Design** | ✅ NOT APPLICABLE | No changes to music domain logic — feature focuses on infrastructure (service worker caching, REST API removal) |
| **II. Hexagonal Architecture** | ✅ ALIGNED | Removes REST API adapter usage (ScoreApiClient) in favor of WASM core domain + IndexedDB persistence port already implemented — strengthens hexagonal boundaries |
| **III. PWA Architecture** | ✅ STRONGLY ALIGNED | Core principle compliance — enhances offline-first capability by precaching demo assets and eliminating network dependencies for local operations |
| **IV. Precision & Fidelity** | ✅ NOT APPLICABLE | No changes to music Timeline or timing calculations |
| **V. Test-First Development** | ⚠️ REQUIRED | All code changes (service worker precache updates, REST API removal, OfflineBanner messaging) MUST have corresponding tests. Manual offline testing documented in quickstart validation. |
| **VI. Layout Engine Authority** | ✅ NOT APPLICABLE | No layout or rendering logic changes |
| **VII. Regression Prevention** | ⚠️ REQUIRED | Current bugs documented in spec (demo fails offline, REST fallbacks fail offline) — regression tests MUST be created to verify offline behavior remains working after implementation |

**Violations**: None  
**Complexity Justification**: Not needed — no violations

## Project Structure

### Documentation (this feature)

```text
specs/025-offline-mode/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
└── [No changes expected - WASM module already compiled and cached by service worker]

frontend/
├── src/
│   ├── components/
│   │   ├── OfflineBanner.tsx          # Update messaging (FR-006)
│   │   ├── OfflineBanner.css          # Update styling if needed
│   │   └── ScoreViewer.tsx            # Remove REST API fallbacks (FR-002, FR-003, FR-004)
│   ├── services/
│   │   ├── onboarding/
│   │   │   └── demoLoader.ts          # Remove fetch() call, load from cache or IndexedDB (FR-001)
│   │   ├── score-api.ts               # Audit/document remaining usage (FR-005)
│   │   └── storage/
│   │       └── local-storage.ts       # No changes - already works offline
│   ├── hooks/
│   │   └── useOfflineDetection.ts     # No changes - already works
│   └── sw-registration.ts             # May need updates for precache verification
├── tests/
│   ├── components/
│   │   └── offline-mode.test.ts       # New: offline feature tests (Principle V)
│   └── integration/
│       └── offline-regression.test.ts # New: regression tests for known bugs (Principle VII)
└── vite.config.ts                     # Update Workbox globPatterns to include demo MusicXML (FR-001)

public/
└── music/
    └── CanonD.musicxml                # Demo file (must be in precache manifest)
```

**Structure Decision**: Web application with frontend PWA (React + TypeScript) and backend WASM module (Rust). For this feature, only frontend changes are required — service worker precache configuration, component updates to remove REST API usage, and test additions. Backend WASM module already provides all local operations (parsing, score creation) and is already cached by the existing service worker.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
