# Research: Virtual Keyboard Pro Plugin

**Feature**: 032-virtual-keyboard-pro
**Date**: 2026-02-27
**Status**: Complete — no NEEDS CLARIFICATION items remain

---

## R-001: Bundler for external plugin

**Question**: What bundler should produce the single-file `index.js` for the importable ZIP?

**Decision**: **esbuild**

**Rationale**: PLUGINS.md documents esbuild as the canonical example for external plugin packaging. It is fast, has minimal configuration for single-file ESM output, handles TSX natively with the `--loader:.tsx=tsx` flag or via `esbuild.config.js`, and is already present in the Musicore ecosystem (used by the frontend build). The plugin is small (<500 lines), so no advanced bundling features (code splitting, tree shaking of multiple entry points) are needed.

**Key esbuild flags**:
```bash
npx esbuild index.tsx \
  --bundle \
  --format=esm \
  --loader:.tsx=tsx \
  --external:react \
  --external:react-dom \
  --outfile=dist/index.js
```

`react` and `react-dom` are externalized because the Musicore host provides them — shipping a duplicate React copy would waste space and could cause React instance conflicts.

**Alternatives considered**:
- Rollup: More configuration overhead; no advantage for a single-file output.
- Vite library mode: Appropriate for packages, but adds Vite overhead for a self-contained plugin with its own `package.json`.
- Webpack: Heavyweight for this use case.

---

## R-002: ZIP packaging approach

**Question**: How is the distributable ZIP produced from the compiled output?

**Decision**: **bash `zip` command** in `build.sh`

**Rationale**: The ZIP must contain exactly two files at its root: `plugin.json` and `index.js` (plus optional `README.md`). The bash `zip` command with `--junk-paths` (-j) achieves this cleanly. No Node.js ZIP library is needed — keeping the build script dependency-free beyond esbuild and the TypeScript compiler.

**Build script flow**:
```bash
#!/usr/bin/env bash
set -euo pipefail
# 1. Compile TSX → dist/index.js
npx esbuild index.tsx --bundle --format=esm --loader:.tsx=tsx \
  --external:react --external:react-dom --outfile=dist/index.js
# 2. Copy required zip assets
cp plugin.json dist/plugin.json
cp README.md dist/README.md
# 3. Package
cd dist && zip -j ../../virtual-keyboard-pro.zip plugin.json index.js README.md
echo "✓ virtual-keyboard-pro.zip produced"
```

The ZIP is written one directory above `plugins-external/virtual-keyboard-pro/`, at `plugins-external/virtual-keyboard-pro.zip` — or at repo root if desired (configurable).

**Alternatives considered**:
- jszip (Node.js): Adds a runtime dependency and complicates the build script.
- npm `archiver` package: Same concern.

---

## R-003: Three-octave note definition generation

**Question**: How should the three-octave NOTES array (C3–B5) be structured, and how does octave shifting work?

**Decision**: **Static base array for C3–B5 + dynamic MIDI offset**

**Rationale**: The displayed keyboard always shows exactly three octaves (21 white keys, 15 black keys). The visual layout (which keys are black/white, which white key index a black key follows) never changes — only the MIDI pitch values shift. Therefore, a static `BASE_NOTES` array defines the layout pattern, and an `octaveOffset` integer (−2 to +2) is added to each `baseMidi` to produce the actual `midi` value at render time.

**Three-octave layout (base octave = 3, octaveOffset = 0)**:
- MIDI 48–71 (C3–B4) from the built-in plugin, extended by one octave:
- MIDI 72–83 (C5–B5) added (12 more notes: C5, C#5, D5, D#5, E5, F5, F#5, G5, G#5, A5, A#5, B5)
- Total: 36 notes (21 white, 15 black)

The `whiteKeyBefore` index for black keys remains consistent with white key position in the three-octave layout (7 white keys per octave × 3 = 21 white keys total).

**Octave shift formula**:
```typescript
const OCTAVE_SEMITONES = 12;
const actualMidi = baseMidi + octaveOffset * OCTAVE_SEMITONES;
// Label is also shifted: "C3" → "C5" when octaveOffset = +2
```

**Range bounds** (confirmed in clarifications):
- Min: octaveOffset = −2 → displayed range C1–B3 (MIDI 24–59)
- Max: octaveOffset = +2 → displayed range C5–B7 (MIDI 72–107)

**Alternatives considered**:
- Dynamically computing full `NoteDefinition[]` based on start MIDI: More complex, requires recomputing `whiteKeyBefore` indices. Not needed since layout pattern is stable.

---

## R-004: TypeScript configuration for external plugin

**Question**: How should `tsconfig.json` be configured for `plugins-external/virtual-keyboard-pro/` to get type checking without being part of the main frontend workspace?

**Decision**: **Standalone `tsconfig.json` with path alias to host Plugin API**

**Rationale**: The plugin needs type-checking against the Plugin API types (`PluginContext`, `MusicorePlugin`, etc.) but must not become part of the frontend TypeScript project. A standalone `tsconfig.json` with a `paths` entry pointing to `../../frontend/src/plugin-api/index.ts` gives full type safety during development. esbuild does not use `tsconfig.json` paths at compile time (it uses them from the TypeScript module resolution at type-check time only) — so the types are only for IDE/tsc validation, and esbuild handles the actual compilation.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "paths": {
      "../../src/plugin-api/index": ["../../frontend/src/plugin-api/index.ts"]
    }
  },
  "include": ["*.tsx", "*.ts"]
}
```

**Alternatives considered**:
- Copy Plugin API types into the plugin directory: Creates drift; types must stay canonical in `frontend/src/plugin-api/`.
- Add plugin to the frontend TypeScript project references: This would make the plugin a built-in, not an external — contrary to FR-005.

---

## R-005: Test configuration for external plugin

**Question**: How should Vitest be configured to run tests from `plugins-external/virtual-keyboard-pro/`?

**Decision**: **Minimal `vite.config.ts` with `test` section + `jsdom` environment**

**Rationale**: Vitest can be run with a `vite.config.ts` that only defines the `test` stanza, without a Vite build config. This matches the pattern used in `frontend/` (which uses `vitest.config.ts`). The test environment must be `jsdom` to support React Testing Library rendering. React/ReactDOM are resolved from the plugin's own `node_modules` (installed as devDependencies) for testing — unlike production where the host provides them.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

`vitest.setup.ts` imports `@testing-library/jest-dom` for DOM matchers.

**Alternatives considered**:
- Run tests from `frontend/` directory: Would require modifying the frontend Vitest config to include the external plugin path; violates the standalone principle.

---

## R-006: Initial empty staff state

**Question**: What does `StaffViewer` render when `notes=[]`?

**Decision**: **Pass `notes={[]}` to `StaffViewer`** — the host component renders an empty staff with clef and time signature (confirmed in clarifications Q5).

**Rationale**: The existing `VirtualKeyboard` component already follows this pattern — it initialises `playedNotes` as an empty array and passes it directly to `StaffViewer`. No special handling is needed. The empty staff is the default host behaviour.

**Implementation**: `const [playedNotes, setPlayedNotes] = useState<PluginNoteEvent[]>([]);` — same as built-in Virtual Keyboard.

---

## R-007: MIDI hardware integration for three-octave range

**Question**: How should the MIDI hardware subscription filter notes for the extended range, including octave shifting?

**Decision**: **Filter incoming MIDI events to the current displayed MIDI range**

**Rationale**: The built-in Virtual Keyboard ignores MIDI notes outside its two-octave range (MIDI 48–71). The Pro plugin should apply the same pattern but to the current range (which varies with octave shift). Only notes whose `midiNote` falls within `[baseMinMidi + offset*12, baseMaxMidi + offset*12]` are acted upon. Out-of-range MIDI notes are silently ignored (matching edge case resolution in spec).

```typescript
useEffect(() => {
  return context.midi.subscribe((event) => {
    const note = visibleNotes.find(n => n.midi === event.midiNote);
    if (!note) return; // out of current range — silently ignore
    if (event.type === 'release') handleKeyUp(event.midiNote);
    else handleKeyDown(note);
  });
}, [context, visibleNotes, handleKeyDown, handleKeyUp]);
```

`visibleNotes` is a `useMemo` derived from the static `BASE_NOTES` array + current `octaveOffset`.

---

## R-008: Note label toggle — rendering strategy

**Question**: How should note labels be rendered on keys when the toggle is active?

**Decision**: **Conditional text node inside each key `div`** — same rendering strategy as the built-in plugin's `C` label on white key roots

**Rationale**: The built-in Virtual Keyboard already renders `note.label.startsWith('C') ? note.label : ''` as a text child of each white key div. The Pro plugin extends this to all keys (white and black) when `showLabels` is true. For black keys, the label needs to be sized appropriately (smaller font). Since this is a CSS change, no state shape change is needed — just a boolean `showLabels` state controlling a CSS class.

```tsx
<div className={`key key--white${pressed ? ' key--pressed' : ''}${showLabels ? ' key--labeled' : ''}`}>
  {showLabels ? note.label : (note.label.startsWith('C') ? note.label : '')}
</div>
```

For black keys when labels are shown: the label is shown inside the black key div, styled to fit.
