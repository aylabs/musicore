# Tasks: Virtual Keyboard Pro Plugin

**Input**: Design documents from `specs/032-virtual-keyboard-pro/`
**Prerequisites**: plan.md ✓ | spec.md ✓ | research.md ✓ | data-model.md ✓ | contracts/ ✓ | quickstart.md ✓

**Tests**: Included — all acceptance scenarios from spec.md are covered by Vitest tests (Constitution Principle V: Test-First Development is NON-NEGOTIABLE).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths are included in all task descriptions

---

## Phase 1: Setup

**Purpose**: Initialize `plugins-external/virtual-keyboard-pro/` as a standalone, self-contained plugin workspace. No host files are modified.

- [x] T001 Create directory `plugins-external/virtual-keyboard-pro/` and `plugins-external/virtual-keyboard-pro/package.json` with dev dependencies: `esbuild`, `typescript`, `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@types/react`, `@types/react-dom`, `react`, `react-dom`
- [x] T002 [P] Create `plugins-external/virtual-keyboard-pro/tsconfig.json` with: `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `strict: true`, `noEmit: true`, and `paths` alias mapping `../../src/plugin-api/index` to `../../frontend/src/plugin-api/index.ts`
- [x] T003 [P] Create `plugins-external/virtual-keyboard-pro/vite.config.ts` configuring Vitest with `environment: jsdom`, `globals: true`, and `setupFiles: ['./vitest.setup.ts']`; create `plugins-external/virtual-keyboard-pro/vitest.setup.ts` importing `@testing-library/jest-dom`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core scaffold that ALL user stories depend on — manifest, entry point, component skeleton, and build script. **Must be complete before any user story work begins.**

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [x] T004 Install npm dependencies: run `npm install` in `plugins-external/virtual-keyboard-pro/`
- [x] T005 [P] Create `plugins-external/virtual-keyboard-pro/plugin.json` with all required manifest fields per `contracts/plugin-manifest.json`: `id: "virtual-keyboard-pro"`, `name: "Virtual Keyboard Pro"`, `version: "1.0.0"`, `pluginApiVersion: "2"`, `entryPoint: "index.js"`, `description`, `type: "common"`, `view: "window"`
- [x] T006 [P] Create `plugins-external/virtual-keyboard-pro/README.md` with installation steps (pointing to quickstart.md steps 4–5) and feature summary (three-octave keyboard, octave shift, note label toggle)
- [x] T007 Create `plugins-external/virtual-keyboard-pro/index.tsx` with the `MusicorePlugin` default export: module-level `_context` variable, `init(context)` storing context, `dispose()` clearing it, and a `VirtualKeyboardProWithContext` wrapper component — imports only from `../../src/plugin-api/index`
- [x] T008 Create `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx` component skeleton: declare `VirtualKeyboardProProps`, declare all state (`pressedKeys`, `playedNotes`, `lastReleasedMidi`, `octaveOffset`, `showLabels`), declare all refs (`attackTimestamps`, `pressedKeysRef`, `lastTouchTimeRef`, `isMouseHeldRef`), declare all derived values (`visibleNotes`, `whiteNotes`, `blackNotes`, `timestampOffset`, `highlightedNoteIndex`), return a placeholder `<div>Virtual Keyboard Pro</div>` — full `NoteDefinition`/`ResolvedNote` types and `BASE_NOTES` constant left as stubs
- [x] T009 [P] Create `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.css` with base structure: `.virtual-keyboard-pro` root, `.vkp-staff-area`, `.vkp-keyboard-scroll` (horizontal overflow), `.keyboard`, `.key`, `.key--white`, `.key--black`, `.key--pressed`, `.vkp-controls` — visual detail to be filled by story phases
- [x] T010 Create `plugins-external/virtual-keyboard-pro/build.sh`: (1) run esbuild to compile `index.tsx` → `dist/index.js` with `--bundle --format=esm --external:react --external:react-dom`; (2) copy `plugin.json` and `README.md` to `dist/`; (3) produce `virtual-keyboard-pro.zip` from `dist/` files at root using `zip -j`; (4) print ZIP size and verify < 5 MB; make script executable (`chmod +x`)

**Checkpoint**: Scaffold complete — `npm test` reports no test files found (expected); `./build.sh` produces a valid stub ZIP; all user story work can now begin.

---

## Phase 3: User Story 1 — Import the Pro Plugin (Priority: P1) 🎯 MVP

**Goal**: The `virtual-keyboard-pro.zip` artifact is valid, correctly structured, carries the right manifest fields, is under 5 MB, and the component renders without crashing when the host loads it — making the plugin installable via the host importer.

**Independent Test**: Install the ZIP in the host importer → "Virtual Keyboard Pro" navigation entry appears → navigate to it → no crash.

- [x] T011 [US1] Create `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.test.tsx` with US1 test suite: (a) `plugin.json` contains `id: "virtual-keyboard-pro"`, `pluginApiVersion: "2"`, and all required fields; (b) component renders without throwing when given a mock `PluginContext`; (c) `init()` + `dispose()` cycle does not throw; (d) plugin default export satisfies `MusicorePlugin` interface (has `init`, `Component`). **Run tests — verify they FAIL before T012 makes them pass.**
- [x] T012 [US1] Complete `plugins-external/virtual-keyboard-pro/index.tsx` and `VirtualKeyboardPro.tsx` stub to the level where all T011 tests pass; run `./build.sh` and confirm: ZIP is under 5 MB, root contains `plugin.json`, `index.js`, `README.md`, no subdirectories

**Checkpoint**: US1 is independently testable. The ZIP can be imported into the host. Navigate to "Virtual Keyboard Pro" — a stub view renders without crashing.

---

## Phase 4: User Story 2 — Play on the Extended Keyboard (Priority: P2)

**Goal**: A three-octave keyboard (C3–B5, 21 white + 15 black keys) is rendered. Playing any key triggers audio and emits the note to the staff. An empty staff is shown on load. Played notes appear on the staff in order.

**Independent Test**: Open Virtual Keyboard Pro view → empty staff visible → press keys across all three octaves → each note appears on staff with correct pitch.

- [x] T013 [P] [US2] Add US2 tests to `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.test.tsx`: (a) on mount, `StaffViewer` receives `notes=[]`; (b) keyboard renders exactly 21 white keys and 15 black keys; (c) mousedown on a white key calls `context.playNote` with `type: "attack"` and the correct `midiNote`; (d) mousedown calls `context.emitNote` with the same `midiNote`; (e) mousedown adds `key--pressed` class; (f) mouseup calls `context.playNote` with `type: "release"`; (g) mouseup appends a `PluginNoteEvent` with `durationMs` to `playedNotes`; (h) pressing a key in the third octave (C5, MIDI 72) emits MIDI 72. **Run tests — verify they FAIL.**
- [x] T014 [P] [US2] Implement `BASE_NOTES: NoteDefinition[]` constant in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx` — 36 entries covering C3 (MIDI 48) through B5 (MIDI 83): all 21 white key `NoteDefinition`s and 15 black key `NoteDefinition`s with correct `baseMidi`, `baseLabel`, `isBlack`, and `whiteKeyBefore` index (7 white keys × 3 octaves = 21 white keys total)
- [x] T015 [US2] Implement `visibleNotes` useMemo in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx`: map `BASE_NOTES` to `ResolvedNote[]` applying `octaveOffset * 12` to `baseMidi` → `midi` and shifting the octave digit in `baseLabel` → `label`; derive `whiteNotes` and `blackNotes` filtered sub-arrays; implement `blackKeyLeft(note)` positioning helper
- [x] T016 [US2] Implement `handleKeyDown` and `handleKeyUp` in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx`: `handleKeyDown` calls `context.playNote(attack)` + `context.emitNote()`, records `attackTimestamps`, updates `pressedKeys`; `handleKeyUp` calls `context.playNote(release)`, computes `durationMs`, appends to `playedNotes` (capped at 20), updates `lastReleasedMidi`, clears from `pressedKeys`; implement `pressedKeysRef` sync effect and unmount cleanup releasing held keys
- [x] T017 [US2] Implement JSX render in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx`: title, staff-header with "Clear" button, `context.components.StaffViewer` with `notes={playedNotes}`, `clef="Treble"`, `bpm={120}`, `timestampOffset`, `highlightedNotes`, `highlightedNoteIndex`, `autoScroll`; keyboard scroll container with white keys and absolutely-positioned black keys; all mouse event handlers wired up
- [x] T018 [US2] Implement touch/mouse guard (`lastTouchTimeRef`, `TOUCH_GUARD_MS=500`), `isMouseHeldRef` with document `mouseup` listener, `handleTouchStart`/`handleTouchEnd`, `handleMouseEnter`/`handleMouseLeave` slide-to-play, and `context.midi.subscribe` MIDI subscription (filter to current `visibleNotes` range) in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx`
- [x] T019 [P] [US2] Add three-octave keyboard layout styles in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.css`: white key width `44px` (44px touch target), black key dimensions and absolute positioning z-index, `key--pressed` highlight, `.vkp-keyboard-scroll` horizontal overflow for narrow viewports (SC-005), staff area height, clear button style

**Checkpoint**: US2 is independently testable. Open the view → empty staff → press keys across all three octaves → notes appear on staff in correct order with correct pitch.

---

## Phase 5: User Story 3 — Toggle Note Labels on Keys (Priority: P3)

**Goal**: A "Show Labels" toggle shows/hides note names on all keys. Labels default to hidden on load and reset to hidden if the view is unmounted and remounted.

**Independent Test**: Open view → no labels visible → click "Show Labels" → every key shows its note name → click again → labels hidden.

- [x] T020 [P] [US3] Add US3 tests to `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.test.tsx`: (a) on mount, no note labels visible on keys; (b) after clicking "Show Labels" toggle, every white key and every black key shows its note name; (c) after clicking the toggle again, note names disappear; (d) after remounting the component, labels are hidden (state resets). **Run tests — verify they FAIL.**
- [x] T021 [US3] Add `showLabels: boolean` state (default `false`) and "Show Labels" toggle button to `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx`; wire toggle to `setShowLabels(prev => !prev)`
- [x] T022 [US3] Update key rendering in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx`: when `showLabels=true`, render `note.label` as text child inside every key div (white and black); when `showLabels=false`, retain only the C-root octave label for white keys (existing behaviour); add `key--labeled` CSS class to both white and black keys when `showLabels=true`
- [x] T023 [P] [US3] Add label text styles in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.css`: white key label (bottom-aligned, small font, dark colour); black key label (smaller font, light colour, centred, readable against `key--pressed` background per US3-AC5); toggle button style

**Checkpoint**: US3 is independently testable. Toggle "Show Labels" → all 36 keys show note names → toggle off → labels hidden → navigate away and back → labels are off.

---

## Phase 6: User Story 4 — Shift Octave Range (Priority: P4)

**Goal**: ▲/▼ octave-shift buttons scroll the displayed keyboard range by one octave. Range is bounded at ±2 from default (C3–B5). Key labels and MIDI pitches update immediately. The staff retains all previously played notes at their absolute pitches.

**Independent Test**: Click ▲ → key labels shift up one octave (C3→C4) → play a key → staff shows correct octave pitch → click ▼ twice → key labeled "C2" plays MIDI 36.

- [x] T024 [P] [US4] Add US4 tests to `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.test.tsx`: (a) after clicking ▲ once from default, first white key is labeled "C4" (MIDI 60); (b) pressing that key calls `context.playNote` with `midiNote: 60`; (c) after clicking ▲ twice, ▲ button has `disabled` attribute; (d) after clicking ▼ once from default, first key is "C2" (MIDI 36); (e) after clicking ▼ twice, ▼ button has `disabled` attribute; (f) shifting octave does not clear existing `playedNotes`. **Run tests — verify they FAIL.**
- [x] T025 [US4] Add `octaveOffset: OctaveShift` state (default `0`) to `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx`; add ▲ (octave-up) and ▼ (octave-down) buttons wired to `setOctaveOffset` with boundary guards: disable ▲ when `octaveOffset >= 2`, disable ▼ when `octaveOffset <= -2`
- [x] T026 [US4] Update `visibleNotes` useMemo in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx` to use `octaveOffset` as dependency: `midi = baseMidi + octaveOffset * 12`; shift label octave digit: parse octave number from `baseLabel`, add `octaveOffset`, reconstruct label string (e.g. `"C3"` + offset `+2` → `"C5"`)
- [x] T027 [US4] Update MIDI subscription handler in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.tsx` to include `visibleNotes` as a dependency: filter incoming `midi.subscribe` events to notes present in current `visibleNotes`; out-of-range events are silently ignored (edge case from spec)
- [x] T028 [P] [US4] Add octave shift button styles in `plugins-external/virtual-keyboard-pro/VirtualKeyboardPro.css`: button layout in `.vkp-controls`, `disabled` visual state, current range display label (e.g. "C3–B5")

**Checkpoint**: US4 is independently testable. Shift octave up/down → key labels and MIDI pitches update → boundary buttons disable → staff retains all historical notes.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Full suite validation, build artifact verification, regression check, documentation update.

- [x] T029 [P] Run `npx vitest run` from `plugins-external/virtual-keyboard-pro/` and confirm all tests pass (target: all US1–US4 acceptance scenarios green)
- [x] T030 [P] Run `npx tsc --noEmit` in `plugins-external/virtual-keyboard-pro/` and fix any type errors; verify no imports from Musicore internals (only `../../src/plugin-api/index` permitted)
- [x] T031 Run `./build.sh` in `plugins-external/virtual-keyboard-pro/`: verify ZIP is <5 MB (SC-004), root contains exactly `plugin.json`, `index.js`, `README.md`, no subdirectories; record actual ZIP size
- [ ] T032 Manual smoke test per `specs/032-virtual-keyboard-pro/quickstart.md` steps 4–5: import `virtual-keyboard-pro.zip` into a running Musicore dev instance, verify "Virtual Keyboard Pro" nav entry appears, all four user stories work end-to-end, plugin persists after PWA reload (US1-AC3)
- [ ] T033 Regression check: with Virtual Keyboard Pro imported, navigate to the built-in "Virtual Keyboard" plugin and verify it still plays notes, shows staff, and has no regressions (SC-009 / FR-005)
- [x] T034 [P] Update `PLUGINS.md` in repo root: add Virtual Keyboard Pro to the importable plugin reference section; document `plugins-external/virtual-keyboard-pro/` as the example importable plugin source
- [x] T035 Add `plugins-external/` and `*.zip` to `.gitignore` so the private external-plugin workspace and build artifacts are never committed to this repository
- [x] T036 Commit all changes on branch `032-virtual-keyboard-pro`: `.gitignore`, `PLUGINS.md`, `frontend/src/App.tsx` (dynamic plugin loading + window React exposure), `frontend/src/components/plugins/PluginNavEntry.tsx` (border fix), and `specs/032-virtual-keyboard-pro/` directory
- [x] T037 Push branch `032-virtual-keyboard-pro` to origin and open a pull request targeting `main` with a summary of the feature and the post-implementation fixes

---

## Dependencies (Story Completion Order)

```
Phase 1 (Setup)
  └── Phase 2 (Foundational)
        ├── Phase 3: US1 — Import the Pro Plugin   [MVP: ZIP + renderable component]
        │     └── Phase 4: US2 — Extended Keyboard  [full 3-octave play + staff]
        │           └── Phase 5: US3 — Label Toggle  [note labels on/off]
        │                 └── Phase 6: US4 — Octave Shift  [range navigation]
        │                       └── Final Phase (Polish + Regression)
        └── [US2–US4 are independent of each other but all modify VirtualKeyboardPro.tsx
             sequentially; tests can be written in parallel per [P] markers]
```

**Most stories depend on prior stories** because US2–US4 all add to `VirtualKeyboardPro.tsx`. Each story phase ADDS functionality and does not break previous stories.

---

## Parallel Execution Examples

### Phase 1 (after T001)
```
T002 (tsconfig.json)   ←─ parallel ─→   T003 (vite.config.ts + vitest.setup.ts)
```

### Phase 2 (after T004)
```
T005 (plugin.json)   ←─ parallel ─→   T006 (README.md)
T007 (index.tsx) → T008 (VirtualKeyboardPro.tsx skeleton)
T009 (base CSS)    ←─ parallel with T007/T008 ─→
T010 (build.sh) — after T007, T008
```

### Phase 4 (US2)
```
T013 (write tests)   ←─ parallel with ─→   T014 (BASE_NOTES constant)
T015 (visibleNotes + render) — after T013, T014
T016 (event handlers) — after T015
T017 (StaffViewer JSX) — after T016
T018 (touch/mouse/MIDI) — after T016
T019 (CSS layout)   ←─ parallel with T015–T018 ─→
```

### Phase 5 (US3)
```
T020 (write tests)   ←─ parallel with ─→   T023 (label CSS)
T021 (showLabels state + button) — after T020
T022 (label rendering) — after T021
```

### Phase 6 (US4)
```
T024 (write tests)   ←─ parallel with ─→   T028 (octave button CSS)
T025 (octaveOffset state + buttons) — after T024
T026 (visibleNotes update) — after T025
T027 (MIDI filter update) — after T025
```

### Final Phase
```
T029 (vitest run)   ←─ parallel with ─→   T030 (tsc --noEmit)   ←─ parallel with ─→   T034 (PLUGINS.md)
T031 (build.sh verification) — after T029, T030
T032 (smoke test) — after T031
T033 (regression check) — after T032
```

---

## Implementation Strategy

**MVP Scope (US1 only)**: Complete Phases 1–2 + Phase 3. Delivers a valid importable ZIP that installs correctly and renders a stub "Virtual Keyboard Pro" view. Proves the packaging pipeline end-to-end.

**Increment 1 (US1 + US2)**: Add Phase 4. Delivers a fully playable three-octave keyboard with staff notation — the primary capability differentiating this plugin.

**Increment 2 (US1–US3)**: Add Phase 5. Adds the note label educational feature.

**Full delivery (US1–US4)**: Add Phase 6 + Final Phase. Adds octave shifting, polish, and regression validation.

---

## Task Count Summary

| Phase | Tasks | Story |
|---|---|---|
| Phase 1: Setup | 3 (T001–T003) | — |
| Phase 2: Foundational | 7 (T004–T010) | — |
| Phase 3: US1 | 2 (T011–T012) | US1 |
| Phase 4: US2 | 7 (T013–T019) | US2 |
| Phase 5: US3 | 4 (T020–T023) | US3 |
| Phase 6: US4 | 5 (T024–T028) | US4 |
| Final Phase | 6 (T029–T034) | — |
| **Total** | **34** | |

| User Story | Task count | Parallel opportunities |
|---|---|---|
| US1 — Import the Pro Plugin | 2 | — |
| US2 — Play on Extended Keyboard | 7 | T013∥T014, T019∥T015–T018 |
| US3 — Toggle Note Labels | 4 | T020∥T023 |
| US4 — Shift Octave Range | 5 | T024∥T028 |
