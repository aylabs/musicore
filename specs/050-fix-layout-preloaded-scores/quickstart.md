# Quickstart: Layout Review for Preloaded Scores

**Feature Branch**: `050-fix-layout-preloaded-scores`
**Date**: 2026-03-15

---

## Prerequisites

Before running your first review cycle, ensure:

1. **Branch checked out**:
   ```bash
   git checkout 050-fix-layout-preloaded-scores
   ```

2. **Backend built** (WASM):
   ```bash
   cd backend
   wasm-pack build --target web --out-dir ../frontend/src/wasm/pkg
   ```

3. **Frontend dev server running**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   App available at `http://localhost:5173` (or configured port).

4. **Musescore 4.x installed** on your machine for exporting reference PNGs.

5. **Score files present** (verify):
   ```bash
   ls scores/
   # Expected:
   # Bach_InventionNo1.mxl
   # Beethoven_FurElise.mxl
   # Burgmuller_Arabesque.mxl
   # Burgmuller_LaCandeur.mxl
   # Chopin_NocturneOp9No2.mxl
   # Pachelbel_CanonD.mxl
   ```

---

## Step 1: Export the Musescore Reference

For the current score in review (start with Burgmuller LaCandeur):

1. Open `scores/Burgmuller_LaCandeur.mxl` in Musescore 4.
2. File → Export → PNG.
   - Resolution: **150 DPI** (sufficient for comparison; not too large)
   - Page: All pages
3. Save the output PNG as:
   ```
   specs/050-fix-layout-preloaded-scores/references/Burgmuller_LaCandeur.png
   ```
4. If the score has complex passages (e.g. dense chords or ornaments), also export a cropped region PNG for those sections.

---

## Step 2: Capture the Graditone Rendering

1. Open the app at `http://localhost:5173`.
2. Load `Burgmuller_LaCandeur.mxl` from the preloaded scores list.
3. Take a screenshot of the rendered score (same area shown in your Musescore export). On macOS: `Cmd+Shift+4`, drag to select.
4. Save to:
   ```
   specs/050-fix-layout-preloaded-scores/reviews/01-Burgmuller_LaCandeur/cycle-01-graditone-baseline.png
   ```

---

## Step 3: Create the Review Document

Create the cycle document:

```bash
mkdir -p specs/050-fix-layout-preloaded-scores/reviews/01-Burgmuller_LaCandeur
```

Copy the template below into `reviews/01-Burgmuller_LaCandeur/cycle-01.md` and fill in the issues you observe:

```markdown
# Review: La Candeur (Burgmuller) — Cycle 1

**Date**: YYYY-MM-DD
**Status**: in-review
**Approved by**: 

## Issues Found

(list each issue here after comparison)

## Fixes Applied This Cycle

| Issue | File | Change |
|---|---|---|

## Propagation

(list generic fixes propagated to other scores)

## Approval

[ ] Approved — Musician sign-off date: ___
```

---

## Step 4: Perform the Side-by-Side Comparison

Open both images:
- `references/Burgmuller_LaCandeur.png` (Musescore)
- `reviews/01-Burgmuller_LaCandeur/cycle-01-graditone-baseline.png` (Graditone)

Look for discrepancies in:

| Category | What to check |
|---|---|
| **Horizontal spacing** | Are notes too cramped or too spread out between beats? Does the proportion match? |
| **Notehead size** | Do noteheads look the same visual size relative to the staff? |
| **Stem length** | Are stems the right length (standard: 3.5 staff spaces)? |
| **Beam placement** | Are beams at the right angle and thickness? |
| **Clef size** | Does the treble clef look the same size as Musescore? |
| **Key/time signature** | Are they the same size and correctly positioned? |
| **Staff line weight** | Are staff lines the same visual weight? |
| **Vertical staff spacing** | In multi-staff scores: is the gap between treble and bass staves similar? |
| **Barline weight** | Do barlines look the same weight? |
| **Accidentals** | Are accidentals correctly placed, same size? |
| **Ledger lines** | Are ledger lines the right length and weight? |

---

## Step 5: Classify and Fix Issues

For each issue identified, follow the fix workflow in [contracts/review-protocol.md](../contracts/review-protocol.md). In brief:

1. **Write a failing test** (layout engine → `backend/tests/layout_test.rs`; renderer → `frontend/src/`).
2. **Confirm the test fails**.
3. **Apply the fix** in the correct layer.
4. **Run the tests** — all must pass.
5. **If generic**: verify the remaining 5 scores are unaffected.

---

## Step 6: Re-render and Re-compare

After all fixes:
1. Rebuild the WASM module: `wasm-pack build --target web --out-dir ../frontend/src/wasm/pkg` in `backend/`.
2. Reload the app (Vite hot-reload handles frontend changes automatically; WASM changes require a manual reload).
3. Capture new Graditone screenshot: `cycle-01-graditone-after.png`.
4. Create new side-by-side: `cycle-01-comparison.png`.

---

## Step 7: Musician Approval

Present `cycle-01-comparison.png` to the musician for review. On approval:

```markdown
## Approval
[x] Approved — Musician sign-off date: YYYY-MM-DD
```

Proceed to the next score (Burgmuller Arabesque).

---

## Running Tests

```bash
# Layout engine (Rust)
cd backend
cargo test

# Frontend (TypeScript)
cd frontend
npm run test

# E2E (Playwright)
cd frontend
npx playwright test
```

All tests must pass after every layout fix before capturing the post-fix screenshot.

---

## File Checklist (per score review cycle)

```
specs/050-fix-layout-preloaded-scores/
├── references/
│   └── <ScoreName>.png               ← export once from Musescore
└── reviews/
    └── 0N-<ScoreName>/
        ├── cycle-NN.md               ← fill in during each cycle
        ├── cycle-NN-graditone-baseline.png   ← capture before fixes
        ├── cycle-NN-graditone-after.png      ← capture after fixes
        └── cycle-NN-comparison.png           ← side-by-side composite
```
