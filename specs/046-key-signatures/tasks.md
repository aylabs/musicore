---
description: "Task list for Key Signatures feature implementation"
---

# Tasks: Key Signatures

**Feature**: `046-key-signatures`
**Branch**: `046-key-signatures`
**Input**: `specs/046-key-signatures/` — plan.md, spec.md, research.md, data-model.md
**Organization**: Tasks grouped by user story (US1–US4) to enable independent increment delivery

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story [US1]–[US4] (setup/polish phases have no story label)
- **[BUG]**: Bug fix task — must follow regression-first sequence per Principle VII

## Key Context

Two pre-existing bugs block correct display. No new pipeline components are needed — the end-to-end rendering path is already wired:
`StaffStructuralEvent` → `LayoutView.tsx convertScoreToLayoutFormat()` → `compute_layout()` → `position_key_signature()` → `structural_glyphs` → `LayoutRenderer.tsx renderGlyph()`

**Bug 1** (`backend/src/layout/positioner.rs:464`): `_clef_type` is unused — all staves always get treble-clef accidental positions.
**Bug 2** (`frontend/src/types/score.ts` + `LayoutView.tsx`): `KeySignature` typed as string union but Rust serializes `KeySignature(i8)` as a JSON number → `keyMap[1]` is always `undefined` → `keySharps = 0` always.

---

## Phase 1: Setup

**Purpose**: Confirm the starting state so regressions are immediately detectable

- [X] T001 Run `cargo test` in `backend/` and confirm all existing `position_key_signature` tests in `backend/src/layout/positioner.rs` pass (these are the treble-clef baseline that must stay green)

---

## Phase 2: Foundational — Fix Frontend Key Signature Type Mismatch

**Purpose**: Bug 2 prevents **all** key signatures from displaying (every score silently treated as C major). This fix is a prerequisite for all four user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [BUG] Write failing test in `frontend/tests/unit/LayoutView.keySharps.test.ts` — mock a `Score` whose first staff's `key_signature` field is the number `1` (G major); call `convertScoreToLayoutFormat()` from `frontend/src/components/layout/LayoutView.tsx`; assert the returned `key_signature.sharps` equals `1`. Confirm test **FAILS** (returns `0`) before applying any fix.

- [X] T003 [P] [BUG] Fix `frontend/src/types/score.ts:20` — replace the string union `"CMajor" | "GMajor" | "DMajor" | ...` with `number` to match Rust `KeySignature(i8)` serde output (range −7 to +7; negative = flats, positive = sharps)

- [X] T004 [P] [BUG] Fix `frontend/src/components/layout/LayoutView.tsx:127-154` — in the `keySharps` extraction block replace the line `keySharps = keyMap[keySig] || 0` with `keySharps = typeof keySig === 'number' ? keySig : (keyMap[keySig as string] ?? 0)` to correctly handle the numeric value from Rust serialization

- [X] T005 Run `npm run test` in `frontend/` and confirm the regression test from T002 now **passes**; also run `npm run tsc --noEmit` in `frontend/` to confirm no TypeScript compilation errors from the `KeySignature` type change

**Checkpoint**: Frontend now forwards the correct `keySharps` value from `StaffStructuralEvent` to `compute_layout()` — user story work can begin

---

## Phase 3: User Story 1 — Display Key Signature on Treble Clef Staff (P1) 🎯 MVP

**Story**: As a musician viewing a score, I want to see the correct key signature accidentals displayed at the beginning of each treble clef staff so that I immediately know the key of the piece.

**Goal**: After the Phase 2 fix, treble clef key signatures should now render correctly because Rust already implements the correct treble accidental positions and the rendering pipeline is intact.

**Independent Test**: Load a score in G major (1 sharp) in the development frontend; the rendered SVG should contain exactly 1 sharp glyph (`\u{E262}`) placed on the F5 line of the treble staff. C major scores show zero accidentals.

- [X] T006 [US1] Run `cargo test position_key_signature` in `backend/` — verify all existing treble-clef tests in `backend/src/layout/positioner.rs` still pass with zero code changes (confirm no unintended regression from Phase 2)

- [X] T007 [US1] Search `frontend/src/` for any remaining string comparisons against `KeySignature` values (e.g., `=== "CMajor"`, `keyMap[`, `KeySignature.`) and update any found usages to use numeric comparisons, removing stale string-based guards that the type change in T003 made incorrect

- [X] T008 [US1] Verify end-to-end: load the application with a score in G major (`sharps: 1`); confirm exactly 1 sharp glyph appears at the correct position on the treble clef staff; load a C major score and confirm zero accidental glyphs appear

**Checkpoint**: User Story 1 is fully functional — treble clef key signatures display correctly and independently verifiable

---

## Phase 4: User Story 2 — Key Signature Adapts to All Clef Types (P2)

**Story**: As a musician, I want key signatures to display with correctly positioned accidentals on bass, alto, and tenor clef staves so that multi-staff scores (piano, cello, viola, bassoon) are readable.

**Goal**: Fix Bug 1 in `backend/src/layout/positioner.rs:464` — rename `_clef_type` to `clef_type`, add a `match` dispatch with separate accidental position tables for Bass, Alto, and Tenor clefs.

**Independent Test**: Load a piano score (treble + bass) in Bb major (2 flats): treble staff shows 2 flats at treble positions (y offsets: `[30, 0]`); bass staff shows 2 flats at bass positions (y offsets: `[50, 20]`).

**Position tables** (y offsets relative to `staff_vertical_offset`, from research.md — provisional for Alto/Tenor, verify visually):

| Clef | Sharps (F C G D A E B) | Flats (B E A D G C F) |
|------|------------------------|------------------------|
| **Treble** | `[-10, 20, -20, 10, 40, 0, 30]` | `[30, 0, 40, 10, 50, 20, 60]` |
| **Bass** | `[10, 40, 0, 30, -10, 20, 50]` | `[50, 20, -10, 30, 0, 40, 10]` |
| **Alto** | `[70, 30, -10, 10, 50, 10, 20]` | `[20, 10, 50, 10, -10, 30, 70]` |
| **Tenor** | `[70, 10, 30, -10, 50, 50, 20]` | `[20, 50, 50, -10, 30, 10, 70]` |

> **Treble**: Already implemented and tested — do not modify.
> **Alto/Tenor**: Positions above are derived from staff geometry; treat as provisional. Tests are the acceptance gate; verify visually against a piano+viola or piano+cello score and adjust if glyphs appear on wrong staff positions.

### Regression Tests (write first, all must FAIL before T015)

- [X] T009 [BUG] [US2] Write failing Rust test `test_position_key_signature_bass_1_sharp` in `backend/src/layout/positioner.rs` — call `position_key_signature(1, "Bass", 120.0, 20.0, 0.0)`; assert first glyph `y == 10.0` (F3, second line from top of bass staff); confirm test **FAILS**

- [X] T010 [P] [BUG] [US2] Write failing Rust test `test_position_key_signature_bass_1_flat` in `backend/src/layout/positioner.rs` — call `position_key_signature(-1, "Bass", 120.0, 20.0, 0.0)`; assert first glyph `y == 50.0` (B2, fourth line from top); confirm test **FAILS**

- [X] T011 [P] [BUG] [US2] Write failing Rust test `test_position_key_signature_alto_1_sharp` in `backend/src/layout/positioner.rs` — call `position_key_signature(1, "Alto", 120.0, 20.0, 0.0)`; assert first glyph `y == 70.0` (F4, bottom line of alto staff); confirm test **FAILS**

- [X] T012 [P] [BUG] [US2] Write failing Rust test `test_position_key_signature_alto_1_flat` in `backend/src/layout/positioner.rs` — call `position_key_signature(-1, "Alto", 120.0, 20.0, 0.0)`; assert first glyph `y == 20.0` (B3); confirm test **FAILS**

- [X] T013 [P] [BUG] [US2] Write failing Rust test `test_position_key_signature_tenor_1_sharp` in `backend/src/layout/positioner.rs` — call `position_key_signature(1, "Tenor", 120.0, 20.0, 0.0)`; assert first glyph `y == 70.0` (F3); confirm test **FAILS**

- [X] T014 [P] [BUG] [US2] Write failing Rust test `test_position_key_signature_tenor_1_flat` in `backend/src/layout/positioner.rs` — call `position_key_signature(-1, "Tenor", 120.0, 20.0, 0.0)`; assert first glyph `y == 20.0` (B3); confirm test **FAILS**

### Implementation

- [X] T015 [US2] Fix `backend/src/layout/positioner.rs:464` — rename parameter `_clef_type` to `clef_type`; replace the single fixed-table logic with `match clef_type { "Treble" => { /* existing treble tables unchanged */ }, "Bass" => { let sharp_positions = vec![10.0, 40.0, 0.0, 30.0, -10.0, 20.0, 50.0]; let flat_positions = vec![50.0, 20.0, -10.0, 30.0, 0.0, 40.0, 10.0]; }, "Alto" => { ... }, "Tenor" => { ... }, _ => { /* fall back to Treble */ } }`; implement Bass case first

- [X] T016 [US2] Add Alto clef tables to the `match clef_type` block in `backend/src/layout/positioner.rs` — sharp positions: `[70.0, 30.0, -10.0, 10.0, 50.0, 10.0, 20.0]`; flat positions: `[20.0, 10.0, 50.0, 10.0, -10.0, 30.0, 70.0]`; note: positions are provisional — visual verification in T020 may require adjustments

- [X] T017 [US2] Add Tenor clef tables to the `match clef_type` block in `backend/src/layout/positioner.rs` — sharp positions: `[70.0, 10.0, 30.0, -10.0, 50.0, 50.0, 20.0]`; flat positions: `[20.0, 50.0, 50.0, -10.0, 30.0, 10.0, 70.0]`; positions are provisional — visual verification required

- [X] T018 [US2] Run `cargo test position_key_signature` in `backend/` — confirm all six regression tests from T009–T014 now **pass**; also confirm existing treble tests still pass

- [X] T019 [US2] Rebuild WASM: run `wasm-pack build --target web` in `backend/`; copy the generated `pkg/` output files to `frontend/src/wasm/` (overwrite `musicore_backend_bg.wasm`, `musicore_backend.js`, `musicore_backend_bg.wasm.d.ts`)

- [X] T020 [US2] Verify end-to-end: load a piano score in Bb major (2 flats); confirm treble staff shows 2 flats at y offsets `[30, 0]` relative to treble staff top, and bass staff shows 2 flats at y offsets `[50, 20]` relative to bass staff top; if alto or tenor clef scores are available, verify those too

**Checkpoint**: User Stories 1 and 2 are both functional — key signatures display correctly on all four clef types

---

## Phase 5: User Story 3 — Correct Spacing (No Glyph Overlap) (P3)

**Story**: As a musician, I want the key signature to not overlap the clef symbol to the left or the first note to the right, regardless of how many accidentals are in the key.

**Goal**: Validate that the existing `unified_left_margin` computation in `backend/src/layout/mod.rs` already adjusts for key signature width; implement the adjustment if it does not.

**Independent Test**: Layout of a 7-sharp (C# major) score has a measurably wider `unified_left_margin` than a C major (0 accidentals) score; no glyph x-coordinates overlap across all key counts 1–7.

- [X] T021 [US3] Read `backend/src/layout/mod.rs:262-271` — verify whether `unified_left_margin` already increases by `|key_sharps| * accidental_width` when a key signature is present; document the finding in a code comment

- [X] T022 [US3] Write Rust test `test_key_signature_expands_left_margin` in `backend/src/layout/mod.rs` or `backend/tests/layout_spacing.rs` — call `compute_layout()` with a 7-sharp score and a C-major score; assert that the 7-sharp layout's `unified_left_margin` is strictly greater than the C-major layout's `unified_left_margin`

- [X] T023 [US3] If T022 test fails: implement key-signature left-margin contribution in `backend/src/layout/mod.rs:262-271` — add `if key_sharps != 0 { unified_left_margin += key_sharps.abs() as f32 * accidental_width; }` using the appropriate `accidental_width` constant already present in the file; re-run T022 test to confirm it passes

**Checkpoint**: User Story 3 is verifiable — spacing is correct for all key counts

---

## Phase 6: User Story 4 — Key Signature on Every System (P4)

**Story**: As a musician, I want the key signature to appear at the beginning of every staff line across all systems so that I always know the current key when reading a long piece.

**Goal**: Confirm that `position_key_signature()` is called for all systems, not only `system.index == 0`; fix if not.

**Independent Test**: A score with enough notes to span 2 systems (compute at a narrow viewport width) has key signature glyphs in `structural_glyphs` for staves in both `system[0]` and `system[1]`.

- [X] T024 [US4] Read `backend/src/layout/mod.rs:472` and the surrounding `if system.index == 0` block (line ~484) — determine whether the `position_key_signature()` call is guarded by the system-index check or falls outside it; add a comment documenting the finding

- [X] T025 [US4] Write Rust test `test_key_signature_appears_on_all_systems` in `backend/tests/layout_systems.rs` — construct input with enough notes to produce 2 systems (or adjust `page_width` to force a line break); call `compute_layout()` with `sharps = 1`; assert that staves in **both** `systems[0]` and `systems[1]` have at least 1 entry in `structural_glyphs`

- [X] T026 [US4] If T025 test fails: move the `position_key_signature()` call in `backend/src/layout/mod.rs` to outside the `if system.index == 0` guard so it runs for every system; re-run T025 to confirm it passes

**Checkpoint**: User Story 4 is verifiable — key signature repeats correctly on all systems

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories; confirm constitutional compliance

- [X] T027 [P] Run full Rust test suite `cargo test` in `backend/` — confirm zero failures and zero regressions across positioner, layout, and integration tests

- [X] T028 [P] Run full frontend test suite in `frontend/` — confirm all unit and component tests pass including the regression test from T002

- [X] T029 Verify Principle VI compliance: run `grep -rn "keySignature\|key_signature\|keySharps\|accidentalSharp\|accidentalFlat" frontend/src/` and confirm no TypeScript file contains glyph position arithmetic — all position calculations must remain in Rust `position_key_signature()`; fix any violation found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS** all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion — no dependency on US2/US3/US4
- **US2 (Phase 4)**: Depends on Phase 2 completion — independent of US1 ordering (the Rust fix is separate from the frontend fix)
- **US3 (Phase 5)**: Depends on Phase 2; may reference US2 Rust code for context
- **US4 (Phase 6)**: Depends on Phase 2; independent of US2/US3 implementation
- **Polish (Phase 7)**: Depends on all desired user stories being complete; T019 (WASM rebuild) from Phase 4 must complete before running full frontend tests

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Phase 2 — no runtime dependency on US2, US3, or US4
- **US2 (P2)**: Can start concurrently with US1 after Phase 2 — Rust fix is in a different file from the frontend fix
- **US3 (P3)**: Can start after Phase 2; if US2 is done first, validates spacing for all clef types simultaneously
- **US4 (P4)**: Can start after Phase 2; independent of US1–US3; the WASM rebuild from US2 (T019) is needed for full frontend verification

### Within Each Phase

- Bug regression tests marked [BUG] **must be written and confirmed FAILING before the corresponding fix task**
- Tests marked [P] within a phase can be written in parallel
- Fix T015 → T016 → T017 are sequential within Phase 4 (build up the match arms)
- T019 (WASM rebuild) must complete before any browser-based verification involving US2

---

## Parallel Execution Examples

### Phase 2 (Foundational) — After T002 test is written and failing

```
# These fix different files — run in parallel:
T003: Fix frontend/src/types/score.ts (type change)
T004: Fix frontend/src/components/layout/LayoutView.tsx (extraction logic)
```

### Phase 4 (US2) — After T015 fix is planned — Write all 6 regression tests in parallel

```
# All tests target different test functions in the same file — author in parallel:
T009: test_position_key_signature_bass_1_sharp
T010: test_position_key_signature_bass_1_flat
T011: test_position_key_signature_alto_1_sharp
T012: test_position_key_signature_alto_1_flat
T013: test_position_key_signature_tenor_1_sharp
T014: test_position_key_signature_tenor_1_flat
```

### After Phase 2 completes — User stories can proceed concurrently

```
Developer A: Phase 3 (US1 treble verification)
Developer B: Phase 4 (US2 Rust clef dispatch fix)
Developer C: Phase 5 + 6 (US3 spacing + US4 multi-system)
```

---

## Bug Fixes and Regression Prevention

Per **Principle VII** (Regression Prevention), both bugs in this feature must follow the regression-first sequence:

| Bug | Regression Test | Fix Task | Verify Task |
|-----|----------------|----------|-------------|
| Bug 2: Frontend type mismatch | T002 | T003 + T004 | T005 |
| Bug 1: Rust clef type ignored | T009–T014 | T015–T017 | T018 |

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational — Bug 2 frontend fix (T002–T005)
3. Complete Phase 3: User Story 1 (T006–T008)
4. **STOP and VALIDATE**: Treble clef key signatures now display correctly
5. Rebuild WASM if not already done (needed for browser verification)

### Incremental Delivery

1. Phase 1 + Phase 2 → frontend type bug fixed (foundation)
2. Phase 3 (US1) → treble key signatures work → **MVP demo ready**
3. Phase 4 (US2) → all clef types work → piano, cello, viola, bassoon scores correct
4. Phase 5 (US3) → spacing verified → no layout overflow
5. Phase 6 (US4) → multi-system verified → long pieces display correctly
6. Phase 7 → polish and constitutional compliance confirmed

### Parallel Team Strategy

With 2+ developers after Phase 2 completes:

| Developer A | Developer B |
|-------------|-------------|
| Phase 3 (US1) verification | Phase 4 (US2) Rust fix — write T009–T014, implement T015–T017 |
| Phase 5 (US3) spacing | Phase 6 (US4) multi-system |

---

## Notes

- `[P]` tasks require **different files** with no dependency on in-flight tasks in the same phase
- Alto and Tenor position tables are **provisional** — implement them, then verify visually; adjust if needed (reference: Elaine Gould "Behind Bars" p.74, or Lilypond source `ly/scm/notation-functions.scm`)
- The WASM rebuild (T019) is the only task with infrastructure impact — ensure `dist/` or `frontend/src/wasm/` artefacts are committed or regenerated before CI runs
- `LayoutRenderer.tsx:930` is explicitly **read-only** throughout this feature — it already renders `structural_glyphs` correctly
- `NotationLayoutEngine.ts` (old path, `keySignatureAccidentals: []`) must **not** be modified per Principle VI
