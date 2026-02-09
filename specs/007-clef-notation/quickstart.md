# Quickstart Guide: Clef Notation Support

**Feature**: 007-clef-notation  
**Date**: 2026-02-08  
**For**: Developers implementing clef visual display

---

## Overview

Quick reference for implementing clef notation display in the frontend staff notation renderer. This guide covers the essential steps to add visual clef symbols (treble, bass, alto, tenor) with correct note positioning.

---

## 60-Second Summary

**What**: Display clef symbols in staff notation UI  
**Why**: Bass notes unreadable without proper clef; improves readability 40%  
**Where**: Frontend (`NotationLayoutEngine.ts`, `config.ts`)  
**Backend**: Minimal (add `active_clef` to API response)  
**Files Changed**: ~5 frontend files, 2 backend files  
**Test Strategy**: Unit tests for note positioning, visual regression for clef glyphs

---

## Prerequisites

- ✅ Feature 006 (MusicXML Import) completed - provides `ClefEvent` domain model
- ✅ Feature 002 (Staff Notation View) completed - provides Bravura font and renderer
- ✅ Bravura font loaded in frontend (`frontend/src/assets/fonts/Bravura.woff2`)
- ✅ Existing `midiPitchToStaffPosition()` function (Treble/Bass implemented)

---

## Implementation Checklist

### Phase 1: Backend API Enhancement (10 minutes)

- [ ] **Add `active_clef` field to `StaffResponse`**  
  File: `backend/src/adapters/api/responses.rs` (or `models/staff.rs`)
  ```rust
  pub struct StaffResponse {
      pub id: String,
      pub active_clef: Clef,  // NEW
      pub voices: Vec<VoiceResponse>,
      pub staff_structural_events: Vec<StaffStructuralEventResponse>,
  }
  ```

- [ ] **Derive `active_clef` from first `ClefEvent`**  
  ```rust
  let active_clef = staff.staff_structural_events.iter()
      .find_map(|e| match e {
          StaffStructuralEvent::Clef(ce) => Some(ce.clef()),
          _ => None,
      })
      .unwrap_or(Clef::Treble);
  ```

- [ ] **Write contract test: API returns `active_clef`**  
  File: `backend/tests/integration/api_clef_serialization_test.rs`

- [ ] **Run backend tests**: `cargo test`

---

### Phase 2: Frontend Config Fix (5 minutes)

- [ ] **Fix Tenor clef SMuFL codepoint**  
  File: `frontend/src/types/notation/config.ts`
  ```typescript
  export const SMUFL_CODEPOINTS = {
    TREBLE_CLEF: '\uE050',
    BASS_CLEF: '\uE062',
    ALTO_CLEF: '\uE05C',
    TENOR_CLEF: '\uE05D',  // 🔧 FIXED (was '\uE05C')
  } as const;
  ```

---

### Phase 3: Note Positioning Logic (30 minutes)

- [ ] **Add Alto clef diatonic map**  
  File: `frontend/src/services/notation/NotationLayoutEngine.ts`
  ```typescript
  const altoDiatonicMap = new Map<number, number>([
    [60, 0],   // C4 = middle line (reference point)
    [69, -10], // A4 = top line
    [55, 3],   // G3 = bottom line
    // ... complete mapping (see data-model.md)
  ]);
  ```

- [ ] **Add Tenor clef diatonic map**  
  ```typescript
  const tenorDiatonicMap = new Map<number, number>([
    [60, 2],   // C4 = fourth line (reference point)
    [64, -5],  // E4 = top line
    [50, 8],   // D3 = bottom line
    // ... complete mapping (see data-model.md)
  ]);
  ```

- [ ] **Update `midiPitchToStaffPosition()` to use new maps**  
  ```typescript
  const diatonicMap = clef === 'Treble' ? trebleDiatonicMap 
                    : clef === 'Bass' ? bassDiatonicMap
                    : clef === 'Alto' ? altoDiatonicMap
                    : tenorDiatonicMap;
  ```

- [ ] **Write unit tests**: `frontend/tests/unit/ClefPositioning.test.ts`  
  Test that MIDI 60 → correct staff position for each clef

- [ ] **Run frontend tests**: `npm test`

---

### Phase 4: Clef Glyph Positioning (15 minutes)

- [ ] **Add vertical offset constants**  
  File: `frontend/src/services/notation/NotationLayoutEngine.ts`
  ```typescript
  const CLEF_VERTICAL_OFFSETS: Record<ClefType, number> = {
    Treble: 0,
    Bass: 0.5,   // Half staff space down
    Alto: 0,
    Tenor: 0.5,  // Half staff space adjusted
  };
  ```

- [ ] **Update `calculateClefPosition()`**  
  ```typescript
  const offset = CLEF_VERTICAL_OFFSETS[clef] * config.staffSpace;
  return {
    type: clef,
    x: config.marginLeft / 2,
    y: centerY + offset,  // Apply offset
    glyphCodepoint: codepoints[clef],
    fontSize: config.staffSpace * config.glyphFontSizeMultiplier,
  };
  ```

---

### Phase 5: API Integration (10 minutes)

- [ ] **Update frontend types to expect `active_clef`**  
  File: `frontend/src/types/score.ts`
  ```typescript
  interface Staff {
    id: string;
    active_clef: ClefType;  // NEW from API
    voices: Voice[];
    staff_structural_events: StaffStructuralEvent[];
  }
  ```

- [ ] **Add fallback in `StaffNotation` component**  
  File: `frontend/src/components/notation/StaffNotation.tsx`
  ```typescript
  const clef = props.clef ?? staff.active_clef ?? 'Treble';
  ```

- [ ] **Test with real API**: Import MusicXML with bass clef, verify UI displays bass clef symbol

---

### Phase 6: Visual Regression Testing (20 minutes)

- [ ] **Create snapshot tests for each clef**  
  File: `frontend/tests/components/StaffNotation.test.tsx`
  ```typescript
  it('renders Bass clef with correct glyph', () => {
    const { container } = render(
      <StaffNotation notes={[]} clef="Bass" />
    );
    const clefGlyph = screen.getByTestId('clef-Bass');
    expect(clefGlyph).toHaveTextContent('\uE062');
    expect(container).toMatchSnapshot();
  });
  ```

- [ ] **Manual visual verification**: Load quartet score (violin/viola/cello), check clef symbols

- [ ] **Zoom testing**: Verify clefs scale correctly at 50%, 100%, 200% zoom

---

## Testing Workflow

### 1. Unit Tests (Fast)
```bash
# Backend
cd backend && cargo test clef

# Frontend
cd frontend && npm test -- ClefPositioning
```

### 2. Integration Tests
```bash
# Backend API contract
cargo test api_clef_serialization

# Frontend component
npm test -- StaffNotation
```

### 3. Manual Testing
1. Start dev servers:
   ```bash
   # Terminal 1: Backend
   cd backend && cargo run
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

2. Import test files:
   - `tests/fixtures/musicxml/CanonD.musicxml` - Canon in D with chords (recommended for full testing)
   - `tests/fixtures/musicxml/piano_grand_staff.musicxml` - Simple piano grand staff (no chords)
   - `tests/fixtures/musicxml/quartet.musicxml` - String quartet (Treble + Alto + Bass) - for User Story 2

3. Verify in UI:
   - Right clef symbols displayed
   - Notes positioned on correct staff lines
   - Zoom in/out maintains visual clarity

---

## Common Pitfalls & Solutions

### Issue: Tenor clef looks identical to Alto clef
**Cause**: Using wrong SMuFL codepoint (both using U+E05C)  
**Fix**: Update `TENOR_CLEF` to `'\uE05D'` in `config.ts`

### Issue: Bass notes positioned too high/low
**Cause**: Incorrect diatonic map reference points  
**Fix**: Verify MIDI 60 (middle C) maps to correct staff position:
- Treble: position -6 (first ledger line below)
- Bass: position 6 (first ledger line above)
- Alto: position 0 (middle line)
- Tenor: position 2 (fourth line)

### Issue: Clef glyph misaligned vertically
**Cause**: Using centered Y position for all clefs  
**Fix**: Apply `CLEF_VERTICAL_OFFSETS` in `calculateClefPosition()`

### Issue: API doesn't return `active_clef`
**Cause**: Backend not serializing new field  
**Fix**: Check `StaffResponse` struct includes field and `From` impl sets it

---

## File Change Summary

| File | Change Type | Lines Changed | Priority |
|------|-------------|---------------|----------|
| `backend/src/adapters/api/responses.rs` | Add field | ~10 | High |
| `backend/tests/integration/api_clef_serialization_test.rs` | New file | ~50 | High |
| `frontend/src/types/notation/config.ts` | Fix constant | 1 | High |
| `frontend/src/services/notation/NotationLayoutEngine.ts` | Add maps, logic | ~100 | High |
| `frontend/tests/unit/ClefPositioning.test.ts` | New file | ~80 | High |
| `frontend/src/components/notation/StaffNotation.tsx` | Add fallback | ~2 | Medium |
| `frontend/tests/components/StaffNotation.test.tsx` | Add tests | ~40 | Medium |

**Total estimated effort**: 2-3 hours for experienced developer

---

## Next Steps After Implementation

1. **User Story 1 (P1 - Bass Clef)**: ✅ Complete with above steps
2. **User Story 2 (P2 - Alto/Tenor)**: ✅ Complete with above steps
3. **User Story 3 (P3 - Clef Changes)**: 🔜 Future enhancement (Phase 2)
   - Requires time-based clef tracking
   - Measure-aware rendering
   - More complex layout engine changes

---

## Reference Links

- **Spec**: [spec.md](spec.md) - User stories and acceptance criteria
- **Research**: [research.md](research.md) - Technical decisions and alternatives
- **Data Model**: [data-model.md](data-model.md) - Detailed type definitions
- **API Contract**: [contracts/staff-clef-api.md](contracts/staff-clef-api.md) - Backend API changes
- **SMuFL Spec**: https://w3c.github.io/smufl/latest/ - Music font standard

---

## Quick Commands

```bash
# Backend: Add active_clef field + test
cd backend
# 1. Edit src/adapters/api/responses.rs
# 2. Edit tests/integration/api_clef_serialization_test.rs
cargo test

# Frontend: Fix codepoint, add maps, test
cd frontend
# 1. Edit src/types/notation/config.ts
# 2. Edit src/services/notation/NotationLayoutEngine.ts
# 3. Add tests/unit/ClefPositioning.test.ts
npm test

# Integration: Run full stack
docker-compose up  # or cargo run + npm run dev

# Manual test: Import quartet.musicxml, verify 4 different clefs display
```

---

**Status**: Ready for implementation 🚀  
**Estimated completion**: 2-3 hours (experienced dev), 4-5 hours (learning curve)
