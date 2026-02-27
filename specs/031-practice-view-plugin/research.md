# Research: Practice View Plugin & Plugin API Recording Extension

## R-001: Shared microphone pitch broadcast service architecture

**Decision**: New singleton class `PluginMicBroadcaster` in `frontend/src/services/recording/PluginMicBroadcaster.ts`.

**Rationale**: Multiple plugins may subscribe to pitch events simultaneously (FR-004: one mic stream only). A singleton manages the AudioWorklet lifecycle independently of React component lifecycle — plugins are long-lived objects initialised once in App.tsx's `loadPlugins()` effect. React hooks (`usePracticeRecorder`) are not suitable for a non-React owner like the plugin context factory. The singleton:
- Opens one `getUserMedia` + AudioWorklet stream on first subscriber
- Dispatches each `detectPitch` result to all registered handler functions
- Releases mic resources when the last subscriber unsubscribes
- Exposes `subscribe(handler): () => void` and `getError(): string | null`

**Implementation sketch**:
```ts
class PluginMicBroadcaster {
  private static instance: PluginMicBroadcaster | null = null;
  static getInstance(): PluginMicBroadcaster { ... }
  subscribe(handler: (event: PluginPitchEvent) => void): () => void { ... }
  private startMic(): void { /* getUserMedia + AudioWorklet + detectPitch */ }
  private stopMic(): void { /* teardown */ }
}
```

**Alternatives considered**:
- Wrap `usePracticeRecorder` in a provider component and pass callbacks — rejected: React hook ownership doesn't work for plugin context built in a one-time effect.
- Create a new React hook `usePluginMicBroadcaster` and use it in App.tsx — viable but adds complexity at App.tsx level; a standalone singleton keeps App.tsx the same shape.
- Reuse `usePracticeRecorder` — rejected: PR-009 of the spec requires the plugin to not import it; the host needs its own service.

---

## R-002: `offsetMs` scheduled playback via ToneAdapter

**Decision**: In App.tsx `playNote` handler, when `event.offsetMs` is defined and `> 0`, schedule via `ToneAdapter.playNote(midiNote, durationSec, time)` rather than `attackNote`. When `offsetMs` is absent or `0`, keep existing `attackNote`/`releaseNote` behaviour unchanged.

**Rationale**: `ToneAdapter.playNote(pitch, duration, time)` already accepts a Tone.js `time` argument for scheduling relative to the Transport. `Date.now() + offsetMs` can be converted to a Tone.js time via `Tone.now() + offsetMs / 1000`. The Practice plugin needs to schedule all exercise notes in one go at play-start with individual `offsetMs` per note, matching the pattern already used in `PracticeView.tsx`'s `exercise.notes.forEach(note => adapter.playNote(note.midiPitch, durationSec, note.expectedOnsetMs / 1000))`.

**Default duration for attack-only events**: When `offsetMs` is used but no `event.durationMs` is provided, use a sensible default (0.5 s). When `event.durationMs` is provided, use `event.durationMs / 1000`.

**Alternatives considered**:
- Add a new `ToneAdapter.scheduleNote(pitch, offsetMs)` method — unnecessary; `playNote(pitch, duration, time)` already does this.
- Implement scheduling with `setTimeout` + `attackNote` — less accurate than Tone.js's WebAudio scheduler; rejects for timing fidelity.

---

## R-003: Per-plugin `stopPlayback()` — cancel scheduled notes

**Decision**: App.tsx maintains a `Map<pluginId, Set<Tone.Part | TimeoutId>>` of pending scheduled events per plugin. `context.stopPlayback()` for a given plugin calls `Tone.Transport.cancel()` (for Transport-scheduled notes from `ToneAdapter.playNote`) filtered to that plugin's events, plus cancels any `setTimeout`-based timers. A simpler approach: use `ToneAdapter.stopAll()` per-plugin via a per-plugin cancel token tracked in App.tsx.

**Revised Decision**: Since `ToneAdapter.stopAll()` cancels ALL scheduled notes globally (would affect other plugins), use a per-plugin `Set<ReturnType<typeof setTimeout>>` of timer handles for `offsetMs`-based notes scheduled via `setTimeout + attackNote`. The Practice plugin schedules notes only during a single exercise run; `stopPlayback()` cancels that run's timers. This keeps the approach simple and consistent with how `PracticeView` already uses `playbackTimersRef` — same pattern owned by the host per plugin.

**Revised implementation**: App.tsx stores `pluginTimersRef: Map<string, Set<ReturnType<typeof setTimeout>>>`. Each `playNote` call with `offsetMs > 0` registers its `setTimeout` handle. `stopPlayback()` clears all timers for that plugin and also calls `adapter.stopAll()` (safe since only one plugin exercises at a time; if multi-plugin concurrent playback ever needed, revisit).

**Alternatives considered**:
- Expose a Tone.js `Part` per plugin and call `.stop()` — heavier integration, requires Tone.js Transport; overkill when `setTimeout`-based scheduling is already in use throughout the codebase.

---

## R-004: Practice plugin exercise generation and scoring (plugin-internal)

**Decision**: Copy `frontend/src/services/practice/exerciseGenerator.ts` and `exerciseScorer.ts` (and their shared types from `types/practice.ts`) into `frontend/plugins/practice-view/` as plugin-internal modules. These files are not exposed through the Plugin API. The copies are de-coupled from the host to keep the plugin self-contained.

**Rationale**: The spec explicitly states "The Practice plugin owns its exercise generation and scoring logic internally" (Assumptions). Both `exerciseGenerator` and `exerciseScorer` are pure functions with no host dependencies — safe to copy. Importing them from `src/services/` would violate the Plugin API boundary (FR-011, FR-019) and be blocked by ESLint.

**Alternatives considered**:
- Expose exercise generation through the Plugin API — rejected: this would bloat the API with domain logic not relevant to other plugins.
- Import from `src/services/` with an ESLint exception — rejected: violates FR-019 and establishes a bad precedent.

---

## R-005: Removal of `PracticeView.tsx` — wiring audit

**Decision**: The following files and wiring must be removed/updated after the Practice plugin is live:

| File | Change |
|---|---|
| `frontend/src/components/practice/PracticeView.tsx` | DELETE |
| `frontend/src/components/practice/PracticeView.css` | DELETE |
| `frontend/src/components/practice/PracticeView.test.tsx` | DELETE (after tests ported) |
| `frontend/src/components/practice/ExerciseResultsView.tsx` | DELETE or move into plugin |
| `frontend/src/services/practice/usePracticeRecorder.ts` | KEEP — still used by host-side `PluginMicBroadcaster` indirectly via shared `pitchDetection.ts`; only `matchRawNotesToSlots` export needs audit |
| `frontend/src/services/practice/exerciseGenerator.ts` | KEEP in src/ (referenced by copied plugin version) |
| `frontend/src/services/practice/exerciseScorer.ts` | KEEP in src/ (referenced by copied plugin version) |
| `frontend/src/App.tsx` | Remove `showPractice` state, `handleShowPractice`, `setShowPractice` in `handleSelectPlugin`, PracticeView import and render block |
| `frontend/src/components/ScoreViewer.tsx` | Remove `onShowPractice` prop, Practice debug button |

Note: `usePracticeRecorder.ts` and `practiceLayoutAdapter.ts` can be deleted once confirmed no other file imports them (the plugin will not use them). The shared `pitchDetection.ts` must be KEPT — `PluginMicBroadcaster` depends on it.

**Regression safety**: All deletions must be preceded by confirming the equivalent test coverage lives in `frontend/plugins/practice-view/PracticePlugin.test.tsx`.

---

## R-006: Plugin API version increment strategy

**Decision**: Bump `PLUGIN_API_VERSION` from `"1"` to `"2"` in `frontend/src/plugin-api/types.ts`. Update `plugin.json` for `practice-view` to declare `"pluginApiVersion": "2"`. Leave `virtual-keyboard/plugin.json` at `"1"` — it uses no new API surface and the importer accepts packages whose version is ≤ host version.

**Rationale**: The importer already validates `parseInt(rawManifest.pluginApiVersion) <= parseInt(PLUGIN_API_VERSION)`. Setting host to `"2"` means: v1 plugins continue to work (backward compat), v2 plugins require the updated host. This matches the spec assumption and the scheme documented in feature 030.

**Alternatives considered**:
- Minor version (`"1.1"`) — rejected: existing scheme uses integer strings; fractional versions would break `parseInt` comparison logic.

---

## R-007: `context.recording.onError` design

**Decision**: `context.recording.onError(handler)` registers a one-time (or persistent) error handler called when mic access fails. On subscription, if the mic is already in an error state, the handler is called synchronously on the next microtask. Error payload is a plain `string` (human-readable message from `getUserMedia` rejection or worklet failure).

**Rationale**: Keeps the API surface minimal — no new event type needed. Consistent with how `usePracticeRecorder` exposes `micError: string | null`.

**Alternatives considered**:
- Expose an `onError` as part of the `subscribe` return value (e.g., `{unsubscribe, error$}`) — rejected: more complex shape; the separate registration mirrors the existing `midi` namespace pattern.

---

## Summary Table

| Decision | Choice | Rationale |
|---|---|---|
| Shared mic service | Singleton `PluginMicBroadcaster` class | Non-React owner, one stream, multiplexed dispatch |
| `offsetMs` scheduling | `setTimeout + attackNote` in App.tsx | Matches existing codebase pattern; no Tone.js Transport complexity |
| `stopPlayback()` scope | Per-plugin timer Set in App.tsx | Simple, isolates plugin cancellation; safe since only one plugin plays at a time |
| Exercise & scoring logic | Copy into plugin as plugin-internal modules | Plugin API boundary enforcement; pure functions safe to copy |
| `PracticeView` removal | Delete after test migration confirmed | Principle VII: tests first, then deletion |
| API version | Integer bump `"1"` → `"2"` | Matches existing importer validation logic |
| `recording.onError` | Separate registration, string payload | Minimal surface; consistent with existing error patterns |
