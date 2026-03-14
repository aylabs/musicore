# ADR-049-003: Frontend Framework Fitness

**Status**: Proposed  
**Date**: 2026-03-13  
**Concern Area**: Frontend Framework

## Context

Graditone is built on React 19.2.0 with TypeScript 5.x, bundled by Vite, and tested with Vitest (happy-dom) and Playwright. The frontend contains:

- **35 component files** in `frontend/src/components/` rendering interactive sheet music (SVG-based), playback controls, and plugin UIs.
- **200+ React hook invocations** across the codebase (50+ `useState`, 45+ `useRef`, 40+ `useEffect`, 35+ `useCallback`, 30+ `useMemo`, 14 custom hooks).
- **13 React-related dependencies** in `package.json` (react, react-dom, @types/react, @testing-library/react, @vitejs/plugin-react, eslint plugins, etc.).

The **plugin API** is coupled to React at its interface boundary:
- `GraditonePlugin.Component` is typed as `React.ComponentType` — every plugin must return a React component.
- 3 shared components (`StaffViewer`, `ScoreRenderer`, `ScoreSelector`) are React components exposed via `PluginContext.components`.
- 3 hook factories (`useScorePlayerContext`, `useMetronomeBridge`, `useRenderConfig`) are exported for plugin use.
- The plugin API uses **data-only props** (MIDI numbers, ticks, IDs — no coordinates or layout geometry), which is good encapsulation but still React-typed.

The rendering model is SVG-based score display with frequent re-renders during playback and scrolling. The layout engine runs in Rust/WASM and produces coordinates that React components consume for SVG rendering.

React 19 added concurrent features, `useActionState`, improved `ref` handling, and native metadata support — all compatible with Graditone's rendering patterns.

## Concern

Is React 19 the right framework for Graditone's current and projected needs, or would migrating to a lighter, faster, or more suitable alternative improve performance, developer experience, or plugin architecture?

## Alternatives Considered

### Alternative 1: Stay on React 19
- **Description**: Continue using React 19 with its concurrent features, ecosystem, and large developer community. No migration.
- **Pros**: Zero migration cost. Mature ecosystem (testing infrastructure, component libraries, extensive documentation). React 19's concurrent rendering is well-suited for the app's pattern of streaming layout updates from WASM. Plugin API remains stable — existing plugins continue working. Ubiquitous developer familiarity lowers onboarding cost for trusted-community contributors.
- **Cons**: Bundle size (~40KB gzipped for react + react-dom) is larger than alternatives. Virtual DOM diffing overhead for SVG re-renders during playback, though not observed as a bottleneck given the layout engine does the heavy computation.

### Alternative 2: Migrate to Preact
- **Description**: Replace React with Preact (~4KB gzipped), a lightweight API-compatible alternative. Use `preact/compat` for existing React component compatibility.
- **Pros**: ~36KB bundle reduction. Near-identical API — many React components work with minimal changes via `preact/compat`. Faster initial load on slow networks.
- **Cons**: `preact/compat` has edge cases with React 19 features (concurrent rendering, `useActionState`, new ref handling). Plugin API types would need updating — `React.ComponentType` → `ComponentType` from Preact. 3 shared components and 3 hook factories require testing/adjustment. Estimated migration: ~3 person-weeks. Ecosystem is smaller (fewer third-party hooks, less community support). Testing with `@testing-library/preact` requires rewriting 20+ test files.

### Alternative 3: Migrate to Solid.js
- **Description**: Replace React with Solid.js (~7KB gzipped), a fine-grained reactive framework with no Virtual DOM.
- **Pros**: Significantly faster rendering — fine-grained reactivity means only changed DOM nodes update, no diffing. Smaller bundle. Could be faster for the rapid SVG updates during playback.
- **Cons**: Completely different reactivity model — signals instead of hooks, createEffect instead of useEffect, no Virtual DOM. Every component must be rewritten. Plugin API must be completely redesigned (plugins can no longer return React components). All 200+ hook invocations must be converted. All 20+ React-based tests must be rewritten with a different testing library. Estimated migration: ~12 person-weeks.

### Alternative 4: Migrate to Svelte 5
- **Description**: Replace React with Svelte 5 (~2KB gzipped), a compiler-based framework.
- **Pros**: Smallest bundle size. Compiler-based approach eliminates runtime overhead. Svelte 5's runes model is conceptually similar to React hooks (easier migration path than Svelte 4).
- **Cons**: Compiler-based — fundamentally different from a runtime library. Every `.tsx` file becomes `.svelte`. Plugin API must be completely redesigned (no component type sharing, different lifecycle model). Plugin developers would need to learn Svelte. Estimated migration: ~15 person-weeks.

### Alternative 5: Web Components (framework-agnostic)
- **Description**: Replace React with native Web Components using Custom Elements and Shadow DOM.
- **Pros**: Zero runtime dependency. Framework-agnostic plugin API — plugins could use any framework or vanilla JS.
- **Cons**: Loses the entire React ecosystem (testing library, hooks, component patterns). Shadow DOM adds complexity for styling shared components. No concurrent rendering support. State management must be built from scratch. Estimated migration: ~20 person-weeks.

## Decision

**Selected: Alternative 1** — Stay on React 19. No migration is justified.

React 19 is well-suited for Graditone's rendering model. The SVG-based score display renders coordinates produced by the Rust/WASM layout engine — the rendering bottleneck is in the layout computation, not in React's DOM diffing. React 19's concurrent features are beneficial for streaming layout updates without blocking the UI thread.

The migration cost for any alternative is disproportionate to the benefits:
- The savings from smaller frameworks (Preact: ~36KB, Solid: ~33KB, Svelte: ~38KB) are modest against the total bundle (~200KB for the React app + ~150KB for WASM).
- Every alternative requires redesigning the plugin API (`GraditonePlugin.Component` is `React.ComponentType`), rewriting all plugins, and updating all React-based tests.
- No performance bottleneck attributable to React has been identified — rendering is layout-engine-bound.

**Migration threshold**: React migration would be justified only if (a) React were discontinued, (b) a proven, unworkable rendering performance ceiling were identified via profiling, or (c) React's licensing changed to be incompatible with the project.

## Comparison Matrix

| Criterion | Weight | React 19 (Alt 1) | Preact (Alt 2) | Solid.js (Alt 3) | Svelte 5 (Alt 4) |
|-----------|--------|-------------------|----------------|-------------------|-------------------|
| Plugin API compatibility | 0.30 | 5 (native, no change) | 3 (compat layer, edge cases) | 1 (complete rewrite) | 1 (complete rewrite) |
| Bundle size | 0.10 | 3 (~40KB gz) | 5 (~4KB gz) | 4 (~7KB gz) | 5 (~2KB gz) |
| Rendering performance | 0.15 | 4 (adequate, not bottleneck) | 4 (similar to React) | 5 (fine-grained, no VDOM) | 5 (compiled, no VDOM) |
| Migration cost | 0.20 | 5 ($0) | 3 (~3 person-weeks) | 1 (~12 person-weeks) | 1 (~15 person-weeks) |
| Ecosystem maturity | 0.15 | 5 (largest ecosystem) | 3 (smaller, compatible) | 3 (growing but smaller) | 3 (growing but smaller) |
| Developer familiarity | 0.10 | 5 (ubiquitous) | 4 (similar API) | 2 (different model) | 2 (different model) |
| **Weighted Total** | | **4.65** | **3.35** | **2.10** | **2.00** |

React 19 leads decisively due to zero migration cost and full plugin API compatibility, which together account for 50% of the weighted score.

## Consequences

### Positive
- Plugin API remains stable — all 6 built-in plugins and any imported plugins continue working without changes.
- The 20+ React-based test files continue working without rewrites.
- Developer onboarding stays simple — React is the most widely known frontend framework.
- React 19's concurrent features (transitions, Suspense) can be incrementally adopted without breaking changes.

### Negative
- Bundle size remains higher than alternatives (~40KB vs 2–7KB for the framework). This is acceptable given the total bundle includes ~150KB of WASM.
- Virtual DOM diffing overhead during rapid SVG updates (playback scrolling). Not currently a bottleneck but could become one with very large scores (100+ measures visible simultaneously).

### Neutral
- Vite bundler configuration unchanged.
- TypeScript configuration unchanged.
- Testing infrastructure (Vitest + Playwright + React Testing Library) unchanged.
- Plugin developer experience unchanged.

## Risk Assessment

1. **React performance ceiling for large scores**: If scores with 100+ visible measures cause jank during playback due to Virtual DOM diffing of hundreds of SVG elements, React could become the bottleneck. **Mitigation**: The layout engine already controls which measures are visible (viewport windowing). If needed, React's `useMemo` and `memo()` can prevent unnecessary re-renders. SVG virtualization is also possible.

2. **React ecosystem decline or discontinuation**: If Meta significantly reduces React investment, the ecosystem could stagnate. **Mitigation**: React is MIT-licensed and community-maintained. If a successor emerges, Preact (Alternative 2) provides the lowest-cost migration path (~3 person-weeks) due to API compatibility.

3. **Plugin API locks in React permanently**: As more plugins are built by trusted-community developers, the migration cost from React increases linearly. With 20+ plugins, a framework migration could cost 10+ person-weeks. **Mitigation**: The plugin API's data-only props pattern (MIDI numbers, ticks — no coordinates) limits the coupling surface. A framework-agnostic adapter layer could be added in the future if needed.

4. **React 20+ breaking changes**: Future React versions might deprecate patterns used in the plugin API (class components are already de-emphasized). **Mitigation**: The plugin API uses `ComponentType` (which covers both function and class components) — following React's migration guides for each version has historically been straightforward.

## Action Items

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-012 | Document the React migration threshold (discontinuation, proven perf ceiling, licensing change) in the project architecture guide | P2 | S (< 1 day) | none |
| AI-049-013 | Add React rendering performance profiling (React DevTools Profiler) to the pre-release checklist for large score testing (~50+ visible measures) | P2 | S (< 1 day) | none |
| AI-049-014 | Evaluate adding `React.memo()` to the 3 shared plugin components (StaffViewer, ScoreRenderer, ScoreSelector) to reduce unnecessary re-renders during playback | P3 | S (< 1 day) | none |

| ID | Description | Priority | Effort | Dependencies |
|----|-------------|----------|--------|--------------|
| AI-049-003 | [Task] | P1/P2/P3 | S/M/L/XL | [IDs or none] |
