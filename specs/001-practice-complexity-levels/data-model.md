# Data Model: Practice Complexity Levels

**Feature**: 001-practice-complexity-levels  
**Date**: 2026-03-01  
**Source**: Derived from `specs/001-practice-complexity-levels/spec.md` and `research.md`

---

## Entities

### ComplexityLevel

A named preset identifier that maps to a complete practice configuration.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `'low' \| 'mid' \| 'high'` | Immutable preset identifier; persisted to localStorage |

**Validation rules**:
- On read from localStorage: must be one of `['low', 'mid', 'high']`; otherwise default to `'low'`.

---

### ComplexityPreset

The full resolved configuration for a given `ComplexityLevel`. Immutable constants — never stored, always derived from `COMPLEXITY_PRESETS` lookup.

| Field | Type | Description |
|-------|------|-------------|
| `level` | `ComplexityLevel` | The level this preset represents |
| `displayName` | `string` | Human-readable label (e.g., "Low") |
| `description` | `string` | Short parameter summary for display in UI |
| `bpm` | `number` | Tempo for the generated exercise |
| `config` | `ExerciseConfig` | Full config passed to `generateExercise()` |

**Preset table** (source-of-truth — matches FR-002, FR-003, FR-004):

| Level | displayName | bpm | preset | noteCount | clef | octaveRange | pitch range |
|-------|-------------|-----|--------|-----------|------|-------------|-------------|
| `'low'` | `"Low"` | 40 | `'c4scale'` | 8 | `'Treble'` | 1 | C4–C5 |
| `'mid'` | `"Mid"` | 80 | `'random'` | 16 | `'Treble'` | 1 | C4–C5 |
| `'high'` | `"High"` | 100 | `'random'` | 20 | `'Bass'` | 2 | C2–C4 |

---

### PracticeConfigurationState

Runtime state in `PracticePlugin`. The active complexity level plus the derived individual parameters.

| Field | Type | Description |
|-------|------|-------------|
| `complexityLevel` | `ComplexityLevel \| null` | Active level; `null` when user has entered custom mode via Advanced panel |
| `config` | `ExerciseConfig` | Current exercise configuration (may reflect a preset or a custom override) |
| `bpmValue` | `number` | Current BPM (synced from preset or manually set) |

**State transitions**:

```
Initial load
  → read `practice-complexity-level-v1` from localStorage
  → if valid ComplexityLevel: apply corresponding preset → complexityLevel = level
  → if absent/invalid: apply Low preset → complexityLevel = 'low'

User selects level button (Low / Mid / High)
  → apply COMPLEXITY_PRESETS[level] to config + bpm
  → complexityLevel = level
  → persist level to localStorage

User changes any Advanced panel parameter (preset, noteCount, clef, octaveRange, bpm)
  → update config / bpm as before
  → complexityLevel = null   (enters custom mode)
  → localStorage unchanged   (retains last explicit level)

User re-selects a level button while in custom mode
  → resets ALL config + bpm to preset values
  → complexityLevel = level
  → persist level to localStorage
```

---

## Relationships

```
ComplexityLevel ──lookup──▶ ComplexityPreset
                               │
                               ├──▶ ExerciseConfig (existing)
                               └──▶ bpm: number

PracticeConfigurationState
  ├── complexityLevel: ComplexityLevel | null
  ├── config: ExerciseConfig
  └── bpmValue: number

localStorage['practice-complexity-level-v1']
  └── serialised as: 'low' | 'mid' | 'high'
```

---

## Storage

| Mechanism | Key | Value | Scope |
|-----------|-----|-------|-------|
| `localStorage` | `practice-complexity-level-v1` | `'low' \| 'mid' \| 'high'` | Cross-session (browser restart) |

No server-side or IndexedDB storage required. No migration needed — key is new and versioned.
