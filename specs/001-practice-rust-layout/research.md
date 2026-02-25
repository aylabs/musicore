# Research: Migrate Practice Layout to Rust Layout Engine

**Feature**: `001-practice-rust-layout`  
**Date**: 2026-02-24  
**Status**: Complete — all items resolved from codebase context

---

## 1. SourceReference → Note ID Mapping Without a Full Score

**Question**: `buildSourceToNoteIdMap` in `services/highlight/sourceMapping.ts` takes a full `Score` domain object. PracticeView only has a flat `ExerciseNote[]`. How do we build the map the `LayoutRenderer` needs?

**Decision**: Implement a standalone `buildPracticeSourceToNoteIdMap(notes: ExerciseNote[]): Map<string, string>` in a new `practiceLayoutAdapter.ts` service. For each exercise note at `slotIndex i`, the source key is:

```
"{system_index}/{instrument_id}/{staff_index}/{voice_index}/{event_index}"
= "0/practice-instrument/0/0/{i}"
```

The value is the note's stable id: `"ex-{i}"`.

**Rationale**: The practice view serializes all notes into a single instrument (`id: "practice-instrument"`), single staff (index 0), single voice (index 0), single system (index 0). The `event_index` in the glyph's `SourceReference` equals the note's position in the serialized voice array — which is `slotIndex`. This is deterministic and requires no async lookup.

**Code reference**: `createSourceKey()` in `services/highlight/sourceMapping.ts` — the format `"{system_index}/{instrument_id}/{staff_index}/{voice_index}/{event_index}"` is validated by its unit tests.

**Alternatives considered**:
- Reusing `buildSourceToNoteIdMap(score, layout)` by constructing a mock `Score` object — rejected: coupling to the full Score domain type for a synthetic object is fragile and misleading.
- Letting `LayoutRenderer` work without `sourceToNoteIdMap` — rejected: without the map, `highlightedNoteIds` cannot be matched to glyphs during rendering.

---

## 2. Guaranteed Single-System Layout (max_system_width)

**Question**: The practice staff must never line-wrap. What `max_system_width` value ensures all 8–20 quarter notes render in a single system?

**Decision**: Use a fixed `max_system_width = 99999` (logical units) for the practice staff layout call, unconditionally bypassing the system-break algorithm.

**Rationale**: A 20-note exercise at the Rust engine's default `units_per_space = 10` and typical note spacing produces a single-system width well below 1000 logical units. Setting `max_system_width = 99999` is safe, deterministic, and avoids the need to measure container width before the first layout call. This differs from `LayoutView`'s approach (which must break long scores into multiple systems) because the practice view has a fixed, small note count.

**For auto-scroll**: The `max_system_width` strategy means `layout.systems` always has exactly one element. This simplifies all glyph-tree iteration (always use `systems[0]`).

**Alternatives considered**:
- Derive `max_system_width` from container pixel width (same as `LayoutView`) — rejected: adds complexity (ResizeObserver) for no benefit when the note count is capped at 20.
- Assert `layout.systems.length === 1` after layout and throw if violated — retained as a dev-mode assertion.

---

## 3. Auto-Scroll: Finding a Note Glyph's x-Position in GlobalLayout

**Question**: `PracticeView` currently reads `exerciseLayout.notes[highlightedSlotIndex].x` directly from `NotationLayoutEngine`'s output. How does it locate the same x-position in a `GlobalLayout`?

**Decision**: Implement `findPracticeNoteX(layout: GlobalLayout, slotIndex: number): number | null` that walks `layout.systems[0].staff_groups[0].staves[0].glyph_runs` and returns `glyph.position.x` for the first glyph whose `source_reference.event_index === slotIndex`. Convert logical units to CSS pixels via `x * BASE_SCALE` (where `BASE_SCALE = 0.5` as used by `LayoutView`).

**Rationale**: Every note notehead in a glyph run carries a `source_reference` that includes `event_index` (the 0-based position in the serialized voice array). Since exercise notes are serialized in slot order, `event_index === slotIndex` is a reliable lookup key. Returns `null` gracefully if the index is not found (edge case: empty layout, mid-reset).

**Code reference**: `Glyph.source_reference: SourceReference` in `wasm/layout.ts`; `BASE_SCALE = 0.5` constant in `components/layout/LayoutView.tsx`.

**Alternatives considered**:
- Build a `tick → x` lookup from the glyph tree (tick = `slotIndex * 960`) — viable but requires iterating both glyph runs and matching ticks, which the Rust engine does not expose on `Glyph` directly. `event_index` is simpler.
- Store glyph x-positions in a React ref updated after each render — rejected: duplicates data already available in the `GlobalLayout` object.

---

## 4. Response Note Serialization for WASM Layout

**Question**: `ResponseNote` contains `hz`, `midiCents`, `onsetMs`, `confidence`. How are these mapped to the `{ tick, duration, pitch }` schema the Rust layout engine expects?

**Decision**: For display purposes only, serialize each matched response note at the same `tick` as its exercise slot:

```typescript
tick:     slotIndex * 960            // same position as exercise staff
pitch:    Math.round(midiCents / 100) // integer MIDI note from fractional cents
duration: 960                         // all displayed as quarter notes
```

Unmatched/missed slots are represented as rests — however, since the Rust engine ignores rests (no `is_rest` field exists in the simple `notes` format), missed slots are simply omitted from the response staff voice.

**Rationale**: The response staff is for visual comparison, not playback. Placing each response note at the same tick as its exercise counterpart aligns them spatially with the exercise staff above, making the comparison immediately readable. Using the integer pitch (from `Math.round(midiCents / 100)`) matches the usual MIDI note display convention.

**Alternatives considered**:
- Use actual onset tick (`Math.round(onsetMs / msPerBeat * 960)`) — rejected: produces irregular spacing in the response staff, making visual comparison with the exercise staff harder.
- Render response staff as a plain list of pitches without tick positions — viable but loses temporal ordering when multiple notes played out of sequence.

---

## 5. Regression Test Strategy for Barline Overlap (Principle VII)

**Question**: The barline overlap bug fixed in commit `41eb168` (`NotationLayoutEngine.calculateBarlines`) must have a regression test per Principle VII. But after migration, `PracticeView` no longer uses `NotationLayoutEngine`. Where does the regression test live?

**Decision**: Add a unit test to `NotationLayoutEngine.test.ts` that verifies `calculateBarlines` x-positions are offset by the same cumulative `barlineNoteSpacing` as `calculateNotePositions`. This test lives in the TS engine's own test file and is independent of the practice migration.

Additionally, document in `spec.md` "Known Issues" that the barline overlap was a TypeScript-engine bug now superseded by the migration, and that the Rust engine natively produces correct barline positions.

**Rationale**: Principle VII requires a test before a fix, but the fix is already committed. The test is written retrospectively during this feature's development to satisfy the principle going forward. Since `NotationLayoutEngine` remains in the codebase (used by other paths or for reference), the test prevents future regressions if anyone modifies it.

---

## 6. WASM Initialisation Gating Pattern

**Question**: What is the established pattern for ensuring WASM is ready before a component calls `computeLayout`?

**Decision**: Call `initWasm()` (from `services/wasm/loader.ts`) in a `useEffect` on mount and gate the layout computation on a `wasmReady` state flag. This mirrors the exact pattern used by `LayoutView` and `ScoreViewer`.

```typescript
const [wasmReady, setWasmReady] = useState(false);
useEffect(() => { initWasm().then(() => setWasmReady(true)); }, []);
```

Show a loading spinner (or the existing "Generating…" overlay) until `wasmReady && exerciseLayout !== null`.

**Rationale**: `initWasm()` is idempotent and cached — if WASM was already initialised by `ScoreViewer` (typical path since users open a score before navigating to practice), the call resolves immediately with no delay. The flag is still needed for direct-navigation to `/practice` (e.g., from a bookmark or the landing page in development).

---

## 7. Naming Convention for Exercise Note IDs

**Question**: What stable string ID scheme should be used for exercise notes?

**Decision**: `"ex-{slotIndex}"` — e.g., `"ex-0"`, `"ex-1"`, ..., `"ex-19"`.

- The `"ex-"` prefix distinguishes exercise note IDs from domain note UUIDs, preventing accidental collisions.
- `slotIndex` is 0-based and stable within an exercise session.
- IDs are regenerated on "New Exercise" — they are session-scoped and never persisted.

For the response staff, if needed in future: `"resp-{slotIndex}"`.
