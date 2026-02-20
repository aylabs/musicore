# Data Model: Load Score Dialog (Feature 028)

**Phase 1 — Entities, validation rules, state transitions**  
**Date**: 2026-02-20

---

## Entities

### 1. `PreloadedScore` (UI-layer DTO)

A static configuration record describing one bundled score asset.  
**Not** a domain entity — lives in the frontend data layer only.

| Field | Type | Required | Constraints |
|---|---|---|---|
| `id` | `string` | ✅ | Stable, unique, kebab-case (e.g. `beethoven-fur-elise`) |
| `displayName` | `string` | ✅ | Human-readable; shown in dialog list |
| `path` | `string` | ✅ | Absolute URL path starting with `/scores/`; must end with `.mxl` |

**Validation rules** (enforced at compile time via TypeScript; no runtime validation needed since the array is a compile-time constant):
- `id` must not be empty
- `path` must match pattern `/scores/<filename>.mxl`
- No two entries may share the same `id`

**Defined in**: `frontend/src/data/preloadedScores.ts`

---

### 2. `LoadScoreDialogState` (component-internal)

React component state for `LoadScoreDialog`. Not exported.

| Field | Type | Default | Description |
|---|---|---|---|
| `loadingId` | `string \| null` | `null` | `PreloadedScore.id` currently being fetched; `null` when idle |
| `presetError` | `string \| null` | `null` | Error message from preloaded fetch/parse; `null` when none |

**State source of truth for `open`**: owned by the parent (`ScoreViewer`) via props `open` / `onClose`. The dialog is a controlled component — it does not own its own open state.

---

## State Transitions

### Preloaded Score Load Flow

```
[IDLE]
  │  user taps PreloadedScoreItem
  ▼
[LOADING]  loadingId = score.id, presetError = null
  │  fetch(score.path)
  ├─── HTTP error / network error ──────────────────────────┐
  │  importFile(file) via useImportMusicXML                 │
  ├─── WASM parse error ──────────────────────────────────┐ │
  ▼                                                        │ │
[SUCCESS]  onImportComplete(result) called                  │ │
  │  parent calls onClose() → dialog unmounts              │ │
  │  parent calls setViewMode('layout')                    │ │
  ▼                                                        │ │
[CLOSED / score in play view, paused at tick 0]            │ │
                                                           │ │
[ERROR]  presetError = message, loadingId = null  ◄────────┘─┘
  │  user taps Retry or re-selects same entry → [LOADING]
  │  user selects different entry → [LOADING] (error cleared)
  │  user dismisses dialog → [CLOSED / original state unchanged]
```

### File-Picker (Load New Score) Flow

```
[IDLE / dialog open]
  │  user taps Load New Score
  ▼
[FILE PICKER OPEN]  (OS native; dialog remains mounted)
  │  user cancels → [IDLE] (no state change)
  │  user selects file
  ▼
[IMPORTING]  useImportMusicXML loading=true; all buttons disabled
  ├─── parse error → error shown inline; dialog stays open; [IDLE with error]
  ▼
[SUCCESS]  onImportComplete(result) called
  │  parent calls onClose() + setViewMode('layout')
  ▼
[CLOSED / score in play view, paused at tick 0]
```

---

## Not a Domain Model

These entities are purely presentational/configuration data. They do not map to any backend resource, IndexedDB store, or music domain concept (Timeline, Event, Note, etc.). The music domain model is unchanged by this feature.
