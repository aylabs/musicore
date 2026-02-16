# Data Model: Display Improvements

**Feature**: 022-display-improvements  
**Date**: 2026-02-16

## Entities

### 1. MusicXMLDocument (Backend — Modified)

**File**: `backend/src/domain/importers/musicxml/types.rs`

Represents the parsed state of a MusicXML file. Extended with title metadata fields.

| Field | Type | Description |
|-------|------|-------------|
| version | `String` | MusicXML version (existing) |
| encoding | `Option<String>` | File encoding (existing) |
| parts | `Vec<MusicXMLPart>` | Parsed parts (existing) |
| default_tempo | `Option<f64>` | Default tempo from direction elements (existing) |
| part_names | `HashMap<String, String>` | Part ID → name mapping (existing) |
| **work_title** | `Option<String>` | **NEW** — Title from `<work>/<work-title>` element |
| **movement_title** | `Option<String>` | **NEW** — Title from `<movement-title>` element |
| **composer** | `Option<String>` | **NEW** — Composer from `<identification>/<creator type="composer">` |

**Validation rules**:
- All new fields default to `None`
- Title strings are trimmed of whitespace
- Empty strings after trimming are treated as `None`

### 2. ImportMetadata (Shared — Backend & Frontend)

**Files**: `backend/src/ports/importers.rs`, `frontend/src/services/import/MusicXMLImportService.ts`

Carries metadata about an import operation. Already has `work_title` and `composer` fields (currently always `None`).

| Field | Type | Description |
|-------|------|-------------|
| format | `String` | Import format, e.g. "MusicXML" (existing) |
| file_name | `Option<String>` | Original filename (existing) |
| work_title | `Option<String>` | Resolved title: work_title or movement_title (existing, now populated) |
| composer | `Option<String>` | Composer name (existing, now populated) |

**Title resolution rule** (applied in `mod.rs` and `bindings.rs`):
```
work_title = doc.work_title.or(doc.movement_title)
```

### 3. PlaybackState (Frontend — Modified)

**File**: `frontend/src/services/playback/MusicTimeline.ts`

Return type of the `usePlayback` hook. Extended with total duration for timer display.

| Field | Type | Description |
|-------|------|-------------|
| status | `PlaybackStatus` | Current playback state (existing) |
| currentTick | `number` | Current playback position in ticks (existing) |
| error | `string \| null` | Error message (existing) |
| **totalDurationTicks** | `number` | **NEW** — Total score duration in ticks |
| play | `() => Promise<void>` | Start/resume playback (existing) |
| pause | `() => void` | Pause playback (existing) |
| stop | `() => void` | Stop playback (existing) |
| seekToTick | `(tick: number) => void` | Seek to position (existing) |
| unpinStartTick | `() => void` | Unpin start position (existing) |

**Calculation**:
```
totalDurationTicks = max(notes.map(n => n.start_tick + n.duration_ticks))
```
If no notes, `totalDurationTicks = 0`.

### 4. Score Title State (Frontend — New State)

**File**: `frontend/src/components/ScoreViewer.tsx` (component state)

A simple string stored in component state, derived from import metadata.

| Field | Type | Description |
|-------|------|-------------|
| scoreTitle | `string \| null` | Display title for the current score |

**Resolution rule** (applied in `handleMusicXMLImport`):
```
scoreTitle = metadata.work_title ?? stripExtension(metadata.file_name) ?? null
```

### 5. WasmImportResult (Frontend — Modified)

**File**: `frontend/src/services/wasm/music-engine.ts`

TypeScript interface for the WASM import function result. Needs `metadata` field added.

| Field | Type | Description |
|-------|------|-------------|
| score | `Score` | Parsed score (existing) |
| statistics | `ImportStatistics` | Import statistics (existing) |
| warnings | `ImportWarning[]` | Import warnings (existing) |
| partial_import | `boolean` | Whether import was partial (existing) |
| **metadata** | `ImportMetadata` | **NEW** — Import metadata including title |

## Relationships

```
MusicXML File
  └─ (parsed by) MusicXMLParser
      └─ MusicXMLDocument { work_title, movement_title, composer }
          └─ (converted to) ImportMetadata { work_title, composer }
              └─ (serialized via) WasmImportResult { metadata }
                  └─ (consumed by) MusicXMLImportService
                      └─ (sets) scoreTitle state in ScoreViewer

Score { notes: Note[] }
  └─ (consumed by) usePlayback hook
      └─ PlaybackState { currentTick, totalDurationTicks }
          └─ (rendered by) PlaybackTimer component
              └─ "1:23 / 4:05"
```

## State Transitions

### Playback Timer State

```
STOPPED → PLAYING → PAUSED → PLAYING → STOPPED
  0:00      1:23     1:23      1:24     0:00
 /T:TT    /T:TT    /T:TT     /T:TT    /T:TT
```

- **STOPPED**: elapsed = 0, total = calculated from notes + tempo
- **PLAYING**: elapsed increments in real time (derived from `currentTick` and `ticksToSeconds`)
- **PAUSED**: elapsed frozen at last `currentTick` value
- **Tempo change**: total recalculates (total = `ticksToSeconds(totalDurationTicks, tempo) / tempoMultiplier`)
