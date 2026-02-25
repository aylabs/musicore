# Musicore Plugin Development Guide

Plugins extend Musicore with new UI views and interactive musical tools. They run inside the application as trusted React components and communicate with the host through a versioned Plugin API.

---

## Table of Contents

1. [Concepts](#concepts)
2. [Plugin API reference](#plugin-api-reference)
3. [Creating a builtin plugin](#creating-a-builtin-plugin)
4. [Creating an importable plugin (ZIP package)](#creating-an-importable-plugin-zip-package)
5. [API constraints and ESLint boundary](#api-constraints-and-eslint-boundary)
6. [Testing your plugin](#testing-your-plugin)
7. [Reference: Virtual Keyboard plugin](#reference-virtual-keyboard-plugin)

---

## Concepts

| Term | Meaning |
|---|---|
| **Plugin** | A self-contained feature that adds a new view to the Musicore navigation bar |
| **Builtin plugin** | Bundled with the repository; always available without installation |
| **Imported plugin** | Packaged as a ZIP file by a third-party developer and installed by the user at runtime |
| **Plugin API** | The only public surface a plugin may import — `frontend/src/plugin-api/index.ts` |
| **PluginContext** | Host-provided object injected into `init()`: the only channel from plugin → host |

---

## Plugin API reference

All public types are exported from `frontend/src/plugin-api/index.ts`. This is the **only** file a plugin is permitted to import from the host.

### `MusicorePlugin`

The interface your plugin's default export must satisfy.

```typescript
import type { MusicorePlugin, PluginContext } from '../../src/plugin-api/index';

const plugin: MusicorePlugin = {
  /** Called once on app startup. Store context for use inside Component. */
  init(context: PluginContext): void { ... },

  /** Optional. Called when the plugin is unregistered. Release resources here. */
  dispose?(): void { ... },

  /** Root React component rendered when the plugin's nav entry is active. */
  Component: () => <div>My Plugin</div>,
};

export default plugin;
```

### `PluginContext`

Injected by the host into `init()`. Store it in a module-level variable and pass it to your component.

```typescript
interface PluginContext {
  /**
   * Send a note event to the host WASM layout pipeline.
   * Use this to record notes the user plays on the musical staff.
   */
  emitNote(event: PluginNoteEvent): void;

  /**
   * Play a note through the host audio engine (Salamander Grand Piano samples).
   * This is the only authorised route for audio — do NOT import Tone.js directly.
   *
   *   type: 'attack'   — note-on  (default when omitted)
   *   type: 'release'  — note-off (release a sustained note)
   */
  playNote(event: PluginNoteEvent): void;

  /** Read-only descriptor for this plugin instance. */
  readonly manifest: Readonly<PluginManifest>;
}
```

### `PluginNoteEvent`

The event type used by both `emitNote` and `playNote`.

```typescript
interface PluginNoteEvent {
  readonly midiNote: number;       // MIDI note number 0–127. Middle C = 60.
  readonly timestamp: number;      // Date.now() at the moment of input.
  readonly velocity?: number;      // 1–127. Defaults to 64 (mezzo-forte).
  readonly type?: 'attack' | 'release'; // Defaults to 'attack'.
}
```

### `PluginManifest`

Read-only descriptor available via `context.manifest`. Populated from `plugin.json` plus `origin` set by the host.

```typescript
interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly pluginApiVersion: string;
  readonly entryPoint: string;
  readonly description?: string;
  readonly origin: 'builtin' | 'imported';
}
```

### `PLUGIN_API_VERSION`

```typescript
const PLUGIN_API_VERSION = '1';   // current version
```

---

## Creating a builtin plugin

Builtin plugins live in `frontend/plugins/<plugin-id>/` and are bundled at build time.

### Step 1 — Create the folder structure

```
frontend/plugins/my-plugin/
  plugin.json        # manifest
  index.tsx          # MusicorePlugin default export (entry point)
  MyPlugin.tsx       # React component(s)
  MyPlugin.css       # styles (optional)
  MyPlugin.test.tsx  # Vitest tests
```

### Step 2 — Write `plugin.json`

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "pluginApiVersion": "1",
  "entryPoint": "index.js",
  "description": "What this plugin does."
}
```

`id` must be unique across all plugins. `pluginApiVersion` must match `PLUGIN_API_VERSION` (`"1"`).  
Do **not** include an `origin` field — the host sets it automatically.

### Step 3 — Write `index.tsx`

```tsx
/* eslint-disable react-refresh/only-export-components */
import type { MusicorePlugin, PluginContext } from '../../src/plugin-api/index';
import { MyPlugin } from './MyPlugin';

// Store context at module scope so the Component closure can access it.
let _context: PluginContext | null = null;

function MyPluginWithContext() {
  if (!_context) return null;
  return <MyPlugin context={_context} />;
}

const plugin: MusicorePlugin = {
  init(context) {
    _context = context;
  },
  dispose() {
    _context = null;
  },
  Component: MyPluginWithContext,
};

export default plugin;
```

### Step 4 — Write your component

```tsx
import { useCallback } from 'react';
import type { PluginContext } from '../../src/plugin-api/index';

export function MyPlugin({ context }: { context: PluginContext }) {
  const handlePlay = useCallback(() => {
    // Play middle C via the host audio engine
    context.playNote({ midiNote: 60, timestamp: Date.now(), type: 'attack' });
    // Also record it on the score staff
    context.emitNote({ midiNote: 60, timestamp: Date.now() });
  }, [context]);

  const handleRelease = useCallback(() => {
    context.playNote({ midiNote: 60, timestamp: Date.now(), type: 'release' });
  }, [context]);

  return (
    <button onMouseDown={handlePlay} onMouseUp={handleRelease}>
      Play C4
    </button>
  );
}
```

### Step 5 — Register in `builtinPlugins.ts`

Edit `frontend/src/services/plugins/builtinPlugins.ts`:

```typescript
import myPlugin from '../../../plugins/my-plugin/index';
import myPluginManifest from '../../../plugins/my-plugin/plugin.json';

export const BUILTIN_PLUGINS: BuiltinPluginEntry[] = [
  // ... existing plugins ...
  {
    manifest: {
      ...(myPluginManifest as Omit<PluginManifest, 'origin'>),
      origin: 'builtin' as const,
    },
    plugin: myPlugin,
  },
];
```

That's it — the plugin now appears in the navigation bar on the next `npm run dev`.

---

## Creating an importable plugin (ZIP package)

Imported plugins are distributed as `.zip` files and installed by the user via the **Import Plugin** button in the Musicore UI. They are persisted in IndexedDB and survive reloads.

> **Note**: Because importable plugins are loaded at runtime without a bundler, they must be pre-compiled to a single JavaScript file. This packaging step is the responsibility of the plugin developer.

### ZIP structure

```
my-plugin.zip
├── plugin.json     # required — manifest (same schema as above)
└── index.js        # required — compiled/bundled ES module, default-exports MusicorePlugin
```

Both files must be at the **root** of the ZIP (no subdirectory nesting). The `entryPoint` field in `plugin.json` must match the JS filename exactly.

### Validation rules

The importer rejects ZIPs that fail any of the following checks:

| Rule | Requirement |
|---|---|
| `plugin.json` present | ZIP must contain `plugin.json` at root |
| Valid JSON | `plugin.json` must parse without errors |
| Required fields | `id`, `name`, `version`, `pluginApiVersion`, `entryPoint` must all be present strings |
| API version | `pluginApiVersion` must equal `"1"` |
| Entry point present | The file named by `entryPoint` must exist in the ZIP |
| No duplicate ID | If a plugin with the same `id` is already installed, the user is prompted to replace or cancel |

### Building a plugin for distribution

You can use any bundler. Here is a minimal example using `esbuild`:

```bash
# Install dependencies
npm install --save-dev esbuild

# Bundle to a single file (React must be available in the Musicore host — use externals)
npx esbuild index.tsx \
  --bundle \
  --format=esm \
  --external:react \
  --external:react-dom \
  --outfile=dist/index.js

# Package
zip my-plugin.zip plugin.json dist/index.js --junk-paths
```

> React is provided by the Musicore host. Mark it external in your bundler config to avoid shipping a duplicate copy.

---

## API constraints and ESLint boundary

These rules are enforced automatically by ESLint (`frontend/eslint.config.js`).

### Permitted imports

```typescript
// ✅ Allowed — only the public API barrel
import type { MusicorePlugin, PluginContext, PluginNoteEvent } from '../../src/plugin-api/index';
```

### Forbidden imports

```typescript
// ❌ Forbidden — direct access to host internals
import { ToneAdapter } from '../../src/services/playback/ToneAdapter';
import { ScoreViewer }  from '../../src/components/ScoreViewer';
import { someUtil }     from '../../src/utils/someUtil';
```

### Forbidden direct audio access

```typescript
// ❌ Forbidden — plugins must not use Tone.js or Web Audio API directly
import * as Tone from 'tone';
const ctx = new AudioContext();
```

Use `context.playNote()` instead. The host manages the audio engine (Tone.js + Salamander Grand Piano samples) and enforces a single, shared AudioContext.

### Constitution Principle VI

`PluginNoteEvent` carries **musical data only** (`midiNote`, `timestamp`, `velocity`). Never add coordinate or layout fields — the WASM engine is the sole authority over all spatial layout.

---

## Testing your plugin

Write Vitest tests alongside your component. Mock `PluginContext` to keep tests fast and isolated:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MyPlugin } from './MyPlugin';
import type { PluginContext, PluginManifest } from '../../src/plugin-api/index';

function makeContext(
  emitNote = vi.fn(),
  playNote = vi.fn(),
): PluginContext {
  const manifest: PluginManifest = {
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    pluginApiVersion: '1',
    entryPoint: 'index.js',
    origin: 'builtin',
  };
  return { emitNote, playNote, manifest };
}

describe('MyPlugin', () => {
  let context: PluginContext;

  beforeEach(() => {
    context = makeContext();
  });

  it('calls playNote with type:attack when button is pressed', () => {
    render(<MyPlugin context={context} />);
    fireEvent.mouseDown(document.querySelector('button')!);
    expect(context.playNote).toHaveBeenCalledWith(
      expect.objectContaining({ midiNote: 60, type: 'attack' }),
    );
  });
});
```

Run the plugin tests:

```bash
cd frontend
npx vitest run plugins/my-plugin/
```

---

## Reference: Virtual Keyboard plugin

The Virtual Keyboard (`frontend/plugins/virtual-keyboard/`) is the canonical reference implementation. It demonstrates:

- Module-level `PluginContext` storage and injection into the React tree
- `context.playNote()` for attack/release audio via the host engine
- `context.emitNote()` to send note data to the WASM layout pipeline
- `useEffect` unmount cleanup to release held notes when navigating away
- A full Vitest test suite covering layout, MIDI mapping, and API calls
