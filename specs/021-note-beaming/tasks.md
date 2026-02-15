# Tasks: Note Beaming

**Input**: Design documents from `/specs/021-note-beaming/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/beam-layout.md, quickstart.md

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1, US2, US3, US4)
- Exact file paths included in every task

---

## Phase 1: Setup

**Purpose**: Verify existing infrastructure and establish new data types for beam parsing

- [X] T001 Run full backend test suite to establish baseline (`cargo test -p musicore_backend`) — all existing tests must pass
- [X] T002 [P] Add `BeamType` enum and `BeamData` struct to `backend/src/domain/importers/musicxml/types.rs`
- [X] T003 [P] Add `beams: Vec<BeamData>` field to `NoteData` struct in `backend/src/domain/importers/musicxml/types.rs`
- [X] T004 [P] Add new constants `INTER_BEAM_GAP = 5.0`, `BEAM_HOOK_LENGTH = 15.0` to `Beam` impl in `backend/src/layout/beams.rs`
- [X] T005 [P] Add new constants `MIN_BEAMED_STEM_LENGTH = 50.0`, `MIN_LEDGER_STEM_LENGTH = 60.0` to `Stem` impl in `backend/src/layout/stems.rs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Thread beam data from MusicXML parsing through the layout pipeline — MUST complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Parse `<beam>` elements in `parse_note()` function in `backend/src/domain/importers/musicxml/parser.rs` — extract `number` attribute (1–8) and text content (begin/continue/end/forward hook/backward hook), populate `NoteData.beams`
- [X] T007 Add unit tests for `<beam>` parsing in `backend/tests/musicxml_import_test.rs` — test single-level beam (begin/continue/end), multi-level beams, forward/backward hooks, missing beam elements (empty vec)
- [X] T008 Add `beam_info: Vec<BeamData>` field to `NoteEvent` struct in `backend/src/layout/mod.rs`
- [X] T009 Thread `beam_info` from parsed `NoteData.beams` through `extract_instruments()` into `NoteEvent` in `backend/src/layout/mod.rs`
- [X] T010 Add `beam_levels: u8` and `beam_types: Vec<BeamType>` fields to `BeamableNote` struct in `backend/src/layout/beams.rs`
- [X] T011 Add `level: u8` and `is_hook: bool` fields to `Beam` struct in `backend/src/layout/beams.rs`
- [X] T012 Verify all existing tests still pass after foundational changes (`cargo test -p musicore_backend`)

**Checkpoint**: Beam data flows from MusicXML parser → NoteEvent → layout pipeline. Extended structs ready for use.

---

## Phase 3: User Story 1 — Beamed Eighth Notes in Imported Scores (Priority: P1) 🎯 MVP

**Goal**: Import a MusicXML file with eighth notes containing `<beam>` elements and render them with beam lines instead of individual flags.

**Independent Test**: Import a MusicXML file with four eighth notes in 4/4. Verify beam line connects the group and no flags are visible.

### Implementation for User Story 1

- [X] T013 [US1] Implement `build_beam_groups_from_musicxml()` function in `backend/src/layout/beams.rs` — consume `Vec<BeamData>` per note at beam level 1 to form `Vec<BeamGroup>`, handling begin/continue/end state machine
- [X] T014 [US1] Add unit tests for `build_beam_groups_from_musicxml()` in `backend/src/layout/beams.rs` — test group formation: 4 eighth notes → 1 group, mixed quarters and eighths → correct groups, single note → no group (flag fallback)
- [X] T015 [US1] Modify `position_noteheads()` in `backend/src/layout/positioner.rs` to accept a `beamed_note_indices: &HashSet<usize>` parameter — when a note index is in the set and `duration_ticks <= 480`, emit `'\u{E0A4}'` (noteheadBlack) instead of combined glyph
- [X] T016 [US1] Add unit tests for beamed notehead selection in `backend/src/layout/positioner.rs` — verify beamed eighth → U+E0A4, unbeamed eighth → U+E1D7, quarter note → U+E1D5 unchanged
- [X] T017 [US1] Re-enable stem generation code in `position_glyphs_for_staff()` in `backend/src/layout/mod.rs` — uncomment stem creation loop (~lines 739–780), emit `Glyph` with codepoint `'\u{0000}'` for each beamed note using `stems::create_stem()`
- [X] T018 [US1] Compute uniform stem direction for beam groups in `backend/src/layout/mod.rs` — for each beam group, use majority rule (`stems::compute_stem_direction()` for each note, pick majority direction, apply to all notes in group)
- [X] T019 [US1] Re-enable single-level beam generation code in `position_glyphs_for_staff()` in `backend/src/layout/mod.rs` — uncomment beam creation loop (~lines 780–829), emit `Glyph` with codepoint `'\u{0001}'` for level-1 beams using `beams::create_beam()`
- [X] T020 [US1] Add integration test in `backend/tests/layout_test.rs` — create a compiled score JSON with 4 eighth notes, run `compute_layout()`, verify output contains: 4 notehead glyphs (U+E0A4), 4 stem glyphs (U+0000), 1 beam glyph (U+0001), and 0 combined flagged glyphs (U+E1D7)
- [X] T021 [US1] Add integration test in `backend/tests/layout_test.rs` — create a score with mixed quarter and eighth notes, verify quarter notes still use combined glyph (U+E1D5) and only eighth notes get bare noteheads + stems + beam
- [X] T022 [US1] Verify all existing tests still pass after US1 implementation (`cargo test -p musicore_backend`)

**Checkpoint**: Eighth notes from MusicXML with `<beam>` elements render with beams. Quarter notes and unbeamed notes unaffected. MVP complete.

---

## Phase 4: User Story 2 — Multi-Level Beaming for Sixteenth Notes (Priority: P2)

**Goal**: Sixteenth notes and shorter display with multiple beam levels (2 for 16ths, 3 for 32nds, etc.), including partial beams (hooks).

**Independent Test**: Import a MusicXML file with four sixteenth notes. Verify two parallel beam lines connect them.

### Implementation for User Story 2

- [X] T023 [US2] Extend `build_beam_groups_from_musicxml()` in `backend/src/layout/beams.rs` to process beam levels 2–5 — track which notes have secondary/tertiary beams and populate `BeamableNote.beam_levels` and `beam_types`
- [X] T024 [US2] Implement `create_multi_level_beams()` function in `backend/src/layout/beams.rs` — for each beam level > 1, compute sub-groups of notes at that level, offset Y position by `(BEAM_THICKNESS + INTER_BEAM_GAP) * (level - 1)`, create `Beam` structs with correct `level` field
- [X] T025 [US2] Implement `create_beam_hook()` function in `backend/src/layout/beams.rs` — create a short beam segment (length = `BEAM_HOOK_LENGTH = 15.0`) extending forward or backward from a note's stem at the specified beam level
- [X] T026 [US2] Add unit tests for multi-level beam creation in `backend/src/layout/beams.rs` — test: 4 sixteenths → 2 beam lines, mixed 8ths + 16ths → primary beam spans all + secondary spans 16ths only, forward/backward hooks at level 2
- [X] T027 [US2] Integrate `create_multi_level_beams()` and `create_beam_hook()` into `position_glyphs_for_staff()` in `backend/src/layout/mod.rs` — after level-1 beam generation, iterate beam levels 2–5 and emit additional beam `Glyph` objects (codepoint U+0001)
- [X] T028 [US2] Add integration test in `backend/tests/layout_test.rs` — create a score with 4 sixteenth notes, verify layout output contains 2 beam glyphs (level 1 and level 2)
- [X] T029 [US2] Add integration test in `backend/tests/layout_test.rs` — create a score with mixed eighth and sixteenth beam group, verify primary beam spans all notes and secondary beam spans only the sixteenths
- [X] T030 [US2] Verify all existing tests still pass (`cargo test -p musicore_backend`)

**Checkpoint**: Multi-level beaming works. Sixteenth, thirty-second notes display correct number of beam lines with proper hooks.

---

## Phase 5: User Story 3 — Correct Stem Direction in Beamed Groups (Priority: P2)

**Goal**: Beamed groups use uniform stem direction based on majority note position relative to middle staff line.

**Independent Test**: Import a score where beamed group has all notes above middle line. Verify stems point down and beam is below noteheads.

### Implementation for User Story 3

- [X] T031 [US3] Implement `compute_group_stem_direction()` function in `backend/src/layout/beams.rs` — take a slice of `BeamableNote`, compute majority position relative to `staff_middle_y`, return uniform `StemDirection` for the group
- [X] T032 [US3] Add unit tests for `compute_group_stem_direction()` in `backend/src/layout/beams.rs` — test: all notes above middle → Down, all below → Up, mixed with majority above → Down, even split → Up (default)
- [X] T033 [US3] Integrate group stem direction into beam pipeline in `backend/src/layout/mod.rs` — replace per-note `compute_stem_direction()` with `compute_group_stem_direction()` for beamed notes; apply uniform direction to all stems in the group
- [X] T034 [US3] Adjust stem attachment point based on direction in `backend/src/layout/mod.rs` — stem-up attaches to right edge of notehead, stem-down attaches to left edge (use `noteheadBlack` bounding box width from `backend/src/layout/metrics.rs`)
- [X] T035 [US3] Adjust beam Y position based on stem direction in `backend/src/layout/mod.rs` — stem-up: beam above noteheads at stem endpoints; stem-down: beam below noteheads at stem endpoints
- [X] T036 [US3] Add integration test in `backend/tests/layout_test.rs` — create a beamed group with all notes above middle line (high pitches), verify all stem glyphs have y_end < y_start (stems point down) and beam glyph y < notehead y (beam below noteheads)
- [X] T037 [US3] Add integration test in `backend/tests/layout_test.rs` — create a beamed group with notes spanning both sides of middle line, verify uniform stem direction in all stem glyphs
- [X] T038 [US3] Verify all existing tests still pass (`cargo test -p musicore_backend`)

**Checkpoint**: Stem direction is correct and uniform within beam groups. Beams position correctly relative to noteheads.

---

## Phase 6: User Story 4 — Beaming Preserves Rendering Performance (Priority: P3)

**Goal**: Ensure the switch from combined glyphs to separate noteheads + stems + beams does not degrade performance below thresholds.

**Independent Test**: Open a 10-stave, 100-measure score. Verify layout computation ≤50% overhead and scrolling ≥30fps.

### Implementation for User Story 4

- [X] T039 [US4] Add algorithmic beat-based beaming fallback in `backend/src/layout/beams.rs` — implement `group_beamable_by_time_signature()` that accepts `time_numerator`, `time_denominator` and groups notes by beat boundary (simple meters: 960 ticks/beat, compound meters 6/8,9/8,12/8: 1440 ticks/beat, asymmetric 5/8: 1440+960, 7/8: 960+960+1440)
- [X] T040 [US4] Add unit tests for algorithmic beaming in `backend/src/layout/beams.rs` — test grouping for 4/4 (groups of 2 eighths), 6/8 (groups of 3 eighths), 3/4 (groups of 2), 5/8 (3+2 grouping)
- [X] T041 [US4] Integrate algorithmic fallback into `position_glyphs_for_staff()` in `backend/src/layout/mod.rs` — when `NoteEvent.beam_info` is empty, call `group_beamable_by_time_signature()` instead of `build_beam_groups_from_musicxml()`
- [X] T042 [US4] Change beam rendering in `frontend/src/components/LayoutRenderer.tsx` — replace U+0001 `<rect>` handler with `<polygon>` using 4 points: `(position.x, position.y)`, `(position.x + bbox.width, position.y + (bbox.y_end_offset))`, `(position.x + bbox.width, position.y + (bbox.y_end_offset) + bbox.height)`, `(position.x, position.y + bbox.height)` — derive slope from position and bounding_box per beam-layout contract
- [X] T043 [US4] Add layout benchmark for beamed scores in `backend/benches/layout_bench.rs` — benchmark `compute_layout()` with a 10-stave, 100-measure score containing beamed eighth notes, compare against baseline (non-beamed version)
- [X] T044 [US4] Ensure beam/rest interaction: break beam groups at rests in `backend/src/layout/beams.rs` — both `build_beam_groups_from_musicxml()` and `group_beamable_by_time_signature()` must finalize a group when a rest is encountered between beamable notes
- [X] T045 [US4] Ensure beam/barline interaction: break beam groups at measure boundaries in `backend/src/layout/mod.rs` — verify beam groups do not span across bar lines (measure boundary check in grouping logic)
- [X] T046 [US4] Add integration test in `backend/tests/layout_test.rs` — create a score without `<beam>` elements, verify algorithmic beaming produces correct groups for 4/4 time signature
- [X] T047 [US4] Add integration test in `backend/tests/layout_test.rs` — verify single isolated eighth note (no beam group partner) renders with combined flag glyph (U+E1D7), not bare notehead
- [X] T048 [US4] Verify all existing tests still pass (`cargo test -p musicore_backend`)

**Checkpoint**: Algorithmic fallback works. Performance validated. Rest/barline beam breaking correct. Frontend renders sloped beams.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge case handling, and regression checks

- [X] T049 [P] Enforce minimum stem length for beamed notes in `backend/src/layout/mod.rs` — after beam slope computation, extend any stem shorter than `MIN_BEAMED_STEM_LENGTH` (50.0) or `MIN_LEDGER_STEM_LENGTH` (60.0 for ledger-line notes)
- [X] T050 [P] Handle degenerate beam groups (single note after rest/barline split) in `backend/src/layout/mod.rs` — if a beam group resolves to a single note, discard the group and render with combined flag glyph
- [X] T051 [P] Add edge case test in `backend/tests/layout_test.rs` — verify degenerate single-note beam group falls back to flagged rendering
- [X] T052 [P] Add edge case test in `backend/tests/layout_test.rs` — verify beams do not cross bar lines (beam group split at measure boundary)
- [X] T053 [P] Add edge case test in `backend/tests/layout_test.rs` — verify beams break at rests
- [X] T054 Run full test suite (`cargo test -p musicore_backend && cd frontend && npm test`) and verify zero regressions
- [X] T055 Run quickstart.md validation commands to confirm all verification steps pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 — P1)**: Depends on Phase 2 — MVP delivery
- **Phase 4 (US2 — P2)**: Depends on Phase 3 (builds on beam pipeline)
- **Phase 5 (US3 — P2)**: Depends on Phase 3 (needs stem generation working). Can run in parallel with Phase 4
- **Phase 6 (US4 — P3)**: Depends on Phase 3 (needs beam pipeline working). Can start after Phase 3
- **Phase 7 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — core MVP
- **US2 (P2)**: Depends on US1 — extends single-level to multi-level beams
- **US3 (P2)**: Depends on US1 — refines stem direction within beam groups. Independent of US2
- **US4 (P3)**: Depends on US1 — adds fallback beaming, performance validation, frontend upgrade. Independent of US2/US3

### Within Each User Story

- Tests written alongside implementation (Constitution Principle V)
- Unit tests before integration tests
- Struct extensions before function implementations
- Backend before frontend
- Regression check at end of each story

### Parallel Opportunities

**Phase 1** (all [P] tasks):
```
T002 (BeamType/BeamData in types.rs) || T004 (beam constants in beams.rs) || T005 (stem constants in stems.rs)
T003 (beams field on NoteData) — depends on T002
```

**Phase 4 + Phase 5** (independent stories, can run in parallel):
```
US2 (T023–T030: multi-level beams) || US3 (T031–T038: stem direction)
```

**Phase 6** (partially parallelizable):
```
T039 (algorithmic grouping) || T042 (frontend polygon rendering)
```

**Phase 7** (all [P] tasks):
```
T049 (min stem length) || T050 (degenerate groups) || T051–T053 (edge case tests)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T012)
3. Complete Phase 3: User Story 1 (T013–T022)
4. **STOP and VALIDATE**: Import a MusicXML file with eighth notes — verify beams render correctly
5. Deploy/demo if ready — this alone delivers the most impactful visual improvement

### Incremental Delivery

1. Setup + Foundational → Beam data flows through pipeline
2. Add US1 → Eighth-note beams work → **MVP!**
3. Add US2 → Sixteenth/32nd beams work → Multi-level beaming
4. Add US3 → Stem direction correct → Engraving quality
5. Add US4 → Fallback beaming + performance + frontend polish → Production-ready
6. Polish → Edge cases, regression checks → Ship

### Parallel Team Strategy

With multiple developers after Phase 2 completes:
- Developer A: US1 (P1) — core beam pipeline
- After US1 done:
  - Developer A: US2 (multi-level beams)
  - Developer B: US3 (stem direction) — independent of US2
  - Developer C: US4 (algorithmic fallback + frontend) — independent of US2/US3
