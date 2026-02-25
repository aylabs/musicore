# Tasks: Plugin Architecture with Virtual Keyboard Sample Plugin

**Input**: Design documents from `specs/030-plugin-architecture/`
**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/](contracts/)

**Tests**: Included — Constitution Principle V (Test-First Development) explicitly requires TDD for all Plugin API methods, PluginRegistry operations, PluginImporter validation, Virtual Keyboard interactions, and error boundary behaviour (see [plan.md](plan.md) Constitution Check, row V).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependencies at that point)
- **[Story]**: User story this task belongs to (US1–US4)
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, scaffold directories, and lock in the ESLint API boundary — prerequisite for all subsequent work.

- [ ] T001 Install `fflate` and `idb` npm packages in `frontend/package.json`
- [ ] T002 Create folder scaffold: `frontend/plugins/virtual-keyboard/`, `frontend/src/plugin-api/`, `frontend/src/services/plugins/`, `frontend/src/components/plugins/`
- [ ] T003 [P] Add ESLint scoped `no-restricted-imports` block for `plugins/**/*.{ts,tsx}` in `frontend/eslint.config.js` (see [research.md R-003](research.md) for config snippet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the Plugin API contract and the Plugin Registry aggregate. All user stories depend on these being complete and passing tests.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is fully checkpointed.

- [ ] T004 Define `PluginManifest`, `PluginNoteEvent`, `PluginContext`, `MusicorePlugin` interfaces and `PLUGIN_API_VERSION = "1"` constant in `frontend/src/plugin-api/types.ts` (see [contracts/plugin-api.ts](contracts/plugin-api.ts) for the target shape)
- [ ] T005 [P] Create `frontend/src/plugin-api/index.ts` barrel that re-exports all public API surface from `types.ts` and nothing else
- [ ] T006 [P] Write Plugin API contract tests (MUST FAIL before T004/T005 implementation is committed) in `frontend/src/plugin-api/plugin-api.test.ts` — assert: `PLUGIN_API_VERSION === "1"`; `MusicorePlugin` shape matches contract; `PluginNoteEvent` has no coordinate fields
- [ ] T007 [P] Create `frontend/src/services/plugins/builtinPlugins.ts` with an empty `BUILTIN_PLUGINS: BuiltinPluginEntry[]` export (populated in US1, Phase 3)
- [ ] T008 Write `PluginRegistry` tests (MUST FAIL before T009 implementation) in `frontend/src/services/plugins/PluginRegistry.test.ts` — cover: `register` persists manifest + assets atomically; `list` returns all entries; `get(id)` returns stored entry; duplicate `id` overwrites; removed entry is absent on `list`
- [ ] T009 Implement `PluginRegistry` with `idb` v8 in `frontend/src/services/plugins/PluginRegistry.ts` — `openDB` schema (`manifests` keyed by `id`, `assets` keyed by `{pluginId}/{filename}`); `register(manifest, assets)` atomic tx; `list()`; `get(id)`; `remove(id)` (see [data-model.md](data-model.md) IndexedDB schema and [research.md R-001](research.md))

**Checkpoint**: `npm test` passes for `plugin-api.test.ts` and `PluginRegistry.test.ts`. Plugin API types and registry accessible.

---

## Phase 3: User Story 1 — Play Virtual Keyboard (Priority: P1) 🎯 MVP

**Goal**: The Virtual Keyboard plugin is available by default in navigation. Users tap keys and see notes on a staff within 100 ms. No user action needed to activate it.

**Independent Test**: Open app → click "Virtual Keyboard" nav entry → click middle C key → note appears on staff. No imports or IndexedDB required.

### Tests — US1 (write first, must fail before implementation)

- [ ] T010 [P] [US1] Write `VirtualKeyboard.tsx` unit tests in `frontend/plugins/virtual-keyboard/VirtualKeyboard.test.tsx` — cover: renders 14+ white keys and 10 black keys; key press applies pressed CSS class; key press calls `context.emitNote()` with correct `midiNote`; white key C4 emits `midiNote: 60`; black key C#4 emits `midiNote: 61`
- [ ] T011 [P] [US1] Write `PluginView.tsx` error boundary tests in `frontend/src/components/plugins/PluginView.test.tsx` — cover: renders children normally; catches thrown error and shows plugin name + error message; "Reload plugin" button resets boundary and remounts children

### Implementation — US1

- [ ] T012 [P] [US1] Create `frontend/plugins/virtual-keyboard/plugin.json` manifest: `id: "virtual-keyboard"`, `name: "Virtual Keyboard"`, `version: "1.0.0"`, `pluginApiVersion: "1"`, `entryPoint: "index.js"` (see [contracts/plugin-manifest.schema.json](contracts/plugin-manifest.schema.json))
- [ ] T013 [P] [US1] Create `frontend/plugins/virtual-keyboard/VirtualKeyboard.css` — piano keyboard grid layout with two+ octave white/black key layout; pressed state class (`.key--pressed`); responsive width for tablet-first layout; 44×44 px minimum touch targets per constitution §III
- [ ] T014 [US1] Implement `frontend/plugins/virtual-keyboard/VirtualKeyboard.tsx` — renders two minimum octaves (C3–B4, 24 white + 16 black keys); calls `context.emitNote({ midiNote, timestamp: Date.now() })` on click/touchstart; applies `.key--pressed` class during interaction; accepts `PluginContext` as prop (dependency-injected via `init()` pattern)
- [ ] T015 [US1] Implement `frontend/plugins/virtual-keyboard/index.tsx` — default export `MusicorePlugin` with `init(context)` storing context ref; `Component` pointing to `VirtualKeyboard`; `dispose()` clearing refs
- [ ] T016 [US1] Register Virtual Keyboard in `frontend/src/services/plugins/builtinPlugins.ts` — import manifest from `plugin.json` and plugin from `index.tsx`; export `BUILTIN_PLUGINS` array with single entry `{ manifest: { ...virtualKeyboardManifest, origin: 'builtin' }, plugin: virtualKeyboardPlugin }` (see [research.md R-006](research.md))
- [ ] T017 [US1] Implement `frontend/src/components/plugins/PluginView.tsx` — wraps `ErrorBoundary.tsx` with plugin-specific fallback (shows `plugin.name`, error message, "Reload plugin" reset button); accepts `plugin: PluginManifest` + child `component` prop (see [research.md R-005](research.md))
- [ ] T018 [P] [US1] Implement `frontend/src/components/plugins/PluginNavEntry.tsx` — navigation item showing plugin name; `onSelect` callback prop; active/inactive visual state; 44×44 px touch target
- [ ] T019 [US1] Extend `frontend/src/App.tsx` with: `installedPlugins: PluginManifest[]` state initialised from `BUILTIN_PLUGINS` on mount; `activePlugin: string | null` state; render one `<PluginNavEntry>` per plugin in navigation area; render `<PluginView>` wrapping active plugin's `Component` when `activePlugin` is non-null

**Checkpoint**: Open app → Virtual Keyboard entry visible → click key → note on staff. US1 fully functional. No IndexedDB or imports required.

---

## Phase 4: User Story 2 — Import a Third-Party Plugin (Priority: P2)

**Goal**: Users can upload a ZIP plugin package. The importer validates it (size, manifest schema, API version, duplicate check), writes atomically to IndexedDB, and the new plugin appears in navigation immediately and after PWA reload.

**Independent Test**: Access Plugin Importer → select a valid 3rd-party ZIP → confirm installation → new nav entry appears → reload app → entry still present.

### Tests — US2 (write first, must fail before implementation)

- [X] T020 [P] [US2] Write `PluginImporter.ts` tests in `frontend/src/services/plugins/PluginImporter.test.ts` — cover: rejects ZIP > 5 MB (FR-021); rejects package whose `pluginApiVersion > "1"` (FR-019); rejects missing/invalid `plugin.json` (FR-009); rejects `entryPoint` file absent from ZIP; accepts valid package and calls `PluginRegistry.register`; returns `{ duplicate: true }` when `id` already exists
- [X] T021 [P] [US2] Write `PluginImporterDialog.tsx` tests in `frontend/src/components/plugins/PluginImporterDialog.test.tsx` — cover: shows file picker on open; displays success message on valid import; displays error message on invalid import; shows duplicate-name confirmation dialog; cancelling duplicate leaves existing plugin intact; confirming duplicate calls importer with `overwrite: true`

### Implementation — US2

- [X] T022 [US2] Implement `frontend/src/services/plugins/PluginImporter.ts`
- [X] T023 [US2] Implement `frontend/src/components/plugins/PluginImporterDialog.tsx`
- [X] T024 [US2] Extend `frontend/src/App.tsx` mount effect to also call `PluginRegistry.list()` and merge imported plugins into `installedPlugins` state (builtin plugins always prepended); add `showImporter` state; render `<PluginImporterDialog>` when open; on `onImportComplete` append new plugin to `installedPlugins`
- [X] T025 [P] [US2] Add a "+" / "Import Plugin" trigger button to the plugin navigation area in `frontend/src/App.tsx` that sets `showImporter: true`

**Checkpoint**: Import flow end-to-end: select ZIP → validate → confirm if duplicate → navigation entry added → reload app → entry persists.

---

## Phase 5: User Story 3 — Navigate Between Installed Plugins (Priority: P3)

**Goal**: Each installed plugin has exactly one navigation entry. The user can move freely between plugin views and all other app views. Each plugin view is independent (no shared state leakage).

**Independent Test**: With only the built-in Virtual Keyboard: navigate to it, return to score view, confirm no broken state. With two plugins installed, switch between both and confirm independent state.

### Tests — US3 (write first, must fail before implementation)

- [X] T026 [P] [US3] Write `App.tsx` navigation integration tests in `frontend/src/App.test.tsx` — 6 tests passing

### Implementation — US3

- [X] T027 [US3] Harden `PluginNavEntry.tsx` — `isActive` prop with visual styling already in place from T018; `handleSelectPlugin` already clears conflicting view flags from T019
- [X] T028 [US3] Non-plugin handlers already call `setActivePlugin(null)` — `onShowRecording` and `onShowPractice` from T019; `showDemo` only set at startup (activePlugin is null at that point)

**Checkpoint**: Navigation is fully cohesive. Plugins appear as first-class nav entries. No state leaks between views.

---

## Phase 6: User Story 4 — Plugin Developer Builds with the Plugin API (Priority: P4)

**Goal**: A developer can write a complete Musicore plugin using only the documented Plugin API contract. ESLint statically enforces zero direct calls to app internals from within `frontend/plugins/`.

**Independent Test**: `npx eslint plugins/` passes with 0 errors. No `src/` import in `virtual-keyboard/` other than `src/plugin-api`. All plugin API methods used by the virtual keyboard are covered in `contracts/plugin-api.ts`.

### Tests — US4

- [X] T029 [P] [US4] Create lint-boundary fixture at `frontend/plugins/lint-test/bad-import.ts`; confirmed `npx eslint plugins/lint-test/bad-import.ts` reports error

### Implementation — US4

- [X] T030 [P] [US4] `npx eslint plugins/virtual-keyboard/` → 0 violations after adding eslint-disable for react-refresh on index.tsx
- [X] T031 [P] [US4] All interfaces (PluginNoteEvent, PluginManifest, PluginContext, MusicorePlugin) and PLUGIN_API_VERSION exported — cross-check passed
- [X] T032 [P] [US4] `npx tsc --noEmit` with plugins/ in tsconfig.app.json include → 0 errors after fixing import paths

**Checkpoint**: Static analysis enforces the Plugin API boundary. The virtual keyboard plugin is a fully compliant reference implementation.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, type-check gate, and quickstart walkthrough.

- [X] T033 [P] `npx tsc --noEmit` → 0 errors (plugins/ added to tsconfig.app.json include; import paths fixed)
- [X] T034 [P] Full Vitest suite → 1149 tests pass, 25 skipped, 0 failures
- [X] T035 [P] `npx eslint plugins/virtual-keyboard/` → 0 violations; `plugins/lint-test/bad-import.ts` → 1 intentional error (boundary confirmed)
- [ ] T036 Manually follow every scenario in `specs/030-plugin-architecture/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 complete — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Requires Phase 2 complete — no other story dependencies
- **Phase 4 (US2)**: Requires Phase 2 complete — integrates with Phase 3 at App.tsx level (T024/T025 extend T019)
- **Phase 5 (US3)**: Requires Phase 3 complete (navigation entries must exist)
- **Phase 6 (US4)**: Requires Phase 3 complete (plugin under audit must exist)
- **Phase 7 (Polish)**: Requires all desired stories complete

### User Story Dependencies

| Story | Depends On | Notes |
|-------|-----------|-------|
| US1 (P1) | Phase 2 only | Core MVP; independently testable |
| US2 (P2) | Phase 2 + US1 partially | Shares `App.tsx` state from T019; independently testable via importer |
| US3 (P3) | US1 complete | Requires nav entries to exist; independently testable with built-in plugin only |
| US4 (P4) | US1 complete | Audits the virtual keyboard reference implementation |

### Within Each Phase: Sequencing

1. Tests marked (MUST FAIL) → written **before** implementation tasks
2. Types/interfaces before services
3. Services before components
4. Components before App.tsx wiring
5. Story checkpoint before next story

---

## Parallel Execution Examples

### Phase 2 (Foundational) — run simultaneously after T001–T003

```
T004  Define Plugin API types (frontend/src/plugin-api/types.ts)
T005  Create plugin-api/index.ts barrel        ← parallel with T004
T006  Write plugin-api.test.ts                 ← parallel with T004
T007  Create builtinPlugins.ts stub            ← parallel with T004
T008  Write PluginRegistry.test.ts             ← parallel with T005
↓
T009  Implement PluginRegistry.ts              ← waits for T008
```

### Phase 3 (US1) — run simultaneously after Phase 2 checkpoint

```
T010  Write VirtualKeyboard.test.tsx           ← parallel
T011  Create plugin.json manifest              ← parallel
T013  Create VirtualKeyboard.css               ← parallel
T011  Write PluginView.test.tsx                ← parallel with T010
↓
T014  Implement VirtualKeyboard.tsx            ← waits for T010 + T013
T017  Implement PluginView.tsx                 ← waits for T011
T018  Implement PluginNavEntry.tsx             ← parallel with T014
↓
T015  Implement index.tsx                      ← waits for T014
T016  Register in builtinPlugins.ts            ← waits for T015
↓
T019  Extend App.tsx                           ← waits for T016 + T017 + T018
```

### Phase 4 (US2) — run simultaneously after Phase 2 checkpoint

```
T020  Write PluginImporter.test.ts             ← parallel
T021  Write PluginImporterDialog.test.tsx      ← parallel
↓
T022  Implement PluginImporter.ts              ← waits for T020
T023  Implement PluginImporterDialog.tsx       ← waits for T021
T025  Add import trigger to App.tsx            ← parallel with T022/T023
↓
T024  Extend App.tsx mount effect              ← waits for T022 + T023
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) — ~1 session
2. Complete Phase 2 (Foundational) — ~1 session; checkpoint tests
3. Complete Phase 3 (US1 — Virtual Keyboard) — ~2 sessions
4. **STOP and VALIDATE**: Open app, play keyboard, confirm notes on staff
5. Merge to main as first increment

### Incremental Delivery

| Increment | Phases | Value Delivered |
|-----------|--------|-----------------|
| MVP | 1 + 2 + 3 | Virtual Keyboard playable; plugin architecture proven end-to-end |
| +P2 | + 4 | Plugin Importer live; any developer can publish a plugin |
| +P3 | + 5 | Navigation cohesion; plugins feel first-class |
| +P4 | + 6 + 7 | API boundary enforced statically; developer experience complete |

### Parallel Team Strategy

With two developers after Phase 2 is complete:

- Developer A: Phase 3 (US1 — Virtual Keyboard)
- Developer B: Phase 4 (US2 — Plugin Importer service layer)

Both work independently; App.tsx wiring (T019, T024) is the only integration point — merge after both are green.

---

## Notes

- **[P]** = different files, no unresolved dependencies: safe for concurrent execution
- **[Story]** label maps task to user story for traceability and independent delivery
- **Test-first discipline**: every test in this file marked "MUST FAIL" must be written and verified failing before the implementation task it gates is begun (Constitution Principle V)
- **Regression prevention**: any bug discovered during implementation becomes a [BUG] task following the pattern in the template: document → failing test → fix → verify (Constitution Principle VII)
- **WASM authority** (Constitution Principle VI): `VirtualKeyboard.tsx` emits `PluginNoteEvent` with `midiNote` integer only — zero coordinate arithmetic allowed in plugin code; notation layout is exclusively WASM domain
- Commit after each checkpointed phase, not after individual tasks
