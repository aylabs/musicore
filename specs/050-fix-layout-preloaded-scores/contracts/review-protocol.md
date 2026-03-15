# Review Protocol: Layout Quality Review Cycle

**Feature Branch**: `050-fix-layout-preloaded-scores`
**Version**: 1.0
**Date**: 2026-03-15

---

## Purpose

This document defines the step-by-step protocol for an iterative layout quality review of a preloaded score. The protocol enforces:
- Systematic comparison against the Musescore reference
- Correct layer attribution of each defect
- Constitution VII compliance (test before fix)
- Explicit musician approval before proceeding to the next score

---

## Participants

| Role | Responsibility |
|---|---|
| **Musician-Reviewer** | Performs visual comparison, identifies defects, approves result |
| **Developer** | Classifies defects by layer, writes tests, implements fixes |

---

## Score Queue

Scores are reviewed in this order. Only one score is `in-review` at a time.

| Priority | Score | File |
|---|---|---|
| 1 | La Candeur | `scores/Burgmuller_LaCandeur.mxl` |
| 2 | Arabesque | `scores/Burgmuller_Arabesque.mxl` |
| 3 | Canon in D | `scores/Pachelbel_CanonD.mxl` |
| 4 | Invention No. 1 | `scores/Bach_InventionNo1.mxl` |
| 5 | Für Elise | `scores/Beethoven_FurElise.mxl` |
| 6 | Nocturne Op. 9 No. 2 | `scores/Chopin_NocturneOp9No2.mxl` |

---

## Phase A: Reference Preparation (once per score)

Performed before the first review cycle of a score.

### A1 — Export Musescore Reference

1. Open the score in Musescore 4.x.
2. File → Export → PNG (or PDF), resolution 150–200 DPI.
3. Save to: `specs/050-fix-layout-preloaded-scores/references/<ScoreName>.png`
4. If the score spans multiple pages, export all pages + selected region crops for complex passages.

### A2 — Capture Graditone Baseline

1. Run the Graditone app locally (`npm run dev` in `frontend/`).
2. Open the score from the preloaded scores list.
3. Take a screenshot of the rendered score at the same area shown in the Musescore reference (full-page or equivalent region).
4. Save as: `specs/050-fix-layout-preloaded-scores/reviews/0N-ScoreName/cycle-01-graditone-baseline.png`

---

## Phase B: Review Cycle

Repeat Phase B until the musician approves the score.

### B1 — Side-by-Side Comparison

1. Place the Musescore reference PNG and the Graditone screenshot side by side.
2. Annotate the Graditone screenshot to mark each visible defect (use image editor or paste arrows into a combined image).
3. Save the annotated composite as: `cycle-NN-comparison.png`

### B2 — Issue Documentation

For each identified defect, record a `LayoutIssue` entry in `cycle-NN.md`:

```
### [SCORE_ID-CYCLE-SEQ] Short title

- **Layer**: layout-engine | renderer | unknown
- **Severity**: blocking | major | minor
- **Scope**: generic | score-specific
- **Description**: Precise description. Reference location (measure 3, beat 2, treble staff).
- **Status**: open
```

**Layer classification guide**:

| Symptom | Layer |
|---|---|
| Note too high/low on staff | layout-engine (positioner.rs) |
| Note too close/far from neighbours | layout-engine (spacer.rs) |
| Stem too long/short | layout-engine (stems.rs) |
| Beam at wrong angle | layout-engine (beams.rs) |
| Wrong measure width, system breaks at wrong measure | layout-engine (breaker.rs/spacer.rs) |
| Clef / time sig / key sig at wrong position | layout-engine (positioner.rs) |
| Wrong vertical spacing between staves | layout-engine (mod.rs spacing multipliers) |
| Staff lines too thin/thick | renderer (LayoutRenderer.tsx, visual style only) |
| Noteheads too small/large | layout-engine (batcher.rs font_size) or renderer fallback |
| Wrong colour | renderer (RenderConfig) |
| Barline thickness | layout-engine (THIN_WIDTH/THICK_WIDTH) |

### B3 — Fix Cycle (one issue at a time)

For **each** `LayoutIssue` (blocking issues first, then major, then minor):

#### If layer = `layout-engine`:

1. **Write failing test** in `backend/tests/layout_test.rs` or create a new test file:
   ```rust
   #[test]
   fn test_<issue_description>() {
       // Arrange: create score fixture with the problematic configuration
       // Act: call compute_layout()
       // Assert: expected geometry value
       // This test MUST FAIL before the fix is applied (Constitution VII)
   }
   ```
2. Run `cargo test` — confirm the new test fails.
3. Apply the fix in the appropriate file (`spacer.rs`, `positioner.rs`, `stems.rs`, etc.).
4. Run `cargo test` — all tests must pass (new + existing).
5. If the fix changes a constant or algorithm that applies globally: verify all 6 scores visually (re-render each, check for regressions on already-approved scores).

#### If layer = `renderer`:

1. **Write failing test** in `frontend/src/` (vitest):
   ```ts
   it('should render staff lines with correct stroke-width', () => {
     // Arrange: mock GlobalLayout with staff line data
     // Act: render LayoutRenderer
     // Assert: SVG stroke-width attribute value
     // This test MUST FAIL before the fix is applied (Constitution VII)
   })
   ```
2. Run `vitest` — confirm the new test fails.
3. Apply the fix in `frontend/src/components/LayoutRenderer.tsx` (visual style only — no coordinate calculations).
4. Run `vitest` — all tests must pass.

#### Scope = `generic` fix propagation:
- After fixing a generic issue in a layout engine constant, re-render ALL 6 scores.
- For each already-approved score: verify visually that the fix did not introduce regressions.
- Document propagation in `cycle-NN.md` under "Propagation".

### B4 — Re-capture Graditone

After all fixes in a cycle are applied:
1. Run `npm run dev`, open the score.
2. Take a new screenshot: `cycle-NN-comparison-after.png` (annotate "FIXED" markers).
3. Store in `reviews/0N-ScoreName/`.

### B5 — Musician Approval Review

1. Musician reviews `cycle-NN-comparison-after.png`.
2. If all issues resolved: fill in `cycle-NN.md` approval block:
   ```markdown
   ## Approval
   [x] Approved — Musician sign-off date: YYYY-MM-DD
   ```
3. Update `PreloadedScore.approval_status = approved`.
4. If issues remain: begin Cycle N+1 from Step B1 with only unresolved issues.

---

## Phase C: Score Completion and Advancement

After a score receives musician approval:

1. Commit all test + fix code changes to branch `050-fix-layout-preloaded-scores`.
2. Mark the score as `approved` in the review tracker.
3. Advance the queue: the next `pending` score enters `in-review`.
4. Repeat Phase A (if reference not yet captured) + Phase B.

---

## Constraints

1. **No score skipping**: A score cannot be marked `approved` without explicit musician sign-off on the `cycle-NN.md` document.
2. **No fix without test**: All code changes to `backend/src/layout/` or `frontend/src/components/LayoutRenderer.tsx` motivated by a visual defect MUST be preceded by a failing test (Constitution Principle VII).
3. **No coordinate calculations in renderer**: Fixes to `LayoutRenderer.tsx` are restricted to visual style properties. If a fix requires adjusting coordinates, it must be done in the layout engine (Constitution Principle VI).
4. **Regression protection**: Fixes must not regress approved scores. The existing test suite in `backend/tests/layout_test.rs` + `layout_integration_test.rs` forms the regression barrier.
5. **Known limitation documentation**: If a defect cannot be fixed (technical constraint), document it in `spec.md#Known Issues & Regression Tests` — it does not block approval but must be explicitly acknowledged by the musician.

---

## Acceptance Gates

A score is eligible for approval when:

- [ ] No `blocking` or `major` issues remain open in the current `cycle-NN.md`
- [ ] All `generic` fixes have been propagated and verified on all other scores
- [ ] All test additions pass in `cargo test` and `vitest`
- [ ] Musician has explicitly checked the approval checkbox in `cycle-NN.md`
