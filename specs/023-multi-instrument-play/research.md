# Research: Multi-Instrument Play View

**Feature**: 023-multi-instrument-play  
**Date**: 2026-02-16

## Research Area 1: Frontend Instrument Passing (RESOLVED)

**Question**: How does `convertScoreToLayoutFormat` currently pass instruments to the WASM layout engine?

**Decision**: Fix `convertScoreToLayoutFormat` to iterate ALL `score.instruments` — not just `[0]`.

**Rationale**: The function at `LayoutView.tsx` line 63 wraps only `score.instruments[0]` into the `ConvertedScore.instruments` array. This is the primary blocker — the Rust engine already supports multiple instruments structurally. The change is a loop from `for (const instrument of score.instruments)` instead of accessing `[0]`.

**Alternatives considered**:
- Passing a separate "instrument index" filter parameter — Rejected because the layout engine should receive the complete score and compute the full layout. Filtering should not be part of the layout API.

---

## Research Area 2: Rust Vertical Offset Calculation (RESOLVED)

**Question**: How should vertical offsets be calculated across multiple instruments to prevent stave overlap?

**Decision**: Introduce a cumulative `global_staff_offset` counter that tracks the total number of staves drawn across all instruments within a system. Each instrument's staves are positioned at `system_y + global_staff_offset * intra_staff_spacing`, with an additional `inter_instrument_gap` added between instrument boundaries.

**Rationale**: Currently `mod.rs` line 138 uses `staff_index` (0-based within each instrument), so instrument 2's staff 0 overlaps instrument 1's staff 0. The fix requires tracking how many staves have been laid out so far.

**Spacing constants** (from existing code analysis):
- **Intra-staff spacing** (between staves within one instrument): `20.0 * units_per_space` = 400 units (line 136-138 of mod.rs)
- **Proposed inter-instrument spacing**: `30.0 * units_per_space` = 600 units — 1.5× the intra-staff spacing, following standard engraving practice where instrument groups have more separation than staves within an instrument
- **System height formula**: Sum of all instruments' staff heights + (num_instruments - 1) × inter_instrument_gap + top/bottom padding

**Alternatives considered**:
- Fixed system_height with proportional scaling — Rejected because system_height must grow dynamically based on the number of instruments, not be clamped to a constant.
- Same spacing within and between instruments — Rejected because FR-005 explicitly requires "visually larger" inter-instrument spacing.

---

## Research Area 3: Instrument Name in Layout Types (RESOLVED)

**Question**: How should the instrument name flow from the domain model to the SVG renderer?

**Decision**: Add `instrument_name: String` to the Rust `StaffGroup` struct (`types.rs`) and `instrument_name: string` to the TypeScript `StaffGroup` interface (`layout.ts`). Populate during `compute_layout()` from `InstrumentData.name`. Render in `LayoutRenderer.renderStaffGroup()` as an SVG `<text>` element.

**Rationale**: FR-009 requires the layout engine to include the instrument name in its output. This follows Principle VI (Layout Engine Authority) — the position is computed in Rust, the renderer only displays it. The `InstrumentData` struct (line 409-412) currently lacks a `name` field; it must be added and populated from the score JSON's `instrument.name`.

**Label positioning** (computed in Rust):
- X position: Fixed at ~30 units from system left edge (before the bracket at x=50)
- Y position: Vertically centered on the staff group's bounding box (midpoint of first and last staff lines)
- Font: Bravura Text or system serif, 14pt equivalent

**Alternatives considered**:
- Renderer computes name position from bracket geometry — Rejected because it violates Principle VI.
- Store name only on SourceReference — Rejected because it's a display property of the staff group, not a note-level reference.

---

## Research Area 4: Playback Highlighting Across Instruments (RESOLVED)

**Question**: Does the current highlighting mechanism work across multiple instruments without changes?

**Decision**: The existing mechanism requires minimal changes. The `sourceMapping.ts` already uses `instrument_id` in its composite key (`system_index/instrument_id/staff_index/voice_index/event_index`). As long as `convertScoreToLayoutFormat` passes all instruments, and the Rust engine populates `SourceReference.instrument_id` correctly per instrument, highlighting will work.

**Rationale**: The `buildSourceToNoteIdMap` function (line 95 of sourceMapping.ts) iterates over all instruments in the score to build the mapping. The `SourceReference` struct already contains `instrument_id: String`. The only prerequisite is that the layout now includes glyphs from all instruments (which it will once the frontend passes all instruments).

**Risk**: The `buildSourceToNoteIdMap` currently iterates `score.instruments` — if the score has 4 instruments but layout only had 1 instrument's glyphs before, the map would have had entries for only 1 instrument. With the fix, it should naturally cover all.

**Alternatives considered**: None needed — existing architecture handles this case.

---

## Research Area 5: Existing Multi-Instrument Test Data (RESOLVED)

**Question**: What test fixtures exist for multi-instrument scores?

**Decision**: Reuse the multi-instrument JSON patterns from `layout_integration_test.rs` (tests T012, T013) which define violin+cello scores with proper structure. Create a new fixture with piano (2 staves) + violin (1 staff) for the mixed-staff-count scenario.

**Rationale**: The existing tests at `layout_integration_test.rs` lines 204-244 already construct multi-instrument score JSON objects with format:
```json
{
  "instruments": [
    { "id": "violin-1", "name": "Violin", "staves": [{ "clef": "Treble", "voices": [...] }] },
    { "id": "cello-1", "name": "Cello", "staves": [{ "clef": "Bass", "voices": [...] }] }
  ]
}
```
No MusicXML multi-instrument fixtures exist yet in `backend/tests/fixtures/`. For integration testing, inline JSON is sufficient (consistent with existing test patterns).

**Alternatives considered**:
- Create external MusicXML fixture files — Can be done for e2e tests but inline JSON is cleaner for unit tests. Piano+violin MusicXML may be added as an e2e fixture later.

---

## Research Area 6: Bracket Rendering for Single-Staff Instruments (RESOLVED)

**Question**: How are brackets rendered for single-staff instruments?

**Decision**: No changes needed. The Rust engine already assigns `BracketType::None` for single-staff instruments and `BracketType::Brace` for multi-staff (piano). The renderer skips bracket rendering when `bracket_type === 'None'`. In a multi-instrument context, each instrument keeps its own bracket behavior — piano gets a brace, violin gets none. System-level brackets are out of scope per spec assumptions.

**Rationale**: `LayoutRenderer.tsx` line 210-214 checks `staves.length > 1 && bracket_type !== 'None'` before rendering. This logic is correct for multi-instrument rendering without modification.

**Alternatives considered**: None needed.

---

## Research Area 7: System Height and Scroll (RESOLVED)

**Question**: How does the existing scroll/zoom mechanism need to adapt?

**Decision**: No changes to scroll/zoom code. The `GlobalLayout.total_height` already sums all system heights. When system heights increase to accommodate more instruments, `total_height` automatically grows, and the existing viewport/scroll logic in `ScoreViewer.tsx` and the virtualization in `LayoutRenderer` handles it.

**Rationale**: The viewport/scroll is driven by `total_height` from the layout engine. The renderer's virtualization culls off-screen systems. Both are height-agnostic — they work regardless of how tall each system is.

**Alternatives considered**: None needed.

---

## Summary

All 7 research areas resolved. No NEEDS CLARIFICATION items remain. Key implementation scope:

| Layer | File | Change |
|-------|------|--------|
| Rust types | `types.rs` | Add `instrument_name: String` to `StaffGroup` |
| Rust engine | `mod.rs` | Fix vertical offset accumulation, system height calculation, add `name` to `InstrumentData`, populate `instrument_name` |
| TS types | `layout.ts` | Add `instrument_name: string` to `StaffGroup` |
| TS converter | `LayoutView.tsx` | Pass all instruments in `convertScoreToLayoutFormat` |
| TS renderer | `LayoutRenderer.tsx` | Render instrument name label `<text>` elements |
| Tests | `layout_test.rs`, Vitest files | Multi-instrument layout & rendering tests |
