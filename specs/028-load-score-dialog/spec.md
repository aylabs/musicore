# Feature Specification: Load Score Dialog

**Feature Branch**: `028-load-score-dialog`  
**Created**: 2026-02-20  
**Status**: Active (plan + tasks complete 2026-02-20)  
**Input**: User description: "Rename the Import button in the landing page to Load Score. When Load Score is selected, a dialog appears with a selection list of preloaded scores on the left and a button to load a new one on the right. Selecting a preloaded score opens it in the play view. Loading an external score follows the current import flow."

---

## Context

The current landing page (rendered by `ScoreViewer` when no score is loaded) shows two buttons: **Demo** and **Import Score**. The toolbar shown after a score is loaded also has an **Import** button.

The **Demo** button is removed in this feature — the preloaded score list inside the Load Score dialog subsumes its purpose. After this feature the landing screen contains a single primary action: **Load Score**.

The **first-run auto-demo** introduced in Feature 013 (`useOnboarding` hook / `demoLoaderService`) is also removed. Every user — first-time or returning — always starts from the clean landing screen and explicitly picks a score via the Load Score dialog. The `isDemoLoading` loading state and `demoError` notification in `App.tsx` are likewise removed.

Preloaded scores live in `/scores` at the repository root:
- `Bach_InventionNo1.mxl`
- `Beethoven_FurElise.mxl`
- `Burgmuller_Arabesque.mxl`
- `Burgmuller_LaCandeur.mxl`
- `Chopin_NocturneOp9No2.mxl`
- `Pachelbel_CanonD.mxl`

To serve them as static assets these files must be placed (or symlinked / copied at build time) under `frontend/public/scores/` so Vite bundles and serves them at `/scores/<filename>`.

---

## Clarifications

### Session 2026-02-20

- Q: Should the existing Demo button on the landing screen be kept alongside Load Score, or removed? → A: Remove the Demo button — the preloaded score list replaces its purpose entirely.
- Q: Should the Feature 013 first-run auto-demo (silent score load on fresh install) be kept or removed? → A: Remove the first-run auto-demo entirely — always start from the empty landing screen.
- Q: After a preloaded score loads successfully, should playback start automatically or open paused? → A: Open layout (play) view paused at position zero — user taps Play to start.
- Q: How should the preloaded `.mxl` files be made available to the frontend at runtime? → A: Copy or symlink `/scores` into `frontend/public/scores/` — Vite serves and bundles them automatically.
- Q: Should the app warn the user when loading a new score while a modified score is already open? → A: Replace the current score silently — no confirmation dialog regardless of modified state.
- Q: Will preloaded score files be available offline? → A: Yes, provided `.mxl` is added to the Workbox `globPatterns` in `vite.config.ts`; currently only `.musicxml` is listed, so `.mxl` files would be served but not precached by the service worker.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Load Score Entry Point (Priority: P1)

A user on the landing page sees a single **Load Score** button. The previous **Demo** button and **Import Score** button are both removed and their combined purpose is served by the Load Score dialog. The same rename applies to the toolbar **Import** button shown when a score is already loaded.

**Why this priority**: Renaming the button is a prerequisite for every other story. It also aligns the label with the broader intent (both preloaded and user-supplied files are "loaded").

**Independent Test**: Open the app with no score loaded. Verify the landing screen contains exactly one primary action button labelled **Load Score** and that the Demo button is absent. Open the app with a score loaded and verify the toolbar also reads "Load Score". The dialog does not need to be functional to validate the rename. Delivers value independently.

**Acceptance Scenarios**:

1. **Given** the app is on the landing screen (no score loaded), **When** the user views the initial action buttons, **Then** exactly one primary button is present, labelled **Load Score**; the previous "Demo" button does not appear.
2. **Given** a score is already loaded and the user is on the instruments view, **When** the user views the toolbar, **Then** the button previously labelled "Import" now reads **Load Score**.
3. **Given** any view where the old Import or Demo buttons existed, **When** the user inspects the UI, **Then** neither a "Demo" button nor any button labelled "Import" appears; the single entry point is **Load Score**.
4. **Given** the app is launched for the first time on a fresh install, **When** WASM initialises, **Then** no score is auto-loaded and no demo loading state is shown; the landing screen with the **Load Score** button is displayed immediately.

---

### User Story 2 — Load Score Dialog Layout (Priority: P1)

A user taps **Load Score** and a dialog appears. The left panel shows a list of preloaded scores. The right panel shows a **Load New Score** button that opens the OS file picker for a user-supplied MusicXML file. The dialog can be dismissed without loading anything.

**Why this priority**: This is the core UX change. It is a prerequisite for stories 3 and 4.

**Independent Test**: Tap **Load Score** on the landing screen. Verify the dialog opens, contains a headed list of preloaded scores on the left, and a distinct **Load New Score** button on the right. Tap outside the dialog or a close control — verify the dialog closes and nothing is loaded. Visual confirmation is sufficient.

**Acceptance Scenarios**:

1. **Given** the user taps **Load Score**, **Then** a modal dialog opens with the title "Load Score" or equivalent heading.
2. **Given** the dialog is open, **When** the user views the left panel, **Then** a list with the following six entries is displayed and each entry is selectable:
   - Bach — Invention No. 1
   - Beethoven — Für Elise
   - Burgmüller — Arabesque
   - Burgmüller — La Candeur
   - Chopin — Nocturne Op. 9 No. 2
   - Pachelbel — Canon in D
3. **Given** the dialog is open, **When** the user views the right panel, **Then** a **Load New Score** button is visible and clearly separated from the preloaded list.
4. **Given** the dialog is open, **When** the user taps outside the dialog backdrop or an explicit close/cancel control, **Then** the dialog closes and the application state is unchanged.
5. **Given** the dialog is open on a narrow viewport (mobile, < 480 px wide), **When** the layout renders, **Then** the two panels stack vertically (preloaded list on top, Load New Score button below) with no horizontal overflow.

---

### User Story 3 — Opening a Preloaded Score (Priority: P1)

A user selects one of the preloaded scores from the list. The app fetches the `.mxl` file from the server, parses it through the existing WASM import pipeline, and immediately navigates to the play view (layout mode) — the same destination reached after a successful import flow.

**Why this priority**: This is the primary value of the feature. Delivering a one-tap path from dialog → play view replaces the friction of finding and uploading a file.

**Independent Test**: Select "Beethoven — Für Elise" from the list. Verify the play view opens with the score rendered and playback controls visible. The file picker must not appear during this flow.

**Acceptance Scenarios**:

1. **Given** the Load Score dialog is open, **When** the user taps a preloaded score entry, **Then** the dialog shows a loading indicator and the file picker is not triggered.
2. **Given** a preloaded score is being fetched, **When** the fetch completes successfully, **Then** the `.mxl` file is piped through the existing `useImportMusicXML` / WASM parsing pipeline identically to a user-supplied file.
3. **Given** parsing completes successfully, **When** the score is ready, **Then** the dialog closes, the score is set as the active score, and the view transitions to **layout (play) mode** with playback **paused at position zero** — the user must tap Play to begin playback.
4. **Given** the score is open in play view, **When** the user presses the return arrow, **Then** the normal Feature-027 navigation back to the instruments view occurs.
5. **Given** the selected preloaded score was already the last loaded score in the session, **When** the user re-selects it, **Then** it reloads cleanly without UI artifacts.
6. **Given** a score is already loaded (with or without the modified `*` indicator), **When** the user selects a preloaded score, **Then** the current score is replaced silently — no confirmation dialog is shown.

---

### User Story 4 — Loading a New (User-Supplied) Score (Priority: P1)

A user taps **Load New Score** inside the dialog. The OS file picker opens with the same `.musicxml,.xml,.mxl` filter as before. On successful import the dialog closes and the score loads through the existing import flow. On error the existing import error UI is shown within the dialog.

**Why this priority**: Preserves the existing import capability without regression. External file imports must continue to work exactly as before.

**Independent Test**: Tap **Load New Score**, select a `.mxl` file from the file system, and verify the score loads through the current import flow. Error behaviour (bad file) must match the existing ImportButton error display.

**Acceptance Scenarios**:

1. **Given** the user taps **Load New Score**, **When** the file picker opens, **Then** accepted file types are `.musicxml`, `.xml`, and `.mxl` — identical to the current ImportButton.
2. **Given** the user selects a valid MusicXML file, **When** import completes, **Then** the dialog closes and the score loads through the same `handleMusicXMLImport` callback used by the current ImportButton.
3. **Given** the user selects an invalid or malformed file, **When** import fails, **Then** the error message is displayed inside the dialog (not in a separate location) and the dialog remains open so the user can retry or cancel.
4. **Given** the user opens the file picker and then cancels (no file selected), **When** the picker closes, **Then** the dialog remains open and no loading state or error is shown.
5. **Given** the import is in progress after file selection, **When** the user tries to tap another preloaded score or the Load New Score button again, **Then** both are disabled (loading state) until the import resolves.
6. **Given** a score is already loaded (with or without the modified `*` indicator), **When** a new external score is imported successfully, **Then** the current score is replaced silently — no confirmation dialog is shown.

---

### User Story 5 — Preloaded Score Fetch Error Handling (Priority: P2)

A user selects a preloaded score but the network request fails (offline, asset missing, timeout). The dialog shows an error and allows the user to retry or select a different score.

**Why this priority**: The app targets offline/PWA use. Robust error feedback prevents a silent broken state.

**Independent Test**: With network disabled after app load, select a preloaded score. Verify an error message appears inside the dialog and the user can dismiss or retry without closing the app.

**Acceptance Scenarios**:

1. **Given** the user selects a preloaded score and the fetch fails, **When** the error occurs, **Then** the dialog displays a message such as "Could not load [Score Name]. Check your connection and try again."
2. **Given** a fetch error is displayed, **When** the user taps Retry (if available) or selects the same entry again, **Then** the fetch is retried.
3. **Given** a fetch error is displayed, **When** the user selects a different preloaded score, **Then** the previous error clears and the new fetch begins.
4. **Given** a fetch error is displayed, **When** the user dismisses the dialog, **Then** the application state is unchanged (the previous score, if any, is still loaded).
5. **Given** the app was previously loaded online (service worker precached the `.mxl` files), **When** the user opens the Load Score dialog while offline, **Then** all six preloaded scores are selectable and load successfully from the service worker cache.

---

## Component Architecture

```
LoadScoreButton          (replaces ImportButton in landing & toolbar)
└── LoadScoreDialog      (modal, appears on button click)
    ├── PreloadedScoreList
    │   └── PreloadedScoreItem  (× 6, one per /scores entry)
    └── LoadNewScoreButton      (wraps existing ImportButton logic)
```

**`LoadScoreButton`** — stateless button; accepts an `onClick` prop that opens the dialog. Renders identical markup to the old ImportButton but labelled "Load Score".

**`LoadScoreDialog`** — modal overlay. Internal state: `{ open, loadingPreset: string | null, error: string | null }`. Delegates file-pick flow to the existing `useImportMusicXML` hook.

**`PreloadedScoreList`** — renders the six score entries defined in a static config array; emits `onSelect(scoreEntry)`.

**`LoadNewScoreButton`** — hidden file input + button, same accept filter as ImportButton; delegates to `useImportMusicXML`.

---

## Static Asset Delivery

The six `.mxl` files from `/scores` are made available by adding `frontend/public/scores/` to the repository — either as a symlink (`ln -s ../../scores frontend/public/scores`) or a copy. Vite serves `public/` verbatim in development and copies it to `dist/` at build time. The Docker build already copies `dist/` into nginx's `html/`, so no Dockerfile changes are needed.

The files are served at:

```
/scores/Bach_InventionNo1.mxl
/scores/Beethoven_FurElise.mxl
/scores/Burgmuller_Arabesque.mxl
/scores/Burgmuller_LaCandeur.mxl
/scores/Chopin_NocturneOp9No2.mxl
/scores/Pachelbel_CanonD.mxl
```

### Offline / PWA Precaching

The existing Workbox `globPatterns` in `vite.config.ts` includes `musicxml` but **not `mxl`**. Without adding `mxl`, the service worker will never precache these files and preloaded score selection will fail when offline.

**Required change** — extend the glob in `vite.config.ts`:

```diff
- globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,musicxml,woff2,mp3}'],
+ globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,musicxml,mxl,woff2,mp3}'],
```

This ensures all six `.mxl` files are precached on first load and available offline from that point on, consistent with the rest of the PWA's offline-first behaviour.

---

## Preloaded Score Manifest

Defined as a static TypeScript constant (not fetched from a server):

```typescript
export interface PreloadedScore {
  id: string;           // stable identifier
  displayName: string;  // shown in list
  path: string;         // URL served at runtime
}

export const PRELOADED_SCORES: PreloadedScore[] = [
  { id: 'bach-invention-1',       displayName: 'Bach — Invention No. 1',         path: '/scores/Bach_InventionNo1.mxl' },
  { id: 'beethoven-fur-elise',    displayName: 'Beethoven — Für Elise',           path: '/scores/Beethoven_FurElise.mxl' },
  { id: 'burgmuller-arabesque',   displayName: 'Burgmüller — Arabesque',          path: '/scores/Burgmuller_Arabesque.mxl' },
  { id: 'burgmuller-la-candeur',  displayName: 'Burgmüller — La Candeur',         path: '/scores/Burgmuller_LaCandeur.mxl' },
  { id: 'chopin-nocturne-op9-2',  displayName: 'Chopin — Nocturne Op. 9 No. 2',  path: '/scores/Chopin_NocturneOp9No2.mxl' },
  { id: 'pachelbel-canon-d',      displayName: 'Pachelbel — Canon in D',          path: '/scores/Pachelbel_CanonD.mxl' },
];
```

---

## Out of Scope

- Adding, removing, or editing preloaded scores at runtime.
- Score thumbnails or audio previews in the dialog.
- Saving user-supplied scores as preloaded entries.
- Caching preloaded scores in IndexedDB for offline access (may be addressed in a follow-up offline feature).
- Any changes to the backend or WASM engine.
- Preserving the Feature 013 `useOnboarding` hook for any other purpose — it is removed entirely as part of this feature.
