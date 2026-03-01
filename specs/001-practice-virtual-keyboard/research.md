# Research: Virtual Keyboard in Practice View

**Branch**: `001-practice-virtual-keyboard` | **Date**: 2026-03-01  
**Status**: Complete — all NEEDS CLARIFICATION items resolved

---

## R-001: InputSource extension pattern

**Question**: How should the existing `inputSource` state (`'midi' | 'mic' | null`) in `PracticePlugin.tsx` be extended to support `'virtual-keyboard'`?

**Decision**: Add `'virtual-keyboard'` to the union type. No new state variable is needed — `virtualKeyboardOpen` and `inputSource` together capture the full state:

- `virtualKeyboardOpen: boolean` — driven purely by the toggle button; controls panel visibility.
- `inputSource: 'midi' | 'mic' | 'virtual-keyboard' | null` — set to `'virtual-keyboard'` when the panel opens; restored to the previous physical source when the panel closes.

**Rationale**: The existing pattern already uses a ref (`inputSourceRef`) alongside the state value so that closures inside mic/MIDI subscriptions can read the current source without stale captures. Extending the union requires zero structural changes — only the type annotation and the guard conditions inside the subscription handlers change.

**Alternatives considered**: A separate `useVirtualKeyboard` boolean state — rejected because it duplicates the information already expressed by `inputSource`. Two sources of truth create synchronisation bugs.

---

## R-002: Cross-plugin keyboard component reuse

**Question**: Can the existing `VirtualKeyboard.tsx` component (in `frontend/plugins/virtual-keyboard/`) be imported and reused inside the Practice plugin?

**Decision**: No. Cross-plugin imports violate the plugin isolation boundary enforced by ESLint in this project. A dedicated `PracticeVirtualKeyboard.tsx` must be created inside `frontend/plugins/practice-view/`.

**Rationale**: The `virtual-keyboard/` plugin is an independent deployable unit. Importing from it would couple the Practice plugin's build to the Virtual Keyboard plugin's internal structure, break the plugin isolation model, and cause circular dependency risks.

**Alternatives considered**: Extracting shared keyboard code to `frontend/src/components/` — possible in principle, but the keyboard rendering logic is tightly scoped to use input only (no staff, no score pipeline) and would be the only consumer at this stage. Premature extraction increases maintenance surface. Can be revisited if a third consumer emerges.

**Implementation note**: `PracticeVirtualKeyboard.tsx` mirrors the key layout, touch/mouse guard pattern, and visual conventions of `VirtualKeyboard.tsx` but replaces `context.emitNote` with the parent's `onKeyDown`/`onKeyUp` callbacks. Audio playback (`context.playNote`) is passed through via the same `context` prop.

---

## R-003: Note routing from virtual keyboard to practice scorer

**Question**: How do virtual keyboard key presses reach the exercise scoring pipeline?

**Decision**: Route through the same handler path as `context.midi.subscribe` events. The MIDI subscription handler (line 385 of `PracticePlugin.tsx`) receives a `PluginNoteEvent` with a `midiNote` integer and processes it for scoring. Virtual keyboard taps call the same handler directly — no new pathway needed.

**Rationale**: The MIDI path already handles:
- Step-mode note matching (`handleStepInputRef`)
- Flow-mode note capture via `captureRef`
- Auto-start on first note in `ready` phase
- Timestamp-based onset recording

All of these behaviours apply identically when the input is an on-screen key vs. a physical MIDI key. Reusing the same handler path means behaviour is identical by construction (FR-012 satisfied automatically).

**Alternatives considered**: Routing through a synthetic `PluginPitchEvent` (mic path) — rejected because the mic path applies Hz-to-MIDI conversion, confidence filtering, and debounce logic (PITCH_STABLE_FRAMES / SILENCE_STABLE_FRAMES) that are inappropriate for discrete key-press events, which have no confidence ambiguity and must be captured immediately on press.

---

## R-004: Mic/MIDI suspension when virtual keyboard is active

**Question**: How are mic and MIDI subscriptions suspended when the virtual keyboard panel is open?

**Decision**: Guard-check at the top of each subscription handler, identical to the existing MIDI/mic priority guard already in the code.

Existing guard (mic handler, line 281):
```ts
if (inputSourceRef.current === 'midi') return;
```

New guard (same pattern, extended):
```ts
if (inputSourceRef.current === 'midi' || inputSourceRef.current === 'virtual-keyboard') return;
```

The MIDI handler at line 395 similarly sets `inputSourceRef.current = 'midi'` — it will now also short-circuit if `inputSourceRef.current === 'virtual-keyboard'`:
```ts
if (inputSourceRef.current === 'virtual-keyboard') return;
```

**Rationale**: Subscriptions remain open (no unsubscribe/resubscribe cycle needed), which avoids AudioWorklet teardown/reinit overhead. Events are simply ignored when the virtual keyboard is active. This is the same approach already used for MIDI/mic priority.

**Alternatives considered**: Unsubscribing from mic/MIDI on toggle and resubscribing on close — rejected because subscription setup has side effects (getUserMedia permission, MIDI access request) and teardown/reinit paths introduce latency and potential permission re-prompt race conditions.

---

## R-005: Octave shift controls

**Question**: What are the bounds and default for octave shifting in `PracticeVirtualKeyboard`?

**Decision**:
- Default display: C3–B4 (two octaves, MIDI 48–71) — matches `VirtualKeyboard.tsx` exactly.
- Shift step: 1 octave per button press.
- Lower bound: C1 (shift = −2, effectively displaying C1–B2, MIDI 24–47).
- Upper bound: C5 (shift = +2, effectively displaying C5–B6, MIDI 72–95).
- State: `octaveShift: number` in `[−2, +2]` inside the component. Resets to 0 on unmount/reopen.

**Rationale**: ±2 octave bounds match the Virtual Keyboard Pro spec (032) for consistency. The two-octave window covers the most common practice range (C3–C5) at shift=0. Up/Down buttons disable at the limits.

---

## R-006: Audio playback during exercise

**Question**: Do key taps produce sound always, or only outside an active exercise?

**Decision**: Always audible — `context.playNote()` is called on every key press regardless of exercise phase (confirmed in clarification session, Q2).

**Implementation**: The `PracticeVirtualKeyboard` component calls `context.playNote({ midiNote, timestamp, type: 'attack' })` directly on key down, and `context.playNote({ midiNote, timestamp, type: 'release' })` on key up. The parent `PracticePlugin` does NOT gate audio — the component fires it unconditionally.

---

## R-007: Exercise start trigger compatibility

**Decision**: No change needed. The virtual keyboard routes through the MIDI capture handler, which already implements auto-start on the first note in `ready` phase. The Play button path is also unchanged.

**Confirmed in clarification Q4**: exercise start trigger is identical regardless of input source.

---

## R-008: Touch target compliance

**Decision**: Minimum 44×44 px touch targets required (Constitution §III). White keys are already `WHITE_KEY_WIDTH = 44px` wide in `VirtualKeyboard.tsx`. The same constant is applied in `PracticeVirtualKeyboard.tsx`. Key height is set to ≥ 80 px (white) and ≥ 50 px (black) to exceed the 44 px minimum.

---

## Summary: All unknowns resolved

| Item | Decision |
|------|----------|
| InputSource type | Extend union to include `'virtual-keyboard'` |
| Keyboard component | New `PracticeVirtualKeyboard.tsx` inside `practice-view/` (no cross-plugin import) |
| Note routing | Via MIDI capture handler (not mic path) |
| Mic/MIDI suspension | Guard clause on `inputSourceRef.current === 'virtual-keyboard'` |
| Octave shift | ±2 octave bounds, 1-octave steps, default C3–B4 |
| Audio feedback | Always audible via `context.playNote()` |
| Exercise start | Unchanged — same trigger regardless of source |
| Touch targets | 44 px white key width, ≥ 80 px height |
