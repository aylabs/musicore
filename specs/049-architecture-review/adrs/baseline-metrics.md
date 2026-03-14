# Baseline Metrics: Architecture Review

**Feature**: 049-architecture-review  
**Date**: 2026-03-13  
**Purpose**: Collected codebase metrics used as evidence across all five ADRs.

---

## Plugin System Metrics

### Built-in Plugins (6 total)

| ID | Name | Type | API Version | Order |
|----|------|------|-------------|-------|
| `play-score` | Play | core | 3 | 1 |
| `train-view` | Train | core | 4 | 2 |
| `practice-view-plugin` | Practice | core | 6 | 3 |
| `guide` | Guide | common | 1 | 99 |
| `virtual-keyboard` | Virtual Keyboard | common | 1 | — |
| `lint-test` | (test plugin) | — | — | — |

**Discovery**: `import.meta.glob()` at build time (`frontend/src/services/plugins/builtinPlugins.ts`), `eager: true`.

### Plugin API Surface (v7)

- **Total exported types/interfaces**: ~30 items from `frontend/src/plugin-api/index.ts`
- **Core definitions file**: `frontend/src/plugin-api/types.ts` (1,082 lines)
- **Key interfaces**: `PluginContext` (10 fields), `GraditonePlugin` (init, dispose, Component), `PluginManifest`, `PluginNoteEvent`
- **Shared components**: `StaffViewer`, `ScoreRenderer`, `ScoreSelector`
- **Versioned features**: v3 (scorePlayer), v5 (metronome), v7 (openListDialog)

### Plugin Loading Flow

1. Built-in plugins loaded eagerly from `BUILTIN_PLUGINS` array
2. Imported plugins loaded **sequentially** from IndexedDB via `pluginRegistry.list()`
3. Each imported plugin: read assets → find entry point → create Blob → `URL.createObjectURL` → dynamic `import()` → revoke URL
4. Error fallback renders error UI instead of crashing

### ZIP Import Validation Pipeline (10 checks)

1. Compressed size ≤ 5MB
2. ZIP extraction via `fflate.unzipSync()`
3. Uncompressed size ≤ 5MB
4. `plugin.json` present
5. Valid JSON manifest
6. Required fields: id, name, version, pluginApiVersion, entryPoint
7. ID pattern: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
8. API version ≤ host version (7)
9. Entry point file exists in ZIP
10. Duplicate detection (optional overwrite)

### MIDI Event Fan-out

- **Pattern**: `midiPluginSubscribersRef.current.forEach(h => h(event))` in `App.tsx`
- **Error isolation**: **NONE** — one handler throwing stops subsequent handlers
- **Ordering**: Undefined (Set iteration)
- **Subscription**: `context.midi.subscribe(handler)` returns unsubscribe function

### Plugin-Related Code Size

| File | Lines |
|------|-------|
| `frontend/src/plugin-api/types.ts` | 1,082 |
| `frontend/src/plugin-api/index.ts` | 50 |
| `frontend/src/services/plugins/builtinPlugins.ts` | ~60 |
| `frontend/src/services/plugins/PluginRegistry.ts` | ~100 |
| `frontend/src/services/plugins/PluginImporter.ts` | ~170 |
| Plugin-related code in `App.tsx` | ~200 |
| **Total** | **~1,660** |

---

## MIDI Processing Metrics

### Production Code

| File | Lines | Exported Functions |
|------|-------|--------------------|
| `frontend/src/services/recording/midiUtils.ts` | 88 | 3 (`midiNoteToLabel` O(1), `parseMidiNoteOn` O(1), `parseMidiNoteOff` O(1)) |
| `frontend/src/services/recording/useMidiInput.ts` | 213 | 1 hook + 2 interfaces |
| `frontend/src/services/chord/ChordDetector.ts` | 54 | 2 methods (`groupByTick` O(n), `filterChordCandidates` O(n)) |
| **Total** | **355** | |

### Key Characteristics

- All parsing functions are O(1) — under 1μs per call
- ChordDetector is O(n) where n = note count in a passage (trivial for 2–6 note chords)
- `useMidiInput` complexity is driven by browser API state management, not computation
- 300ms hotplug debounce (`CONNECT_DEBOUNCE_MS`), 3s MIDI access timeout
- Web MIDI API is JavaScript-only — cannot run in WASM

---

## Test Suite Metrics

### Test Files by Category

| Category | File Count |
|----------|------------|
| Frontend unit tests (`.test.ts`/`.test.tsx`) | 11 |
| Frontend integration tests | 7 |
| Frontend E2E tests (`.spec.ts`) | 9 |
| Backend integration tests (`.rs` in `tests/`) | 23 |
| Backend in-file tests (`#[test]`) | 159+ occurrences |
| **Total test files** | **50** |

### Test Cases (estimated)

| Category | Estimated Count |
|----------|----------------|
| Frontend unit + integration | 400+ |
| Frontend E2E | 73+ |
| Backend (Rust) | 180+ |
| **Total** | **650+** |

### Pre-Push Pipeline (`.githooks/pre-push`)

| Stage | Command | Duration (est.) |
|-------|---------|-----------------|
| 1. Branch check | git branch match | <1s |
| 2. Rust tests | `cargo test` | 10–30s |
| 3. TypeScript build | `VITE_BASE=/musicore/ npm run build` | 20–60s |
| 4. Frontend tests | `npm test -- --run --exclude 'tests/performance/**'` | 10–30s |
| 5. E2E tests | `npx playwright test --config playwright.config.prod.ts` | 60–180s (3min timeout) |
| **Total** | | **~2–5 minutes** |

**Pipeline is sequential** — no parallelism between stages.

### Test Configuration (`frontend/vitest.config.ts`)

- Environment: `happy-dom` (lightweight DOM)
- Excludes: `e2e/`, `visual/`, `virtual-keyboard-pro/`
- CSS support: enabled
- Globals: enabled (`describe`, `it`, `expect`)

---

## App.tsx Architectural Coupling

### Overview

- **Total lines**: 746
- **Import statements**: 42
- **React hooks**: 11 `useState`, 7 `useEffect`, 4 `useCallback`, 3 `useRef`, 1 `useMemo`, 1 custom hook
- **Responsibilities**: 26 distinct concerns
- **Context providers**: 3 (`RenderConfigContext`, `TempoStateProvider`, `FileStateProvider`)

### Merge-Conflict-Prone Sections

| Section | Lines | Risk Level |
|---------|-------|------------|
| Import statements | 1–42 | Very High |
| useState declarations | 68–86 | High |
| Plugin context object | 309–350 | High |
| Main JSX return | 590–746 | High |
| useEffect hooks (7 total) | various | High |
| handleSelectPlugin | 455–464 | Medium |
| ScoreViewer props | 712–722 | Medium |

### Responsibility Categories

- **Plugin system**: 7 responsibilities (registry, init, context, navigation, import/remove, sorting, list dialog)
- **Audio/MIDI**: 4 responsibilities (note emission, playback, stopping, MIDI routing)
- **Theme management**: 3 responsibilities (state, DOM injection, render config)
- **UI state**: 4 responsibilities (offline banner, install prompts, plugin manager dialog, recording view)
- **Lifecycle**: 3 responsibilities (WASM init, debug mode, ToneAdapter loading)
- **Recording**: 1 responsibility (mic pitch broadcasting)
- **React sharing**: 1 responsibility (window React exposure for plugins)
