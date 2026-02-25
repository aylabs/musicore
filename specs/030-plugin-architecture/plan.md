# Implementation Plan: Plugin Architecture with Virtual Keyboard Sample Plugin

**Branch**: `030-plugin-architecture` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/030-plugin-architecture/spec.md`

## Summary

Introduce a plugin architecture for the Musicore PWA. Plugins are self-contained React views that interact with the app exclusively through a documented Musicore Plugin API. A built-in Virtual Keyboard plugin (assets in `frontend/plugins/virtual-keyboard`) demonstrates the architecture: tapping piano keys displays the played notes on a music staff using the WASM layout engine via the Plugin API. A Plugin Importer controller allows users to add external plugins (ZIP packages) at runtime; each installed plugin gains a dedicated navigation entry. Plugin API compliance is enforced by ESLint static analysis and code review.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18, Vite  
**Primary Dependencies**: React 18 (error boundary API), `fflate` (ZIP extraction, ~8 KB gz), `idb` v8 (IndexedDB, ~1.7 KB gz), ESLint flat config (`no-restricted-imports`)  
**Storage**: IndexedDB (plugin registry — manifests + asset blobs; persists across PWA sessions)  
**Testing**: Vitest + React Testing Library (existing setup)  
**Target Platform**: Tablet-first PWA — Chrome, Safari, Firefox, Edge (see constitution §III)  
**Project Type**: Web application (frontend-only; no Rust/WASM changes needed for plugin infrastructure; Plugin API delegates notation rendering to existing WASM pipeline)  
**Performance Goals**: Note-to-staff display ≤100 ms (FR-016/SC-002); plugin import end-to-end ≤2 min (SC-003); invalid package rejection ≤3 s (SC-005)  
**Constraints**: Plugin packages ≤5 MB (FR-021); offline-capable (plugins stored in IndexedDB, no network required after install); 44×44 px touch targets  
**Scale/Scope**: Initial scope — 1 built-in plugin (Virtual Keyboard); runtime-installed plugins limited only by IndexedDB storage quota

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Domain-Driven Design | ✅ PASS | Plugin, PluginManifest, PluginRegistry are first-class domain entities with ubiquitous language. PluginRegistry is the aggregate root for plugin lifecycle. |
| II. Hexagonal Architecture | ✅ PASS | Plugin API is a port (defines what plugins can request). PluginImporter and IndexedDB adapter are adapters implementing persistence and package-ingestion ports. Plugin views are pure UI adapters. |
| III. PWA — Offline-First | ✅ PASS | Built-in plugins bundled at build time; imported plugins stored in IndexedDB. All plugin views functional without network after first load. |
| IV. Precision & Fidelity | ✅ PASS | Virtual Keyboard key events use integer MIDI note numbers. Note display delegated to WASM layout engine via Plugin API, preserving engine authority. |
| V. Test-First Development | ✅ REQUIRED | All Plugin API methods, PluginRegistry operations, PluginImporter validation, Virtual Keyboard interactions, and error boundary behaviour must be TDD. No implementation PR without tests. |
| VI. Layout Engine Authority | ✅ PASS | Plugin API's `renderNote` delegates directly to existing WASM `computeLayout` pipeline. Virtual Keyboard plugin MUST NOT perform coordinate calculations; it emits note events, the Plugin API and WASM engine handle geometry. TypeScript-side layout in plugin code is explicitly prohibited. |
| VII. Regression Prevention | ✅ REQUIRED | Any error discovered during implementation (validation edge cases, IndexedDB failures, ESLint false negatives) must yield a failing test before the fix. |

**Post-Design Re-Check**: Re-evaluate Principle VI after data-model is finalised — confirm `renderNote` in Plugin API contract does not expose or accept coordinate parameters.

## Project Structure

### Documentation (this feature)

```text
specs/030-plugin-architecture/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── plugin-manifest.schema.json   # Plugin manifest JSON Schema
│   └── plugin-api.ts                 # Plugin API TypeScript interface
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── plugins/
│   └── virtual-keyboard/         # Virtual Keyboard plugin (FR-003, FR-017)
│       ├── plugin.json           # Plugin manifest
│       ├── index.tsx             # Plugin view entry point
│       ├── VirtualKeyboard.tsx   # Piano keyboard component
│       ├── VirtualKeyboard.css
│       └── VirtualKeyboard.test.tsx
│
└── src/
    ├── plugin-api/               # Musicore Plugin API (the only import plugins may use)
    │   ├── index.ts              # Public API surface (sole export from plugin-api)
    │   ├── types.ts              # PluginManifest, PluginNoteEvent, PluginContext types
    │   └── plugin-api.test.ts
    │
    ├── services/
    │   └── plugins/
    │       ├── PluginRegistry.ts        # CRUD + persistence via idb
    │       ├── PluginRegistry.test.ts
    │       ├── PluginImporter.ts        # ZIP extraction, validation, registration
    │       ├── PluginImporter.test.ts
    │       └── builtinPlugins.ts        # Registers frontend/plugins/* at startup
    │
    ├── components/
    │   └── plugins/
    │       ├── PluginView.tsx           # Error boundary wrapper for any plugin view
    │       ├── PluginView.test.tsx
    │       ├── PluginImporterDialog.tsx # Upload UI + confirmation dialogs
    │       ├── PluginImporterDialog.test.tsx
    │       └── PluginNavEntry.tsx       # Navigation entry component per plugin
    │
    └── App.tsx                   # Extended: plugin navigation entries added dynamically
```

**Structure Decision**: Frontend-only feature (Option 2 web, frontend subtree only). No Rust backend changes. The `frontend/plugins/` directory is the plugin home per FR-003; `frontend/src/plugin-api/` is the enforced API boundary; `frontend/src/services/plugins/` contains domain logic following the existing `services/` hexagonal pattern.

## Complexity Tracking

> No constitution violations. No complexity justification required.
