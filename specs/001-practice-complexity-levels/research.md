# Research: Practice Complexity Levels

**Feature**: 001-practice-complexity-levels  
**Date**: 2026-03-01  
**Status**: Complete — all NEEDS CLARIFICATION resolved

---

## 1. Exercise Generator Capability Audit

**Decision**: Reuse `exerciseGenerator.ts` unchanged — all three level configurations are already supported.  
**Rationale**: The generator was already designed (Feature 031) to accept a generic `ExerciseConfig` that covers every parameter combination required by the three complexity levels.  
**Alternatives considered**: Extracting level logic into a new generator function — rejected; the existing API is already parameterised correctly.

### Evidence

| Level | Generator call | Note pool in code | Verified |
|-------|---------------|-------------------|---------|
| Low   | `generateC4ScaleExercise(40, 8, 'Treble')` via `preset:'c4scale'` | `C4_TO_C5_PITCHES` = C4–C5 ascending | ✓ |
| Mid   | `generateExercise(80, {preset:'random', noteCount:16, clef:'Treble', octaveRange:1})` | `NOTE_POOLS['Treble-1']` = C4–C5 | ✓ |
| High  | `generateExercise(100, {preset:'random', noteCount:20, clef:'Bass', octaveRange:2})` | `NOTE_POOLS['Bass-2']` = C2–C4 | ✓ |

Key source lines (`exerciseGenerator.ts`):
```ts
'Treble-1': [60, 62, 64, 65, 67, 69, 71, 72],          // C4–C5
'Bass-2':   [36, 38, 40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60], // C2–C4
```
`generateC4ScaleExercise` returns the 8-note ascending C major scale (C4–C5 for Treble), capped at `noteCount` — with `noteCount:8` all 8 notes are included.

---

## 2. Complexity Level Persistence Strategy

**Decision**: `localStorage` with key `practice-complexity-level-v1`.  
**Rationale**: Matches spec FR-006 (persist across restarts). Plugins already use browser Web Storage directly (see `PracticePlugin.tsx` line 113 — `sessionStorage`). `localStorage` survives page reload and browser restart; `IndexedDB` is overkill for a single string value.  
**Alternatives considered**:
- `sessionStorage` — rejected; survives only within a single tab session.
- `IndexedDB` via `local-storage.ts` — rejected; the service has `src/` imports which are outside the plugin import boundary (ESLint).
- Passing state through plugin context API — rejected; context does not currently expose a generic key-value store and adding one would be a larger API change out of scope.

**Storage key design**: `practice-complexity-level-v1` (versioned suffix prevents stale values if the type changes in a future iteration).  
**Default**: `'low'` (FR-007). On read: if value is absent or not in `['low','mid','high']`, return `'low'`.

---

## 3. Custom Mode (Advanced Override) Interaction

**Decision**: When the user changes any individual parameter in the Advanced panel, clear the active complexity level badge — `complexityLevel` becomes `null` and no level is shown as selected. `localStorage` retains the last explicit level, not the custom state.  
**Rationale**: Honest visual feedback (clarification Q4). Keeping the badge active while parameters diverge from the preset would mislead the user about what exercise they're about to run.  
**Alternatives considered**: Show a "(modified)" indicator — rejected per clarification A.  
**Implementation detail**: `updateConfig` (which already exists) is called both by level selection and by individual controls. Wrap it: level-selection calls `setComplexityLevel(level)` then `updateConfig(…)`, individual controls call `setComplexityLevel(null)` then `updateConfig(…)`.

---

## 4. UI Architecture — Complexity Selector Placement

**Decision**: Add a new "Level" section at the top of the existing collapsible sidebar, above the current Mode/Score/Notes/Clef/Octaves sections. The existing sections remain as the "Advanced" panel, visually grouped under an expandable "Advanced" disclosure.  
**Rationale**: Gives new users an immediate and prominent answer to "where do I start?"; experienced users can still reach individual controls via the same sidebar. Minimises disruption to the existing DOM structure and CSS.  
**Alternatives considered**: Replace sidebar entirely with a fullscreen level picker — rejected; scores and other presets are still valid entry points.

---

## 5. Test Strategy

**Decision**: Three test layers.  
**Rationale**: Matches Constitution Principle V (Test-First) and Principle VII (Regression Prevention).

| Layer | File | What it covers |
|-------|------|----------------|
| Unit | `exerciseGenerator.test.ts` (extend) | `COMPLEXITY_PRESETS` maps to correct ExerciseConfig values |
| Component | `PracticePlugin.test.tsx` (extend) | Level selector renders; selecting Low/Mid/High updates config + bpm; Advanced override clears badge; localStorage round-trip |
| E2E | `e2e/practice-complexity-levels.spec.ts` (new) | SC-001 (select level → session starts within 15 s), SC-002 (parameter accuracy), SC-003 (2-step flow), SC-004 (restore after reload) |

---

## 6. Files Changed Scope

| File | Change | Reason |
|------|--------|--------|
| `plugins/practice-view/practiceTypes.ts` | Add `ComplexityLevel` type + `COMPLEXITY_PRESETS` constant | Domain entity definition |
| `plugins/practice-view/PracticePlugin.tsx` | Add `complexityLevel` state, localStorage init/persist, complexity selector UI, Advanced collapse, `updateConfig` wiring | Core UI feature |
| `plugins/practice-view/PracticePlugin.css` | Add `.practice-level-*` and `.practice-advanced-*` CSS classes | Visual presentation |
| `plugins/practice-view/exerciseGenerator.test.ts` | Extend: assert COMPLEXITY_PRESETS map to expected generator output | Test-first for preset constants |
| `plugins/practice-view/PracticePlugin.test.tsx` | Extend: level selector tests, badge-clear tests, localStorage tests | Test-first for UI behaviour |
| `e2e/practice-complexity-levels.spec.ts` | New: SC-001 through SC-004 acceptance tests | E2E coverage |

**No backend/Rust changes required.** No new npm packages required.
