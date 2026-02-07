# Quickstart: Score File Persistence Testing

**Date**: 2026-02-07  
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Phase**: Phase 1 - Design

## Overview

This guide provides manual testing procedures for the score file save/load functionality. Follow these steps to verify the implementation meets all acceptance criteria.

---

## Prerequisites

1. **Development Environment Running**:
   ```bash
   # From repository root
   docker compose up -d
   # OR
   cd frontend && npm run dev
   cd backend && cargo run
   ```

2. **Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+

3. **Test Data**: Use the example score from [contracts/score-file.json](./contracts/score-file.json)

---

## Test Suite 1: Save Score (US1 - Priority P1)

### Test 1.1: Save New Score

**Objective**: Verify saving a newly created score works correctly

**Steps**:
1. Open application in browser: `http://localhost:5173`
2. Create a new score with at least one instrument and several notes:
   - Click "Add Instrument" → Enter "Piano"
   - Add 4 notes: C4, D4, E4, F4 (MIDI 60, 62, 64, 65)
3. Click "Save" button (or File → Save menu)
4. Browser shows file download dialog
5. Choose location: `~/Downloads/test-score.json`
6. Confirm save

**Expected Results**:
- ✅ File `test-score.json` created in Downloads folder
- ✅ File size: ~5-15 KB (depending on notes added)
- ✅ File is human-readable JSON (open in text editor to verify)
- ✅ JSON contains all score data: instruments, notes, tempo (120 BPM), time signature (4/4)

**Success Criteria**: SC-002 (Save <1s), SC-004 (file size reasonable), SC-005 (human-readable)

---

### Test 1.2: Overwrite Existing File

**Objective**: Verify updating an existing saved file works

**Steps**:
1. Load the previously saved `test-score.json` (see Test 2.1 below)
2. Modify the score: Add 2 more notes (G4, A4 - MIDI 67, 69)
3. Click "Save" button (same file path should be remembered)
4. Confirm overwrite if prompted

**Expected Results**:
- ✅ File `test-score.json` updated with new content
- ✅ New notes included in JSON
- ✅ File size slightly increased (~2 KB more)
- ✅ Original notes still preserved

**Success Criteria**: SC-002 (Save <1s), SC-001 (original data preserved)

---

### Test 1.3: Save with Invalid Path (Error Handling)

**Objective**: Verify graceful handling of invalid save paths

**Note**: This test may be difficult to trigger with browser download mechanism (downloads always go to configured folder). May require manual path entry in future File System Access API version.

**Steps**:
1. Create a score with notes
2. Click "Save" button
3. Attempt to save to read-only location (if possible) or cancel dialog

**Expected Results**:
- ✅ If path invalid: Error message displayed (not browser crash)
- ✅ If cancelled: Operation cancelled gracefully, score remains unsaved
- ✅ Application remains functional

**Success Criteria**: FR-003 (error handling), US1 Acceptance Scenario 3

---

## Test Suite 2: Load Score (US2 - Priority P2)

### Test 2.1: Load Valid Score File

**Objective**: Verify loading a previously saved score works correctly

**Steps**:
1. Ensure `test-score.json` exists from Test 1.1 (or use [contracts/score-file.json](./contracts/score-file.json))
2. Open application: `http://localhost:5173`
3. Click "Load" or "Open" button (or File → Open menu)
4. Browser shows file picker dialog
5. Select `test-score.json`
6. Click "Open"

**Expected Results**:
- ✅ Score loads and displays in editor
- ✅ All instruments visible with correct names
- ✅ All notes displayed at correct positions
- ✅ Tempo shows 120 BPM (or whatever was saved)
- ✅ Time signature shows 4/4 (or whatever was saved)
- ✅ Load completes in <2 seconds (SC-003)
- ✅ Success message displayed: "Score loaded successfully"

**Success Criteria**: SC-001 (100% fidelity), SC-003 (Load <2s), SC-006 (valid files load 100%)

---

### Test 2.2: Load with Unsaved Changes Warning

**Objective**: Verify warning displays before discarding unsaved work

**Steps**:
1. Create a new score and add 2 notes (don't save)
2. Click "Load" button
3. Warning dialog appears: "You have unsaved changes. Loading a file will discard them. Continue?"
4. Test both options:
   - Click "Cancel" → Load operation cancelled, current score preserved
   - Click "Continue" → File picker opens, proceed to load

**Expected Results**:
- ✅ Warning dialog displays before file picker
- ✅ "Cancel" preserves current unsaved work
- ✅ "Continue" allows loading (current work discarded)
- ✅ Warning only shows when `isModified = true`

**Success Criteria**: FR-007 (warn before discard), SC-008 (warnings 100% of cases), US2 Acceptance Scenario 2

---

### Test 2.3: Load Invalid JSON File

**Objective**: Verify clear error messages for corrupted files

**Test Data**: Create `invalid.json` files:

1. **Syntax error** (`invalid-syntax.json`):
   ```json
   {
     "id": "123",
     "instruments": [
       { "name": "Piano"  // Missing closing brace
   }
   ```

2. **Missing field** (`invalid-missing-field.json`):
   ```json
   {
     "id": "123"
     // Missing "instruments" and "global_structural_events"
   }
   ```

3. **Invalid value** (`invalid-pitch.json`):
   ```json
   {
     "id": "123",
     "global_structural_events": [],
     "instruments": [{
       "id": "456",
       "name": "Piano",
       "staves": [{
         "id": "789",
         "clef_events": [],
         "key_signature_events": [],
         "voices": [{
           "id": "abc",
           "notes": [{
             "start_tick": 0,
             "duration_ticks": 960,
             "pitch": 200  // Invalid: out of range (21-108)
           }]
         }]
       }]
     }]
   }
   ```

**Steps** (repeat for each invalid file):
1. Click "Load" button
2. Select invalid file
3. Click "Open"

**Expected Results**:
- ✅ Error message displayed (not crashed)
- ✅ **Syntax error**: "Invalid JSON file format: [parse error details]"
- ✅ **Missing field**: "Missing required field: instruments" (or similar)
- ✅ **Invalid value**: "Invalid pitch value '200': must be between 21 and 108"
- ✅ Application remains functional after error
- ✅ Current score unchanged

**Success Criteria**: FR-005 (validation), SC-007 (helpful error messages), US2 Acceptance Scenario 3

---

## Test Suite 3: New Score Creation (US3 - Priority P3)

### Test 3.1: Create New Score (No Unsaved Changes)

**Objective**: Verify creating new score with clean state works

**Steps**:
1. Load a score from file (or have empty score)
2. Ensure no unsaved changes (modify indicator should be off)
3. Click "New Score" button (or File → New menu)

**Expected Results**:
- ✅ Current score cleared
- ✅ Empty score displayed with defaults:
  - Tempo: 120 BPM
  - Time signature: 4/4
  - No instruments
  - No notes
- ✅ File path cleared (shows as "Untitled" or no filename)
- ✅ Modified flag reset to false

**Success Criteria**: US3 Acceptance Scenario 1

---

### Test 3.2: Create New Score with Unsaved Changes Warning

**Objective**: Verify warning before discarding unsaved work

**Steps**:
1. Load a score and modify it (add a note)
2. Don't save changes
3. Click "New Score" button
4. Warning dialog appears: "You have unsaved changes. Creating a new score will discard them. Continue?"
5. Test both options:
   - Click "Cancel" → New score operation cancelled, current work preserved
   - Click "Continue" → New empty score created, unsaved work discarded

**Expected Results**:
- ✅ Warning dialog displays before clearing
- ✅ "Cancel" preserves current unsaved work
- ✅ "Continue" creates new empty score
- ✅ Warning only shows when `isModified = true`

**Success Criteria**: FR-007 (warn before discard), SC-008 (warnings 100% of cases), US3 Acceptance Scenario 2

---

## Test Suite 4: Performance & File Size (Success Criteria)

### Test 4.1: Large Score Performance

**Objective**: Verify performance targets met for large scores

**Test Data**: Create or generate a score with:
- 100 measures (384,000 ticks at 4/4 time)
- 10 instruments (piano, violin, cello, flute, oboe, clarinet, trumpet, trombone, percussion, bass)
- ~200 notes per instrument (~2000 notes total)

**Steps**:
1. Load or create large score
2. Click "Save" → Measure time until file downloaded
3. Click "Load" → Select saved file → Measure time until score displayed

**Expected Results**:
- ✅ Save completes in <1 second (SC-002)
- ✅ Load completes in <2 seconds (SC-003)
- ✅ File size <1 MB (SC-004) - Check in file manager
- ✅ JSON remains human-readable (open in text editor to verify)

**Measurement**:
- Use browser DevTools Performance timeline
- Or add console.time/timeEnd in code temporarily
- Or use stopwatch for rough timing

---

### Test 4.2: Data Fidelity Round-Trip

**Objective**: Verify 100% data preservation through save/load cycle

**Steps**:
1. Create a complex score with:
   - 3 instruments (Piano, Violin, Cello)
   - Multiple tempo changes (120 BPM at tick 0, 140 BPM at tick 3840)
   - Time signature changes (4/4 at tick 0, 3/4 at tick 7680)
   - Clef changes (Treble → Bass mid-score)
   - Key signature changes (C major → D major)
   - Various note durations (whole, half, quarter, eighth notes)
   - Full MIDI range notes (low A0 = 21, high C8 = 108)
2. Save score as `fidelity-test.json`
3. Copy file to `fidelity-test-original.json` (backup)
4. Load `fidelity-test.json` back into application
5. Save again as `fidelity-test-reloaded.json`
6. Compare files in text editor or diff tool

**Expected Results**:
- ✅ All instruments preserved (names, count, order)
- ✅ All notes preserved (start tick, duration, pitch)
- ✅ All tempo events preserved (tick, BPM)
- ✅ All time signature events preserved (tick, numerator, denominator)
- ✅ All clef events preserved (tick, clef type)
- ✅ All key signature events preserved (tick, sharps/flats)
- ✅ UUIDs preserved (same IDs across save/load)
- ✅ JSON files identical (except possible whitespace differences)

**Success Criteria**: SC-001 (100% data fidelity - most critical test)

---

## Test Suite 5: Edge Cases

### Test 5.1: Empty Score Save/Load

**Steps**:
1. Create new score (no instruments, no notes)
2. Save as `empty-score.json`
3. Load `empty-score.json`

**Expected**:
- ✅ Saves successfully (minimal JSON with defaults)
- ✅ Loads successfully (default tempo 120 BPM, 4/4 time signature)
- ✅ File size ~1-2 KB

---

### Test 5.2: Very Long Instrument/Field Names

**Steps**:
1. Create instrument with 255-character name
2. Save and reload

**Expected**:
- ✅ Long names preserved
- ✅ No truncation
- ✅ UI displays (may truncate in display but data intact)

---

### Test 5.3: Multiple Rapid Save Operations

**Steps**:
1. Create score, click "Save" 5 times rapidly
2. Verify file system state

**Expected**:
- ✅ No crashes or errors
- ✅ File saved successfully (multiple downloads or last save wins)

---

## Test Execution Checklist

Use this checklist when running the full test suite:

### Save Functionality (US1)
- [ ] Test 1.1: Save new score
- [ ] Test 1.2: Overwrite existing file
- [ ] Test 1.3: Save error handling

### Load Functionality (US2)
- [ ] Test 2.1: Load valid score
- [ ] Test 2.2: Load with unsaved warning
- [ ] Test 2.3: Load invalid JSON (3 variants)

### New Score (US3)
- [ ] Test 3.1: New score clean state
- [ ] Test 3.2: New score with unsaved warning

### Performance (Success Criteria)
- [ ] Test 4.1: Large score performance (save <1s, load <2s)
- [ ] Test 4.2: Data fidelity round-trip (100%)

### Edge Cases
- [ ] Test 5.1: Empty score
- [ ] Test 5.2: Long field names
- [ ] Test 5.3: Rapid saves

### Cross-Browser Testing
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+

---

## Troubleshooting

### Issue: File doesn't download
**Possible Causes**:
- Browser blocking downloads (check permissions)
- Ad blocker interfering
- Browser download settings

**Fix**:
- Check browser console for errors
- Verify download folder permissions
- Try incognito/private mode

---

### Issue: Load fails with "Invalid JSON"
**Possible Causes**:
- File corrupted during transfer
- File edited manually with syntax errors
- Wrong file type selected

**Fix**:
- Validate JSON in online validator (jsonlint.com)
- Check file extension (.json)
- Re-save from application

---

### Issue: Performance slower than targets
**Possible Causes**:
- Browser DevTools open (slows performance)
- System under heavy load
- Very old browser version

**Fix**:
- Close DevTools during timing tests
- Close other applications
- Update browser to latest version

---

## Reporting Issues

When reporting bugs, include:
1. **Browser**: Name and version (e.g., "Chrome 114.0.5735.198")
2. **Test**: Which test failed (e.g., "Test 2.1: Load Valid Score")
3. **Steps**: Exact sequence to reproduce
4. **Expected**: What should happen
5. **Actual**: What actually happened
6. **Files**: Attach test files if applicable
7. **Console**: Browser console errors (F12 → Console tab)

---

## Success Criteria Mapping

| Test | Success Criteria | Passing Required For |
|------|-----------------|---------------------|
| 1.1, 1.2 | SC-002 (Save <1s) | US1 acceptance |
| 1.1 | SC-004 (File size), SC-005 (Readable) | US1 acceptance |
| 2.1 | SC-001 (100% fidelity), SC-003 (Load <2s), SC-006 (Valid loads 100%) | US2 acceptance |
| 2.2, 3.2 | SC-008 (Warnings 100%) | US2, US3 acceptance |
| 2.3 | SC-007 (Helpful errors) | US2 acceptance |
| 4.1 | SC-002, SC-003, SC-004 | Performance validation |
| 4.2 | SC-001 (100% fidelity) | **CRITICAL** - Data integrity |

---

**Status**: Ready for manual testing once implementation complete.
