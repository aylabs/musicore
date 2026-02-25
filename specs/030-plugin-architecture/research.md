# Research: Plugin Architecture with Virtual Keyboard Sample Plugin

**Branch**: `030-plugin-architecture` | **Date**: 2026-02-25
**Input**: [spec.md](spec.md) — FR-001 through FR-021; 4 user stories

---

## R-001: Plugin Registry Persistence — IndexedDB Library Choice

**Decision**: Use the `idb` npm package (v8, Jake Archibald) for IndexedDB access.

**Rationale**: The plugin registry must persist two data shapes — small manifest objects and large binary blobs (up to 5 MB per plugin). Raw IndexedDB satisfies browser support requirements but wraps every operation in `IDBRequest` callbacks, making the atomic manifest+assets write required by FR-010 brittle and verbose. `localforage` abstracts storage but silently falls back to localStorage (which cannot hold blobs of this size), has no TypeScript generics on values, and omits multi-store transaction APIs. `idb` costs ~1.7 kB gzipped, wraps every request in a Promise, exposes the full IndexedDB primitive (stores, indexes, transactions, cursors), and ships first-party TypeScript types via `DBSchema`. Maintenance is active (v8, 2024).

**Key pattern**:
```ts
import { openDB, DBSchema } from 'idb';
interface PluginDB extends DBSchema {
  manifests: { key: string; value: PluginManifest };
  assets:    { key: string; value: { pluginId: string; name: string; data: ArrayBuffer } };
}
const db = await openDB<PluginDB>('plugin-registry', 1, {
  upgrade(db) {
    db.createObjectStore('manifests', { keyPath: 'id' });
    db.createObjectStore('assets',    { keyPath: 'name' });
  },
});
const tx = db.transaction(['manifests', 'assets'], 'readwrite');
await tx.objectStore('manifests').put(manifest);
await tx.objectStore('assets').put({ pluginId: manifest.id, name: 'bundle.js', data: buffer });
await tx.done;
```

**Alternatives considered**:
- **Raw IndexedDB**: Zero dependencies, full control. Rejected — doubles boilerplate, no typed generics.
- **localforage**: Simpler API. Rejected — opaque backend, no multi-store transactions, no generic types.

---

## R-002: ZIP Package Extraction — Library Choice

**Decision**: Use `fflate` for in-browser ZIP extraction.

**Rationale**: The Plugin Importer accepts plugin packages as ZIP archives (FR-008). `fflate` provides a `unzip()` function that accepts a `Uint8Array` (from `File.arrayBuffer()`) and returns all entries by path with raw bytes. Bundle size is ~8 kB gzipped — significantly lighter than JSZip (~30 kB gzipped). `fflate` ships first-party TypeScript types, is actively maintained (v0.8.x, ~2 M weekly downloads), and covers all modern browsers.

**Key pattern**:
```ts
import { unzip } from 'fflate';
const buffer = await file.arrayBuffer();
const files = await new Promise<Record<string, Uint8Array>>((res, rej) =>
  unzip(new Uint8Array(buffer), (err, data) => err ? rej(err) : res(data))
);
const manifestRaw = files['plugin.json'];
const manifest = JSON.parse(new TextDecoder().decode(manifestRaw));
```

**Alternatives considered**:
- **JSZip**: Familiar API, but ~30 kB gzipped, no releases since 2023, requires `@types/jszip`.
- **Native `DecompressionStream`**: Handles raw deflate/gzip only — has no ZIP container (local file headers, central directory) support. Manual parsing would be ~500 LOC.

---

## R-003: Plugin API Boundary Enforcement — Static Analysis

**Decision**: Use ESLint `no-restricted-imports` in a scoped flat-config block targeting `plugins/**/*` to enforce that plugin code imports only from `src/plugin-api/`.

**Rationale**: SC-008 resolved to documentation + code review only (no runtime sandboxing). `no-restricted-imports` is a built-in ESLint rule (zero extra dependencies) that supports glob patterns. Flat config (`eslint.config.js`) makes per-directory scoping straightforward — a separate config block with `files: ['plugins/**/*.{ts,tsx}']` applies the restriction only to plugin files. The alternative `eslint-plugin-import` rule `import/no-restricted-paths` solves the same problem but requires installing the `import` plugin and configuring its resolver.

**Key config snippet** (`frontend/eslint.config.js`):
```js
{
  files: ['plugins/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['**/src/!(plugin-api)/**', '../!(src)/**', './*'],
        message: 'Plugin code must only import from src/plugin-api/.',
      }],
    }],
  },
},
```

**Known limitations**:
- Matches literal import strings, not resolved module paths. Path aliases (e.g. `@/components/`) must also be listed in `patterns`.
- Dynamic `import()` with computed strings is not caught.
- Re-exports that inadvertently expose non-API internals from the `plugin-api/index.ts` barrel are not detected by this rule — the barrel's own exports must be carefully curated.

---

## R-004: Plugin Navigation Architecture

**Decision**: Extend the existing `useState`-based navigation in `App.tsx` with a `PluginNavEntry` list derived from the Plugin Registry. Each installed plugin contributes one navigation entry. No routing library is introduced.

**Rationale**: The app currently uses conditional `useState` flags in `App.tsx` to switch between views (ScoreViewer, RecordingView, PracticeView, RendererDemo). There is no react-router or router library. Introducing a router solely for plugin views would be disproportionate and inconsistent with the existing pattern. Instead, `App.tsx` reads installed plugins from the Plugin Registry on mount and renders a navigation list; selecting a plugin entry sets `activePlugin` state, which renders the `<PluginView>` wrapper mounting that plugin's view component.

**State extension**:
```ts
const [activePlugin, setActivePlugin] = useState<string | null>(null);
const [installedPlugins, setInstalledPlugins] = useState<PluginManifest[]>([]);
// On mount: load from PluginRegistry; re-run after import
```

**Navigation rendering**: `installedPlugins.map(p => <PluginNavEntry key={p.id} plugin={p} onSelect={() => setActivePlugin(p.id)} />)` added to the existing navigation area in `ScoreViewer` or the app header.

---

## R-005: Plugin View Error Isolation

**Decision**: Wrap each plugin view in a `<PluginView>` component that extends the existing `ErrorBoundary.tsx`. The boundary catches render-time and lifecycle errors from the plugin's component tree, displays an inline error message and a "Reload plugin" button, and does not affect other app views.

**Rationale**: The existing `frontend/src/components/ErrorBoundary.tsx` already implements a class-based React error boundary. `<PluginView>` composes it with plugin-specific UI: the plugin name in the error message, a "Reload plugin" action that resets the boundary state (re-mounts the plugin), and a thin container `div` that preserves layout when the error state is shown (FR-020).

**Key pattern**:
```tsx
export const PluginView = ({ plugin, children }: PluginViewProps) => (
  <ErrorBoundary
    fallback={({ error, reset }) => (
      <div className="plugin-error">
        <p>Plugin "{plugin.name}" encountered an error: {error.message}</p>
        <button onClick={reset}>Reload plugin</button>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);
```

---

## R-006: Built-In Plugin Registration at Startup

**Decision**: Built-in plugins (those in `frontend/plugins/*/`) are registered via a `builtinPlugins.ts` module that directly imports their manifests and view components at build time. They are added to the Plugin Registry in-memory on app startup without requiring IndexedDB persistence (they are always available).

**Rationale**: Built-in plugins are bundled assets known at compile time. Writing them to IndexedDB introduces an unnecessary async dependency on app startup; treating them as hardcoded imports is simpler, faster, and avoids any IndexedDB failure modes affecting the built-in Virtual Keyboard. The Plugin Registry distinguishes between `builtin` and `imported` origin, allowing the UI to label them correctly and preventing users from accidentally overwriting them through the importer.

**Pattern**:
```ts
// builtinPlugins.ts
import virtualKeyboardManifest from '../../plugins/virtual-keyboard/plugin.json';
import { VirtualKeyboardPlugin } from '../../plugins/virtual-keyboard/index';

export const BUILTIN_PLUGINS: BuiltinPlugin[] = [
  { manifest: virtualKeyboardManifest, component: VirtualKeyboardPlugin },
];
```

---

## Resolved Unknowns Summary

| Unknown | Resolution |
|---------|-----------|
| IndexedDB library | ✅ `idb` v8 — typed, ~1.7 kB gz, active |
| ZIP extraction library | ✅ `fflate` — ~8 kB gz, TypeScript types, active |
| Plugin API boundary enforcement | ✅ ESLint `no-restricted-imports` in scoped flat-config block |
| Navigation architecture | ✅ Extend existing `useState` in `App.tsx`; no router introduced |
| Plugin view error isolation | ✅ `<PluginView>` composing existing `ErrorBoundary.tsx` |
| Built-in plugin registration | ✅ Build-time imports in `builtinPlugins.ts`; in-memory; no IndexedDB write |

