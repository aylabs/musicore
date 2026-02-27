# Implementation Plan: Virtual Keyboard Pro Plugin

**Branch**: `032-virtual-keyboard-pro` | **Date**: 2026-02-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/032-virtual-keyboard-pro/spec.md`

## Summary

Build and package **Virtual Keyboard Pro** — a new, standalone importable plugin delivering an enhanced interactive piano keyboard. It extends the built-in Virtual Keyboard with a three-octave range (C3–B5), ±2-octave shift controls, and a note-label toggle. The plugin is distributed as `virtual-keyboard-pro.zip`, installable via the Musicore host importer without any host-side changes. Source lives in `plugins-external/virtual-keyboard-pro/`; a `build.sh` script compiles TSX via esbuild and packages the ZIP.

## Technical Context

**Language/Version**: TypeScript 5 + React 19 (JSX; same stack as existing plugins)
**Primary Dependencies**: Plugin API v2 (`frontend/src/plugin-api/index.ts`); esbuild (bundler → single ESM `index.js`); bash `zip` (packaging); Vitest + `@testing-library/react` (tests)
**Storage**: None — plugin state is session-only; ZIP persistence handled by host IndexedDB
**Testing**: Vitest + `@testing-library/react`; mock `PluginContext`; run from `plugins-external/virtual-keyboard-pro/`
**Target Platform**: Tablet PWA (iPad, Surface, Android); Chrome 57+, Safari 11+; existing Musicore host
**Project Type**: Standalone external plugin (self-contained directory with own build tooling)
**Performance Goals**: Key-press → staff note ≤150 ms | label toggle ≤100 ms | octave shift ≤100 ms | ZIP <5 MB
**Constraints**: Plugin API boundary enforced — no Musicore internals imported; React/ReactDOM externalized (provided by host); zero coordinate/layout calculations in plugin (Constitution Principle VI)
**Scale/Scope**: ~350 lines TSX; ~20 Vitest tests; ZIP <500 KB expected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|---|---|---|
| **I — Domain-Driven Design** | Plugin operates on `midiNote` integers and `PluginNoteEvent` — the domain's ubiquitous language. Octave shift is a pure integer offset on the MIDI base range. | ✅ PASS |
| **II — Hexagonal Architecture** | Plugin communicates exclusively through the Plugin API (a defined port). No backend or host-internal changes. Zero `src/` imports. | ✅ PASS |
| **III — PWA Architecture** | Plugin compiled to ESM, loadable at runtime by the host. Session-only state; host IndexedDB persists the ZIP. | ✅ PASS |
| **IV — Precision & Fidelity** | MIDI note numbers are integers; `Date.now()` timestamps. No floating-point timing. WASM handles all layout arithmetic. | ✅ PASS |
| **V — Test-First Development** | All spec acceptance scenarios must have Vitest tests written before/alongside implementation. NON-NEGOTIABLE gate per task. | ✅ PASS — enforced in tasks |
| **VI — Layout Engine Authority** | Plugin emits `{ midiNote, timestamp }` via `context.emitNote()` — musical data only. No x/y positions, bounding boxes, or spacing computed anywhere in plugin code. `StaffViewer` (host) handles layout. | ✅ PASS |
| **VII — Regression Prevention** | Known Issues empty at spec time. Any discovered bug must produce a failing test before the fix. | ✅ PASS — section ready |

**Gate result**: All 7 principles PASS. Proceeding to Phase 0.

### Post-Phase 1 Re-check

Re-evaluated after data model and contract design: `OctaveShift` is a pure integer MIDI offset; `NoteDefinition` carries `midi`, `label`, `isBlack` — no coordinate fields exist. **Principle VI: CONFIRMED PASS.**

## Project Structure

### Documentation (this feature)

```text
specs/032-virtual-keyboard-pro/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── plugin-manifest.json   ← Phase 1 output
│   └── plugin-api-usage.ts    ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
plugins-external/
└── virtual-keyboard-pro/
    ├── package.json                  # dev deps: esbuild, typescript, vitest, @testing-library/react
    ├── tsconfig.json                 # compilerOptions aligned with frontend tsconfig
    ├── vite.config.ts                # vitest configuration (test runner only, no Vite build)
    ├── build.sh                      # FR-012: compile TSX → index.js then package zip
    ├── plugin.json                   # FR-002: plugin manifest
    ├── README.md                     # FR-013: installation + feature summary (included in zip)
    ├── index.tsx                     # MusicorePlugin default export (entry point)
    ├── VirtualKeyboardPro.tsx        # root React component (keyboard + staff + controls)
    ├── VirtualKeyboardPro.css        # styles
    └── VirtualKeyboardPro.test.tsx   # Vitest tests covering all acceptance scenarios
```

**Structure Decision**: Standalone external plugin in `plugins-external/virtual-keyboard-pro/` — explicitly separated from built-in plugins (`frontend/plugins/`). Self-contained with own `package.json`/build tooling. References host Plugin API types via relative path for TypeScript checking; externalizes runtime host modules. Existing `frontend/plugins/` directory and all its files are untouched (FR-005).

## Complexity Tracking

> No constitution violations. Section omitted.
