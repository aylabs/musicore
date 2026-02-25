# Plugin Architecture — Developer Quickstart

**Branch**: `030-plugin-architecture`

This guide covers:
1. Running the app and seeing the Virtual Keyboard plugin
2. Creating a new plugin from scratch
3. Packaging and testing a plugin ZIP import
4. Understanding the ESLint API-boundary enforcement

---

## 1. Running the App and Seeing the Virtual Keyboard

```bash
# From the repo root:
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The **Virtual Keyboard** entry appears in the navigation bar (it is a built-in plugin, always present).

Click **Virtual Keyboard** → the keyboard view renders. Tap or click a key → the corresponding note appears on the staff above the keyboard.

---

## 2. Creating a New Plugin

### Folder structure

All plugins live under `frontend/plugins/<plugin-id>/`.

```
frontend/plugins/
└── my-plugin/
    ├── plugin.json         ← manifest (required)
    ├── index.tsx           ← plugin entry point (must export default MusicorePlugin)
    ├── MyPlugin.tsx        ← root React component (imported by index.tsx)
    ├── MyPlugin.css        ← optional styles
    └── MyPlugin.test.tsx   ← optional Vitest tests
```

### plugin.json reference

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "pluginApiVersion": "1",
  "entryPoint": "index.js",
  "description": "A short description for the plugin list."
}
```

| Field | Notes |
|-------|-------|
| `id` | Lowercase, alphanumeric + hyphens only. Must be unique across all installed plugins. |
| `version` | SemVer (`MAJOR.MINOR.PATCH`). Shown in the duplicate-name confirmation dialog. |
| `pluginApiVersion` | Integer string. The importer rejects the plugin if this exceeds the app's current Plugin API version (`"1"`). |
| `entryPoint` | The compiled JS file *inside* the ZIP (not the source path). For built-in plugins, this field is informational. |

### index.tsx skeleton

```tsx
// frontend/plugins/my-plugin/index.tsx
import type { MusicorePlugin } from '../../src/plugin-api';
import MyPlugin from './MyPlugin';

const plugin: MusicorePlugin = {
  init(context) {
    // Store context if needed to call context.emitNote() later.
    console.log('my-plugin initialised', context.manifest.version);
  },

  dispose() {
    // Clean up listeners / timers here.
  },

  Component: MyPlugin,
};

export default plugin;
```

### Emitting a note event

```tsx
// Inside a component or event handler:
context.emitNote({ midiNote: 60, timestamp: Date.now() }); // Middle C
```

The host forwards the event to the WASM layout engine. **Do not compute note coordinates in plugin code** — that violates Constitution Principle VI.

### Registering as a built-in plugin

Open `frontend/src/services/plugins/builtinPlugins.ts` and add an import:

```ts
import myPlugin from '../../../plugins/my-plugin';
import myPluginManifest from '../../../plugins/my-plugin/plugin.json';

export const BUILTIN_PLUGINS: BuiltinPluginEntry[] = [
  // ... existing entries
  { manifest: { ...myPluginManifest, origin: 'builtin' }, plugin: myPlugin },
];
```

Built-in plugins appear in the nav bar immediately on app start, without any IndexedDB writes.

---

## 3. Packaging and Testing a Plugin ZIP Import

### Package your plugin

A plugin ZIP must have `plugin.json` at the root and all referenced assets (your compiled entry-point JS, CSS, etc.) at the corresponding relative paths.

```bash
# From your plugin's build output directory:
zip -r my-plugin-1.0.0.zip plugin.json index.js styles.css
```

Constraints enforced by the importer:
- Total uncompressed size: ≤ 5 MB (FR-021)
- `plugin.json` must be present and valid against [plugin-manifest.schema.json](contracts/plugin-manifest.schema.json)
- `entryPoint` file must exist inside the ZIP
- `pluginApiVersion` must be `"1"` (current app API version)

### Import via the UI

1. Click the **+** button in the navigation bar (or the "Import Plugin" action).
2. Select your ZIP file.
3. The importer validates, then:
   - If a plugin with the same `id` is already installed, a confirmation dialog asks whether to overwrite it.
   - On success, the new plugin's navigation entry appears immediately.

### Testing import in isolation (Vitest)

```ts
// frontend/src/services/plugins/PluginImporter.test.ts
import { importPlugin } from './PluginImporter';
import { strToU8, zip } from 'fflate';

it('rejects package over 5 MB', async () => {
  const bigData = new Uint8Array(6 * 1024 * 1024);
  // ... build a ZIP and assert rejection
});
```

---

## 4. ESLint API-Boundary Enforcement

The ESLint configuration in `frontend/eslint.config.js` contains a scoped block:

```js
{
  files: ['plugins/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['../src/*', '../../src/*', '!**/src/plugin-api', '!**/src/plugin-api/**'],
        message: 'Plugins may only import from src/plugin-api. All other host internals are forbidden.',
      }],
    }],
  },
},
```

**What it enforces**: any file under `frontend/plugins/` that imports from a `src/` path other than `src/plugin-api` gets an ESLint error.

**What plugins may import**:
- `../../src/plugin-api` (the official Plugin API)
- npm packages (React, etc.)
- Files within their own plugin folder

**How to verify**:

```bash
cd frontend
npx eslint plugins/
```

A violation looks like:
```
plugins/bad-plugin/index.tsx
  3:1  error  Plugins may only import from src/plugin-api.  no-restricted-imports
```

**Known limitation** (see research.md R-003): ESLint only prevents *static* import violations at lint time. Runtime dynamic imports (`await import(url)`) are not covered — avoid dynamic host imports in plugin code.

---

## 5. Useful Commands

```bash
# Run all frontend tests (includes plugin service unit tests)
cd frontend && npm test

# Run just plugin-related tests
cd frontend && npx vitest run --reporter=verbose src/services/plugins src/components/plugins plugins/

# Type-check (includes plugin API types)
cd frontend && npx tsc --noEmit

# Lint plugins for API-boundary violations
cd frontend && npx eslint plugins/
```
