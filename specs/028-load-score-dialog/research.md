# Research: Load Score Dialog (Feature 028)

**Phase 0 — Resolved unknowns**  
**Date**: 2026-02-20

---

## 1. Static Asset Delivery for `.mxl` Files

**Question**: How should the six preloaded `.mxl` scores be made available at runtime in both Vite dev and production Docker?

**Decision**: Create `frontend/public/scores/` as a symlink to `/scores` at repo root (or a copy). Vite copies the entire `public/` directory verbatim to `dist/` at build time. The existing `frontend/Dockerfile` already copies `dist/` to nginx `html/`.

**Rationale**: Standard Vite convention. Zero configuration required. Works identically in `npm run dev` (served by Vite dev server) and Docker production (served by nginx). No Vite plugin, no build script, no Dockerfile change.

**Alternatives considered**:
- Vite plugin / build script to copy files at build time only — adds tooling complexity with no benefit; cannot serve files in `npm run dev` without additional dev plugin config.
- Hosting scores on a CDN / external URL — adds external dependency; breaks offline first.

---

## 2. Offline / PWA Precaching for `.mxl` Files

**Question**: Will the service worker precache the `.mxl` files for offline use?

**Finding**: The existing `vite.config.ts` Workbox `globPatterns` is:
```
'**/*.{js,css,html,wasm,png,svg,ico,musicxml,woff2,mp3}'
```
`.mxl` is absent. The files would be deployed and served, but the service worker would skip them during precaching. Offline selection would fail with a network error (served from cache miss).

**Decision**: Extend glob to add `mxl`:
```diff
- globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,musicxml,woff2,mp3}'],
+ globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,musicxml,mxl,woff2,mp3}'],
```

**Rationale**: One-word change. Consistent with how other binary assets (WASM, audio) are already precached. Six `.mxl` files are ~100–500 KB each, total precache budget increase ~2 MB — acceptable for a PWA targeting tablets with storage capacity.

**Alternatives considered**: Runtime caching strategy (e.g., `CacheFirst` for `/scores/*`) — works but requires an additional online fetch on first selection before scores are cached. Precaching ensures all six scores are available offline from the moment the PWA is installed, which is the correct offline-first behaviour.

---

## 3. Preloaded Score Fetch + WASM Parse Flow

**Question**: How does `fetch` output get into the existing `useImportMusicXML` pipeline?

**Finding**: `useImportMusicXML.importFile(file: File)` accepts a `File` object. `fetch(url)` returns a `Response`. The bridge is:

```typescript
const response = await fetch(score.path);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const blob = await response.blob();
const file = new File([blob], score.path.split('/').pop()!, {
  type: 'application/octet-stream',
});
await importFile(file);
```

`File` extends `Blob`; `MusicXMLImportService` reads the raw bytes and passes them to the WASM module, making the file origin transparent. This reuses the entire existing pipeline including error handling, warnings, and the `onSuccess` callback.

**Rationale**: Zero new abstractions. The service worker will serve the fetch from cache when offline, so no special offline handling is needed in the load path.

**Alternatives considered**: Directly passing the `ArrayBuffer` to the WASM module — would require changes to `MusicXMLImportService` and bypass the `useImportMusicXML` error-state management. Not worth the coupling.

---

## 4. Removal of `useOnboarding` / Feature 013 Auto-Demo

**Question**: What exactly needs to be deleted and are there any other consumers?

**Finding** (from codebase inspection):
- `useOnboarding.ts` — used only in `App.tsx` (one import, one call site)
- `demoLoaderService` — used only in `ScoreViewer.tsx` (`handleLoadDemoButtonClick`) and `useOnboarding.ts`
- `OnboardingService.ts`, `config.ts`, `types.ts` in `services/onboarding/` — used only by `demoLoader.ts` and `useOnboarding.ts`

No other component or hook imports from the onboarding directory.

**Deletion list**:
- `frontend/src/hooks/useOnboarding.ts`
- `frontend/src/services/onboarding/` (entire directory)
- `App.tsx`: remove `useOnboarding` import + call, `isDemoLoading` branch, `demoError` notification JSX
- `ScoreViewer.tsx`: remove `handleLoadDemoButtonClick`, the **Demo** button JSX, and `demoLoaderService` import

**Decision**: Full deletion. No preservation needed.

---

## 5. Dialog Accessibility Pattern

**Question**: What is the correct accessible pattern for the modal dialog?

**Decision**: Use the HTML `<dialog>` element with `showModal()` / `.close()` API for native focus-trapping and backdrop handling, or a `<div role="dialog" aria-modal="true">` overlay with manual backdrop `onClick` if `<dialog>` support is insufficient.

**Finding**: `<dialog>` has full support in Chrome 37+, Firefox 98+, Safari 15.4+. All target browsers in the constitution spec are well above these thresholds. The `<dialog>` element provides: native focus trap, `Escape` key close, `::backdrop` pseudo-element, and `close` event.

**Decision**: Use HTML `<dialog>` element. Call `dialogRef.current.showModal()` on open; listen for `close` event to sync React state.

**Rationale**: Zero additional JavaScript for focus trapping. Semantically correct. `::backdrop` handles the dimmed backdrop without extra DOM. Consistent with modern standards.

**Alternatives considered**: `react-modal` or `@radix-ui/react-dialog` — adds a dependency. Unnecessary when the native `<dialog>` element covers all requirements.

---

## 6. Responsive Two-Panel Layout

**Question**: How should the dialog layout switch from two-column (tablet) to single-column (mobile)?

**Decision**: CSS Flexbox with `flex-wrap: wrap` or a CSS Grid with `min-width`-based columns. On viewports < 480px, the two panels stack vertically (list on top, Load New Score button below).

**Implementation**:
```css
.load-score-dialog-body {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.load-score-panel-left  { flex: 1 1 200px; }
.load-score-panel-right { flex: 0 1 auto; align-self: flex-start; }
```
At < 480px both panels have `flex-basis > available-width`, so they wrap naturally to a single column.

**Rationale**: No JS breakpoints; pure CSS; consistent with the existing component CSS patterns in the project (no CSS-in-JS, no CSS modules, plain `.css` files imported directly).

---

## Summary Table

| Unknown | Resolved | Decision |
|---|---|---|
| Static asset delivery | ✅ | `frontend/public/scores/` symlink/copy |
| Offline precaching | ✅ | Add `mxl` to Workbox `globPatterns` |
| Fetch → WASM pipeline bridge | ✅ | `fetch` → `Blob` → `new File([blob], name)` → `importFile()` |
| Onboarding deletion scope | ✅ | Delete entire `services/onboarding/`, `useOnboarding.ts`; clean `App.tsx` + `ScoreViewer.tsx` |
| Modal accessibility pattern | ✅ | HTML `<dialog>` element with `showModal()` |
| Responsive layout | ✅ | Flexbox `flex-wrap: wrap`; stacks at < 480px |
