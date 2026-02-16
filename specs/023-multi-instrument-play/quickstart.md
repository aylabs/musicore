# Quickstart: Multi-Instrument Play View

**Feature**: 023-multi-instrument-play  
**Branch**: `023-multi-instrument-play`

## Prerequisites

- Rust toolchain (latest stable) with `wasm32-unknown-unknown` target
- wasm-pack installed (`cargo install wasm-pack`)
- Node.js 18+ with npm
- Git on branch `023-multi-instrument-play`

## Setup

```bash
# Clone and checkout
cd /Users/alvaro.delcastillo/devel/sdd/musicore
git checkout 023-multi-instrument-play

# Backend: build and test
cd backend
cargo build
cargo test

# WASM: build for frontend
./scripts/build-wasm.sh

# Frontend: install and test
cd ../frontend
npm install
npm run test
```

## Verification Steps

### 1. Rust Layout Engine Tests

```bash
cd backend
cargo test layout -- --nocapture
```

**Expected**: All layout tests pass, including new multi-instrument tests:
- `test_multi_instrument_vertical_spacing` — verifies no staff overlap
- `test_multi_instrument_system_height` — verifies system height accounts for all instruments
- `test_instrument_name_in_staff_group` — verifies `instrument_name` field populated
- `test_name_label_position` — verifies label positioned before bracket

### 2. WASM Build

```bash
cd backend
./scripts/build-wasm.sh
```

**Expected**: WASM builds without errors. `pkg/` directory contains updated `.wasm` and `.js` files.

### 3. Frontend Tests

```bash
cd frontend
npm run test
```

**Expected**: All Vitest tests pass, including:
- `convertScoreToLayoutFormat` converts all instruments
- `LayoutRenderer` renders instrument name labels
- Playback highlighting works across multiple instruments

### 4. Manual Verification (Dev Server)

```bash
cd frontend
npm run dev
```

1. Open `http://localhost:5173` in a browser
2. Import a multi-instrument MusicXML file (e.g., piano + violin, or string quartet)
3. Switch to **Play View**
4. Verify:
   - [ ] All instruments' staves are visible in each system
   - [ ] Instrument names appear to the left of each staff group
   - [ ] No staves overlap between different instruments
   - [ ] Piano staves (within same instrument) are closer together than the gap between piano and violin
   - [ ] Click play — notes highlight in the correct instrument's staves
   - [ ] Zoom in/out works without rendering issues
   - [ ] Single-instrument scores still render correctly (no regression)

### 5. Contract Test

```bash
cd backend
cargo test contract -- --nocapture
```

**Expected**: Contract tests verify that `StaffGroup` serialization includes `instrument_name` and `name_label` fields.

## Key Files to Modify

| File | Purpose |
|------|---------|
| `backend/src/layout/types.rs` | Add `instrument_name`, `NameLabel` to `StaffGroup` |
| `backend/src/layout/mod.rs` | Fix vertical offsets, system height, populate name fields |
| `frontend/src/wasm/layout.ts` | Add `instrument_name`, `NameLabel` TypeScript types |
| `frontend/src/components/layout/LayoutView.tsx` | Pass all instruments in `convertScoreToLayoutFormat` |
| `frontend/src/components/LayoutRenderer.tsx` | Render `<text>` elements for instrument name labels |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `cargo test` fails with serialization errors | Ensure `NameLabel` derives `Serialize, Deserialize` |
| WASM build fails | Run `rustup target add wasm32-unknown-unknown` |
| Frontend types don't match WASM output | Rebuild WASM: `cd backend && ./scripts/build-wasm.sh` |
| Staves still overlap | Check `global_staff_offset` accumulation in `mod.rs` |
| No instrument names visible | Check `name_label` is not `None` and renderer reads it |
