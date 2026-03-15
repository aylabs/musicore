# Data Model: Fix Layout Preloaded Scores

**Feature Branch**: `050-fix-layout-preloaded-scores`
**Phase**: 1 — Design
**Date**: 2026-03-15

---

## Overview

This feature does not introduce a new database schema or runtime data model. The "model" is a documentation convention: a set of structured file artifacts stored in the `specs/050-fix-layout-preloaded-scores/` directory that record the review state, discovered issues, applied fixes, and approval status for each score.

All entities are stored as Markdown files and PNG images in the repository.

---

## Entities

### PreloadedScore

Represents one of the 6 scores subject to layout review.

| Field | Type | Description |
|---|---|---|
| `id` | integer (1–6) | Priority-order index |
| `title` | string | Human-readable score name |
| `source_file` | string | Path relative to repo root (e.g. `scores/Burgmuller_LaCandeur.mxl`) |
| `approval_status` | enum | `pending` · `in-review` · `approved` |
| `review_cycle` | integer | Current review iteration (starts at 1) |
| `reference_image` | string | Path to Musescore PNG reference (e.g. `specs/050-.../references/Burgmuller_LaCandeur.png`) |

**Canonical list** (priority order):

| id | title | source_file |
|---|---|---|
| 1 | La Candeur | `scores/Burgmuller_LaCandeur.mxl` |
| 2 | Arabesque | `scores/Burgmuller_Arabesque.mxl` |
| 3 | Canon in D | `scores/Pachelbel_CanonD.mxl` |
| 4 | Invention No. 1 | `scores/Bach_InventionNo1.mxl` |
| 5 | Für Elise | `scores/Beethoven_FurElise.mxl` |
| 6 | Nocturne Op. 9 No. 2 | `scores/Chopin_NocturneOp9No2.mxl` |

---

### LayoutIssue

A specific visual defect identified during a musician review cycle.

| Field | Type | Description |
|---|---|---|
| `id` | string | `SCORE_ID-CYCLE-SEQ` (e.g. `01-01-A`) |
| `score_id` | integer | References PreloadedScore.id |
| `cycle` | integer | Review cycle in which the issue was found |
| `description` | string | Plain English, what looks wrong |
| `layer` | enum | `layout-engine` · `renderer` · `unknown` |
| `severity` | enum | `blocking` · `major` · `minor` |
| `affected_file` | string | Source file to change (`backend/src/layout/spacer.rs`, etc.) |
| `scope` | enum | `score-specific` · `generic` |
| `status` | enum | `open` · `fixed` · `wont-fix` · `documented-limitation` |
| `test_ref` | string | Reference to the regression test added (Constitution VII) |

**Layer classification rules**:
- `layout-engine`: incorrect note X/Y position, wrong spacing, bad stem length, wrong beam slope, incorrect vertical offset, wrong measure width
- `renderer`: incorrect stroke-width, wrong font-size on glyph runs, color issues, line rendering artifacts
- `unknown`: requires further investigation before attribution

---

### ReviewArtifact

The tangible output of one review cycle for a score.

| Field | Type | Description |
|---|---|---|
| `score_id` | integer | References PreloadedScore.id |
| `cycle` | integer | Review cycle number |
| `comparison_image` | string | Path to side-by-side PNG (`reviews/01-LaCandeur/cycle-01-comparison.png`) |
| `issues` | LayoutIssue[] | Issues identified in this cycle |
| `approved` | boolean | True when musician signs off on this cycle |
| `approved_at` | date | ISO date of approval |

---

### LayoutFix

Records a concrete code change that addresses one or more LayoutIssues.

| Field | Type | Description |
|---|---|---|
| `issue_ids` | string[] | LayoutIssue identifiers resolved by this fix |
| `layer` | enum | `layout-engine` · `renderer` |
| `changed_file` | string | Source file modified |
| `constant_or_function` | string | What was changed (e.g. `base_spacing`, `compute_note_spacing()`) |
| `before` | string | Previous value/behavior description |
| `after` | string | New value/behavior description |
| `test_added` | string | Path to the regression test (`backend/tests/layout_test.rs::test_xxx`) |
| `propagated_to_scores` | integer[] | Score IDs that were also improved by this fix |

---

## File Layout Convention

```text
specs/050-fix-layout-preloaded-scores/
├── references/
│   ├── Burgmuller_LaCandeur.png        # Musescore export (full score)
│   ├── Burgmuller_Arabesque.png
│   ├── Pachelbel_CanonD.png
│   ├── Bach_InventionNo1.png
│   ├── Beethoven_FurElise.png
│   └── Chopin_NocturneOp9No2.png
│
└── reviews/
    ├── 01-Burgmuller_LaCandeur/
    │   ├── cycle-01.md                 # ReviewArtifact document
    │   └── cycle-01-comparison.png     # Side-by-side screenshot
    ├── 02-Burgmuller_Arabesque/
    │   └── ...
    ├── 03-Pachelbel_CanonD/
    ├── 04-Bach_InventionNo1/
    ├── 05-Beethoven_FurElise/
    └── 06-Chopin_NocturneOp9No2/
```

### cycle-XX.md Format

```markdown
# Review: [Score Title] — Cycle [N]

**Date**: YYYY-MM-DD
**Status**: [in-review | approved]
**Approved by**: [musician name]

## Issues Found

### [01-01-A] [Issue Title]
- **Layer**: layout-engine | renderer
- **Severity**: blocking | major | minor
- **Scope**: generic | score-specific
- **Description**: What is wrong and where in the score.
- **Fix**: What was changed.
- **Test**: `path/to/test::function_name`
- **Status**: open | fixed | documented-limitation

## Fixes Applied This Cycle

| Issue | File | Change |
|---|---|---|
| 01-01-A | backend/src/layout/spacer.rs | base_spacing 40.0 → 35.0 |

## Propagation

Generic fixes applied in this cycle and forward-propagated to:
- Score 2 (Arabesque) — verified unchanged ✅
- Score 3 (Canon in D) — verified unchanged ✅

## Approval

[ ] Approved — Musician sign-off date: ___
```

---

## State Transitions

```
PreloadedScore.approval_status:

  pending ──► in-review ──► approved
                ▲               │
                └── (iterate) ──┘
                    (open issues remain)
```

Scores advance through review one at a time. A score must reach `approved` before the next score enters `in-review`.
