# Implementation Plan: Load Score Dialog

**Branch**: `028-load-score-dialog` | **Date**: 2026-02-20 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/028-load-score-dialog/spec.md`

---

## Summary

Replace the separate **Demo** and **Import Score** buttons on the landing page with a single **Load Score** button that opens a two-panel modal dialog. The left panel lists six preloaded `.mxl` scores (served as PWA static assets); the right panel provides a **Load New Score** button that preserves the existing file-picker import flow. Selecting a preloaded score fetches the file, parses it through the existing WASM pipeline, and transitions directly to layout (play) view paused at position zero. The Feature 013 first-run auto-demo is removed entirely. A one-word change to the Workbox glob ensures all `.mxl` files are PWA-precached for offline use.

---

## Technical Context

**Language/Version**: TypeScript 5.x, React 18+  
**Primary Dependencies**: Vite 5 + `vite-plugin-pwa` (Workbox), `@testing-library/react`, Vitest, existing `useImportMusicXML` hook, existing WASM pipeline (`MusicXMLImportService`)  
**Storage**: No new storage — static assets in `frontend/public/scores/`; service worker precache handles offline  
**Testing**: Vitest + `@testing-library/react` (unit/component); existing Playwright suite for E2E  
**Target Platform**: Tablet devices (iPad/Surface/Android) — Chrome 57+, Safari 11+; PWA installed mode  
**Project Type**: Web (frontend-only change; no backend changes)  
**Performance Goals**: Dialog open < 16ms; preloaded score fetch + WASM parse < 100ms for typical `.mxl` files (consistent with existing WASM constraint); offline-first  
**Constraints**: No backend changes; no WASM engine changes; `useImportMusicXML` hook reused unchanged; touch targets ≥ 44×44px  
**Scale/Scope**: 6 static score files (~100–500 KB each); single dialog component tree; deletes ~300 LOC from `useOnboarding` / `demoLoader`

---

## Constitution Check

| Principle | Gate | Status |
|---|---|---|
| I. Domain-Driven Design | No new domain model introduced; `PreloadedScore` is a UI-layer DTO, not a domain entity | ✅ PASS |
| II. Hexagonal Architecture | No backend or port/adapter changes; frontend is a pure UI adapter | ✅ PASS |
| III. PWA Architecture | Offline capability maintained by extending Workbox glob to include `mxl`; static assets in `public/` follow Vite PWA conventions | ✅ PASS — requires `vite.config.ts` glob fix |
| IV. Precision & Fidelity | No timing or music domain logic touched | ✅ PASS |
| V. Test-First Development | New components and data constants require tests before/alongside implementation | ⚠️ ENFORCED — tests listed in Phase 1 |
| VI. Layout Engine Authority | No layout geometry changes; dialog is pure UI chrome | ✅ PASS |
| VII. Regression Prevention | `ImportButton` existing tests must remain green; new tests cover dialog flow | ✅ PASS — regression tests listed |

**No gate violations.** Principle III requires the `vite.config.ts` glob change to be implemented and its effect verified in the same PR.

---

## Project Structure

### Documentation (this feature)

```text
specs/028-load-score-dialog/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── preloaded-scores.ts   ← TypeScript manifest (Phase 1)
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code Changes

```text
frontend/
├── public/
│   └── scores/                          NEW — symlink or copy of /scores
│       ├── Bach_InventionNo1.mxl
│       ├── Beethoven_FurElise.mxl
│       ├── Burgmuller_Arabesque.mxl
│       ├── Burgmuller_LaCandeur.mxl
│       ├── Chopin_NocturneOp9No2.mxl
│       └── Pachelbel_CanonD.mxl
├── vite.config.ts                        MODIFIED — add 'mxl' to globPatterns
└── src/
    ├── App.tsx                           MODIFIED — remove isDemoLoading / demoError / useOnboarding
    ├── hooks/
    │   └── useOnboarding.ts              DELETED — replaced by Load Score dialog
    ├── services/
    │   └── onboarding/                   DELETED — OnboardingService, demoLoader, config, types
    ├── data/
    │   └── preloadedScores.ts            NEW — PRELOADED_SCORES manifest constant
    └── components/
        └── load-score/                   NEW directory
            ├── LoadScoreButton.tsx       NEW
            ├── LoadScoreButton.css       NEW
            ├── LoadScoreButton.test.tsx  NEW
            ├── LoadScoreDialog.tsx       NEW
            ├── LoadScoreDialog.css       NEW
            ├── LoadScoreDialog.test.tsx  NEW
            ├── PreloadedScoreList.tsx    NEW
            ├── PreloadedScoreList.test.tsx NEW
            └── LoadNewScoreButton.tsx    NEW

# ScoreViewer.tsx (components/ScoreViewer.tsx)  MODIFIED:
#   - Replace <ImportButton buttonText="Import Score"> → <LoadScoreButton>
#   - Replace <ImportButton buttonText="Import"> in toolbar → <LoadScoreButton>
#   - Remove handleLoadDemoButtonClick and references
```

**Structure Decision**: Web application (Option 2). All changes confined to `frontend/src/`. No backend directory touched. New components live in `frontend/src/components/load-score/` following existing component directory pattern (e.g., `import/`, `playback/`, `stacked/`). Manifest data lives in `frontend/src/data/` (new top-level data directory for static config constants).

---

## Phase 0: Research

→ See [research.md](./research.md) for full findings.

**Key resolved decisions:**

| Topic | Decision | Rationale |
|---|---|---|
| Static asset delivery | `frontend/public/scores/` symlink | Standard Vite pattern; zero tooling; works in dev and production Docker |
| Offline precaching | Extend Workbox `globPatterns` with `mxl` | One-word change; `.mxl` currently absent from glob |
| Preloaded score fetch | `fetch(score.path)` → `new File([blob], name, {type})` → `useImportMusicXML.importFile()` | Reuses existing pipeline without new abstractions |
| Onboarding removal | Delete `useOnboarding`, `demoLoader`, `OnboardingService` | No other feature uses these; `isDemoLoading` path in `App.tsx` removed |
| Dialog close on backdrop | `<dialog>` HTML element or `role="dialog"` overlay with backdrop `onClick` | Standard accessible pattern; no new dependency |
| File-picker cancellation | `onChange` fires only with selected file; `input.value = ''` reset on success | Existing `ImportButton` behaviour preserved |

---

## Phase 1: Design & Contracts

### Data Model → [data-model.md](./data-model.md)

**`PreloadedScore`** (UI-layer DTO, not a domain entity):

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable identifier (kebab-case) |
| `displayName` | `string` | Human-readable label shown in list |
| `path` | `string` | Runtime URL path (`/scores/<file>.mxl`) |

No database, no IndexedDB, no backend API. Pure static configuration.

**`LoadScoreDialogState`** (component-internal, not exported):

| Field | Type | Description |
|---|---|---|
| `open` | `boolean` | Whether dialog is visible |
| `loadingId` | `string \| null` | `PreloadedScore.id` being fetched, or `null` |
| `presetError` | `string \| null` | Fetch/parse error for preloaded flow |

### API Contracts → [contracts/preloaded-scores.ts](./contracts/preloaded-scores.ts)

No network API introduced. Contract is the static TypeScript manifest. See contracts file.

### Component Contracts

#### `LoadScoreButton`
```typescript
interface LoadScoreButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}
```

#### `LoadScoreDialog`
```typescript
interface LoadScoreDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: (result: ImportResult) => void;
  // After success, caller (ScoreViewer) sets viewMode='layout'
}
```

#### `PreloadedScoreList`
```typescript
interface PreloadedScoreListProps {
  scores: PreloadedScore[];
  loadingId: string | null;
  onSelect: (score: PreloadedScore) => void;
  disabled: boolean;  // true while any load is in progress
}
```

#### `LoadNewScoreButton`
```typescript
interface LoadNewScoreButtonProps {
  onImportComplete: (result: ImportResult) => void;
  disabled?: boolean;
}
// Internally uses useImportMusicXML; shows error inline
```

### `ScoreViewer` Integration

`ScoreViewer` adds `const [dialogOpen, setDialogOpen] = useState(false)` and passes it to `LoadScoreDialog`. On `onImportComplete`, the existing `handleMusicXMLImport` callback runs (score state set), then `setViewMode('layout')` is called — matching the spec requirement for direct-to-play-view navigation. The **Demo** button and `handleLoadDemoButtonClick` are removed.

---

## Complexity Tracking

No constitution violations. No complexity justification required.

---

## Post-Design Constitution Re-Check

| Principle | Post-design status |
|---|---|
| III. PWA / Offline | `mxl` added to glob → all 6 files precached on first online visit → offline selection works ✅ |
| V. Test-First | 4 new test files planned (LoadScoreButton, LoadScoreDialog, PreloadedScoreList, preloadedScores data) + existing ImportButton tests remain green ✅ |
| VII. Regression Prevention | Existing `ImportButton.test.tsx` is the regression baseline; new dialog tests cover the replacement path ✅ |
