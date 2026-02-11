# Quickstart: Resilient MusicXML Import

**Feature**: [015-musicxml-error-handling](spec.md)  
**Target**: Developers implementing/testing error handling improvements  
**Duration**: 15 minutes

## Overview

This guide helps you test the enhanced MusicXML importer with real-world files containing structural issues. Primary test case: **Moonlight Sonata.mxl** (71KB, currently fails with "Domain validation failed").

## Prerequisites

- Rust 1.93+ installed (`rustup update`)
- Node.js 20.19+ installed (for frontend testing)
- Repository cloned: `git clone https://github.com/aylabs/musicore.git`
- Branch checked out: `git checkout 015-musicxml-error-handling`

## Test Files

Located in `backend/music/`:

| File | Size | Status | Issue Type |
|------|------|--------|------------|
| `Moonlight sonata.mxl` | 71KB | ❌ Fails | Overlapping notes (P1) |
| `CanonD.mxl` | 5.4KB | ✅ Works | Baseline (no issues) |
| `1bar.mxl` | 2.3KB | ✅ Works | Minimal test case |

## Quick Test (Current Failure)

### Step 1: Verify Current Failure

```bash
cd backend
cargo run --bin musicore-import -- "music/Moonlight sonata.mxl"
```

**Expected Output** (before fix):
```
Error: Import failed: Domain validation failed
```

**Root Cause**: Overlapping notes with same pitch in single voice violate domain invariant in `Voice::add_note()`.

### Step 2: Examine File Structure

```bash
unzip -l "music/Moonlight sonata.mxl"
```

**Expected Output**:
```
Archive:  music/Moonlight sonata.mxl
  Length      Date    Time    Name
---------  ---------- -----   ----
      152  02-08-2026 21:32   META-INF/container.xml
    73428  02-08-2026 21:32   score.xml
```

Extract and analyze XML:
```bash
unzip -p "music/Moonlight sonata.mxl" score.xml | head -100
```

Look for multiple `<note>` elements with same pitch at overlapping tick positions within same `<voice>1</voice>`.

## Testing After Implementation

### Backend: Unit Tests

```bash
cd backend

# Run all importer tests
cargo test musicxml_import

# Run specific error handling tests
cargo test overlapping_notes
cargo test missing_elements
cargo test deterministic_import

# Verbose output for debugging
cargo test musicxml_import -- --nocapture
```

**Key Tests to Add**:
- `test_overlapping_notes_split()` - Verify voice splitting
- `test_missing_tempo_default()` - Verify 120 BPM default applied
- `test_moonlight_sonata_import()` - Integration test with real file
- `test_deterministic_repeated_import()` - Parse same file 10x, compare outputs

### Backend: CLI Import

```bash
cd backend

# Import with warnings displayed
cargo run --bin musicore-import -- --verbose "music/Moonlight sonata.mxl"

# Expected output (after fix):
# Importing MusicXML file: music/Moonlight sonata.mxl
# 
# Statistics:
#   Instruments: 1
#   Staves: 2
#   Voices: 3 (auto-generated due to overlaps)
#   Notes: 2847
#   Duration: 28800 ticks
# 
# Warnings (5):
#   [Measure 12, Staff 1, Voice 1] Overlapping C4 quarter notes at tick 480 - split into voice 2
#   [Measure 25, Staff 1, Voice 1] Overlapping E4 eighth notes at tick 1920 - split into voice 2
#   [Measure 31, Staff 1, Voice 1] Overlapping G4 quarter notes at tick 2880 - split into voice 3
#   [Measure 47, Staff 1, Voice 1] Overlapping A4 half notes at tick 4320 - split into voice 3
#   [Measure 52, Staff 2] Missing clef definition - inferred Bass clef from pitch range
# 
# ✓ Import successful (with warnings)

# Validate determinism
for i in {1..10}; do
  cargo run --bin musicore-import -- "music/Moonlight sonata.mxl" > /tmp/import_$i.json
done
md5sum /tmp/import_*.json  # All should have same hash
```

### Frontend: Integration Test

```bash
cd frontend

# Install dependencies
npm install

# Run import tests
npm test -- import-error-handling

# Start dev server for manual testing
npm run dev
```

**Manual Test Steps**:
1. Open http://localhost:5173 in browser
2. Click "Import" button
3. Select `backend/music/Moonlight sonata.mxl`
4. Verify:
   - ✅ Import success banner appears
   - ✅ Warning panel displays "Imported with 5 warnings - see details"
   - ✅ Clicking "see details" expands grouped warnings
   - ✅ Score renders with 3 movements visible
   - ✅ Playback works correctly
   - ✅ No console errors

### Frontend: WASM Integration

```bash
cd backend

# Build WASM module
./scripts/build-wasm.sh

# Module outputs to pkg/ directory
ls -lh pkg/musicore_backend_bg.wasm

cd ../frontend

# Copy WASM to public directory (build script does this)
npm run build:wasm

# Test WASM parsing directly
npm test -- wasm-import.test.ts
```

## Validation Checklist

Before marking feature complete:

### Functional Requirements

- [ ] **FR-001**: Moonlight Sonata.mxl imports successfully (no fatal error)
- [ ] **FR-002**: Warnings collected without failing operation
- [ ] **FR-003**: Overlapping notes split into separate voices (check warning messages)
- [ ] **FR-004**: Max 4 voices per staff (verify in output statistics)
- [ ] **FR-005**: Default tempo 120 BPM applied if missing (check warnings)
- [ ] **FR-006**: All defaults recorded in warnings (search for "default" keyword)
- [ ] **FR-016**: Deterministic - repeated imports produce identical output (md5sum test)
- [ ] **FR-017**: Non-integer ticks rounded, warned if >0.1 (check for rounding warnings)

### Success Criteria

- [ ] **SC-001**: Moonlight Sonata.mxl displays all 3 movements, notes playable
- [ ] **SC-003**: Import completes within 5 seconds (check `time` output)
- [ ] **SC-008**: 10 repeated imports produce byte-identical JSON

### User Experience

- [ ] Import success banner shows warning count
- [ ] Warnings grouped by category (Overlap, Missing Elements, etc.)
- [ ] Each warning includes measure number and context
- [ ] Warning severity colors match design (gray=info, yellow=warning, red=error)
- [ ] Score playback works despite warnings
- [ ] No breaking changes to existing working imports (CanonD.mxl, 1bar.mxl still work)

## Troubleshooting

### Issue: "cargo: command not found"

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Issue: "error: binary not found for 'musicxore-import'"

```bash
# Build binary first
cd backend
cargo build --bin musicore-import
```

### Issue: "WASM module failed to load"

```bash
# Rebuild WASM with fresh build
cd backend
rm -rf pkg target/wasm32-unknown-unknown
./scripts/build-wasm.sh

cd ../frontend
rm -rf public/wasm
npm run build:wasm
```

### Issue: "Different imports produce different outputs"

Check for sources of non-determinism:
- HashMap usage (replace with BTreeMap)
- Floating-point arithmetic (use integer-only)
- Unordered iteration (sort collections before processing)
- Random UUIDs (use deterministic ID generation)

### Issue: "Warning messages not displaying in UI"

```bash
# Check WASM bindings return warnings
cd frontend/src/services/wasm
grep -n "warnings" music-engine.ts

# Verify ImportButton component handles warnings
cd ../components/import
grep -n "warnings" ImportButton.tsx
```

## Next Steps

1. **Implement**: Follow [tasks.md](tasks.md) (generated by `/speckit.tasks`)
2. **Test**: Run above validation checklist at each milestone
3. **Document**: Update [README.md](/README.md) with new import capabilities
4. **Deploy**: Merge to main after all tests pass and PR approved

## Quick Reference

| Command | Purpose |
|---------|---------|
| `cargo test musicxml_import` | Run backend importer tests |
| `cargo run --bin musicore-import -- FILE` | CLI import with warnings |
| `npm test -- import-error-handling` | Frontend warning display tests |
| `npm run dev` | Start dev server for manual testing |
| `./scripts/build-wasm.sh` | Rebuild WASM module |

**Test File**: `backend/music/Moonlight sonata.mxl` (71KB, P1 validation target)  
**Expected**: Import succeeds with ~5 warnings, score displays/plays correctly
