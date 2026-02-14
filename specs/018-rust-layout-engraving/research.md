# Phase 0: Research & Technical Decisions

**Feature**: Rust Layout Engine Engraving  
**Phase**: Research (Phase 0)  
**Date**: 2025-02-12

## Research Questions from Technical Context

### Q1: JSON Input Format Mismatch

**Question**: Why does the WASM function receive notes but extract zero notes from the score JSON?

**Investigation**:
- Frontend LayoutView.tsx sends: `{instruments: [{staves: [{voices: [{notes: [...]}]}]}]}`
- Backend expects: `interval_events` array (from CompiledScore schema)
- Root cause: Format mismatch - frontend uses simplified `notes` field, backend parses `interval_events`

**Decision**: Support BOTH formats for backward compatibility
- Check for `notes` array first (new format from LayoutView)
- Fall back to `interval_events` (CompiledScore format)
- Log warning if neither found

**Rationale**: Allows layout engine to work with both direct note input (from LayoutView) and full score objects (from CompiledScore). No breaking changes.

---

### Q2: SMuFL Glyph Codepoints for Structural Elements

**Question**: What are the correct SMuFL codepoints and positioning rules for clefs, time signatures, and key signatures?

**Research Findings** (SMuFL 1.40 specification):

**Clefs**:
- Treble (G clef): `U+E050` - Anchor on second line from bottom (F4), spans ~7 staff spaces vertically
- Bass (F clef): `U+E062` - Anchor on fourth line from bottom (F3), spans ~3 staff spaces
- Alto (C clef): `U+E05C` - Center on middle line (C4), spans ~5 staff spaces
- Tenor (C clef): `U+E05D` - Center on fourth line from bottom (D4), spans ~5 staff spaces

**Time Signatures** (digits):
- `U+E080` through `U+E089` - Numbers 0-9 for time signature display
- Common time (C): `U+E08A`
- Cut time (¢): `U+E08B`
- Positioning: Stack numerator and denominator vertically centered on third line

**Key Signatures**:
- Sharp: `U+E262` 
- Flat: `U+E260`
- Natural: `U+E261`
- Order: F# C# G# D# A# E# B# (sharps), Bb Eb Ab Db Gb Cb Fb (flats)
- Vertical positions vary by clef (e.g., F# on treble = fifth line, F# on bass = fourth line)

**Decision**: Use SMuFL standard codepoints with staff-relative positioning
- Clefs positioned at x=20 logical units (before first note)
- Time signature at x=100 (after clef, before key signature if present)
- Key signature between clef and time signature (x=60-90 depending on accidental count)

**Rationale**: SMuFL is the industry standard for music notation fonts. Bravura font (embedded in project) implements full SMuFL specification.

---

### Q3: Stem Direction and Length Rules

**Question**: What are the engraving rules for stem direction, length, and attachment points?

**Research Findings** (Gould, "Behind Bars" + SMuFL recommendations):

**Stem Direction**:
- Notes on or above middle line (third line): stem DOWN (notehead on right, stem on left side)
- Notes below middle line: stem UP (notehead on left, stem on right side)
- Multiple notes (chords): direction based on average pitch
- Multiple voices: voice 1 always stems up, voice 2 always stems down

**Stem Length**:
- Standard length: 3.5 staff spaces (35 logical units at default 10 units/space)
- Minimum length: 3.0 staff spaces for notes within staff
- Extended for notes with ledger lines: must reach middle line from extreme ledger notes

**Stem Attachment**:
- Stem UP: Attach to RIGHT side of notehead at y-coordinate of notehead center
- Stem DOWN: Attach to LEFT side of notehead at y-coordinate of notehead center
- Width of notehead: ~1.25 staff spaces (12.5 logical units)

**Decision**: Implement standard engraving rules with 3.5 staff-space stems
- Compute stem direction based on notehead position relative to staff center
- Override for multi-voice: voice 1 up, voice 2 down
- Render stems as vertical line segments (no SMuFL glyph needed)

**Rationale**: These are universally accepted music engraving standards. Consistent with professional notation software (Dorico, Finale, Sibelius).

---

### Q4: Beam Grouping and Slope Calculation

**Question**: How should beams connect eighth notes and how is beam slope determined?

**Research Findings**:

**Beam Grouping Rules**:
- Group notes by beat according to time signature (e.g., in 4/4, group by quarter note beats)
- Maximum beam span: 1 measure (do not beam across bar lines)
- Break beams at rests
- Eighth notes = 1 beam, sixteenth notes = 2 beams, etc.

**Beam Slope**:
- Follows average pitch contour of beamed notes
- Maximum slope: 0.5 staff spaces per note (prevents excessive angles)
- Horizontal beams preferred for repeated pitches (slope = 0)
- Beam thickness: 0.5 staff spaces (5 logical units)

**Beam Positioning**:
- Beam sits outside staff (above stems-up, below stems-down)
- Distance from notehead: stem length (3.5 staff spaces)
- Secondary beams (sixteenth notes) spaced 0.25 staff spaces apart

**Decision**: Implement simplified beaming for MVP (US4 - Priority P2)
- Group consecutive eighth notes within same beat
- Calculate average pitch for slope (clamped to ±0.5 staff spaces/note)
- Render beams as horizontal rectangles in SVG (frontend handles rendering)
- Defer: Complex beaming (cross-staff, fractional beams, mixed durations)

**Rationale**: Basic beaming covers 80% of use cases. Complex beaming rules can be added incrementally in future iterations.

---

### Q5: Test Strategy for WASM Contract Validation

**Question**: How to validate that Rust output exactly matches frontend fixture expectations?

**Research Findings**:

**Approach 1**: JSON Schema Validation
- Define JSON schemas for input/output formats
- Validate WASM output against schema
- Pros: Catches structure mismatches, documents contract
- Cons: Doesn't verify exact values (e.g., glyph positions)

**Approach 2**: Fixture-Based Contract Tests
- Load frontend fixtures (violin_10_measures.json, piano_8_measures.json)
- Run known inputs through `compute_layout_wasm()`
- Assert byte-for-byte JSON equality
- Pros: Validates exact compatibility, catches regressions
- Cons: Brittle (any algorithm change breaks tests)

**Approach 3**: Property-Based Testing
- Generate random valid inputs
- Verify invariants (e.g., all glyphs have valid codepoints, staff lines evenly spaced)
- Pros: Finds edge cases, robust to algorithm changes
- Cons: Doesn't validate frontend integration

**Decision**: Hybrid approach combining all three
1. **Phase 1**: JSON schemas for documentation and basic validation
2. **Phase 2**: Fixture-based tests to validate against violin/piano fixtures (contract tests)
3. **Phase 3**: Property-based tests for invariants (unit tests)

**Rationale**: Schemas document contracts, fixture tests ensure frontend compatibility, property tests prevent regressions.

---

### Q6: Performance Optimization Strategies

**Question**: How to meet <100ms layout computation for 100-measure scores?

**Research Findings**:

**Current Bottlenecks** (profiling needed, but likely candidates):
- JSON parsing (`serde_json::from_str`) - can be slow for large scores
- Floating-point arithmetic in positioning calculations
- Repeated allocations in glyph vector building

**Optimization Strategies**:
1. **Pre-allocate vectors**: Use `Vec::with_capacity()` for known sizes
2. **Avoid cloning**: Use references where possible
3. **Cache glyph metrics**: Bravura metrics are static, compute once per glyph type
4. **Batch JSON serialization**: Serialize `GlobalLayout` once at end, not incrementally
5. **Profile-guided optimization**: Use `cargo bench` to identify actual bottlenecks

**Decision**: Defer optimization until after correctness is achieved (TDD principle)
- Phase 2: Implement correct logic without premature optimization
- Phase 3: Benchmark actual performance
- Phase 4: Optimize only proven bottlenecks

**Rationale**: "Premature optimization is the root of all evil" - Donald Knuth. Profile first, optimize second.

---

## Technology Choices

### SMuFL Font: Bravura

**Choice**: Continue using Bravura font (already embedded in project)

**Alternatives Considered**:
- MuseJazz: Optimized for jazz notation, lacks classical glyph coverage
- Petaluma: Handwritten style, less precise positioning
- Leland: Good alternative, but Bravura is reference SMuFL implementation

**Rationale**: Bravura is the SMuFL reference implementation with complete glyph coverage and precise metrics. Already integrated in project.

---

### Positioning Precision: f32 vs f64

**Choice**: Continue using `f32` for spatial coordinates

**Alternatives Considered**:
- `f64`: Higher precision, but doubles memory footprint and slower on some architectures
- Fixed-point arithmetic: More deterministic, but complex to implement

**Rationale**: `f32` provides sufficient precision for screen rendering (0.01 logical unit = 0.001 staff space). Screen resolution is the limiting factor, not float precision. Serialization rounds to 2 decimal places for determinism.

---

### Testing Framework: Built-in vs External

**Choice**: Use Rust built-in test framework (`#[test]` + `cargo test`)

**Alternatives Considered**:
- `rstest`: Parameterized tests, nice syntax
- `proptest`: Property-based testing (will use for Phase 3)
- `criterion`: Benchmarking (will use for performance validation)

**Rationale**: Built-in framework is sufficient for MVP. Add `proptest` and `criterion` later for advanced testing.

---

## Dependencies Analysis

### Existing Dependencies (No Changes)
- `serde` 1.0 - Serialization (already used)
- `serde_json` 1.0 - JSON parsing (already used)
- `wasm-bindgen` 0.2 - WASM bindings (already used)

### New Dependencies (None Required)
All functionality can be implemented with existing dependencies. SMuFL metrics are embedded as static data (no runtime font parsing needed).

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Input Format** | Support both `notes` and `interval_events` | Backward compatibility |
| **SMuFL Glyphs** | Use standard codepoints (U+E050, U+E080, etc.) | Industry standard |
| **Stem Rules** | 3.5 staff spaces, direction by pitch | Professional engraving standards |
| **Beam Rules** | Group by beat, average slope, 0.5 space thickness | Standard practice, simplified for MVP |
| **Test Strategy** | Hybrid: Schemas + Fixtures + Properties | Comprehensive validation |
| **Optimization** | Defer until after correctness | Avoid premature optimization |
| **Font** | Bravura SMuFL | Reference implementation |
| **Precision** | f32 coordinates | Sufficient for screen rendering |
| **Testing** | Built-in + proptest + criterion | Standard Rust ecosystem |

---

**Phase 0 Complete**: All research questions answered. Ready to proceed to Phase 1 (Design).
