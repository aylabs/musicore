# Quickstart: Practice Complexity Levels

**Feature**: 001-practice-complexity-levels  
**Date**: 2026-03-01

---

## Prerequisites

- Node 22 (`.nvmrc` in repo root — run `nvm use`)
- WASM build present: `frontend/src/wasm/` files must be tracked (run `cd backend && ./scripts/build-wasm.sh` if missing)
- No additional npm packages required by this feature

---

## Development

```bash
# From repo root
cd frontend
npm run dev          # Start Vite dev server at http://localhost:5173
```

Navigate to the Practice plugin (landing screen → "Practice" button).

---

## Running Unit & Component Tests

```bash
cd frontend
npm test             # Vitest watch mode
```

Key test files for this feature:

```
frontend/plugins/practice-view/exerciseGenerator.test.ts  # unit — preset values
frontend/plugins/practice-view/PracticePlugin.test.tsx    # component — selector UI
```

Run only practice-view tests in watch mode:

```bash
npm test -- plugins/practice-view
```

Run once (CI mode):

```bash
npm test -- --run plugins/practice-view
```

---

## Running E2E Tests

E2E tests require a production build served with the `/musicore/` base path:

```bash
cd frontend

# 1 — Build
VITE_BASE=/musicore/ npm run build

# 2 — Serve (background)
npx vite preview --base /musicore/ --port 4173 &

# 3 — Run the feature spec
npx playwright test e2e/practice-complexity-levels.spec.ts --reporter=list
```

Run all e2e tests (regression check):

```bash
npx playwright test --reporter=list
```

---

## Test-First Implementation Checklist

Per Constitution Principle V, write tests **before** implementation.

**Step 1** — Write failing unit tests in `exerciseGenerator.test.ts`:
- Assert `COMPLEXITY_PRESETS.low.bpm === 40`, `.config.preset === 'c4scale'`, etc.

**Step 2** — Write failing component tests in `PracticePlugin.test.tsx`:
- Assert level selector renders with Low / Mid / High buttons
- Assert selecting "Low" applies correct config and bpm
- Assert changing a slider clears the active level badge
- Assert localStorage round-trip restores the selected level

**Step 3** — Write failing E2E tests in `e2e/practice-complexity-levels.spec.ts`:
- SC-001: select level → practice session starts within 15 s
- SC-002: each level produces correct parameter configuration
- SC-003: session is reachable in 2 steps (select → start)
- SC-004: reload restores last selected level

**Step 4** — Implement until all tests pass.

**Step 5** — Run full test suite (validate):

```bash
cd frontend
npm run validate
```

---

## File Change Map

| File | Action | Notes |
|------|--------|-------|
| `plugins/practice-view/practiceTypes.ts` | Edit | Add `ComplexityLevel`, `ComplexityPreset`, `COMPLEXITY_PRESETS` |
| `plugins/practice-view/PracticePlugin.tsx` | Edit | Add state, localStorage init/persist, level selector UI, Advanced panel |
| `plugins/practice-view/PracticePlugin.css` | Edit | Add `.practice-level-*` and `.practice-advanced-*` rules |
| `plugins/practice-view/exerciseGenerator.test.ts` | Edit | Extend: assert preset constants produce expected generator output |
| `plugins/practice-view/PracticePlugin.test.tsx` | Edit | Extend: level selector, custom-mode, persistence tests |
| `e2e/practice-complexity-levels.spec.ts` | Create | New: SC-001 through SC-004 acceptance tests |
