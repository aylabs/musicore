# Quickstart: Virtual Keyboard Pro Plugin

**Feature**: 032-virtual-keyboard-pro

This guide covers how to build, package, install, and test the Virtual Keyboard Pro plugin.

---

## Prerequisites

- Node.js 18+ and npm
- The Musicore repository cloned and `frontend/` dependencies installed
- macOS/Linux shell (build script uses bash)

---

## 1. Set up the plugin workspace

```bash
cd plugins-external/virtual-keyboard-pro
npm install
```

This installs the plugin's own dev dependencies:
- `esbuild` — compile TSX to ESM
- `typescript` — type-check only (esbuild handles compilation)
- `vitest` + `@testing-library/react` + `@testing-library/jest-dom` — testing
- `react` + `react-dom` — test runtime (externalized in production build)

---

## 2. Run the tests

Run the full test suite before building:

```bash
cd plugins-external/virtual-keyboard-pro
npx vitest run
```

All acceptance scenarios from the spec are covered. Tests are the single source of truth for correctness.

To run in watch mode during development:

```bash
npx vitest
```

---

## 3. Build the ZIP

```bash
cd plugins-external/virtual-keyboard-pro
./build.sh
```

This:
1. Compiles `index.tsx` → `dist/index.js` (bundled, ESM, React externalized)
2. Copies `plugin.json` and `README.md` into `dist/`
3. Packages `dist/plugin.json`, `dist/index.js`, and `dist/README.md` into `virtual-keyboard-pro.zip`
4. Writes the ZIP to `plugins-external/virtual-keyboard-pro.zip`

Expected output:
```
✓ virtual-keyboard-pro.zip produced (≈ XXX KB)
```

**Validation**: The ZIP must be under 5 MB and contain exactly `plugin.json`, `index.js`, and `README.md` at its root.

---

## 4. Install in Musicore

1. Start the Musicore development server: `cd frontend && npm run dev`
2. Open the app in the browser
3. Navigate to the **Import Plugin** button in the navigation bar
4. Select `plugins-external/virtual-keyboard-pro.zip`
5. Confirm the installation prompt
6. "Virtual Keyboard Pro" appears as a new navigation entry

---

## 5. Verify correct operation

After installation:

- **Empty staff on load**: Open the plugin — the staff shows only clef and time signature (no notes)
- **Extended keyboard**: Three octaves (C3–B5) are displayed by default
- **Play notes**: Press any key → note plays and appears on the staff
- **Octave shift**: Press ▲/▼ octave buttons → key labels shift; playing verifies correct pitch on staff
- **Label toggle**: Press "Show Labels" → note names appear on all keys; press again → names disappear
- **Persistence**: Close and reopen the app — "Virtual Keyboard Pro" is still listed and functional
- **Built-in unaffected**: Navigate to "Virtual Keyboard" — it still works normally

---

## 6. Type-check (optional, CI)

```bash
cd plugins-external/virtual-keyboard-pro
npx tsc --noEmit
```

This validates that the plugin imports only from the Plugin API and that all types match.

---

## 7. ZIP contents reference

```
virtual-keyboard-pro.zip
├── plugin.json     ← manifest (id, name, version, pluginApiVersion, entryPoint, description)
├── index.js        ← compiled ESM bundle (React externalized)
└── README.md       ← user-facing installation + feature summary
```

Both `plugin.json` and `index.js` must be at the ZIP root (no subdirectory). The host importer validates this.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Importer rejects: "pluginApiVersion must equal 2" | `plugin.json` has wrong API version | Set `"pluginApiVersion": "2"` |
| Importer rejects: "Entry point not found" | `entryPoint` in `plugin.json` doesn't match file in ZIP | Ensure `"entryPoint": "index.js"` and `index.js` is at ZIP root |
| Tests fail: "Cannot find module '../../src/plugin-api/index'" | `tsconfig.json` paths misconfigured | Check `paths` alias in `tsconfig.json` points to `../../frontend/src/plugin-api/index.ts` |
| ZIP >5 MB | React/ReactDOM not externalized in build | Verify `--external:react --external:react-dom` in `build.sh` |
| Staff shows nothing after playing | `context.emitNote()` not called | Ensure `emitNote` is called on key down (see `VirtualKeyboardPro.tsx`) |
