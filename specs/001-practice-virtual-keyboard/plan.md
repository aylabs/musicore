# Implementation Plan: Virtual Keyboard in Practice View

**Branch**: `001-practice-virtual-keyboard` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-practice-virtual-keyboard/spec.md`

## Summary

Add a toggle button to the Practice plugin toolbar that shows/hides an on-screen piano keyboard at the bottom of the view. When open, the virtual keyboard becomes the sole note input source (mic and MIDI are suspended); key taps are routed through the same MIDI note capture pipeline as a physical MIDI keyboard, producing audible feedback and scoring. When closed, mic/MIDI resumes. No Plugin API version bump is needed — this is entirely a Practice plugin implementation change with a new internal keyboard subcomponent (`PracticeVirtualKeyboard`).

## Technical Context

**Language/Version**: TypeScript 5.x, React 18  
**Primary Dependencies**: React, Plugin API v4 (`context.playNote`, `context.midi.subscribe`, `context.recording.subscribe`), Vitest (unit), Playwright (e2e)  
**Storage**: N/A — toggle state is session-only, no persistence (FR-009)  
**Testing**: Vitest for component/unit tests; Playwright for e2e automation  
**Target Platform**: Tablet devices (iPad, Surface, Android tablets) — Chrome/Safari/Edge; PWA offline-capable  
**Project Type**: Web application — frontend only, no backend changes  
**Performance Goals**: Toggle response ≤ 300 ms (SC-002); 60 fps rendering; 44×44 px minimum touch targets (Constitution §III)  
**Constraints**: Plugin boundary rule — Practice plugin MUST NOT import from other plugin directories; keyboard component lives inside `frontend/plugins/practice-view/`. No coordinate calculations in component (Constitution Principle VI).  
**Scale/Scope**: Single plugin (Practice plugin), two new source files + modifications to two existing files + one new e2e spec

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Domain-Driven Design | `InputSource` is a domain concept; `'virtual-keyboard'` is a first-class value alongside `'midi'` and `'mic'` in the union type | ✅ PASS |
| II. Hexagonal Architecture | Backend untouched; all changes are in the frontend plugin layer | ✅ PASS |
| III. PWA Architecture | Feature is client-side only; works offline; touch targets ≥ 44×44 px | ✅ PASS |
| IV. Precision & Fidelity | No timing changes; MIDI note integers pass unchanged through the existing capture pipeline | ✅ PASS |
| V. Test-First Development | Unit tests for `PracticeVirtualKeyboard` + e2e tests for all SCs written before implementation | ✅ PASS (required) |
| VI. Layout Engine Authority | Keyboard component emits only `midiNote` integers — no coordinate math anywhere | ✅ PASS |
| VII. Regression Prevention | Regression test mandate applies to any bugs discovered during implementation | ✅ PASS |

**Verdict: No violations. Proceed.**

## Project Structure

### Documentation (this feature)

```text
specs/001-practice-virtual-keyboard/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── input-source.ts  ← Phase 1 output (InputSource type contract)
└── tasks.md             ← Phase 2 output (created by /speckit.tasks — NOT this command)
```

### Source Code

```text
frontend/
├── plugins/
│   └── practice-view/
│       ├── PracticePlugin.tsx               ← MODIFIED
│       │     • inputSource type: add 'virtual-keyboard'
│       │     • keyboard toggle button in header near Mic/MIDI badge
│       │     • virtualKeyboardOpen boolean state
│       │     • mic subscription: skip events when source is 'virtual-keyboard'
│       │     • MIDI subscription: skip events when source is 'virtual-keyboard'
│       │     • embed <PracticeVirtualKeyboard> at bottom of view
│       │     • handleVirtualKeyDown/Up: route through MIDI capture path +
│       │       context.playNote for audio
│       ├── PracticePlugin.css               ← MODIFIED (keyboard panel layout)
│       ├── PracticeVirtualKeyboard.tsx      ← NEW
│       │     • Props: onKeyDown(midi, timestamp), onKeyUp(midi, attackedAt),
│       │               context (for context.playNote audio only)
│       │     • Renders two-octave piano keyboard (C3–B4 default, matching
│       │       the built-in Virtual Keyboard plugin)
│       │     • Octave Up/Down shift controls (±2 octave limit)
│       │     • Touch + mouse handlers (same guard pattern as VirtualKeyboard.tsx)
│       │     • pressedKeys visual state (highlight on hold)
│       │     • NO staff viewer, NO context.emitNote (scoring is parent's job)
│       ├── PracticeVirtualKeyboard.css      ← NEW (key styles, octave controls)
│       └── PracticeVirtualKeyboard.test.tsx ← NEW (unit: render, key press,
│                                               octave shift, touch/mouse guard)
└── e2e/
    └── practice-virtual-keyboard.spec.ts   ← NEW
          • SC-001: complete exercise end-to-end via virtual keyboard only
          • SC-002: toggle response < 300 ms
          • SC-004: exercise config preserved after source toggle
          • SC-005: active input source is visually unambiguous
```

**Structure Decision**: Frontend only — `practice-view/` plugin directory. `PracticeVirtualKeyboard` lives inside `practice-view/` to respect the cross-plugin import boundary; it mirrors conventions but does not import from `virtual-keyboard/`.

## Complexity Tracking

> No Constitution violations to justify.
