# Quickstart: Virtual Keyboard in Practice View

**Branch**: `001-practice-virtual-keyboard` | **Date**: 2026-03-01  
**For**: Implementer onboarding — get oriented in < 5 minutes.

---

## What this feature adds

A **keyboard icon toggle** in the Practice plugin toolbar. Tapping it opens an on-screen piano keyboard at the bottom of the view. While open:
- The on-screen keyboard is the sole note input (mic and MIDI are suspended).
- Every key tap is audible **and** scored identically to a physical MIDI keystroke.
- Octave Up/Down controls shift the displayed range by one octave at a time.

Tapping the icon again closes the keyboard and restores mic/MIDI input.

---

## Files to touch

| File | Change |
|------|--------|
| `frontend/plugins/practice-view/PracticePlugin.tsx` | Extend `InputSource`, add toggle state, guard handlers, embed keyboard |
| `frontend/plugins/practice-view/PracticePlugin.css` | Add keyboard panel layout styles |
| `frontend/plugins/practice-view/PracticeVirtualKeyboard.tsx` | **New** — keyboard component |
| `frontend/plugins/practice-view/PracticeVirtualKeyboard.css` | **New** — key styles |
| `frontend/plugins/practice-view/PracticeVirtualKeyboard.test.tsx` | **New** — unit tests |
| `frontend/e2e/practice-virtual-keyboard.spec.ts` | **New** — e2e tests |

**Do not modify**: `frontend/plugins/virtual-keyboard/` (unrelated plugin), `frontend/src/plugin-api/` (no API version bump needed), any backend files.

---

## Step-by-step implementation order

Follow **test-first** (Constitution Principle V):

### 1. Write unit tests first (`PracticeVirtualKeyboard.test.tsx`)

Before creating the component, write tests for:
- Renders white and black keys in the correct count (14 white, 10 black at default shift=0)
- `onKeyDown` callback fires with correct `midiNote` on mouse/touch press
- `onKeyUp` callback fires with correct `midiNote` on mouse/touch release
- Octave shift Up increments shift; Down decrements shift; buttons disable at limits
- Touch guard: mouse events synthesised within 500 ms of a touch event are ignored
- `context.playNote` is called attack on down and release on up

### 2. Write e2e tests (`practice-virtual-keyboard.spec.ts`)

Before implementing the toggle in `PracticePlugin.tsx`, write Playwright tests for:
- `[SC-001]` Complete a full exercise using only the virtual keyboard (no mic/MIDI)
- `[SC-002]` Toggle response time < 300 ms (measure with `Date.now()` before/after click)
- `[SC-004]` Exercise config (preset, note count) unchanged after toggle on then off
- `[SC-005]` Keyboard toggle button has visible active state when panel is open

### 3. Create `PracticeVirtualKeyboard.tsx` + `.css`

Model the component on `VirtualKeyboard.tsx` but:
- Replace `context.emitNote` calls with `props.onKeyDown(midi, timestamp)` on key down.
- On key up: call `props.onKeyUp(midi, attackedAt)` **and** `props.context.playNote(release)`.
- On key down: call `props.context.playNote(attack)` **and** `props.onKeyDown(...)`.
- Include `octaveShift` state (`-2` to `+2`) with Up/Down buttons.
- Reuse the same touch/mouse guard pattern (`lastTouchTimeRef`, `TOUCH_GUARD_MS = 500`).
- Reuse `WHITE_KEY_WIDTH = 44` and the same key layout maths for the shifted range.
- **No `StaffViewer`, no `context.emitNote`** — this component owns audio only.

### 4. Modify `PracticePlugin.tsx`

Four targeted changes:

**A. Extend InputSource type** (line ~101):
```ts
// Before:
const [inputSource, setInputSource] = useState<'midi' | 'mic' | null>(null);
const inputSourceRef = useRef<'midi' | 'mic' | null>(null);

// After:
const [inputSource, setInputSource] = useState<'midi' | 'mic' | 'virtual-keyboard' | null>(null);
const inputSourceRef = useRef<'midi' | 'mic' | 'virtual-keyboard' | null>(null);
const [virtualKeyboardOpen, setVirtualKeyboardOpen] = useState(false);
const prevPhysicalSourceRef = useRef<'midi' | 'mic' | null>(null);
```

**B. Add guard to mic subscription handler** (line ~281):
```ts
// Before:
if (inputSourceRef.current === 'midi') return;

// After:
if (inputSourceRef.current === 'midi' || inputSourceRef.current === 'virtual-keyboard') return;
```

**C. Add guard to MIDI subscription handler** (line ~385):
```ts
// At the top of the MIDI subscribe handler, before processing:
if (inputSourceRef.current === 'virtual-keyboard') return;
```

**D. Add toggle callback + keyboard panel + toggle button**:
```ts
const handleVirtualKeyboardToggle = useCallback(() => {
  setVirtualKeyboardOpen(prev => {
    const next = !prev;
    if (next) {
      // Opening: save current physical source, switch to virtual-keyboard
      prevPhysicalSourceRef.current = inputSourceRef.current as 'midi' | 'mic' | null;
      setInputSource('virtual-keyboard');
      inputSourceRef.current = 'virtual-keyboard';
    } else {
      // Closing: restore previous physical source
      const restored = prevPhysicalSourceRef.current;
      setInputSource(restored);
      inputSourceRef.current = restored;
    }
    return next;
  });
}, []);

// Key down handler — routes to MIDI capture path + audio
const handleVirtualKeyDown = useCallback((midi: number, timestamp: number) => {
  context.playNote({ midiNote: midi, timestamp, type: 'attack' });
  // feed into MIDI capture pipeline (same as context.midi.subscribe handler)
  handleMidiNoteRef.current({ midiNote: midi, timestamp, type: 'attack' });
}, [context]);

// Key up handler
const handleVirtualKeyUp = useCallback((midi: number, attackedAt: number) => {
  context.playNote({ midiNote: midi, timestamp: Date.now(), type: 'release' });
  handleMidiNoteRef.current({ midiNote: midi, timestamp: attackedAt, type: 'release' });
}, [context]);
```

> **Note**: Extract the body of the existing MIDI subscribe handler into a stable `handleMidiNoteRef` so both physical MIDI and virtual keyboard share the exact same logic path.

**E. Add toggle button near Mic/MIDI badge** (in the header/toolbar render area):
```tsx
<button
  className={`practice-plugin__vkb-toggle${virtualKeyboardOpen ? ' practice-plugin__vkb-toggle--active' : ''}`}
  onClick={handleVirtualKeyboardToggle}
  title={virtualKeyboardOpen ? 'Hide virtual keyboard' : 'Show virtual keyboard'}
  aria-label={virtualKeyboardOpen ? 'Hide virtual keyboard' : 'Show virtual keyboard'}
>
  🎹
</button>
```

**F. Render keyboard panel at the bottom of the view**:
```tsx
{virtualKeyboardOpen && (
  <div className="practice-plugin__vkb-panel">
    <PracticeVirtualKeyboard
      context={context}
      onKeyDown={handleVirtualKeyDown}
      onKeyUp={handleVirtualKeyUp}
    />
  </div>
)}
```

### 5. CSS additions (`PracticePlugin.css`)

```css
/* Toggle button — active state */
.practice-plugin__vkb-toggle--active {
  background: var(--color-accent, #4a90d9);
  color: #fff;
}

/* Suspended state indicator on Mic/MIDI badge */
.practice-mic-badge--suspended {
  opacity: 0.4;
  pointer-events: none;
}

/* Virtual keyboard panel */
.practice-plugin__vkb-panel {
  border-top: 1px solid var(--color-border, #ddd);
  padding: 8px 0;
  overflow-x: auto;
  flex-shrink: 0;
}
```

---

## Key invariants to preserve

1. **Mutual exclusion**: `inputSourceRef.current` is always exactly one of `'midi' | 'mic' | 'virtual-keyboard' | null`. Never two values simultaneously.
2. **No layout math in keyboard component**: `PracticeVirtualKeyboard` only emits MIDI integers. Black key positions use the same `blackKeyLeft()` formula as `VirtualKeyboard.tsx` (multiplication of `whiteKeyBefore * WHITE_KEY_WIDTH + 0.65 * WHITE_KEY_WIDTH`) — this is display positioning, not WASM layout geometry.
3. **Audio always fires**: `context.playNote(attack)` called on key down unconditionally, `context.playNote(release)` on key up unconditionally.
4. **Scoring path only fires during playing phase**: The shared MIDI handler already guards `if (phaseRef.current !== 'playing') return` for scoring logic.
5. **Toggle state resets on mount**: `virtualKeyboardOpen` is `useState(false)` with no sessionStorage read — resets every time the plugin view mounts.

---

## Running tests

```bash
# Unit tests
cd frontend && npx vitest run plugins/practice-view/PracticeVirtualKeyboard.test.tsx

# All practice plugin tests
cd frontend && npx vitest run plugins/practice-view/

# E2e (requires prod build + preview server)
cd frontend && VITE_BASE=/musicore/ npm run build
npx playwright test --config playwright.config.prod.ts e2e/practice-virtual-keyboard.spec.ts
```
