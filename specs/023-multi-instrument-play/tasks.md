# Tasks: Multi-Instrument Play View

**Input**: Design documents from `/specs/023-multi-instrument-play/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included as they are required by Principle V (Test-First Development) and the constitution.

**Organization**: Tasks are grouped by user story. US1 (Display All Instruments) and US3 (Correct Vertical Spacing) are combined into Phase 3 since they are inseparable P1 requirements — you cannot display multiple instruments without correct vertical spacing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Type definitions and shared infrastructure changes needed before any user story work

- [X] T001 [P] Add `NameLabel` struct and `instrument_name` field to `StaffGroup` in `backend/src/layout/types.rs`
- [X] T002 [P] Add `NameLabel` interface and `instrument_name` field to `StaffGroup` in `frontend/src/wasm/layout.ts`
- [X] T003 Add `name` field to internal `InstrumentData` struct and update `extract_instruments()` to populate it from score JSON in `backend/src/layout/mod.rs`

**Checkpoint**: Type definitions are in place across Rust and TypeScript. Layout engine can now be updated.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core layout engine changes that MUST be complete before user story rendering works

**⚠️ CRITICAL**: No user story rendering can work until vertical spacing and system height are fixed

- [X] T004 Fix system height calculation to sum staves across ALL instruments plus inter-instrument gaps in `backend/src/layout/mod.rs`
- [X] T005 Fix vertical offset accumulation to use cumulative `global_staff_offset` across instruments, adding inter-instrument gap between instrument boundaries in `backend/src/layout/mod.rs`
- [X] T006 Update `create_staff_lines()` to use absolute staff offset (accounting for previous instruments' staves) in `backend/src/layout/mod.rs`
- [X] T007 Populate `instrument_name` on `StaffGroup` from `InstrumentData.name` during staff group creation in `backend/src/layout/mod.rs`

**Checkpoint**: Rust layout engine correctly positions all instruments vertically. WASM output has correct heights and no overlaps. Ready for frontend changes.

---

## Phase 3: User Story 1+3 - Display All Instruments with Correct Spacing (Priority: P1) 🎯 MVP

**Goal**: Multi-instrument scores render all instruments in Play View with correct vertical spacing and no stave overlap. Single-instrument scores have no visual regression.

**Independent Test**: Import a multi-instrument score (e.g., violin+cello), open Play View, verify all instruments appear in each system with correct spacing.

### Tests for User Story 1+3

- [X] T008 [P] [US1] Write Rust test: 2-instrument score (violin+cello) produces 2 `StaffGroup` entries per system in `backend/tests/layout_test.rs`
- [X] T009 [P] [US1] Write Rust test: piano (2 staves) + violin (1 staff) score has no Y-overlap between staff groups in `backend/tests/layout_test.rs`
- [X] T010 [P] [US3] Write Rust test: inter-instrument gap (between piano and violin) is larger than intra-instrument gap (between piano treble and bass) in `backend/tests/layout_test.rs`
- [X] T011 [P] [US1] Write Rust test: single-instrument score still produces 1 `StaffGroup` per system (no regression) in `backend/tests/layout_test.rs`
- [X] T012 [P] [US1] Write Rust test: system `bounding_box.height` grows with number of instruments in `backend/tests/layout_test.rs`
- [X] T013 [P] [US3] Write Rust test: 4-instrument score (string quartet) has 4 `StaffGroup` entries per system with no overlap in `backend/tests/layout_test.rs`

### Implementation for User Story 1+3

- [X] T014 [US1] Update `convertScoreToLayoutFormat` to iterate ALL `score.instruments` instead of only `[0]` in `frontend/src/components/layout/LayoutView.tsx`
- [X] T015 [US1] Update Play View info bar text from "First voice from {instrument}" to "All instruments" in `frontend/src/components/layout/LayoutView.tsx`
- [X] T016 [US1] Verify playback highlighting works across all instruments — `buildSourceToNoteIdMap` already uses `instrument_id` in composite key in `frontend/src/services/highlight/sourceMapping.ts`
- [X] T017 [US1] Build WASM and run Rust tests to verify multi-instrument layout output is correct via `cargo test` in `backend/`

**Checkpoint**: Multi-instrument scores render all instruments in Play View. Vertical spacing is correct. Single-instrument scores unchanged. Playback highlighting works across instruments. SC-001, SC-003, SC-004, SC-005, SC-006 achievable.

---

## Phase 4: User Story 2 - Instrument Name Labels at System Start (Priority: P2)

**Goal**: Each system displays the instrument name as a text label to the left of the bracket/brace, positioned by the layout engine (Principle VI).

**Independent Test**: Import a multi-instrument score, open Play View, verify instrument names appear at the start of each system for all instruments.

### Tests for User Story 2

- [X] T018 [P] [US2] Write Rust test: `StaffGroup.name_label` is populated with correct text matching `instrument_name` in `backend/tests/layout_test.rs`
- [X] T019 [P] [US2] Write Rust test: `name_label.position.x` is less than bracket x position (name before bracket) in `backend/tests/layout_test.rs`
- [X] T020 [P] [US2] Write Rust test: `name_label.position.y` is vertically centered within the staff group's bounding box in `backend/tests/layout_test.rs`
- [X] T021 [P] [US2] Write Rust test: single-instrument score still has `name_label` populated on its `StaffGroup` in `backend/tests/layout_test.rs`

### Implementation for User Story 2

- [X] T022 [US2] Compute `NameLabel` position (x before bracket, y centered on staff group) and set on `StaffGroup.name_label` in `backend/src/layout/mod.rs`
- [X] T023 [US2] Render `name_label` as SVG `<text>` element in `renderStaffGroup()` method in `frontend/src/components/LayoutRenderer.tsx`
- [X] T024 [US2] Build WASM and verify name labels appear for all instruments in browser in `backend/` and `frontend/`

**Checkpoint**: Instrument names visible at the start of each system. SC-002 achieved. All success criteria now met.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Contract test validation, cleanup, and verification

- [X] T025 [P] Write Rust contract test: `StaffGroup` serializes to JSON with `instrument_name` and `name_label` fields present in `backend/tests/contract_test.rs`
- [X] T026 [P] Update existing multi-instrument layout tests (T012/T013 in `layout_integration_test.rs`) to also assert `instrument_name` field is correct in `backend/tests/layout_integration_test.rs`
- [X] T027 Run all backend tests (`cargo test`) and all frontend tests (`npm test`) to verify no regressions
- [X] T028 Run quickstart.md validation steps to verify end-to-end functionality

---

## Phase 6: Visual Bug Fixes & Engraving Improvements (Post-Implementation)

**Purpose**: Iterative visual fixes discovered during manual testing of the multi-instrument Play View. These tasks address engraving quality, spacing, and correctness issues that were not anticipated in the original spec.

### Bug Fix: Missing Name Labels & Brackets

- [X] T029 Fix missing instrument name labels and bracket glyphs not rendering for multi-instrument scores — bracket span and label positioning were not accounting for multi-staff instrument groups

### Bug Fix: Blank Multi-Instrument View

- [X] T030 Fix blank multi-instrument view — `convertScoreToLayoutFormat` was not iterating all instruments correctly, causing empty layout output

### Bug Fix: Systems Only Visible After Scrolling

- [X] T031 Fix systems only appearing after scrolling — initial render was not triggering layout computation at correct viewport offset

### Bug Fix: Excessive Vertical Spacing

- [X] T032 Reduce excessive vertical spacing between systems by tuning `intra_staff_multiplier` from 5.0 to 10.0 (then later to 12.0, then 14.0) to prevent staff overlap while keeping staves compact

### Bug Fix: Measure Misalignment Across Instruments

- [X] T033 Fix measure misalignment across instruments — barlines and notes were not horizontally aligned between different instrument staff groups within the same system

### Compact Note Spacing

- [X] T034 Reduce `SpacingConfig` defaults (base/factor/minimum from 60 to 40, flag_padding from 10 to 5, structural_padding from 50 to 30) for 3+ measures per system in `backend/src/layout/spacer.rs`
- [X] T035 Increase `max_system_width` from 2400 to 3200 (later reverted to 1600) for more horizontal room in `backend/src/layout/mod.rs`

### Bug Fix: Beam Slope Clamp

- [X] T036 Fix beam slope clamp bug — `compute_beam_slope` used `dx` instead of `dx.abs()` for `max_slope_per_unit`, causing negative clamp range when dx was negative in `backend/src/layout/beams.rs`

### Piano Staff Overlap Fix

- [X] T037 Fix piano treble/bass staff overlap — `intra_staff_multiplier` was 5.0 giving 100 units between staff tops, but each staff spans 160 units (8×ups). Changed to 10.0(200 units), then 12.0 (240 units), then 14.0 (280 units) in `backend/src/layout/mod.rs`

### Ledger Line Width & Inter-Staff Gap

- [X] T038 Reduce ledger line half-width from 1.25 to 0.7 ups (notehead-sized) in `backend/src/layout/mod.rs`
- [X] T039 Increase `intra_staff_multiplier` from 12.0 to 14.0 (280 units, 80-unit gap for ledger lines) in `backend/src/layout/mod.rs`

### Horizontal Scroll & Screen Fit

- [X] T040 Reduce `max_system_width` from 3200 to 1600 for natural screen fit without horizontal scroll in `backend/src/layout/mod.rs` and `frontend/src/components/layout/LayoutView.tsx`
- [X] T041 Revert 100% width + overflow:hidden approach that broke zoom — use explicit pixel widths with `overflowX: auto` instead in `frontend/src/pages/ScoreViewer.tsx`

### Staff Line Spacing Reduction (Engraving Proportion Fix)

- [X] T042 Change staff line spacing from 2×ups to 1×ups so noteheads fill the gap between lines (standard engraving proportion) in `backend/src/layout/mod.rs` `create_staff_lines()`
- [X] T043 Update pitch-to-y formula: change diatonic step from `(diff - 0.5) * ups` to `(diff * 0.5 - 0.5) * ups` in `backend/src/layout/positioner.rs`
- [X] T044 Update all hardcoded Y positions: staff height refs (8→4 ups), barline y_end, staff_middle_y (4→2 ups) in `backend/src/layout/mod.rs`
- [X] T045 Update clef positions: Treble 110→50, Bass 110→10, Alto 70→30, Tenor 110→10 in `backend/src/layout/positioner.rs`
- [X] T046 Update time signature positions: numerator y 30→10, denominator y 110→50 in `backend/src/layout/positioner.rs`
- [X] T047 Update key signature sharp positions [-10,20,-20,10,40,0,30] and flat positions [30,0,40,10,50,20,60] in `backend/src/layout/positioner.rs`
- [X] T048 Update ledger line bounds: bottom_line 8→4 ups, step 2→1 ups, threshold 0.5→0.25 in `backend/src/layout/positioner.rs`
- [X] T049 Make bracket glyph dynamic — span from top of first staff to bottom of last staff instead of hardcoded extension in `backend/src/layout/mod.rs`
- [X] T050 Update all test assertions across `positioner.rs`, `mod.rs`, `contract_test.rs`, `layout_integration_test.rs`, `layout_test.rs` for new staff line spacing values

### Stem Direction Fix (Engraving Rule Correction)

- [X] T051 Fix `compute_stem_direction()` — swap Up/Down so notes on/above middle line get stems down, notes below get stems up (standard music engraving rule) in `backend/src/layout/stems.rs`
- [X] T052 Adjust `staff_middle_y` from `2.0 * ups` to `1.5 * ups` in `backend/src/layout/mod.rs` to account for the -0.5*ups glyph-centering offset in pitch_to_y

### Direction-Aware Note Glyphs

- [X] T053 Add per-note stem direction computation in `position_noteheads()` — use direction-aware SMuFL codepoints for unbeamed notes in `backend/src/layout/positioner.rs`:
  - Half: U+E1D3 (up) / U+E1D4 (down)
  - Quarter: U+E1D5 (up) / U+E1D6 (down)
  - Eighth: U+E1D7 (up) / U+E1D8 (down)
  - Sixteenth: U+E1D9 (up) / U+E1DA (down)
- [X] T054 Update beam group direction tests (3 tests with backwards assertions) in `backend/src/layout/beams.rs`
- [X] T055 Add down-variant codepoints to SMuFL validation registry in `backend/tests/smufl_codepoint_test.rs`
- [X] T056 Update all affected mod.rs integration tests to check for both Up/Down glyph variants

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 and T003 (type definitions + `InstrumentData.name`)
- **US1+US3 (Phase 3)**: Depends on Phase 2 completion (vertical spacing must work before rendering)
- **US2 (Phase 4)**: Depends on Phase 2 (T007 — `instrument_name` on `StaffGroup`). Can run in parallel with Phase 3 tests/implementation if desired.
- **Polish (Phase 5)**: Depends on Phases 3 and 4 completion

### User Story Dependencies

- **US1+US3 (P1)**: Core MVP. Can start after Phase 2. No dependency on US2.
- **US2 (P2)**: Name labels. Can start after Phase 2. Independent of US1+US3 frontend work (different file: `LayoutRenderer.tsx` vs `LayoutView.tsx`), but logically tested after US1+US3.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Rust backend changes before frontend changes
- Layout engine before renderer
- WASM build before browser verification

### Parallel Opportunities

**Phase 1** (all three tasks touch different files):
```
T001 (types.rs) ‖ T002 (layout.ts) ‖ T003 (mod.rs)
```

**Phase 3 Tests** (all in same file but independent test functions):
```
T008 ‖ T009 ‖ T010 ‖ T011 ‖ T012 ‖ T013
```

**Phase 4 Tests** (independent test functions):
```
T018 ‖ T019 ‖ T020 ‖ T021
```

**Phase 3 Implementation** (different files):
```
T014 (LayoutView.tsx) ‖ T016 (sourceMapping.ts verification)
```

**Phase 5** (different test files):
```
T025 (contract_test.rs) ‖ T026 (layout_integration_test.rs)
```

---

## Implementation Strategy

### MVP First (User Story 1+3 Only)

1. Complete Phase 1: Setup (type definitions)
2. Complete Phase 2: Foundational (vertical spacing + system height)
3. Complete Phase 3: User Story 1+3 (all instruments render correctly)
4. **STOP and VALIDATE**: Import multi-instrument MusicXML, verify in Play View
5. Deploy/demo if ready — names can come later

### Incremental Delivery

1. Setup + Foundational → Type + layout engine ready
2. Add US1+US3 → All instruments visible, correct spacing → **MVP!**
3. Add US2 → Instrument name labels visible → **Full feature**
4. Polish → Contract tests, regression checks → **Production ready**

---

## Notes

- US1 and US3 are combined because vertical spacing (US3) is a prerequisite for displaying multiple instruments (US1) — they cannot be tested independently
- The WASM binding (`compute_layout_wasm`) is a pass-through and needs no task — it automatically picks up the new struct fields via serde
- Playback highlighting (FR-011) requires no code changes — the existing `sourceMapping.ts` already uses `instrument_id` in composite keys. Only verification (T016) is needed.
- `convertScoreToLayoutFormat` (T014) is the single frontend change that unblocks multi-instrument rendering
