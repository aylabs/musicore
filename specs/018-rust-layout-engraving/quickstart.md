# Quickstart: Rust Layout Engine Engraving

**Feature**: Complete Rust layout engine to generate staff content  
**Branch**: `018-rust-layout-engraving`  
**Estimated Time**: 5-10 minutes to understand, 1-2 weeks to implement

## What This Feature Does

**Problem**: The layout engine creates system structure but returns empty `staff_groups[]` arrays, preventing notation from rendering.

**Solution**: Complete the implementation to generate:
- Staff lines (5 horizontal lines per staff, 20 logical units apart)
- Noteheads (SMuFL glyphs positioned by pitch and timing)
- Structural glyphs (clefs, time signatures, key signatures)
- Stems and beams (for eighth notes and shorter durations)

**User Impact**: Musicians can see correctly rendered music notation in Layout View instead of blank systems.

---

## Quick Navigation

| Document | Purpose | Read First? |
|----------|---------|-------------|
| [spec.md](spec.md) | User stories, requirements, success criteria | ✅ Yes |
| [plan.md](plan.md) | Implementation roadmap, architecture | ✅ Yes |
| [research.md](research.md) | Technical decisions, SMuFL details | 📖 Reference |
| [data-model.md](data-model.md) | Entity relationships, JSON structure | 📖 Reference |
| [contracts/](contracts/) | JSON schemas for input/output | 🧪 Testing |

---

## 5-Minute Overview

### Current State (❌ Broken)

**Input** (from LayoutView.tsx):
```json
{
  "instruments": [{"staves": [{"voices": [{"notes": [...]}]}]}]
}
```

**Output** (from compute_layout_wasm):
```json
{
  "systems": [
    { "staff_groups": [] }  // ❌ Empty!
  ]
}
```

**Error in Frontend**: `"Layout engine computed systems but did not generate staff content"`

---

### Desired State (✅ Fixed)

**Same Input** → **Correct Output**:
```json
{
  "systems": [
    {
      "staff_groups": [
        {
          "instrument_id": "violin-1",
          "staves": [
            {
              "staff_lines": [
                {"y_position": 0, "start_x": 0, "end_x": 1200},
                {"y_position": 20, ...},
                {"y_position": 40, ...},
                {"y_position": 60, ...},
                {"y_position": 80, ...}
              ],
              "glyph_runs": [{
                "glyphs": [
                  {"position": {"x": 100, "y": 40}, "codepoint": "\\uE0A4"}
                ]
              }],
              "structural_glyphs": [
                {"position": {"x": 20, "y": 40}, "codepoint": "\\uE050"}  // Treble clef
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Result in Frontend**: Notation renders correctly with staff lines, noteheads, and clefs visible.

---

## Root Cause Analysis

### Bug 1: JSON Input Format Mismatch

**Location**: `backend/src/layout/mod.rs:extract_instruments()`

**Problem**: Code checks for `interval_events` but frontend sends `notes`:

```rust
// Current code (WRONG):
if let Some(interval_events) = voice["interval_events"].as_array() {
    // Parse notes...
}
// Frontend sends voice["notes"], so this returns None
```

**Fix**: Check `notes` first, fall back to `interval_events`:

```rust
// Fixed code:
let note_array = voice["notes"].as_array()
    .or_else(|| voice["interval_events"].as_array());
    
if let Some(notes) = note_array {
    // Parse notes...
}
```

---

### Gap 2: Structural Glyphs Not Implemented

**Location**: `backend/src/layout/positioner.rs:position_structural_glyphs()`

**Problem**: Function exists but is stubbed:

```rust
pub fn position_structural_glyphs() {
    // Stub implementation - structural glyphs positioning
    // For MVP, we'll skip structural glyphs and implement this in future iterations
}
```

**Fix**: Implement clef, time signature, and key signature positioning using SMuFL codepoints.

---

### Gap 3: Stem/Beam Rendering Not Implemented

**Location**: Will create `backend/src/layout/stems.rs` and `beams.rs`

**Problem**: No code exists for rendering stems and beams.

**Fix**: Create modules to generate stem lines and horizontal beams, encode as special glyphs (codepoint U+0000, U+0001).

---

## Development Workflow

### Phase 0: Research ✅ COMPLETE

- [x] Investigate input format mismatch
- [x] Research SMuFL glyph codepoints
- [x] Research stem/beam engraving rules
- [x] Define test strategy

**Output**: [research.md](research.md) - All decisions documented

---

### Phase 1: Design ✅ COMPLETE

- [x] Document entity relationships
- [x] Define JSON contracts (schemas)
- [x] Create quickstart guide
- [x] Update agent context

**Output**: [data-model.md](data-model.md), [contracts/](contracts/), this file

---

### Phase 2: Implementation (Next Step - Use `/speckit.tasks`)

**Test-Driven Development Required**:

1. **Write Contract Tests FIRST (RED)**:
   ```bash
   # Create test file
   touch backend/tests/contract/wasm_contract_test.rs
   
   # Write test that loads violin_10_measures.json
   # Run test (will fail - no staff_groups yet)
   cargo test --test wasm_contract_test
   ```

2. **Fix Input Parsing (GREEN)**:
   ```rust
   // Modify backend/src/layout/mod.rs:extract_instruments()
   // Check for 'notes' field before 'interval_events'
   ```

3. **Add Structural Glyphs (GREEN)**:
   ```rust
   // Modify backend/src/layout/positioner.rs
   // Implement position_structural_glyphs()
   ```

4. **Add Stems/Beams (GREEN)**:
   ```rust
   // Create backend/src/layout/stems.rs
   // Create backend/src/layout/beams.rs
   ```

5. **Verify Tests Pass (GREEN)**:
   ```bash
   cargo test --test wasm_contract_test
   # All tests should pass
   ```

**Next Command**: Run `/speckit.tasks` to generate detailed task breakdown.

---

## File Modification Summary

| File | Change Type | Priority | Lines Added |
|------|-------------|----------|-------------|
| `backend/src/layout/mod.rs` | MODIFY | P1 (Critical) | ~30 |
| `backend/src/layout/positioner.rs` | MODIFY | P1 (Critical) | ~150 |
| `backend/src/layout/metrics.rs` | MODIFY | P2 | ~50 |
| `backend/src/layout/stems.rs` | CREATE | P2 | ~100 |
| `backend/src/layout/beams.rs` | CREATE | P2 | ~150 |
| `backend/tests/contract/wasm_contract_test.rs` | CREATE | P1 (Critical) | ~200 |
| `backend/tests/integration/layout_engine_test.rs` | CREATE | P2 | ~300 |

**Total New Code**: ~500-800 lines  
**Total Tests**: ~500 lines

---

## Testing Strategy

### Level 1: Contract Tests (Must Pass)

**Purpose**: Validate WASM output matches frontend fixtures exactly

```bash
cargo test --test wasm_contract_test

# Tests:
# - test_violin_fixture_match()
# - test_piano_fixture_match()
# - test_deterministic_output()
```

**Pass Criteria**: Byte-for-byte JSON match with `violin_10_measures.json` and `piano_8_measures.json`

---

### Level 2: Integration Tests

**Purpose**: Validate layout computation logic

```bash
cargo test --test layout_engine_test

# Tests:
# - test_single_note_positioning()
# - test_multiple_staves()
# - test_structural_glyph_placement()
# - test_stem_direction()
# - test_beam_grouping()
```

**Pass Criteria**: All layout invariants hold (5 staff lines, valid codepoints, correct spacing)

---

### Level 3: Unit Tests

**Purpose**: Validate individual functions

```bash
cargo test -p musicore-backend

# Tests in each module:
# - positioner::tests::test_pitch_to_y()
# - positioner::tests::test_clef_positioning()
# - stems::tests::test_stem_direction()
# - beams::tests::test_beam_slope()
```

**Pass Criteria**: All edge cases covered (out-of-range pitches, extreme slope, etc.)

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| 10-measure score | < 10ms | `cargo bench layout_10_measures` |
| 100-measure score | < 100ms | `cargo bench layout_100_measures` |
| 1000-measure score | < 1s | `cargo bench layout_1000_measures` |
| Determinism | 100% | Run 10x, compare SHA256 |
| Memory | No leaks | `valgrind` (if available) |

---

## Success Validation

### Step 1: Run Backend Tests

```bash
cd backend
cargo test --all-features
# Expected: All tests pass (0 failures)
```

### Step 2: Rebuild WASM Module

```bash
cd backend
wasm-pack build --target web
# Expected: pkg/musicore_bg.wasm generated
```

### Step 3: Rebuild Frontend

```bash
cd frontend
docker compose build frontend
docker compose restart frontend
# Expected: Build succeeds, frontend restarts
```

### Step 4: Test in Browser

```
1. Open http://localhost:3000
2. Load a score (use test score if available)
3. Click "Layout View" mode selector
4. Expected: Notation renders with staff lines, noteheads, clefs visible
5. No errors in browser console
```

### Step 5: Visual Verification

**Compare rendered output against violin demo**:
- Staff lines evenly spaced (20 logical units apart)
- Noteheads positioned on correct lines/spaces
- Treble clef visible at left edge
- No "Layout engine computed systems but did not generate staff content" error

---

## Troubleshooting

### Error: "staff_groups is empty"

**Cause**: Input parsing bug not fixed, or fix not deployed  
**Solution**: Verify `extract_instruments()` checks `notes` field, rebuild WASM, restart frontend

### Error: "Invalid SMuFL codepoint"

**Cause**: Using wrong Unicode for clef/signature glyphs  
**Solution**: Check [research.md](research.md) for correct codepoints (U+E050 for treble clef, etc.)

### Error: "Noteheads positioned at NaN"

**Cause**: `pitch_to_y()` calculation error or invalid MIDI pitch  
**Solution**: Add validation for pitch range (0-127), check units_per_space config value

### Error: "Staff lines have wrong spacing"

**Cause**: `units_per_space` mismatch between config and expectation  
**Solution**: Verify config uses 20 units/space, formula is `line_index * 2 * units_per_space`

---

## Next Steps

1. **Read [spec.md](spec.md)** to understand user requirements
2. **Read [plan.md](plan.md)** Constitution Check and architecture
3. **Run `/speckit.tasks`** to generate detailed implementation task list
4. **Start TDD cycle**: Write contract test → Fix input parsing → Implement glyphs → Verify tests pass

**Estimated Timeline**:
- Week 1: Fix input parsing, add structural glyphs, contract tests passing
- Week 2: Add stems/beams, complete integration tests, performance validation
- Total: 1-2 weeks to MVP (P1+P2 user stories)

---

**Ready to start?** Run `/speckit.tasks` to break down implementation into atomic tasks.
