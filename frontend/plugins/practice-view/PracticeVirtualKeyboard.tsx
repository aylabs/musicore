/**
 * PracticeVirtualKeyboard.tsx — Feature 001: Virtual Keyboard in Practice View
 *
 * Renders an interactive two-octave piano keyboard inside the Practice plugin.
 * Mirrors the visual design and interaction model of VirtualKeyboard.tsx but is
 * a self-contained component inside practice-view/ to respect the cross-plugin
 * import boundary (R-002).
 *
 * Responsibilities:
 *   - Render piano keys (white + black) for a two-octave range based on octaveShift
 *   - Call props.onKeyDown/onKeyUp so the parent routes notes through the MIDI
 *     scoring pipeline (handleMidiAttackRef — R-003)
 *   - Call context.playNote on every key down AND up unconditionally (FR-006:
 *     always audible, regardless of exercise phase)
 *   - Apply pressed-key visual highlight (FR-007)
 *   - Provide octave Up/Down shift controls within ±2 bounds (FR-008, R-005)
 *   - Suppress synthetic mouse events on mobile via touch/mouse guard (R-008)
 *
 * Constitution Principle VI: this component emits ONLY midiNote integers via
 * props callbacks. It does NOT perform coordinate or layout calculations.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import './PracticeVirtualKeyboard.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Width of each white key in px — matches VirtualKeyboard.tsx (44 px touch target). */
const WHITE_KEY_WIDTH = 44;

/** Default lowest MIDI note at octaveShift=0: C3 = MIDI 48. */
const KEYBOARD_BASE_NOTE = 48;

/** Minimum allowed octave shift (shift=−2 → C1–B2, MIDI 24–47). */
const OCTAVE_SHIFT_MIN = -2;

/** Maximum allowed octave shift (shift=+2 → C5–B6, MIDI 72–95). */
const OCTAVE_SHIFT_MAX = 2;

/**
 * Milliseconds after a touch event during which synthesised mouse events are
 * ignored.  Prevents double-triggering on mobile browsers.
 */
const TOUCH_GUARD_MS = 500;

// White-key pattern within an octave (semitone offsets of white keys):
// C, D, E, F, G, A, B
const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
// Black-key pattern: (semitone, white-key-index-before)
const BLACK_SEMITONES: { semitone: number; whiteKeyBefore: number }[] = [
  { semitone: 1,  whiteKeyBefore: 0 },
  { semitone: 3,  whiteKeyBefore: 1 },
  { semitone: 6,  whiteKeyBefore: 3 },
  { semitone: 8,  whiteKeyBefore: 4 },
  { semitone: 10, whiteKeyBefore: 5 },
];

// ---------------------------------------------------------------------------
// Key definition helpers
// ---------------------------------------------------------------------------

interface NoteDefinition {
  midi: number;
  isBlack: boolean;
  /** 0-based global index of the white key it follows (black keys only) */
  whiteKeyBeforeGlobal?: number;
  label: string;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function midiLabel(midi: number): string {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/**
 * Generate the NoteDefinition array for `octaveCount` octaves starting at `baseMidi`.
 * White key indices are global, running from 0 to (7 × octaveCount − 1).
 * Defaults to 2 octaves so callers without a measured width work correctly.
 */
function buildNotes(baseMidi: number, octaveCount: number = 2): NoteDefinition[] {
  const notes: NoteDefinition[] = [];

  for (let octave = 0; octave < octaveCount; octave++) {
    const octaveBase = baseMidi + octave * 12;
    for (const semi of WHITE_SEMITONES) {
      notes.push({
        midi: octaveBase + semi,
        isBlack: false,
        label: midiLabel(octaveBase + semi),
      });
    }
    for (const { semitone, whiteKeyBefore } of BLACK_SEMITONES) {
      notes.push({
        midi: octaveBase + semitone,
        isBlack: true,
        whiteKeyBeforeGlobal: octave * 7 + whiteKeyBefore,
        label: midiLabel(octaveBase + semitone),
      });
    }
  }

  return notes;
}

/**
 * Left position (px) of a black key.
 * Centres the key exactly at the boundary between white keys — the transform
 * translateX(-50%) in CSS shifts the rendered box left by half its own width,
 * so `left = (n+1) * WHITE_KEY_WIDTH` places the midpoint of the black key on
 * the gap between white key n and white key n+1.
 */
function blackKeyLeft(whiteKeyBeforeGlobal: number): number {
  return (whiteKeyBeforeGlobal + 1) * WHITE_KEY_WIDTH;
}

// ---------------------------------------------------------------------------
// Props contract (matches contracts/input-source.ts)
// ---------------------------------------------------------------------------

export interface PracticeVirtualKeyboardProps {
  /** Plugin context — used ONLY for context.playNote (audio). */
  context: {
    playNote: (event: { midiNote: number; timestamp: number; type: 'attack' | 'release' }) => void;
  };
  /** Called when a key is pressed. Parent routes to scoring pipeline. */
  onKeyDown: (midiNote: number, timestamp: number) => void;
  /** Called when a key is released. Parent may use for flow-mode release relay. */
  onKeyUp: (midiNote: number, attackedAt: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PracticeVirtualKeyboard({ context, onKeyDown, onKeyUp }: PracticeVirtualKeyboardProps) {
  // Octave shift state: [-2, +2], default 0 (C3–B4)
  const [octaveShift, setOctaveShift] = useState(0);

  // Keys currently pressed (for visual highlight — FR-007)
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  // Mirror into ref so cleanup can access without stale closure
  const pressedKeysRef = useRef<Set<number>>(new Set());
  useEffect(() => { pressedKeysRef.current = pressedKeys; }, [pressedKeys]);

  // Attack timestamps: midiNote → Date.now() at press time
  const attackTimestamps = useRef<Map<number, number>>(new Map());

  // Touch/mouse dual-source guard (R-008, matching VirtualKeyboard.tsx)
  const lastTouchTimeRef = useRef<number>(0);

  // isMouseHeldRef: tracks whether primary button is currently down (for slide-play)
  const isMouseHeldRef = useRef(false);

  // Ref to the scrollable keyboard wrapper — used by ResizeObserver to measure
  // the available pixel width so the keyboard can fill it with whole octaves.
  const scrollRef = useRef<HTMLDivElement>(null);

  // Measured width of the scroll container in px; 0 until first layout.
  const [availableWidth, setAvailableWidth] = useState(0);

  // Recompute when the panel is resized (e.g. orientation change, panel open).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Grab initial width synchronously after first render.
    setAvailableWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      setAvailableWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Derived note arrays from the current octave shift
  const baseMidi = KEYBOARD_BASE_NOTE + octaveShift * 12;
  // How many whole octaves fit? Each octave = 7 white keys × 44 px.
  // Fall back to 2 if width hasn't been measured yet (avoids a zero-key render
  // on first paint and keeps jsdom-based unit tests stable).
  const octaveCount = availableWidth > 0
    ? Math.max(1, Math.floor(availableWidth / (7 * WHITE_KEY_WIDTH)))
    : 2;
  const notes = buildNotes(baseMidi, octaveCount);
  const whiteNotes = notes.filter(n => !n.isBlack);
  const blackNotes = notes.filter(n => n.isBlack);
  const totalWidth = whiteNotes.length * WHITE_KEY_WIDTH;

  // Lock orientation to landscape on mobile so the keyboard has maximum width.
  // The Screen Orientation API is not universally supported; failures are silently
  // ignored so desktop browsers and restricted contexts are unaffected.
  useEffect(() => {
    const orient = (screen as unknown as {
      orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void };
    }).orientation;
    orient?.lock?.('landscape')?.catch(() => {});
    return () => { orient?.unlock?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On unmount: release any keys still held (avoids sustained notes after panel close)
  useEffect(() => {
    return () => {
      for (const midi of pressedKeysRef.current) {
        context.playNote({ midiNote: midi, timestamp: Date.now(), type: 'release' });
      }
    };
  // context is stable — intentional empty dep array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Document-level mouseup: reset isMouseHeldRef when button released outside keyboard
  useEffect(() => {
    const onDocMouseUp = () => { isMouseHeldRef.current = false; };
    document.addEventListener('mouseup', onDocMouseUp);
    return () => document.removeEventListener('mouseup', onDocMouseUp);
  }, []);

  // ---------------------------------------------------------------------------
  // Key down / up handlers (shared by touch and mouse paths)
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback((note: NoteDefinition) => {
    // Ignore if already pressed (prevents re-entry during slide-play)
    if (pressedKeysRef.current.has(note.midi)) return;

    const ts = Date.now();
    attackTimestamps.current.set(note.midi, ts);

    // Audio first — unconditional (FR-006: always audible regardless of phase)
    context.playNote({ midiNote: note.midi, timestamp: ts, type: 'attack' });

    // Scoring: parent routes through handleMidiAttackRef (R-003)
    onKeyDown(note.midi, ts);

    setPressedKeys(prev => {
      const next = new Set(prev);
      next.add(note.midi);
      return next;
    });
  }, [context, onKeyDown]);

  const handleKeyUp = useCallback((midi: number) => {
    const attackedAt = attackTimestamps.current.get(midi) ?? Date.now();
    attackTimestamps.current.delete(midi);

    // Audio release — unconditional (FR-006)
    context.playNote({ midiNote: midi, timestamp: Date.now(), type: 'release' });

    // Notify parent (used for flow-mode release relay if needed)
    onKeyUp(midi, attackedAt);

    setPressedKeys(prev => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, [context, onKeyUp]);

  // ---------------------------------------------------------------------------
  // Touch handlers
  // ---------------------------------------------------------------------------

  const handleTouchStart = useCallback((e: React.TouchEvent, note: NoteDefinition) => {
    e.preventDefault();
    lastTouchTimeRef.current = Date.now();
    handleKeyDown(note);
  }, [handleKeyDown]);

  const handleTouchEnd = useCallback((e: React.TouchEvent, midi: number) => {
    e.preventDefault();
    handleKeyUp(midi);
  }, [handleKeyUp]);

  // ---------------------------------------------------------------------------
  // Mouse handlers (guarded against synthesised events after touch)
  // ---------------------------------------------------------------------------

  const handleMouseDown = useCallback((note: NoteDefinition) => {
    if (Date.now() - lastTouchTimeRef.current < TOUCH_GUARD_MS) return;
    isMouseHeldRef.current = true;
    handleKeyDown(note);
  }, [handleKeyDown]);

  const handleMouseUp = useCallback((midi: number) => {
    if (Date.now() - lastTouchTimeRef.current < TOUCH_GUARD_MS) return;
    isMouseHeldRef.current = false;
    handleKeyUp(midi);
  }, [handleKeyUp]);

  const handleMouseLeave = useCallback((midi: number) => {
    if (Date.now() - lastTouchTimeRef.current < TOUCH_GUARD_MS) return;
    if (!isMouseHeldRef.current) return;
    handleKeyUp(midi);
  }, [handleKeyUp]);

  const handleMouseEnter = useCallback((note: NoteDefinition) => {
    if (Date.now() - lastTouchTimeRef.current < TOUCH_GUARD_MS) return;
    if (!isMouseHeldRef.current) return;
    handleKeyDown(note);
  }, [handleKeyDown]);

  // ---------------------------------------------------------------------------
  // Octave shift controls (FR-008, R-005)
  // ---------------------------------------------------------------------------

  const shiftUp = useCallback(() => {
    setOctaveShift(prev => Math.min(prev + 1, OCTAVE_SHIFT_MAX));
  }, []);

  const shiftDown = useCallback(() => {
    setOctaveShift(prev => Math.max(prev - 1, OCTAVE_SHIFT_MIN));
  }, []);

  const rangeLabel = `${midiLabel(baseMidi)}–${midiLabel(baseMidi + 23)}`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="practice-vkb" data-testid="practice-vkb" role="group" aria-label="Virtual piano keyboard">
      {/* Hidden live region — consumed by screen readers and unit tests */}
      <span
        className="practice-vkb__range-label--sr"
        aria-live="polite"
        data-testid="vkb-range-label"
      >
        {rangeLabel}
      </span>

      {/* Oct− button — left of keyboard */}
      <button
        className="practice-vkb__octave-btn"
        onClick={shiftDown}
        disabled={octaveShift <= OCTAVE_SHIFT_MIN}
        aria-label="Shift octave down"
        data-testid="vkb-octave-down"
      >
        ◀
      </button>

      {/* Keyboard (scrollable on narrow screens, centred when smaller than panel) */}
      <div className="practice-vkb__scroll" ref={scrollRef}>
        <div
          className="practice-vkb__keyboard"
          style={{ width: `${totalWidth}px` }}
          data-testid="practice-vkb-keyboard"
        >
          {/* White keys (z-index 1) */}
          {whiteNotes.map(note => (
            <div
              key={note.midi}
              className={`practice-vkb__key practice-vkb__key--white${pressedKeys.has(note.midi) ? ' practice-vkb__key--pressed' : ''}`}
              data-midi={note.midi}
              data-testid={`vkb-key-${note.midi}`}
              onMouseDown={() => handleMouseDown(note)}
              onMouseUp={() => handleMouseUp(note.midi)}
              onMouseLeave={() => handleMouseLeave(note.midi)}
              onMouseEnter={() => handleMouseEnter(note)}
              onTouchStart={e => handleTouchStart(e, note)}
              onTouchEnd={e => handleTouchEnd(e, note.midi)}
              onContextMenu={e => e.preventDefault()}
              role="button"
              aria-label={note.label}
              aria-pressed={pressedKeys.has(note.midi)}
            >
              {/* Show octave C note label */}
              {note.label.startsWith('C') && !note.label.startsWith('C#') ? note.label : ''}
            </div>
          ))}

          {/* Black keys (z-index 2, absolutely positioned) */}
          {blackNotes.map(note => (
            <div
              key={note.midi}
              className={`practice-vkb__key practice-vkb__key--black${pressedKeys.has(note.midi) ? ' practice-vkb__key--pressed' : ''}`}
              data-midi={note.midi}
              data-testid={`vkb-key-${note.midi}`}
              style={{ left: `${blackKeyLeft(note.whiteKeyBeforeGlobal!)}px` }}
              onMouseDown={() => handleMouseDown(note)}
              onMouseUp={() => handleMouseUp(note.midi)}
              onMouseLeave={() => handleMouseLeave(note.midi)}
              onMouseEnter={() => handleMouseEnter(note)}
              onTouchStart={e => handleTouchStart(e, note)}
              onTouchEnd={e => handleTouchEnd(e, note.midi)}
              onContextMenu={e => e.preventDefault()}
              role="button"
              aria-label={note.label}
              aria-pressed={pressedKeys.has(note.midi)}
            />
          ))}
        </div>
      </div>

      {/* Oct+ button — right of keyboard */}
      <button
        className="practice-vkb__octave-btn"
        onClick={shiftUp}
        disabled={octaveShift >= OCTAVE_SHIFT_MAX}
        aria-label="Shift octave up"
        data-testid="vkb-octave-up"
      >
        ▶
      </button>
    </div>
  );
}
