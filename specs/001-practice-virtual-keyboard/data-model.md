# Data Model: Virtual Keyboard in Practice View

**Branch**: `001-practice-virtual-keyboard` | **Date**: 2026-03-01

No new persistent entities. This feature extends existing in-memory state within the Practice plugin only.

---

## Extended Entity: InputSource

**Current type** (PracticePlugin.tsx):
```ts
type InputSource = 'midi' | 'mic' | null;
```

**Extended type** (this feature):
```ts
type InputSource = 'midi' | 'mic' | 'virtual-keyboard' | null;
```

| Value | Meaning |
|-------|---------|
| `'midi'` | A physical MIDI device is connected and has sent at least one note event |
| `'mic'` | Microphone pitch detection is active and has detected at least one note |
| `'virtual-keyboard'` | The on-screen virtual keyboard panel is open and is the active note input source |
| `null` | No input source detected yet (initial state on load) |

**Relationships**:
- `inputSource` and `virtualKeyboardOpen` are correlated: when `virtualKeyboardOpen` becomes `true`, `inputSource` is set to `'virtual-keyboard'`. When `virtualKeyboardOpen` becomes `false`, `inputSource` is restored to the previous physical source (or `null`).
- Only one value is active at a time (mutual exclusion).

**State transitions**:

```
null / 'mic' / 'midi'
      │
      │  user taps keyboard toggle icon (opens panel)
      ▼
'virtual-keyboard'
      │
      │  user taps keyboard toggle icon (closes panel)
      ▼
previous physical source (or null)
```

---

## New In-Memory State: VirtualKeyboardOpen

| Field | Type | Default | Scope |
|-------|------|---------|-------|
| `virtualKeyboardOpen` | `boolean` | `false` | PracticePlugin component state |

- Resets to `false` on every plugin mount (FR-009 — no session persistence).
- Controls visibility of the `PracticeVirtualKeyboard` panel.
- Setting this to `true` triggers the `inputSource → 'virtual-keyboard'` transition.

---

## New In-Memory State: OctaveShift (in PracticeVirtualKeyboard)

| Field | Type | Default | Min | Max | Scope |
|-------|------|---------|-----|-----|-------|
| `octaveShift` | `number` (integer) | `0` | `-2` | `+2` | PracticeVirtualKeyboard component state |

- Resets to `0` on every mount (panel open).
- Controls which two-octave range is displayed.
- `shift = 0` → C3–B4 (MIDI 48–71)
- `shift = +1` → C4–B5 (MIDI 60–83)
- `shift = +2` → C5–B6 (MIDI 72–95)
- `shift = -1` → C2–B3 (MIDI 36–59)
- `shift = -2` → C1–B2 (MIDI 24–47)

---

## New In-Memory State: PressedKeys (in PracticeVirtualKeyboard)

| Field | Type | Default | Scope |
|-------|------|---------|-------|
| `pressedKeys` | `Set<number>` (MIDI note numbers) | `new Set()` | PracticeVirtualKeyboard component state |

- A MIDI note number is added on key down; removed on key up.
- Drives the visual pressed/highlight state of individual keys.
- Cleared on unmount via cleanup effect (releases any sustained notes via `context.playNote(..., type: 'release')`).

---

## No New Persistent Entities

This feature introduces no new data that is stored in IndexedDB, localStorage, sessionStorage, or any backend. All state is ephemeral and lives only in React component state for the duration of the plugin session.

---

## Validation Rules

| Rule | Description |
|------|-------------|
| `octaveShift` bounds | Must be in `[-2, +2]`; Up button disabled at `+2`, Down button disabled at `-2` |
| `pressedKeys` note range | Must be within the currently displayed two-octave window (`baseNote + octaveShift*12` to `baseNote + octaveShift*12 + 23`) |
| `inputSource` mutual exclusion | Exactly one source active at a time; no concurrent mic+keyboard or MIDI+keyboard |
