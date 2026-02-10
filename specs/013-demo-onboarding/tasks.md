---
description: "Task list for Demo Music Onboarding implementation"
---

# Tasks: Demo Music Onboarding

**Input**: Design documents from `/specs/013-demo-onboarding/`  
**Branch**: `013-demo-onboarding`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: ✅ INCLUDED - Test-First Development required per plan.md

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and demo asset bundling

- [ ] T001 Create directory structure for onboarding services in frontend/src/services/onboarding/
- [ ] T002 Copy Canon D MusicXML from tests/fixtures/musicxml/CanonD.musicxml to frontend/public/demo/CanonD.musicxml
- [ ] T003 Verify demo asset accessibility at http://localhost:5173/demo/CanonD.musicxml and check file size ~200KB

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create TypeScript types file frontend/src/services/onboarding/types.ts based on contracts/types.ts
- [ ] T005 [P] Create onboarding configuration constants in frontend/src/services/onboarding/config.ts with defaultViewMode, demoBundlePath, enableDemoReload, firstRunTimeoutMs
- [ ] T006 [P] Setup test infrastructure with localStorage mock in frontend/tests/setup/localStorage.mock.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Immediate Music Playback on First Launch (Priority: P1) 🎯 MVP

**Goal**: New users see Canon D pre-loaded in stacked view within 5 seconds of first launch, ready to play

**Independent Test**: Clear localStorage and IndexedDB, launch app fresh, verify Canon D loads in stacked view with playback controls functional

### Tests for User Story 1 ⚠️ WRITE FIRST

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T007 [P] [US1] Unit test for first-run detection logic in frontend/tests/unit/firstRunDetection.test.ts (test isFirstRun returns true when localStorage empty, false after marking complete)
- [ ] T008 [P] [US1] Unit test for demo loader service in frontend/tests/unit/demoLoader.test.ts (mock fetch API, test successful parse, test error handling for 404/parse failures)
- [ ] T009 [P] [US1] Unit test for onboarding service orchestration in frontend/tests/unit/OnboardingService.test.ts (mock dependencies, test first-run flow initialization)
- [ ] T010 [P] [US1] Unit test for useOnboarding hook in frontend/tests/unit/useOnboarding.test.ts (use React Testing Library renderHook, test state initialization, test demo loading state)
- [ ] T011 [US1] Integration test for first-run onboarding flow in frontend/tests/integration/onboarding-flow.test.tsx (clear storage → mount App → verify demo loaded → verify stacked view active → verify playback works)

### Implementation for User Story 1

- [ ] T012 [P] [US1] Implement IFirstRunStorage adapter as LocalStorageFirstRunAdapter in frontend/src/services/storage/preferences.ts (implement isFirstRun, getFirstRunState, markFirstRunComplete, resetFirstRun methods with error handling)
- [ ] T013 [P] [US1] Implement first-run detection service in frontend/src/services/onboarding/firstRunDetection.ts (export firstRunStorage singleton, handle localStorage disabled gracefully)
- [ ] T014 [US1] Implement IDemoLoaderService as DemoLoaderService in frontend/src/services/onboarding/demoLoader.ts (implement loadBundledDemo with fetch from /demo/CanonD.musicxml, integrate with WASM parser from Feature 011, add demo metadata with isDemoScore=true)
- [ ] T015 [US1] Implement getDemoScore and isDemoLoaded methods in frontend/src/services/onboarding/demoLoader.ts (query IndexedDB for demo score with isDemoScore=true)
- [ ] T016 [US1] Implement IOnboardingService as OnboardingService in frontend/src/services/onboarding/OnboardingService.ts (implement initialize method orchestrating first-run check → load demo → mark complete, add 5-second timeout handling)
- [ ] T017 [US1] Implement useOnboarding React hook in frontend/src/hooks/useOnboarding.ts (manage isFirstRun state, isDemoLoading state, demoError state, call OnboardingService.initialize on mount)
- [ ] T018 [US1] Integrate useOnboarding hook in frontend/src/App.tsx (call useOnboarding at component mount, handle loading and error states in UI, ensure demo score displays when loaded)
- [ ] T019 [US1] Add error boundary and user notification for demo loading failures in frontend/src/App.tsx (show non-blocking warning if demo fails: "Demo music unavailable. You can import your own MusicXML files.")
- [ ] T020 [US1] Add logging for first-run analytics in frontend/src/services/onboarding/OnboardingService.ts (log first-run completion timestamp, app version, demo load time)

**Checkpoint**: User Story 1 complete - first-run users see Canon D in stacked view within 5 seconds

---

## Phase 4: User Story 2 - Persistent View Mode Preference (Priority: P2)

**Goal**: Users' view mode preference (stacked or single-instrument) persists across sessions

**Independent Test**: Switch to single-instrument view, close app, reopen app → verify single-instrument view restored; repeat with stacked view

### Tests for User Story 2 ⚠️ WRITE FIRST

- [ ] T021 [P] [US2] Unit test for view mode preference storage in frontend/tests/unit/preferences.test.ts (test getViewMode defaults to stacked, test setViewMode persists, test corrupted JSON handling)
- [ ] T022 [US2] Integration test for view mode persistence in frontend/tests/integration/onboarding-flow.test.tsx (set preference → unmount App → remount → verify preference restored, test both stacked and single modes)

### Implementation for User Story 2

- [ ] T023 [P] [US2] Implement IViewModePreferenceStorage adapter as LocalStorageViewModeAdapter in frontend/src/services/storage/preferences.ts (implement getViewModePreference, getViewMode, setViewMode, hasViewModePreference, clearViewModePreference methods)
- [ ] T024 [US2] Extend useOnboarding hook in frontend/src/hooks/useOnboarding.ts (add viewMode state initialized from LocalStorageViewModeAdapter, add setViewMode function that updates state and persists to localStorage)
- [ ] T025 [US2] Update App.tsx to use viewMode from useOnboarding hook in frontend/src/App.tsx (pass viewMode to ViewModeSelector or stacked view components from Feature 010, ensure view updates when setViewMode called)
- [ ] T026 [US2] Add useEffect in useOnboarding hook to persist view mode changes in frontend/src/hooks/useOnboarding.ts (listen to viewMode state changes, call LocalStorageViewModeAdapter.setViewMode with source="user")
- [ ] T027 [US2] Set default view mode to "stacked" on first run in frontend/src/services/onboarding/OnboardingService.ts (call setViewMode("stacked", "onboarding") during first-run initialization)

**Checkpoint**: User Story 2 complete - view mode preference persists across sessions for returning users

---

## Phase 5: User Story 3 - Optional Demo Reset (Priority: P3)

**Goal**: Users can reload Canon D demo without losing their imported music library

**Independent Test**: Import custom music, delete Canon D from library, click "Reload Demo" → verify Canon D reloads, imported music still accessible

### Tests for User Story 3 ⚠️ WRITE FIRST

- [ ] T028 [P] [US3] Unit test for reloadDemo method in frontend/tests/unit/demoLoader.test.ts (test re-fetch and re-parse, test demo re-added to library with new UUID)
- [ ] T029 [US3] Integration test for ReloadDemoButton in frontend/tests/integration/reload-demo.test.tsx (mount button → click → verify demo reloads → verify other scores unaffected)

### Implementation for User Story 3

- [ ] T030 [P] [US3] Implement reloadDemo method in frontend/src/services/onboarding/demoLoader.ts (re-fetch from bundled path, re-parse via WASM, store with new UUID and isDemoScore=true)
- [ ] T031 [P] [US3] Create ReloadDemoButton component in frontend/src/components/demo/ReloadDemoButton.tsx (button with onClick calling DemoLoaderService.reloadDemo, show loading state, handle errors)
- [ ] T032 [US3] Add ReloadDemoButton to settings or help menu in appropriate location (determine menu location based on existing app structure, integrate component)
- [ ] T033 [US3] Update onboarding config in frontend/src/services/onboarding/config.ts (set enableDemoReload=true for P3 feature)

**Checkpoint**: User Story 3 complete - users can reload demo music on demand

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refinements, performance optimization, and quality assurance

- [ ] T034 [P] Add comprehensive error handling for localStorage disabled scenarios in frontend/src/services/storage/preferences.ts (detect SecurityError, log warning, provide in-memory fallback)
- [ ] T035 [P] Add performance logging for demo load time in frontend/src/services/onboarding/OnboardingService.ts (measure time from fetch start to render complete, log if exceeds 5-second target)
- [ ] T036 Add accessibility attributes to demo-related UI components in frontend/src/components/demo/ReloadDemoButton.tsx (ARIA labels, keyboard navigation, screen reader announcements)
- [ ] T037 Document onboarding system in code comments in frontend/src/hooks/useOnboarding.ts (JSDoc for hook usage, parameters, return values)
- [ ] T038 Manual QA: Test on fresh browser profile (clear all data, verify first-run experience matches acceptance criteria)
- [ ] T039 Manual QA: Test in private/incognito mode (verify graceful degradation when localStorage doesn't persist)
- [ ] T040 Manual QA: Test on physical tablet devices (iPad, Android tablet - verify demo loads in <5 seconds over 3G)
- [ ] T041 Manual QA: Test offline mode (disconnect network after initial app load, verify demo cached and accessible)
- [ ] T042 Manual QA: Test localStorage disabled scenario (browser settings or iframe context, verify app doesn't crash)
- [ ] T043 Performance validation: Measure and verify first-run to playable demo <5 seconds (run performance.now() measurements, log results)
- [ ] T044 Performance validation: Verify demo bundle size <500KB (check CanonD.musicxml file size, verify gzipped size ~50KB)

---

## Dependencies & Execution Order

### Story Dependency Graph

```
Setup (Phase 1)
  ↓
Foundational (Phase 2)
  ↓
User Story 1 (P1) ← MUST complete first (MVP)
  ↓ (builds on first-run infrastructure)
User Story 2 (P2) ← Can start after US1 complete
  ↓ (independent, adds preference persistence)
User Story 3 (P3) ← Can start after US1 complete (requires demo loader)
  ↓
Polish (Phase 6)
```

### Parallel Execution Opportunities

**Within User Story 1** (after T006 complete):
- **Parallel Group 1**: T007, T008, T009, T010 (all unit tests, different files)
- **Parallel Group 2**: T012, T013 (first-run detection adapter + service, independent files)
- **Sequential**: T014 → T015 (demo loader methods in same file)
- **Sequential**: T016 → T017 → T018 (orchestration service → hook → App integration, dependencies)

**Within User Story 2** (after US1 complete):
- **Parallel**: T021, T023 (test and implementation, independent files)
- **Sequential**: T024 → T025 → T026 → T027 (hook extension → App integration → persistence logic)

**Within User Story 3** (after US1 complete):
- **Parallel**: T028, T030, T031 (test, service method, component - different files)
- **Sequential**: T032 → T033 (menu integration after component exists)

**Polish Phase**:
- **Parallel**: T034, T035, T036, T037 (all independent code improvements)
- **Sequential**: T038-T044 (manual QA and performance validation, one at a time)

---

## Implementation Strategy

### MVP Scope (Recommended Initial Delivery)

**Phase 1 + Phase 2 + Phase 3 (User Story 1 only)**
- Delivers core value: first-run users immediately experience app with Canon D demo
- Task count: T001-T020 (20 tasks)
- Estimated effort: 1-2 days
- Validation: Can demo app to stakeholders showing instant music playback

### Incremental Delivery Plan

1. **MVP**: User Story 1 (T001-T020) → Deploy and gather feedback
2. **Increment 2**: User Story 2 (T021-T027) → Improve returning user experience
3. **Increment 3**: User Story 3 (T028-T033) → Add convenience feature for demo reload
4. **Final**: Polish (T034-T044) → QA and performance optimization

---

## Success Criteria Validation

Map tasks to success criteria from spec.md:

| Success Criteria | Validating Tasks |
|------------------|------------------|
| SC-001: New users play Canon D within 5 seconds | T043 (performance validation), T011 (integration test) |
| SC-002: 80% first-time users interact with playback | T011 (integration test verifies playback works), T038 (manual QA) |
| SC-003: View mode persists 100% of sessions | T022 (integration test), T039 (manual QA incognito mode) |
| SC-004: Demo loads without errors in 99% of first-runs | T008 (error handling tests), T019 (error UI), T038-T042 (manual QA) |
| SC-005: Preference remembered 100% of sessions | T021 (unit test), T022 (integration test) |
| SC-006: Bundle size <500KB | T044 (performance validation) |
| SC-007: Launch to render <3 seconds on mid-range tablets | T040 (manual QA on physical devices), T043 (performance measurement) |

---

## Task Summary

- **Total Tasks**: 44
- **Setup Phase**: 3 tasks (T001-T003)
- **Foundational Phase**: 3 tasks (T004-T006)
- **User Story 1 (P1 - MVP)**: 14 tasks (T007-T020)
- **User Story 2 (P2)**: 7 tasks (T021-T027)
- **User Story 3 (P3)**: 6 tasks (T028-T033)
- **Polish Phase**: 11 tasks (T034-T044)

**Parallelizable Tasks**: 16 tasks marked with [P] (36% can run in parallel)

**Independent Test Criteria Defined**: ✅
- User Story 1: Fresh install → Canon D loads in stacked view → playback works
- User Story 2: Switch view mode → restart app → preference restored
- User Story 3: Delete demo → reload demo → demo restored, other music intact

**Format Validation**: ✅ All tasks follow checklist format (checkbox, ID, labels, file paths)

---

**Tasks Ready for Implementation**: Proceed with Phase 1 setup tasks (T001-T003) to begin development.
