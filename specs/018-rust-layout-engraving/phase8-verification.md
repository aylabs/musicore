# Phase 8 Frontend Integration Verification

## T082: Load Score & Verify Notation Renders

### Test Steps:
1. Navigate to http://localhost:5173/
2. Load a test score (violin or piano fixture)
3. Verify notation elements render correctly:
   - [ ] Staff lines visible (5 lines per staff)
   - [ ] Noteheads display with correct duration glyphs
   - [ ] Clefs render at start of system (treble/bass)
   - [ ] Barlines separate measures
   - [ ] Multi-staff systems aligned vertically (piano)

### Expected Results:
- All notation elements visible and properly positioned
- No missing or misaligned glyphs
- Proper spacing between notes
- Barlines after last note in each measure

---

## T083: Browser Console Verification

### Console Checks:
Open browser DevTools console (F12) and verify:

1. **No JavaScript Runtime Errors**
   - [ ] No red error messages
   - [ ] No "Uncaught" exceptions
   - [ ] No "TypeError" or "ReferenceError"

2. **No "empty staff_groups" Error**
   - [ ] Search console for "staff_groups"
   - [ ] Verify no empty staff group warnings
   - [ ] All staff groups contain glyphs

3. **WASM Loading Success**
   - [ ] Look for "[WASM] Loading module:" message
   - [ ] Verify no WASM loading failures
   - [ ] Check wasmVersion matches (should be 2)
   - [ ] Verify layoutWidth: 1600 (not cached 1200 or 800)

4. **Performance Warnings** (if any)
   - [ ] "Slow frame detected" warnings acceptable if < 16ms threshold
   - [ ] No infinite loops or hangs
   - [ ] Viewport updates complete within 100ms

### Debug Output to Check:
```javascript
{
  "layoutWidth": 1600,     // Should be 1600 (max_system_width)
  "totalWidth": 1600,       // Should match layoutWidth
  "zoom": 1,                // Initial zoom 100%
  "viewportWidth": <varies> // Your browser window width
}
```

---

## T084: Visual Verification

### Violin Fixture (10 measures):
Compare rendered output against expected layout:
- [ ] Single staff (treble clef)
- [ ] Correct note duration glyphs:
  - Whole notes: open oval, no stem (U+E0A2)
  - Half notes: open oval with stem (U+E1D3)
  - Quarter notes: filled oval with stem (U+E1D5)
  - Eighth notes: filled oval with stem + 1 flag (U+E1D7)
  - Sixteenth notes: filled oval with stem + 2 flags (U+E1D9)
- [ ] Comfortable spacing (notes not cramped)
- [ ] Barlines not overlapping noteheads
- [ ] No flags overlapping

### Piano Fixture (8 measures):
- [ ] Two staves (grand staff: treble + bass)
- [ ] Brace connecting staves on left
- [ ] Treble and bass clefs correct
- [ ] Staves vertically aligned (same x-positions)
- [ ] Barlines aligned between staves
- [ ] Staves separated by 20 staff spaces (400 units)

### Scrolling Behavior:
- [ ] Horizontal scrollbar visible at bottom of container (if viewport < 1600px)
- [ ] Horizontal scroll navigates through full score width
- [ ] Vertical scrolling works at page level (not buggy container scroll)
- [ ] Zoom controls functional (+/- buttons)
- [ ] Zoom affects scroll dimensions correctly

---

## Verification Commands

### Run All Backend Tests:
```bash
cd backend && cargo test
# Should show 242+ tests passing
```

### Check WASM Artifacts:
```bash
ls -lh frontend/public/wasm/
# Should see:
# - musicore_backend.js (~36K)
# - musicore_backend_bg.wasm (~372K)
# - musicore_backend_bg.wasm.d.ts
```

### Verify Dev Server Running:
```bash
# Check server is listening
lsof -ti:5173
# Should return process ID
```

---

## Known Issues to Monitor

### ✅ Fixed (should NOT appear):
- Empty `<text>` elements (codepoints now populated)
- layoutWidth: 1200 (should be 1600 after cache clear)
- Two vertical scrollbars (container now overflowY: hidden)
- Flags overlapping (measure-level padding added)
- Barlines overlapping noteheads (positioning uses note map)

### ⚠️ Acceptable (not blocking):
- Beaming not implemented (deferred to future phase)
- Stem direction always up (using combined glyphs)
- Performance warnings if frame time 16-50ms (still acceptable)

### ❌ Report if Found:
- Missing notation elements
- NaN position errors in console
- Glyphs rendering as empty squares (�)
- WASM loading failures
- Layout computation errors
- Crashes or infinite loops

---

## Completion Criteria

Phase 8 Integration & Validation is ✅ **COMPLETE** when:
- [x] T075: Violin contract tests pass
- [x] T076: Piano contract tests pass
- [x] T077: Determinism verified (10 iterations)
- [ ] T078-T079: Performance benchmarks (optional)
- [x] T080: SMuFL codepoints validated
- [x] T081: WASM module rebuilt
- [ ] T082: Score loads and renders
- [ ] T083: Console has no errors
- [ ] T084: Visual output matches expectations

---

## Next Steps

After Phase 8 validation:
- **Phase 9**: Polish & Documentation (T085-T094)
  - Add inline documentation for layout functions
  - Update architecture README
  - Remove debug logging
  - Update task checklist
  - Final code cleanup
