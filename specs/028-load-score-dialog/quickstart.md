# Quickstart: Load Score Dialog (Feature 028)

**Branch**: `028-load-score-dialog`  
**Date**: 2026-02-20

---

## What you're building

Replace the separate **Demo** and **Import Score** buttons with a single **Load Score** button that opens a two-panel modal dialog. Left panel: list of six preloaded scores. Right panel: a **Load New Score** button (existing file-picker import flow). Selecting a preloaded score fetches the `.mxl`, parses it via WASM, and drops the user into the play view, paused.

---

## Prerequisites

```bash
# 1. Create and switch to the feature branch
git checkout -b 028-load-score-dialog

# 2. Ensure frontend dev environment works
cd frontend && npm install && npm run dev
```

---

## Step 1 — Link score files as static assets

```bash
# From repo root
cd frontend/public
ln -s ../../scores scores
```

Verify: `ls frontend/public/scores/` should show the 6 `.mxl` files.

> **Why**: Vite serves `public/` verbatim. The symlink means `http://localhost:5173/scores/Bach_InventionNo1.mxl` works in dev, and `npm run build` copies the files to `dist/scores/`.

---

## Step 2 — Fix offline precaching (one-word change)

In [frontend/vite.config.ts](../../../frontend/vite.config.ts), find the `globPatterns` line and add `mxl`:

```diff
- globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,musicxml,woff2,mp3}'],
+ globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,musicxml,mxl,woff2,mp3}'],
```

---

## Step 3 — Create the preloaded scores manifest

Create `frontend/src/data/preloadedScores.ts` using the contract defined in [contracts/preloaded-scores.ts](./contracts/preloaded-scores.ts). This is a compile-time constant — no fetching.

---

## Step 4 — Build the new components (test-first)

Work in `frontend/src/components/load-score/`. Build in this order, writing tests before or alongside each component:

### 4a. `PreloadedScoreList` + tests
- Renders the 6 entries from `PRELOADED_SCORES`
- Shows a spinner/indicator on the `loadingId` entry
- Disables all items when `disabled=true`

### 4b. `LoadNewScoreButton` + tests
- Hidden `<input type="file">` + visible button
- Delegates to `useImportMusicXML`; shows error inline
- Cancelling file picker leaves no state change

### 4c. `LoadScoreDialog` + tests
- `<dialog>` element; `showModal()` on `open=true`; `onClose()` on `Escape` or backdrop click
- Renders `PreloadedScoreList` (left) and `LoadNewScoreButton` (right)
- Flexbox two-column → single-column at < 480 px (visual test or snapshot)
- On preloaded select: `fetch → Blob → new File → importFile()` → calls `onImportComplete`
- On fetch/parse error: shows message, stays open, allows retry

### 4d. `LoadScoreButton` + tests
- Stateless button; label "Load Score"; delegates `onClick`

---

## Step 5 — Wire into `ScoreViewer`

In `frontend/src/components/ScoreViewer.tsx`:

1. Add `const [dialogOpen, setDialogOpen] = useState(false)`
2. Replace landing-screen `<ImportButton buttonText="Import Score">` with:
   ```tsx
   <LoadScoreButton onClick={() => setDialogOpen(true)} disabled={loading} />
   ```
3. Replace toolbar `<ImportButton buttonText="Import">` in the `score-toolbar` with:
   ```tsx
   <LoadScoreButton onClick={() => setDialogOpen(true)} />
   ```
4. Remove `handleLoadDemoButtonClick` and the **Demo** `<button>`
5. Remove `demoLoaderService` import
6. Add `<LoadScoreDialog>` at the bottom of both render paths (not inside conditionals):
   ```tsx
   <LoadScoreDialog
     open={dialogOpen}
     onClose={() => setDialogOpen(false)}
     onImportComplete={(result) => {
       handleMusicXMLImport(result);
       setDialogOpen(false);
       setViewMode('layout');
     }}
   />
   ```

---

## Step 6 — Remove Feature 013 onboarding

### In `frontend/src/App.tsx`
- Remove `import { useOnboarding } from './hooks/useOnboarding'`
- Remove the `useOnboarding(wasmReady)` call and destructure
- Remove `isDemoLoading` from the loading-state check: `if (wasmLoading || isDemoLoading)` → `if (wasmLoading)`
- Remove the `demoError` notification JSX block
- Remove `viewMode` / `setViewMode` from the `useOnboarding` destructure (they move to `ScoreViewer` internal state — verify they are not needed here)

### Delete files
```bash
rm frontend/src/hooks/useOnboarding.ts
rm -rf frontend/src/services/onboarding/
```

---

## Step 7 — Run tests

```bash
cd frontend
npm run test          # Vitest unit/component tests
npm run test:e2e      # Playwright E2E (if available)
```

All existing `ImportButton.test.tsx` tests must remain green.

---

## Step 8 — Verify offline manually (optional but recommended)

```bash
npm run build && npm run preview
```
Open DevTools → Application → Service Workers → check "Offline" → reload.  
Open Load Score dialog → select a preloaded score → verify it loads from cache.

---

## File checklist

| Path | Action |
|---|---|
| `frontend/public/scores/` | CREATE (symlink) |
| `frontend/vite.config.ts` | MODIFY (add `mxl` to glob) |
| `frontend/src/data/preloadedScores.ts` | CREATE |
| `frontend/src/components/load-score/LoadScoreButton.tsx` | CREATE |
| `frontend/src/components/load-score/LoadScoreButton.css` | CREATE |
| `frontend/src/components/load-score/LoadScoreButton.test.tsx` | CREATE |
| `frontend/src/components/load-score/LoadScoreDialog.tsx` | CREATE |
| `frontend/src/components/load-score/LoadScoreDialog.css` | CREATE |
| `frontend/src/components/load-score/LoadScoreDialog.test.tsx` | CREATE |
| `frontend/src/components/load-score/PreloadedScoreList.tsx` | CREATE |
| `frontend/src/components/load-score/PreloadedScoreList.test.tsx` | CREATE |
| `frontend/src/components/load-score/LoadNewScoreButton.tsx` | CREATE |
| `frontend/src/components/ScoreViewer.tsx` | MODIFY |
| `frontend/src/App.tsx` | MODIFY |
| `frontend/src/hooks/useOnboarding.ts` | DELETE |
| `frontend/src/services/onboarding/` | DELETE (directory) |
