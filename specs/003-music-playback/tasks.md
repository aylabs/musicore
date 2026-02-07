# Tasks: Music Playback

**Input**: Design documents from `/specs/003-music-playback/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [X] T001 Install Tone.js dependency in frontend: `cd frontend && npm install tone@^14.7.0`
- [X] T002 [P] Add uuid dependency to backend Cargo.toml (if not present): `uuid = { version = "1.0", features = ["v4", "serde"] }` - Already present
- [X] T003 [P] Create frontend playback types file: `frontend/src/types/playback.ts` with PlaybackStatus, PlaybackState, ScheduledNote interfaces

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend Instrument entity and Score API updates - MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Domain Model

- [X] T004 Create Instrument entity in `backend/src/models/instrument.rs` with id and instrument_type fields, Default impl
- [X] T005 Add Instrument module export to `backend/src/models/mod.rs`
- [X] T006 Update Score entity in `backend/src/models/score.rs` to add instruments: Vec<Instrument> field
- [X] T007 Update Score::new() method to initialize with vec![Instrument::default()]
- [X] T008 [P] Write unit tests for Instrument in `backend/tests/unit/models/instrument_test.rs` (default is piano, custom instrument creation)
- [X] T009 Update Score service in `backend/src/services/score_service.rs` to handle instruments in CRUD operations
- [X] T010 Update Score API handler in `backend/src/api/score_handler.rs` to serialize instruments in responses
- [X] T011 Update Score API contract tests in `backend/tests/integration/api/score_api_test.rs` to validate instruments field in GET /scores/{id}

### Frontend Type Updates

- [X] T012 [P] Update Score interface in `frontend/src/types/score.ts` to add instruments: Instrument[] field
- [X] T013 [P] Add getScoreInstrument() helper function in `frontend/src/types/score.ts` for backward compatibility
- [X] T014 [P] Update ScoreApiClient in `frontend/src/services/api/ScoreApiClient.ts` to handle instruments in Score type responses

**Checkpoint**: Foundation ready - Backend serves Instrument entity, Frontend types updated. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Basic Playback Controls (Priority: P1) 🎯 MVP

**Goal**: Implement Play/Pause/Stop buttons that control playback state and trigger audio initialization

**Independent Test**: Click Play button to start playback (even if only initialization happens), Pause to stop, Stop to reset. Validates basic state management and control flow without requiring accurate timing or piano sound.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T015 [P] [US1] Write unit test for PlaybackControls component in `frontend/src/components/playback/PlaybackControls.test.tsx` (button rendering, click handlers, disabled states)
- [X] T016 [P] [US1] Write unit test for MusicTimeline hook in `frontend/src/services/playback/MusicTimeline.test.ts` (state transitions: stopped→playing, playing→paused, paused→playing, stopped on stop)
- [X] T017 [P] [US1] Write unit test for ToneAdapter initialization in `frontend/src/services/playback/ToneAdapter.test.ts` (init() called once, handles autoplay policy)

### Implementation for User Story 1

- [X] T018 [P] [US1] Create ToneAdapter class in `frontend/src/services/playback/ToneAdapter.ts` with init(), getCurrentTime(), stopAll() methods (stub playNote for now)
- [X] T019 [US1] Implement ToneAdapter.init() with Tone.start() and PolySynth initialization (maxPolyphony: 16, basic envelope)
- [X] T020 [P] [US1] Create MusicTimeline hook in `frontend/src/services/playback/MusicTimeline.ts` with usePlayback(notes, tempo) returning {status, currentTick, play, pause, stop}
- [X] T021 [US1] Implement MusicTimeline.play() to call ToneAdapter.init() and transition status to 'playing'
- [X] T022 [US1] Implement MusicTimeline.pause() to transition status to 'paused' and track currentTick
- [X] T023 [US1] Implement MusicTimeline.stop() to call ToneAdapter.stopAll(), reset currentTick to 0, transition to 'stopped'
- [X] T024 [US1] Create PlaybackControls component in `frontend/src/components/playback/PlaybackControls.tsx` with Play/Pause/Stop buttons, disabled states based on playback status
- [X] T025 [US1] Integrate PlaybackControls into ScoreViewer component (add above instrument list)
- [X] T026 [US1] Add visual playback state indicator to PlaybackControls (display current status: playing/paused/stopped)
- [X] T027 [US1] Handle edge case: empty score with no notes (disable Play button or show "No notes to play" message)
- [X] T028 [US1] Handle edge case: clicking Play while already playing (ignore duplicate clicks or restart from beginning per research decision)

**Checkpoint**: At this point, User Story 1 should be fully functional - Play/Pause/Stop buttons control playback state, audio context initializes on Play. No actual notes play yet (that's US2).

---

## Phase 4: User Story 2 - Accurate Note Timing (Priority: P2)

**Goal**: Implement tick-to-time conversion and schedule notes at correct timing positions with accurate durations

**Independent Test**: Create a score with 4 quarter notes at 120 BPM (960 ticks apart). Playback should play notes at 0s, 0.5s, 1.0s, 1.5s with 0.5s durations. Measure timing accuracy with audio editor or console.log timestamps. Validates timing calculations without requiring piano-like sound quality.

### Tests for User Story 2

- [X] T029 [P] [US2] Write unit test for ticksToSeconds() in `frontend/src/services/playback/PlaybackScheduler.test.ts` (quarter note at 120BPM=0.5s, at 60BPM=1.0s, different tick values)
- [X] T030 [P] [US2] Write unit test for PlaybackScheduler.scheduleNotes() in `frontend/src/services/playback/PlaybackScheduler.test.ts` (notes scheduled at correct times, durations calculated correctly, currentTick offset applied)
- [X] T031 [P] [US2] Write integration test for note timing in `frontend/tests/integration/playback-integration.test.tsx` (verify notes play at expected times using Tone.Offline rendering)

### Implementation for User Story 2

- [X] T032 [P] [US2] Create PlaybackScheduler class in `frontend/src/services/playback/PlaybackScheduler.ts` with constructor(toneAdapter), scheduleNotes(notes, tempo, currentTick), clearSchedule() methods
- [X] T033 [P] [US2] Implement ticksToSeconds() pure function in `frontend/src/services/playback/PlaybackScheduler.ts` using formula: ticks / (tempo/60 * 960)
- [X] T034 [US2] Implement ToneAdapter.playNote(pitch, duration, time) method to call polySynth.triggerAttackRelease() with Tone.Frequency conversion
- [X] T035 [US2] Implement PlaybackScheduler.scheduleNotes() to iterate notes, calculate startTime and duration using ticksToSeconds(), call ToneAdapter.playNote() for each
- [X] T036 [US2] Implement PlaybackScheduler.clearSchedule() to call ToneAdapter.stopAll() and Tone.Transport.cancel()
- [X] T037 [US2] Integrate PlaybackScheduler into MusicTimeline.play() to schedule notes after ToneAdapter initialization
- [X] T038 [US2] Update MusicTimeline.pause() to call PlaybackScheduler.clearSchedule() and calculate currentTick based on elapsed time
- [X] T039 [US2] Add PPQ constant (960) to PlaybackScheduler with documentation explaining 960 ticks per quarter note
- [X] T040 [US2] Handle edge case: notes with extremely short durations (<50ms) - ensure they still trigger sound
- [X] T041 [US2] Handle edge case: simultaneous notes (same start_tick) - verify all schedule at same time for polyphonic playback
- [X] T042 [US2] Add tempo fallback: default to 120 BPM if score.tempo is undefined or invalid

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - Notes play at correct times with accurate durations. Timing verification can be done with console.log or audio analysis.

---

## Phase 5: User Story 3 - Piano Sound Synthesis (Priority: P3)

**Goal**: Configure PolySynth with ADSR envelope for piano-like timbre and implement MIDI pitch mapping

**Independent Test**: Play any note (e.g., middle C = MIDI 60) and verify it produces a piano-like sound with attack and decay characteristics, not a simple sine wave. Verify different pitches produce correct piano notes. Test chord (10 simultaneous notes) to validate polyphony.

### Tests for User Story 3

- [ ] T043 [P] [US3] Write unit test for ToneAdapter MIDI pitch mapping in `frontend/src/services/playback/ToneAdapter.test.ts` (MIDI 60 maps to "C4", MIDI 69 to "A4")
- [ ] T044 [P] [US3] Write unit test for ToneAdapter out-of-range pitches in `frontend/src/services/playback/ToneAdapter.test.ts` (MIDI <21 or >108 logs warning, skips playback)
- [x] T045 [P] [US3] Write manual test checklist in `specs/003-music-playback/checklists/manual-tests.md` for piano sound quality (SC-007: harmonically rich tone, SC-005: 10 simultaneous notes)

### Implementation for User Story 3

- [x] T046 [US3] Configure PolySynth ADSR envelope in ToneAdapter.init() with attack=0.005s, decay=0.3s, sustain=0.5, release=1.0s for piano-like timbre - **COMPLETED via Salamander Grand Piano samples**
- [x] T047 [US3] Add oscillator configuration to PolySynth (consider triangle+sine blend for richer harmonics per research decision) - **COMPLETED via Salamander Grand Piano samples (real piano sound)**
- [x] T048 [US3] Implement MIDI pitch validation in ToneAdapter.playNote() to check range 21-108 (standard piano), skip or clamp out-of-range notes
- [x] T049 [US3] Add pitch mapping conversion in ToneAdapter.playNote() using Tone.Frequency(midiPitch, 'midi').toNote() - **COMPLETED via Salamander sampler integration**
- [x] T050 [US3] Test polyphonic playback with 10 simultaneous notes (create test score with chord) to verify maxPolyphony setting - **COMPLETED: test_polyphonic_chord_10_notes in backend/tests/api_integration_test.rs**
- [x] T051 [US3] Handle edge case: notes outside piano range - log warning and skip silently (don't crash)
- [x] T052 [US3] Add browser autoplay policy error handling with user-friendly message in PlaybackControls - **COMPLETED: Error handling in MusicTimeline + UI display in PlaybackControls**

**Checkpoint**: All user stories should now be independently functional - Playback has piano-like sound quality with accurate timing and responsive controls.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [ ] T053 [P] Add visual feedback for pause/resume in PlaybackControls (change button text: "Play" vs "Resume")
- [ ] T054 [P] Add error boundary in PlaybackControls to catch Tone.js initialization failures gracefully
- [ ] T055 Optimize bundle size: verify Tone.js tree-shaking (import only used classes: PolySynth, Synth, start, now, Frequency)
- [ ] T056 [P] Add loading state while Tone.js initializes (prevent double-clicks on Play button)
- [ ] T057 Handle edge case: user navigates away during playback - add cleanup in useEffect return (call stop() on unmount)
- [ ] T058 Handle edge case: pausing at exact moment note starts - verify note pauses mid-sound (Tone.js should handle automatically)
- [ ] T059 [P] Update PlaybackControls styling for better UX (button sizes, spacing, icons per design system)
- [ ] T060 [P] Add keyboard shortcuts for playback controls (Space = Play/Pause, Escape = Stop) in PlaybackControls component
- [ ] T061 Run manual validation checklist from `specs/003-music-playback/checklists/manual-tests.md`
- [ ] T062 Run quickstart.md Step 5 validation (SC-001 through SC-010 success criteria)
- [ ] T063 [P] Add JSDoc documentation to ToneAdapter, PlaybackScheduler, and MusicTimeline public methods
- [ ] T064 Performance profiling: verify playback start <500ms, control response <100ms (SC-001, SC-004)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3) - **RECOMMENDED for MVP**
- **Polish (Phase 6)**: Depends on all three user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Delivers: Playback state management, UI controls, audio initialization
  - MVP Stop Point: This alone provides basic playback controls (even without timing or sound quality)
  
- **User Story 2 (P2)**: Can start after US1 completion (recommended) or in parallel after Foundational
  - Depends on: ToneAdapter and MusicTimeline from US1
  - Delivers: Notes play at correct times with accurate durations
  - MVP Stop Point: US1 + US2 = functional playback with correct timing (acceptable for testing)
  
- **User Story 3 (P3)**: Can start after US1 completion (recommended) or in parallel after Foundational
  - Depends on: ToneAdapter from US1
  - Delivers: Piano-like sound quality with ADSR envelope
  - MVP Stop Point: US1 + US2 + US3 = complete feature (production-ready)

### Within Each User Story

1. **Tests MUST be written FIRST** and verified to FAIL
2. Parallel tasks ([P]) within a story can run simultaneously:
   - US1: Tests (T015-T017), ToneAdapter+MusicTimeline creation (T018+T020)
   - US2: Tests (T029-T031), PlaybackScheduler+ticksToSeconds (T032-T033)
   - US3: Tests (T043-T045), ADSR config+pitch mapping (T046-T049)
3. Implementation follows: models → services → integration → edge cases
4. Verify story checkpoint before proceeding to next story

### Parallel Opportunities

**Within Foundational Phase (After T004-T007 complete)**:
- T008 (Instrument tests), T012 (Score type), T013 (helper function), T014 (API client) can run in parallel

**Within User Story 1 (After T018-T020 complete)**:
- T015-T017 (all tests) can run in parallel
- T018 and T020 (ToneAdapter + MusicTimeline creation) can run in parallel

**Within User Story 2 (After T032-T033 complete)**:
- T029-T031 (all tests) can run in parallel
- T032 and T033 (scheduler + timing function) can run in parallel

**Within User Story 3**:
- T043-T045 (all tests) can run in parallel
- T046-T047 (ADSR + oscillator config) can run in parallel

**Across User Stories (if team capacity allows)**:
- After Foundational completes, US1, US2, US3 can be worked on by different developers in parallel
- US1 must complete first for US2/US3 to integrate properly (recommended sequential approach)

---

## Parallel Example: User Story 1

```bash
# After Foundation is complete, launch US1 tests in parallel:
Task T015: "Write PlaybackControls component test" (different file)
Task T016: "Write MusicTimeline hook test" (different file)
Task T017: "Write ToneAdapter init test" (different file)

# Then launch US1 service creation in parallel:
Task T018: "Create ToneAdapter class" (different file)
Task T020: "Create MusicTimeline hook" (different file)

# Sequential implementation follows (integration tasks):
Task T019: "Implement ToneAdapter.init()" (modifies T018)
Task T021-T023: "Implement play/pause/stop in MusicTimeline" (modifies T020)
Task T024: "Create PlaybackControls component" (integrates T020)
Task T025: "Integrate into NotationRenderer" (integrates T024)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003) - ~30 minutes
2. Complete Phase 2: Foundational (T004-T014) - ~2 hours
3. Complete Phase 3: User Story 1 (T015-T028) - ~3 hours
4. **STOP and VALIDATE**: 
   - Test Play/Pause/Stop buttons
   - Verify audio context initializes
   - Confirm state transitions work
   - **Estimated total: ~6 hours for US1 MVP**
5. Deploy/demo if ready (basic playback controls without timing or sound quality)

### Incremental Delivery (Recommended)

1. **Foundation** (Phase 1-2): ~2.5 hours → Backend serves Instrument, Frontend types ready
2. **+ User Story 1** (Phase 3): ~3 hours → Playback controls working, audio initializes (MVP!)
3. **+ User Story 2** (Phase 4): ~4 hours → Notes play at correct times with accurate durations (Testable!)
4. **+ User Story 3** (Phase 5): ~2 hours → Piano-like sound quality (Production-ready!)
5. **Polish** (Phase 6): ~2 hours → Edge cases, optimization, validation

**Total Estimated Time: 13-15 hours for complete feature**

Each story adds value without breaking previous stories. Stop at US1 for controls-only demo, US1+US2 for timing validation, or US1+US2+US3 for full production feature.

### Parallel Team Strategy

With 2-3 developers:

1. **Team completes Foundation together** (Phase 1-2): ~2.5 hours
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 (controls) - ~3 hours
   - **Developer B**: Wait for US1 ToneAdapter/MusicTimeline, then start User Story 2 (timing) - ~4 hours
   - **Developer C**: Wait for US1 ToneAdapter, then start User Story 3 (sound quality) - ~2 hours
3. **Team completes Polish together** (Phase 6): ~2 hours

**Total Parallel Time: ~9-10 hours with 3 developers** (vs 13-15 hours sequential)

**Constraint**: US2 and US3 both depend on US1's ToneAdapter and MusicTimeline, so true parallel start is limited. Sequential or pipeline approach (US1 → US2+US3 parallel) is more practical.

---

## Task Count Summary

- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 11 tasks (BLOCKING - must complete first)
- **Phase 3 (User Story 1)**: 14 tasks (Play/Pause/Stop controls)
- **Phase 4 (User Story 2)**: 14 tasks (Accurate timing)
- **Phase 5 (User Story 3)**: 10 tasks (Piano sound)
- **Phase 6 (Polish)**: 12 tasks (Edge cases, optimization, validation)

**Total: 64 tasks**

### Breakdown by Story:
- **US1**: 14 tasks (3 tests + 11 implementation) - ~3 hours
- **US2**: 14 tasks (3 tests + 11 implementation) - ~4 hours
- **US3**: 10 tasks (3 tests + 7 implementation) - ~2 hours
- **Foundation**: 14 tasks (setup + backend/frontend updates) - ~2.5 hours
- **Polish**: 12 tasks (cross-cutting concerns) - ~2 hours

### Parallel Opportunities Identified:
- **12 tasks marked [P]** can run in parallel within their phases
- Each user story has 3-4 parallel opportunities
- Foundation phase has 3 parallel opportunities after core entities created

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** maps task to specific user story for traceability (US1=Basic Controls, US2=Timing, US3=Sound)
- Each user story should be **independently completable and testable**
- **Test-first approach**: Verify tests fail (RED) before implementing (GREEN)
- **Commit frequently**: After each task or logical group of parallel tasks
- **Stop at checkpoints**: Validate each story independently before proceeding
- **MVP strategy**: Stop after US1 for basic demo, US1+US2 for testable playback, US1+US2+US3 for production

**Validation**: Run `specs/003-music-playback/quickstart.md` Step 5 checklist (SC-001 through SC-010) after Phase 5 completion.
