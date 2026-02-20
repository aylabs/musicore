# Tasks: Load Score Dialog

**Feature**: `028-load-score-dialog`  
**Input**: Design documents from `specs/028-load-score-dialog/`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/preloaded-scores.ts](./contracts/preloaded-scores.ts)

**User Stories**: 5 (US1–US4 = P1, US5 = P2)  
**Total tasks**: 26  
**MVP scope**: US1 alone (landing screen cleaned up; no dialog required for validation)

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Task can run in parallel with other [P] tasks in the same phase (different files, no cross-dependency)
- **[Story]**: User story label — only on phases 3–7
- All paths relative to repo root

---

## Phase 1: Setup

**Purpose**: Static asset infrastructure and PWA precache fix — prerequisites for all user stories.

- [X] T001 Create `frontend/public/scores/` as a symlink to the repo-root `/scores` directory (`ln -s ../../scores frontend/public/scores`)
- [X] T002 [P] Extend Workbox `globPatterns` in `frontend/vite.config.ts` to add `mxl` — change `musicxml,woff2` to `musicxml,mxl,woff2`
- [X] T003 [P] Create `frontend/src/data/preloadedScores.ts` with `PreloadedScore` interface and `PRELOADED_SCORES: ReadonlyArray<PreloadedScore>` constant (6 entries per contracts/preloaded-scores.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Manifest tests and onboarding removal. Must complete before any user story work.

**⚠️ CRITICAL**: All user story phases depend on T004 (manifest) and T005 (onboarding deleted).

- [X] T004 [P] Write manifest integrity tests in `frontend/src/data/preloadedScores.test.ts` — assert exactly 6 entries, all IDs unique, all paths start with `/scores/` and end with `.mxl`, all displayNames non-empty (verify fails before T003)
- [X] T005 [P] Delete `frontend/src/hooks/useOnboarding.ts` and the entire `frontend/src/services/onboarding/` directory (OnboardingService.ts, demoLoader.ts, config.ts, types.ts)

**Checkpoint**: Manifest constant tested; onboarding code deleted. User story work can begin.

---

## Phase 3: User Story 1 — Load Score Entry Point (P1) 🎯 MVP

**Goal**: Single **Load Score** button on landing screen; Demo button absent; no first-run auto-demo; toolbar Import renamed.

**Independent Test**: Open app with no score → one button labelled "Load Score", no Demo; open with score → toolbar shows "Load Score". No dialog functionality needed.

- [X] T006 [P] [US1] Write `frontend/src/components/load-score/LoadScoreButton.test.tsx` — render with label "Load Score"; verify `onClick` called on click; verify button is disabled when `disabled=true`; verify button is not disabled by default
- [X] T007 [US1] Create `frontend/src/components/load-score/LoadScoreButton.tsx` + `LoadScoreButton.css` — stateless button, label "Load Score", min touch target 44×44px, accepts `onClick`, `disabled?`, `className?` props
- [X] T008 [P] [US1] Remove onboarding from `frontend/src/App.tsx`: delete `useOnboarding` import and call; change `wasmLoading || isDemoLoading` loading guard to `wasmLoading`; delete `demoError` JSX notification block; delete `viewMode`/`setViewMode` if sourced from `useOnboarding` (verify they still exist in ScoreViewer)
- [X] T009 [US1] In `frontend/src/components/ScoreViewer.tsx`: add `const [dialogOpen, setDialogOpen] = useState(false)`; replace landing-screen Demo `<button>` + `<ImportButton buttonText="Import Score">` with `<LoadScoreButton onClick={() => setDialogOpen(true)} disabled={loading} />`; replace toolbar `<ImportButton buttonText="Import">` with `<LoadScoreButton onClick={() => setDialogOpen(true)} />`; remove `handleLoadDemoButtonClick` function and `demoLoaderService` import

**Checkpoint**: Landing shows single "Load Score" button; Demo button absent; toolbar renamed; no auto-demo on first run.

---

## Phase 4: User Story 2 — Load Score Dialog Layout (P1)

**Goal**: Tapping Load Score opens a modal `<dialog>` with a 6-item preloaded list (left) and a Load New Score button (right). Can be dismissed. Stacks vertically on < 480px.

**Independent Test**: Tap Load Score → dialog opens with two panels; tap backdrop or press Escape → dialog closes, app state unchanged.

- [X] T010 [P] [US2] Write `frontend/src/components/load-score/LoadScoreDialog.test.tsx` — dialog not in DOM when `open=false`; dialog renders when `open=true`; `onClose` called on `Escape` key; `onClose` called on backdrop click; dialog contains a heading and two panels; `PreloadedScoreList` and Load New Score button visible
- [X] T011 [P] [US2] Write `frontend/src/components/load-score/PreloadedScoreList.test.tsx` — renders 6 items from `PRELOADED_SCORES`; item with `loadingId` shows loading indicator; all items disabled when `disabled=true`; `onSelect` called with correct `PreloadedScore` on item click
- [X] T012 [US2] Create `frontend/src/components/load-score/PreloadedScoreList.tsx` — list of `PreloadedScore` items; shows spinner/indicator on the item matching `loadingId`; disables all items when `disabled=true`; calls `onSelect(score)` on item click
- [X] T013 [US2] Create `frontend/src/components/load-score/LoadNewScoreButton.tsx` stub — renders a "Load New Score" button + hidden `<input type="file" accept=".musicxml,.xml,.mxl">`; button click triggers file input; no import logic yet (will be completed in T020)
- [X] T014 [US2] Create `frontend/src/components/load-score/LoadScoreDialog.tsx` + `LoadScoreDialog.css` — HTML `<dialog>` element; call `dialogRef.current.showModal()` when `open` becomes true; call `dialogRef.current.close()` when `open` becomes false; listen for `close` event to call `onClose`; close on backdrop click; two-panel flexbox layout (PreloadedScoreList left, LoadNewScoreButton right); CSS stacks panels at `< 480px`
- [X] T015 [US2] Add `<LoadScoreDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onImportComplete={handleDialogImportComplete} />` to both render branches (no-score landing and score-loaded) in `frontend/src/components/ScoreViewer.tsx`

**Checkpoint**: Dialog opens/closes correctly; both panels visible; dismiss via backdrop and Escape works; stacks on mobile.

---

## Phase 5: User Story 3 — Opening a Preloaded Score (P1)

**Goal**: Tapping a preloaded score entry fetches the `.mxl`, parses it via the existing WASM pipeline, closes the dialog, and navigates to layout (play) view paused at tick 0.

**Independent Test**: Select "Beethoven — Für Elise" from list → play view opens, score rendered, playback controls visible, paused. No file picker appears.

- [X] T016 [P] [US3] Add preloaded fetch tests to `frontend/src/components/load-score/LoadScoreDialog.test.tsx` — mock `global.fetch` returning a valid blob; verify `fetch` called with `score.path` on item click; verify `useImportMusicXML.importFile` called with a `File` object; verify `loadingId` set to `score.id` during fetch; verify `loadingId` cleared to null after success; verify `onImportComplete` called on parse success
- [X] T017 [US3] Implement preloaded score load logic in `frontend/src/components/load-score/LoadScoreDialog.tsx`: on `PreloadedScoreList` `onSelect` fire `fetch(score.path)` → `.blob()` → `new File([blob], filename, {type: 'application/octet-stream'})` → `useImportMusicXML.importFile(file)`; set `loadingId = score.id` on start; clear `loadingId` on completion (success or error)
- [X] T018 [US3] In `frontend/src/components/ScoreViewer.tsx`, define `handleDialogImportComplete(result: ImportResult)`: call `handleMusicXMLImport(result)`, then `setDialogOpen(false)`, then `setViewMode('layout')` — score opens in play view paused at position zero

**Checkpoint**: Full preloaded flow works end-to-end: tap score → WASM parse → play view paused. No auto-play.

---

## Phase 6: User Story 4 — Loading a New (User-Supplied) Score (P1)

**Goal**: The Load New Score button in the dialog opens the file picker for `.musicxml/.xml/.mxl` files. Valid import closes the dialog and navigates to play view. Errors display inline inside the dialog. Cancel leaves the dialog open unchanged.

**Independent Test**: Tap Load New Score → select a `.mxl` file → score loads, play view opens. Select broken file → error shown inside dialog, dialog stays open.

- [X] T019 [P] [US4] Write `frontend/src/components/load-score/LoadNewScoreButton.test.tsx` — file input has `accept=".musicxml,.xml,.mxl"`; cancelling file picker (no file selected) causes no state change; selecting a valid file triggers `useImportMusicXML.importFile` and calls `onImportComplete` on success; import failure renders error message inside component; button is disabled when `disabled=true` or while import in progress
- [X] T020 [US4] Complete `frontend/src/components/load-score/LoadNewScoreButton.tsx` with full `useImportMusicXML` integration: handle `onChange` → call `importFile(file)` → call `onImportComplete(result)` on success; render inline error when `error` is set; reset `input.value` after each attempt; disable button while `loading=true` or `disabled` prop is true
- [X] T021 [US4] Wire `LoadNewScoreButton` into `frontend/src/components/load-score/LoadScoreDialog.tsx`: pass `onImportComplete={onImportComplete}` and `disabled={loadingId !== null}` to `LoadNewScoreButton`; on success the dialog is closed by the parent via `onImportComplete` callback chain

**Checkpoint**: File picker flow fully functional inside dialog; error display in-dialog; cancel is a no-op; concurrent disable works.

---

## Phase 7: User Story 5 — Preloaded Score Fetch Error Handling (P2)

**Goal**: If a preloaded score fetch fails (network error, HTTP error, WASM parse error), the dialog shows a named error message and provides retry. Selecting another score clears the error. Dismissing the dialog leaves the app state unchanged. Scores load from SW cache when offline.

**Independent Test**: With network disabled, select any preloaded score → error message names the score; Retry re-attempts fetch; selecting a different score clears error and begins new fetch.

- [X] T022 [P] [US5] Add fetch-error tests to `frontend/src/components/load-score/LoadScoreDialog.test.tsx` — mock `fetch` to reject; verify `presetError` contains score display name; verify Retry button re-triggers fetch; verify selecting a different score clears `presetError` and begins new load
- [X] T023 [US5] Implement error state in `frontend/src/components/load-score/LoadScoreDialog.tsx`: catch `fetch` HTTP non-OK and network errors; set `presetError = "Could not load ${score.displayName}. Try again."`; clear `presetError` at start of each new selection; render error message with Retry button that re-invokes the same load handler

**Checkpoint**: Error handling complete; retry works; selecting new score clears error; dismiss is safe.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [X] T024 Run `npm run test` in `frontend/` — verify all 26+ new test cases pass AND all pre-existing `frontend/src/components/import/ImportButton.test.tsx` tests remain green (regression baseline)
- [X] T025 [P] Run `npm run build` in `frontend/` — verify TypeScript compilation succeeds with zero errors; inspect `dist/sw.js` precache manifest to confirm `.mxl` entries are present (offline fix validated)
- [X] T026 [P] Update `specs/028-load-score-dialog/spec.md` status from `Draft` to `Active`

---

## Dependencies

### Story completion order

```
T001─T003 (Setup)
  └── T004, T005 (Foundational)
        └── US1: T006→T007, T008[P], T009
              └── US2: T010[P], T011[P] → T012, T013 → T014 → T015
                    ├── US3: T016[P] → T017 → T018
                    │         (can run in parallel with US4)
                    └── US4: T019[P] → T020 → T021
                          └── US5: T022[P] → T023
                                └── Final: T024 → T025[P], T026[P]
```

**US3 and US4 are parallel**: once US2's dialog is wired (T015), the preloaded fetch logic (US3) and the file-picker logic (US4) touch different methods/components and can be built concurrently.

### Cross-story dependencies

| Task | Depends on |
|---|---|
| T007 | T006 (tests written first — TDD) |
| T009 | T007 (LoadScoreButton must exist) |
| T012 | T011 (tests written first) |
| T014 | T010 (tests), T012, T013 |
| T015 | T009 (dialogOpen state in ScoreViewer), T014 |
| T017 | T016 (tests written first), T014 (dialog component) |
| T018 | T017 (load logic), T015 (dialog wired) |
| T020 | T019 (tests written first) |
| T021 | T020, T014 |
| T023 | T022 (tests written first), T017 |
| T024 | All implementation tasks |

---

## Parallel Execution Examples

### US1 sprint (2 devs)

| Dev A | Dev B |
|---|---|
| T006: Write LoadScoreButton tests | T008: Remove onboarding from App.tsx |
| T007: Implement LoadScoreButton | — |
| T009: Rewire ScoreViewer | — |

### US2 sprint (2 devs)

| Dev A | Dev B |
|---|---|
| T010: Write LoadScoreDialog tests | T011: Write PreloadedScoreList tests |
| T014: Implement LoadScoreDialog | T012: Implement PreloadedScoreList |
| T015: Wire dialog into ScoreViewer | T013: Implement LoadNewScoreButton stub |

### US3 + US4 parallel sprint (2 devs)

| Dev A (US3) | Dev B (US4) |
|---|---|
| T016: Add fetch tests | T019: Write LoadNewScoreButton tests |
| T017: Implement preloaded fetch | T020: Complete LoadNewScoreButton |
| T018: Wire play view transition | T021: Connect file-picker to dialog |

---

## Implementation Strategy

**MVP** (shippable after US1): Landing screen has a single Load Score button; Demo button gone; no auto-demo on first run. Dialog not yet functional — button opens nothing. Validates the UX rename independently.

**Full P1 delivery** (US1–US4): All four P1 stories in a single PR. US1 unblocks US2; US2 unblocks US3 + US4 (parallel). Realistic single-session delivery.

**P2 add-on** (US5): Fetch error handling can ship in a follow-up PR without blocking the P1 stories.

---

## Task Count Summary

| Phase | Tasks | Story |
|---|---|---|
| Phase 1: Setup | 3 (T001–T003) | — |
| Phase 2: Foundational | 2 (T004–T005) | — |
| Phase 3 | 4 (T006–T009) | US1 |
| Phase 4 | 6 (T010–T015) | US2 |
| Phase 5 | 3 (T016–T018) | US3 |
| Phase 6 | 3 (T019–T021) | US4 |
| Phase 7 | 2 (T022–T023) | US5 |
| Final | 3 (T024–T026) | — |
| **Total** | **26** | |

| | |
|---|---|
| Parallelizable [P] tasks | 14 |
| New component files | 9 |
| Modified files | 3 (ScoreViewer.tsx, App.tsx, vite.config.ts) |
| Deleted files/dirs | 2 (useOnboarding.ts, services/onboarding/) |
| New test files | 5 |
