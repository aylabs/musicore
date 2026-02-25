# Data Model: Plugin Architecture

**Branch**: `030-plugin-architecture` | **Date**: 2026-02-25

---

## Entities

### PluginManifest

The descriptor bundled with every plugin. Stored in IndexedDB (`manifests` object store) for imported plugins; loaded directly at build time for built-in plugins.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ | Unique plugin identifier, URL-safe (e.g. `virtual-keyboard`). Serves as the primary key. |
| `name` | `string` | ✅ | Human-readable display name (e.g. `"Virtual Keyboard"`). Shown in navigation and plugin list. |
| `version` | `string` | ✅ | SemVer string (e.g. `"1.0.0"`). Displayed in the plugin list; used in overwrite confirmation prompt (FR-018). |
| `pluginApiVersion` | `string` | ✅ | Minimum Musicore Plugin API version required (e.g. `"1"`). Validated against current app API version during import (FR-019). |
| `entryPoint` | `string` | ✅ | Path to the plugin's main JS/TS entry file within the ZIP package (e.g. `"index.js"`). |
| `description` | `string` | ❌ | Optional short description for display in the plugin list. |
| `origin` | `"builtin" \| "imported"` | — | Set by the registry (not present in the ZIP manifest); `"builtin"` for repo plugins, `"imported"` for user-installed. |

**Validation rules** (FR-009):
- `id` must match pattern `/^[a-z0-9-]+$/` (lowercase alphanumeric + hyphens)
- `version` must be a valid SemVer string
- `pluginApiVersion` must be a non-empty string parseable as a positive integer
- `entryPoint` file must exist within the ZIP (`files[entryPoint]` is defined)
- Package ZIP uncompressed size must not exceed 5 MB (FR-021)

---

### PluginRegistryEntry

The runtime record in the Plugin Registry. Combines the manifest with runtime metadata.

| Field | Type | Description |
|-------|------|-------------|
| `manifest` | `PluginManifest` | The plugin's descriptor. |
| `component` | `React.ComponentType` | The plugin's root view component (resolved at build time for builtins; dynamically loaded for imported plugins). |
| `installedAt` | `Date` | ISO timestamp of installation. Stored in IndexedDB for imported plugins. |

---

### PluginAsset

Auxiliary files bundled with an imported plugin (JS bundles, CSS, images). Stored in IndexedDB (`assets` object store) keyed by `{pluginId}/{filename}`.

| Field | Type | Description |
|-------|------|-------------|
| `pluginId` | `string` | Foreign key → `PluginManifest.id` |
| `name` | `string` | Relative path within the ZIP (e.g. `"bundle.js"`, `"styles.css"`). Combined with `pluginId` as the storage key. |
| `data` | `ArrayBuffer` | Raw file bytes. |

---

### PluginNoteEvent

The domain event emitted by a plugin (e.g. Virtual Keyboard key press) and passed to the Plugin API for notation rendering.

| Field | Type | Description |
|-------|------|-------------|
| `midiNote` | `number` | Integer MIDI note number (0–127). Middle C = 60. |
| `timestamp` | `number` | Millisecond timestamp (`Date.now()`) at the moment of the key press. |
| `velocity` | `number` | Optional MIDI velocity (1–127). Defaults to 64 if not provided. |

---

## Plugin Registry — Aggregate

`PluginRegistry` is the aggregate root for all plugin lifecycle operations.

**Invariants**:
- No two plugins may share the same `id` (overwrite requires confirmation, FR-018).
- Built-in plugins (origin `"builtin"`) cannot be overwritten or removed through the importer.
- A plugin with a `pluginApiVersion` greater than the current app's Plugin API version is never registered (FR-019).
- All imported plugin writes are atomic: manifest + assets committed together or not at all.

**State transitions**:

```
[package uploaded]
      │
      ▼
[validation] ─── fail ──► [rejected with error] ─► end
      │
     pass
      │
      ▼
[duplicate check] ─── found ──► [confirmation prompt]
      │                               │ cancel ──► end
     none                             │ confirm ──►
      │                               │
      └──────────────────────────────►│
                                      ▼
                              [write to IndexedDB]
                                      │
                                      ▼
                              [navigation entry added]
                                      │
                                      ▼
                                    [done]
```

---

## IndexedDB Schema

**Database name**: `plugin-registry`  
**Version**: `1`

| Object Store | Key Path | Description |
|---|---|---|
| `manifests` | `id` | One entry per installed imported plugin (PluginManifest + `installedAt`). |
| `assets` | `name` | One entry per asset file (`{pluginId}/{filename}`). |

Built-in plugins are held in-memory only (not written to IndexedDB).

---

## Post-Design Constitution Check (Principle VI)

`PluginNoteEvent` carries only `midiNote` (integer), `timestamp`, and `velocity`. It contains **no coordinate data** (no `x`, `y`, bounding boxes, or layout geometry). The Plugin API method `renderNote(event)` passes the note to the existing WASM `computeLayout` pipeline — the WASM engine is the sole authority over all spatial geometry. This satisfies Constitution Principle VI.
