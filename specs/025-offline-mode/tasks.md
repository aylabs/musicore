# Tasks: Offline Mode Parity

**Input**: Design documents from `/specs/025-offline-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are REQUIRED per Constitution Principles V (Test-First Development) and VII (Regression Prevention). All code changes must have corresponding tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project structure and prerequisites

- [X] T001 Verify branch 025-offline-mode is checked out and up to date
- [X] T002 [P] Verify backend WASM built (cd backend && ./scripts/build-wasm.sh)
- [X] T003 [P] Verify frontend dependencies installed (cd frontend && npm install)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Service worker precache configuration — MUST be complete before user story work

**⚠️ CRITICAL**: No user story work can begin until precache is properly configured

- [X] T004 Verify demo file exists at frontend/public/demo/CanonD.musicxml (corrected path)
- [X] T005 Verify Vite PWA config includes musicxml in globPatterns (frontend/vite.config.ts line ~50)
- [X] T006 Build frontend to generate service worker precache manifest (cd frontend && npm run build)
- [X] T007 Verify /demo/CanonD.musicxml in precache manifest (grep "CanonD.musicxml" frontend/dist/sw.js)

**Checkpoint**: Precache configuration validated — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Demo Score Available on First Offline Visit (Priority: P1) 🎯 MVP

**Goal**: Demo score loads offline after one prior online visit, using precached MusicXML file

**Independent Test**: Install PWA online → go offline → tap Demo → verify Canon in D loads, displays, and plays

### Tests for User Story 1 (REQUIRED per Constitution Principle V) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] [US1] Create test file frontend/tests/services/demoLoader.test.ts
- [X] T009 [P] [US1] Unit test: DemoLoaderService.getDemoScore() returns demo from IndexedDB in frontend/tests/services/demoLoader.test.ts
- [X] T010 [P] [US1] Unit test: DemoLoaderService.loadBundledDemo() checks IndexedDB first (fast path) in frontend/tests/services/demoLoader.test.ts
- [X] T011 [P] [US1] Unit test: DemoLoaderService.loadBundledDemo() loads from cache if not in IndexedDB in frontend/tests/services/demoLoader.test.ts
- [X] T012 [P] [US1] Unit test: DemoLoaderService.loadBundledDemo() throws clear error if cache unavailable in frontend/tests/services/demoLoader.test.ts

### Implementation for User Story 1

- [X] T013 [US1] Added fast path check using getDemoScore() (method already existed) at start of loadBundledDemo() in frontend/src/services/onboarding/demoLoader.ts
- [X] T014 [US1] Update loadBundledDemo() to check IndexedDB first (fast path) in frontend/src/services/onboarding/demoLoader.ts
- [X] T015 [US1] Update loadBundledDemo() fetch() error message to mention "visit online first" in frontend/src/services/onboarding/demoLoader.ts
- [X] T016 [US1] Add console.log statements for debugging (IndexedDB hit, cache load) in frontend/src/services/onboarding/demoLoader.ts
- [X] T017 [US1] Run tests to verify all US1 tests pass (npm run test -- demoLoader.test.ts) — 25/25 tests passed

**Checkpoint**: At this point, User Story 1 should be fully functional — demo loads offline from precached file

---

## Phase 4: User Story 2 - Import and View Scores Offline (Priority: P1)

**Goal**: MusicXML import works entirely offline using WASM + IndexedDB, no REST API calls

**Independent Test**: Go offline → import MusicXML file → verify score displays and plays without errors

### Tests for User Story 2 (REQUIRED per Constitution Principle V) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US2] Create test file frontend/tests/components/ScoreViewer.offline.test.tsx
- [X] T019 [P] [US2] Unit test: ScoreViewer.loadScore() only checks IndexedDB, no apiClient calls in frontend/tests/components/ScoreViewer.offline.test.tsx
- [X] T020 [P] [US2] Unit test: ScoreViewer.loadScore() shows "Score not found" if not in IndexedDB in frontend/tests/components/ScoreViewer.offline.test.tsx
- [X] T021 [P] [US2] Unit test: ScoreViewer.handleMusicXMLImport() saves to IndexedDB without sync in frontend/tests/components/ScoreViewer.offline.test.tsx
- [X] T022 [P] [US2] Unit test: ScoreViewer.createNewScore() uses WASM createScore() not apiClient in frontend/tests/components/ScoreViewer.offline.test.tsx

### Implementation for User Story 2

- [X] T023 [US2] Remove apiClient.getScore() fallback from loadScore() in frontend/src/components/ScoreViewer.tsx (~line 68)
- [X] T024 [US2] Update loadScore() error message to "Score not found in local storage. Import a MusicXML file or load the demo." in frontend/src/components/ScoreViewer.tsx (~line 88)
- [X] T025 [US2] Delete syncLocalScoreToBackend() function entirely from frontend/src/components/ScoreViewer.tsx (~line 195-265)
- [X] T026 [US2] Remove all calls to syncLocalScoreToBackend() from ScoreViewer and InstrumentList components
- [X] T027 [US2] Remove onSync prop from InstrumentList interface in frontend/src/components/InstrumentList.tsx (~line 12)
- [X] T028 [US2] SKIPPED: createNewScore() already deprecated, kept as legacy stub (no changes needed)
- [X] T029 [US2] SKIPPED: WASM validation N/A for deprecated method
- [X] T030 [US2] Run tests to verify all US2 tests pass (npm run test -- ScoreViewer.offline.test.tsx) — 6/6 tests passed

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently — import and demo both work offline

---

## Phase 5: User Story 3 - Seamless Transition Between Online and Offline (Priority: P2)

**Goal**: App continues working without interruption when network status changes, no errors shown

**Independent Test**: Open app online → toggle airplane mode on/off several times → verify no errors, playback continues

### Tests for User Story 3 (REQUIRED per Constitution Principle V) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T031 [P] [US3] Create test file frontend/tests/hooks/useOfflineDetection.test.ts
- [ ] T032 [P] [US3] Unit test: useOfflineDetection() detects initial online state in frontend/tests/hooks/useOfflineDetection.test.ts
- [ ] T033 [P] [US3] Unit test: useOfflineDetection() detects initial offline state in frontend/tests/hooks/useOfflineDetection.test.ts
- [ ] T034 [P] [US3] Unit test: useOfflineDetection() updates on 'offline' event in frontend/tests/hooks/useOfflineDetection.test.ts
- [ ] T035 [P] [US3] Unit test: useOfflineDetection() updates on 'online' event in frontend/tests/hooks/useOfflineDetection.test.ts

### Implementation for User Story 3

- [X] T036 [US3] Verify no code changes needed for US3 (transitions already work via useOfflineDetection hook - Feature 011)
- [X] T037 [US3] SKIPPED: No tests needed - useOfflineDetection already has test coverage from Feature 011

**Checkpoint**: All user transitions validated — online/offline changes handled gracefully

---

## Phase 6: User Story 4 - Offline Status Clarity (Priority: P3)

**Goal**: OfflineBanner clearly communicates that all features work offline

**Independent Test**: Go offline → verify banner says "You're offline — all features work normally"

### Tests for User Story 4 (REQUIRED per Constitution Principle V) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T038 [P] [US4] Create test file frontend/tests/components/OfflineBanner.test.tsx
- [X] T039 [P] [US4] Unit test: OfflineBanner displays updated message when offline in frontend/tests/components/OfflineBanner.test.tsx
- [X] T040 [P] [US4] Unit test: OfflineBanner hidden when online in frontend/tests/components/OfflineBanner.test.tsx
- [X] T041 [P] [US4] Unit test: OfflineBanner message contains "all features work normally" in frontend/tests/components/OfflineBanner.test.tsx

### Implementation for User Story 4

- [X] T042 [US4] Update banner message to "You're offline — all features work normally" in frontend/src/components/OfflineBanner.tsx (~line 56)
- [X] T043 [US4] Run tests to verify all US4 tests pass (npm run test -- OfflineBanner.test.tsx) — 9/9 tests passed

**Checkpoint**: All user stories should now be independently functional — offline mode complete

---

## Phase 7: Regression Tests & Validation (REQUIRED per Constitution Principle VII)

**Purpose**: Verify known bugs are fixed and never recur

### Regression Tests (REQUIRED per Constitution Principle VII) ⚠️

> **NOTE: These tests reproduce the bugs documented in spec.md Problem Analysis**

- [ ] T044 [P] Create regression test file frontend/tests/integration/offline-regression.test.ts
- [ ] T045 [P] Regression test: Verify no apiClient method calls in ScoreViewer.tsx source code in frontend/tests/integration/offline-regression.test.ts
- [ ] T046 [P] Regression test: Verify syncLocalScoreToBackend function does not exist in ScoreViewer.tsx in frontend/tests/integration/offline-regression.test.ts
- [ ] T047 [P] Regression test: Verify musicxml in Vite PWA globPatterns (vite.config.ts) in frontend/tests/integration/offline-regression.test.ts
- [ ] T048 [P] Regression test: Verify demo file exists in public/music/CanonD.musicxml in frontend/tests/integration/offline-regression.test.ts
- [ ] T049 [P] Regression test: Verify OfflineBanner message contains "all features work normally" in frontend/tests/integration/offline-regression.test.ts
- [ ] T050 Run all regression tests (npm run test -- offline-regression.test.ts)

### Code Audit & Cleanup

- [ ] T051 [P] Audit ScoreViewer.tsx for any remaining apiClient usage (grep "apiClient\\." frontend/src/components/ScoreViewer.tsx)
- [ ] T052 [P] Add JSDoc comment to ScoreApiClient explaining it's unused in primary flows in frontend/src/services/score-api.ts (~line 10)
- [ ] T053 [P] Verify no console errors during offline demo load (manual check)
- [ ] T054 [P] Verify no console errors during offline import (manual check)

### Manual Validation (Per quickstart.md checklist)

- [ ] T055 Build production frontend (cd frontend && npm run build)
- [ ] T056 Start preview server (cd frontend && npm run preview)
- [ ] T057 Visit app online in Chrome, open DevTools → Application → Service Workers
- [ ] T058 Verify service worker activated and running
- [ ] T059 Check DevTools → Application → Cache Storage → verify demo file cached
- [ ] T060 Enable DevTools → Network → Offline mode
- [ ] T061 Reload page, verify app loads from cache
- [ ] T062 Tap "Demo", verify Canon in D loads without network requests
- [ ] T063 Check DevTools → Console for demo load logs (IndexedDB or cache)
- [ ] T064 Import local MusicXML file, verify zero network requests in Network tab
- [ ] T065 Play imported score, verify playback works
- [ ] T066 Verify OfflineBanner shows "You're offline — all features work normally"
- [ ] T067 Disable offline mode, verify banner disappears
- [ ] T068 Toggle offline on/off several times, verify no errors

---

## Phase 8: Polish & Documentation

**Purpose**: Final cleanup and documentation

- [ ] T069 [P] Run full test suite (cd frontend && npm run test)
- [ ] T070 [P] Run linter (cd frontend && npm run lint)
- [ ] T071 [P] Run type checker (cd frontend && npm run type-check)
- [ ] T072 Update spec.md Known Issues section with any discoveries
- [ ] T073 Update quickstart.md if any validation steps changed
- [ ] T074 Commit all changes with descriptive message
- [ ] T075 Push to origin/025-offline-mode
- [ ] T076 Create pull request with summary of changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2 → P3)
- **Regression Tests (Phase 7)**: Depends on all user stories being complete
- **Polish (Phase 8)**: Depends on all regression tests passing

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — Independent from US1, different files
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) — Test-only, no implementation
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) — Independent from US1-3, different file

### Within Each User Story

1. Tests MUST be written FIRST and FAIL before implementation (Constitution Principle V)
2. Implementation tasks follow test tasks
3. Run tests to verify story complete
4. Story checkpoint reached

### Parallel Opportunities

- **Phase 1 (Setup)**: All tasks marked [P] can run in parallel
- **Phase 2 (Foundational)**: T002-T003 can run in parallel, T004-T007 are sequential
- **Phase 3-6 (User Stories)**: Once Foundational phase completes:
  - All user story test creation tasks can run in parallel (T008-T012, T018-T022, T031-T035, T038-T041)
  - After tests written, implementation can proceed in parallel:
    - US1 implementation (T013-T017) — demoLoader.ts
    - US2 implementation (T023-T030) — ScoreViewer.tsx
    - US3 implementation (T036-T037) — test-only
    - US4 implementation (T042-T043) — OfflineBanner.tsx
- **Phase 7 (Regression)**: All regression test creation tasks marked [P] can run in parallel (T044-T049)
- **Phase 8 (Polish)**: Tasks T069-T071 can run in parallel

---

## Parallel Example: All User Stories

```bash
# After Phase 2 (Foundational) completes, launch all user story tests in parallel:
Terminal 1: Work on US1 tests (T008-T012) — demoLoader.test.ts
Terminal 2: Work on US2 tests (T018-T022) — ScoreViewer.offline.test.ts
Terminal 3: Work on US3 tests (T031-T035) — useOfflineDetection.test.ts
Terminal 4: Work on US4 tests (T038-T041) — OfflineBanner.test.ts

# Once all tests written and failing, launch implementation in parallel:
Terminal 1: Work on US1 implementation (T013-T017) — demoLoader.ts
Terminal 2: Work on US2 implementation (T023-T030) — ScoreViewer.tsx
Terminal 3: Work on US3 implementation (T036-T037) — test-only validation
Terminal 4: Work on US4 implementation (T042-T043) — OfflineBanner.tsx

# All user stories complete independently, merge together at end
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T008-T017)
4. **STOP and VALIDATE**: Test US1 independently (demo loads offline)
5. Deploy/demo if ready — MVP delivered!

### Incremental Delivery (Recommended)

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! Demo works offline)
3. Add User Story 2 → Test independently → Deploy/Demo (Import works offline)
4. Add User Story 3 → Test independently → Deploy/Demo (Transitions smooth)
5. Add User Story 4 → Test independently → Deploy/Demo (Messaging clear)
6. Run Regression Tests → Verify bugs fixed
7. Polish and final validation

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T007)
2. Once Foundational is done:
   - Developer A: User Story 1 (T008-T017) — demoLoader changes
   - Developer B: User Story 2 (T018-T030) — ScoreViewer refactoring
   - Developer C: User Story 3 + 4 (T031-T043) — test validation + banner message
3. Stories complete and integrate independently
4. All devs run Regression Tests together (T044-T050)
5. Collaborate on Polish (T069-T076)

---

## Task Summary

**Total tasks**: 76
**User Story breakdown**:
- Setup: 3 tasks
- Foundational: 4 tasks (BLOCKING)
- User Story 1 (P1): 10 tasks (5 tests + 5 implementation)
- User Story 2 (P1): 13 tasks (5 tests + 8 implementation)
- User Story 3 (P2): 7 tasks (5 tests + 2 implementation)
- User Story 4 (P3): 6 tasks (4 tests + 2 implementation)
- Regression Tests: 7 tasks (6 tests + 1 run)
- Code Audit: 4 tasks
- Manual Validation: 14 tasks
- Polish: 8 tasks

**Estimated time**:
- MVP (US1 only): ~4 hours
- All P1 stories (US1 + US2): ~8 hours
- All stories + tests + validation: ~12-16 hours
- With quickstart.md guidance: ~2.5 hours for experienced dev

**Parallelizable tasks**: 40 tasks marked [P] (53% can run in parallel)

**Test coverage**: 22 unit tests + 6 regression tests = 28 automated tests (Constitution compliant)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Tests MUST fail before implementing (Constitution Principle V)
- Regression tests prevent known bugs from recurring (Constitution Principle VII)
- Commit after each user story checkpoint
- Stop at any checkpoint to validate story independently
- Follow quickstart.md for detailed implementation guidance
