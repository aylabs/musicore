# ADR-049-001: Plugin Architecture Scalability

**Status**: Proposed  
**Date**: 2026-03-13  
**Concern Area**: Plugin Architecture

## Context

Graditone uses a plugin system (API v7) as its primary extensibility mechanism. The system supports two plugin categories:

- **Built-in plugins** (6 total): Discovered at build time via Vite's `import.meta.glob()` with `eager: true`. Includes 3 core plugins (Play, Train, Practice) and 3 common plugins (Guide, Virtual Keyboard, lint-test). Total plugin-related code: ~1,660 lines across `plugin-api/`, `services/plugins/`, and `App.tsx`.
- **Imported plugins**: Installed via ZIP upload, validated through a 10-step pipeline (size ≤5MB, manifest shape, API version, ID pattern, duplicate detection), stored in IndexedDB, loaded at runtime via Blob URL + dynamic `import()`.

The plugin API surface exports ~30 types and interfaces, including `PluginContext` (10 fields), shared UI components (`StaffViewer`, `ScoreRenderer`, `ScoreSelector`), and versioned features (v3: scorePlayer, v5: metronome, v7: openListDialog).

The plugin developer audience is a growing trusted community (core team plus vetted external contributors with a review process before distribution).

## Concern

Is the current plugin architecture evolving in the right direction to support a trusted-community model with 20+ simultaneously active plugins, while maintaining stability, performance, and backward compatibility?

## Alternatives Considered

### Alternative 1: Keep Current Architecture Unchanged
- **Description**: Continue with eager loading for built-in plugins, sequential `await` for imported plugins, and no error isolation in MIDI event fan-out.
- **Pros**: Zero migration cost; proven stable for current 6 built-in plugins.
- **Cons**: Bundle size grows linearly with built-in plugins (~75KB gzipped for 6, projected ~250–300KB for 20). Sequential imported plugin loading could take 1.5–3s with 15 imported plugins at ~100–200ms each (IndexedDB read + Blob URL creation + dynamic import). A single throwing MIDI handler stops all subsequent handlers — confirmed by spike test.

### Alternative 2: Lazy-Load Built-in Plugins + Parallel Imported Plugin Loading + Error Boundaries
- **Description**: Switch non-core built-in plugins from `eager: true` to lazy-loaded chunks via dynamic `import()`. Parallelize imported plugin loading with `Promise.all`. Wrap each MIDI event handler invocation in `try/catch` to isolate errors.
- **Pros**: Low implementation cost (1–2 days for lazy loading, <1 day for parallel loading, <1 hour for try/catch). High impact on initialization time and robustness. Maintains backward compatibility — no API surface changes required.
- **Cons**: Slightly more complex loading logic with lazy chunks. `Promise.all` means one plugin failure rejects all — needs `Promise.allSettled` instead. Lazy loading introduces brief flash when first opening a non-core plugin.

### Alternative 3: iframe-Based Plugin Sandboxing
- **Description**: Run each plugin in its own iframe for true security isolation with `postMessage` communication.
- **Pros**: Complete security isolation between plugins and core. One plugin cannot crash another.
- **Cons**: Breaks the React component model entirely — plugins cannot return React components, share hooks, or access shared components. Massive implementation cost. Destroys the plugin developer experience for a trusted-community model where full sandboxing is unnecessary.

### Alternative 4: Web Worker Plugins
- **Description**: Run plugin logic in Web Workers for CPU isolation.
- **Pros**: Computation isolation prevents one plugin from blocking the UI thread.
- **Cons**: Web Workers cannot access the DOM or render React components. This is incompatible with the fundamental design of the plugin API (`GraditonePlugin.Component` returns a React component). Would require a complete architecture redesign.

## Decision

**Selected: Alternative 2** — Lazy-load built-in plugins, parallelize imported plugin loading, and add error boundaries to the MIDI event fan-out.

This is the right approach because it addresses all three scaling concerns (bundle size, init time, error isolation) with minimal migration cost and zero breaking changes to the plugin API. The trusted-community security model does not require iframe sandboxing (Alternative 3), and the React-component-based plugin rendering model is incompatible with Web Workers (Alternative 4).

The current architecture's core design is sound: additive-only API versioning (v1→v7) provides strict backward compatibility, `import.meta.glob` eliminates registration boilerplate, and ESLint boundary enforcement prevents plugins from importing core internals. The identified gaps are specific performance and robustness issues, not fundamental design flaws.

## Consequences

### Positive
- Plugin initialization for 20+ plugins stays well under the 2-second budget (synthetic spike measured ~20ms for 20 plugins in synchronous init; real-world async init with parallel loading expected under 500ms).
- Bundle size grows sublinearly — only core plugins (Play, Train, Practice) remain in the main chunk; common and future plugins load on demand.
- Error isolation prevents one buggy plugin from silently breaking MIDI input for all other plugins.

### Negative
- Lazy-loaded plugins show a brief loading state on first open (mitigated by preloading on plugin selection, already implemented in `handleSelectPlugin`).
- `Promise.allSettled` for imported plugins requires handling partial failures (some plugins loaded, some failed) — need degraded-mode UI.

### Neutral
- Plugin API surface (v7) remains unchanged — no breaking changes for existing plugins.
- ZIP import validation pipeline (10 checks) remains unchanged.
- ESLint boundary enforcement continues to work as-is.

## Risk Assessment

1. **Lazy-loading breaks a core plugin**: If the Play, Train, or Practice plugin is accidentally moved to a lazy chunk, the landing screen would show a loading spinner instead of the main UI. Mitigation: keep core plugins with `eager: true`; only lazy-load common and future plugins.

2. **Parallel loading masks individual plugin failures**: With `Promise.allSettled`, one plugin failing to load would be reported in the results but the app would proceed. If users don't notice the error message, they may think a plugin is missing. Mitigation: show a persistent warning badge on the plugin manager if any imports failed.

3. **Error boundary in fan-out swallows debugging information**: Catching errors per handler means the error no longer propagates to the top level. If a plugin developer doesn't check the console, they may not notice their handler is throwing. Mitigation: log errors with `console.error` including the plugin ID and handler reference.

4. **Backward compatibility risk for imported plugins in IndexedDB**: If the loading mechanism changes from sequential to parallel, existing imported plugins stored in IndexedDB should continue to work because the loading logic (read assets → Blob URL → import) is per-plugin and order-independent. However, any plugin that depends on initialization order (e.g., reading state set by a previously-loaded plugin) would break. Mitigation: document that plugin initialization order is undefined.

## Action Items

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-001 | Switch non-core built-in plugins from `eager: true` glob to lazy-loaded dynamic `import()` chunks in `builtinPlugins.ts` | P1 | M (1–3 days) | none |
| AI-049-002 | Replace sequential `await` loop in `App.tsx` plugin loading with `Promise.allSettled` for imported plugins | P1 | S (< 1 day) | none |
| AI-049-003 | Wrap each MIDI event handler invocation in `App.tsx` fan-out with `try/catch` per handler, logging `(pluginId, error)` | P1 | S (< 1 day) | none |
| AI-049-004 | Add degraded-mode UI: show warning badge in plugin manager if any imported plugin failed to load | P2 | S (< 1 day) | AI-049-002 |
| AI-049-005 | Document that plugin initialization order is undefined (for imported plugin developers) | P2 | S (< 1 day) | none |
| AI-049-006 | Evaluate plugin lifecycle management (unload/dispose at runtime) for memory pressure with 20+ active plugins | P3 | M (1–3 days) | none |
| AI-049-007 | Create plugin developer CLI scaffolding tool for trusted-community contributors | P3 | L (1–2 weeks) | none |
