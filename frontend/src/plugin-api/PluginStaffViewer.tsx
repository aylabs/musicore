/**
 * PluginStaffViewer — Host-side notation staff component for plugins
 * Feature 030: Plugin Architecture
 *
 * Injected into every PluginContext as `context.components.StaffViewer`.
 * Plugins render this component to display their played notes on a live
 * notation staff — no direct access to the notation engine is needed.
 *
 * Architecture:
 *   PluginNoteEvent[]  →  toNotes()  →  Note[]
 *   Note[]  →  NotationLayoutEngine.calculateLayout()  →  LayoutGeometry
 *   LayoutGeometry  →  NotationRenderer  →  SVG staff
 *
 * Auto-scroll:
 *   When `autoScroll={true}`, the container scrolls right after every new note
 *   so the latest note stays visible.  A `useEffect` on `staffNotes.length`
 *   fires `container.scrollLeft = container.scrollWidth` after React paints.
 *   The live `scrollX` offset is fed back into the layout engine so only the
 *   visible slice of the score is computed (matching the main app strategy).
 *
 * This file is HOST code (src/), not plugin code.  It may freely import from
 * the rest of src/ — the no-restricted-imports ESLint rule only applies to
 * files under plugins/.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NotationLayoutEngine } from '../services/notation/NotationLayoutEngine';
import { NotationRenderer } from '../components/notation/NotationRenderer';
import { DEFAULT_STAFF_CONFIG } from '../types/notation/config';
import type { Note, ClefType } from '../types/score';
import type { PluginNoteEvent, PluginStaffViewerProps } from './types';

// ---------------------------------------------------------------------------
// MIDI-event → Note conversion
// ---------------------------------------------------------------------------

/**
 * Duration mapping for a touch keyboard (NOT BPM-proportional):
 *
 * On a touchscreen, a natural "tap" lasts ~80–200 ms regardless of tempo.
 * Using a BPM ratio (500 ms = quarter at 120 BPM) means every tap maps to a
 * sixteenth — not what the user expects.  Instead we use intuitive thresholds:
 *
 *   tap   < 300 ms  →  quarter  (480 ticks)  — normal press
 *   hold  < 800 ms  →  half     (960 ticks)  — deliberate hold
 *   hold  ≥ 800 ms  →  whole    (1920 ticks) — long hold
 *
 * Eighth and sixteenth are intentionally excluded: physical tap duration on
 * glass cannot reliably distinguish them from a quarter.
 */
const QUARTER_TICKS = 480;

import { msToDurationTicks } from './staffViewerUtils';

/** Fallback visual span when no duration is known (quarter note). */
const DEFAULT_TICK_STEP = QUARTER_TICKS;

/**
 * Filters attack events from `events` and converts them to the `Note` format
 * expected by `NotationLayoutEngine`.  Notes are laid out left-to-right in the
 * order they appear in the array.  `durationMs` is used to compute the correct
 * note value; events without `durationMs` default to a quarter note.
 */
function toNotes(events: readonly PluginNoteEvent[]): Note[] {
  const attacks = events.filter(e => !e.type || e.type === 'attack');
  let tick = 0;
  return attacks.map((e, i) => {
    const durationTicks = e.durationMs != null
      ? msToDurationTicks(e.durationMs)
      : DEFAULT_TICK_STEP;
    const note: Note = {
      id: `plugin-note-${i}-${e.midiNote}`,
      start_tick: tick,
      duration_ticks: durationTicks,
      pitch: e.midiNote,
    };
    tick += durationTicks;
    return note;
  });
}

// Fixed height; width is measured from the container at runtime.
const VIEWER_HEIGHT = 160;
const VIEWER_WIDTH_FALLBACK = 800;

// Throttle layout recalculations to every 200 px of scroll (mirrors StaffNotation strategy).
const SCROLL_THROTTLE = 200;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PluginStaffViewer
 *
 * Renders a scrollable notation staff from an ordered list of `PluginNoteEvent`s.
 * Currently pressed keys (supplied via `highlightedNotes`) are shown with a
 * filled accent colour.  When `autoScroll` is true the viewport tracks the
 * latest note on every new keypress.
 *
 * @example
 * ```tsx
 * <context.components.StaffViewer
 *   notes={recordedNotes}
 *   highlightedNotes={[...pressedKeys]}
 *   clef="Treble"
 *   autoScroll
 * />
 * ```
 */
export const PluginStaffViewer: React.FC<PluginStaffViewerProps> = ({
  notes,
  highlightedNotes = [],
  clef = 'Treble',
  autoScroll = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // scrollX drives both the layout engine (clipping) and the DOM scroll position.
  const [scrollX, setScrollX] = useState(0);

  // Convert PluginNoteEvents → Note models (attack events only).
  const staffNotes = useMemo(() => toNotes(notes), [notes]);

  // Derive highlighted note IDs.
  // `highlightedNotes` contains MIDI numbers of notes the *caller* wants to
  // accent (e.g. the note that was just committed to the staff).  We find
  // the LAST note in staffNotes whose pitch matches any value in the set —
  // matching only the most recent occurrence avoids lighting up all past
  // repetitions of the same pitch.
  const highlightedNoteIds = useMemo(() => {
    if (highlightedNotes.length === 0) return [];
    const midiSet = new Set(highlightedNotes);
    // Walk backwards: only highlight the most-recent note for each MIDI value.
    const seen = new Set<number>();
    const ids: string[] = [];
    for (let i = staffNotes.length - 1; i >= 0; i--) {
      const n = staffNotes[i];
      if (midiSet.has(n.pitch) && !seen.has(n.pitch)) {
        ids.push(n.id);
        seen.add(n.pitch);
      }
    }
    return ids;
  }, [staffNotes, highlightedNotes]);

  // Measure the container's visible width for accurate layout clipping.
  const [viewportWidth, setViewportWidth] = useState(VIEWER_WIDTH_FALLBACK);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewportWidth(el.clientWidth || VIEWER_WIDTH_FALLBACK));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Throttled scrollX for layout recalculation (avoids 60 Hz engine calls).
  const scrollXThrottled = useMemo(
    () => Math.round(scrollX / SCROLL_THROTTLE) * SCROLL_THROTTLE,
    [scrollX],
  );

  // Calculate layout geometry with the notation engine.
  const layout = useMemo(() => {
    return NotationLayoutEngine.calculateLayout({
      notes: staffNotes,
      clef: clef as ClefType,
      timeSignature: { numerator: 4, denominator: 4 },
      config: {
        ...DEFAULT_STAFF_CONFIG,
        viewportWidth,
        viewportHeight: VIEWER_HEIGHT,
        scrollX: scrollXThrottled,
      },
    });
  }, [staffNotes, clef, viewportWidth, scrollXThrottled]);

  // Auto-scroll: after every new note is appended, scroll the container so
  // the newest note is fully visible at the right edge.
  //
  // Two rAF calls are required:
  //   1st rAF – browser has committed layout/style but not yet painted
  //   2nd rAF – browser has painted; SVG has its final scrollWidth
  // Without the double-rAF the SVG may not have expanded yet and the scroll
  // falls short by exactly one note width.
  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    const el = containerRef.current;
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const target = el.scrollWidth - el.clientWidth;
        el.scrollLeft = target;
        setScrollX(target);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  // staffNotes.length is the correct dependency: fire only when a note is added.
  }, [staffNotes.length, autoScroll]);

  // Keep scrollX state in sync when the user manually scrolls.
  const handleScroll = () => {
    if (containerRef.current) setScrollX(containerRef.current.scrollLeft);
  };

  return (
    <div
      ref={containerRef}
      data-testid="plugin-staff-viewer"
      onScroll={handleScroll}
      style={{
        width: '100%',
        overflowX: 'auto',
        border: '1px solid #e0e0e0',
        borderRadius: 4,
        backgroundColor: '#ffffff',
        marginBottom: 12,
      }}
    >
      <NotationRenderer
        layout={layout}
        highlightedNoteIds={highlightedNoteIds}
      />
    </div>
  );
};
