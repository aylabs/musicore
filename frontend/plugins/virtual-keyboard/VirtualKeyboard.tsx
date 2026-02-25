/**
 * VirtualKeyboard component — Feature 030: Plugin Architecture (US1)
 *
 * Renders an interactive two-octave piano keyboard (C3–B4).
 * On key press: calls context.playNote() (audio via host ToneAdapter) and
 * context.emitNote() (note data for the WASM layout pipeline), and records
 * the played note for on-screen display above the keyboard.
 *
 * Audio is intentionally routed through the Plugin API (context.playNote /
 * context.emitNote) — this component must NOT import Tone.js or the Web Audio
 * API directly. The host owns the audio engine.
 *
 * Constitution Principle VI: this component emits ONLY midiNote integers via
 * the Plugin API. It does NOT perform any coordinate or layout calculations;
 * those are delegated to the WASM engine through the host's note pipeline.
 *
 * Accessibility: ARIA roles + keyboard navigation are out of scope for US1.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PluginContext } from '../../src/plugin-api/index';
import './VirtualKeyboard.css';

// ---------------------------------------------------------------------------
// Note definitions
// ---------------------------------------------------------------------------

interface NoteDefinition {
  midi: number;
  isBlack: boolean;
  /** Only set for black keys: the 0-based index of the white key it follows */
  whiteKeyBefore?: number;
  /** Short label, e.g. "C4", "C#4" */
  label: string;
}

const WHITE_KEY_WIDTH = 44; // px — meets 44px touch target requirement

/**
 * Two octaves: C3 (MIDI 48) → B4 (MIDI 71)
 * White keys: 14 total (7 per octave)
 * Black keys: 10 total (5 per octave)
 */
const NOTES: NoteDefinition[] = [
  // Octave 3
  { midi: 48, isBlack: false, label: 'C3' },
  { midi: 49, isBlack: true,  whiteKeyBefore: 0,  label: 'C#3' },
  { midi: 50, isBlack: false, label: 'D3' },
  { midi: 51, isBlack: true,  whiteKeyBefore: 1,  label: 'D#3' },
  { midi: 52, isBlack: false, label: 'E3' },
  { midi: 53, isBlack: false, label: 'F3' },
  { midi: 54, isBlack: true,  whiteKeyBefore: 3,  label: 'F#3' },
  { midi: 55, isBlack: false, label: 'G3' },
  { midi: 56, isBlack: true,  whiteKeyBefore: 4,  label: 'G#3' },
  { midi: 57, isBlack: false, label: 'A3' },
  { midi: 58, isBlack: true,  whiteKeyBefore: 5,  label: 'A#3' },
  { midi: 59, isBlack: false, label: 'B3' },
  // Octave 4
  { midi: 60, isBlack: false, label: 'C4' },
  { midi: 61, isBlack: true,  whiteKeyBefore: 7,  label: 'C#4' },
  { midi: 62, isBlack: false, label: 'D4' },
  { midi: 63, isBlack: true,  whiteKeyBefore: 8,  label: 'D#4' },
  { midi: 64, isBlack: false, label: 'E4' },
  { midi: 65, isBlack: false, label: 'F4' },
  { midi: 66, isBlack: true,  whiteKeyBefore: 10, label: 'F#4' },
  { midi: 67, isBlack: false, label: 'G4' },
  { midi: 68, isBlack: true,  whiteKeyBefore: 11, label: 'G#4' },
  { midi: 69, isBlack: false, label: 'A4' },
  { midi: 70, isBlack: true,  whiteKeyBefore: 12, label: 'A#4' },
  { midi: 71, isBlack: false, label: 'B4' },
];

const WHITE_NOTES = NOTES.filter(n => !n.isBlack);
const BLACK_NOTES = NOTES.filter(n => n.isBlack);

/** Calculate the absolute left position for a black key (in px). */
function blackKeyLeft(note: NoteDefinition): number {
  // Centre the black key at 65% from the left edge of its preceding white key.
  // (whiteKeyBefore * whiteKeyWidth) = left edge of the white key
  // + 0.65 * whiteKeyWidth = the centre point
  return (note.whiteKeyBefore! * WHITE_KEY_WIDTH) + (0.65 * WHITE_KEY_WIDTH);
}

// Maximum displayed notes before oldest are dropped from the on-screen list
const MAX_DISPLAYED_NOTES = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface VirtualKeyboardProps {
  context: PluginContext;
}

export function VirtualKeyboard({ context }: VirtualKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [playedNotes, setPlayedNotes] = useState<{ midi: number; label: string }[]>([]);

  // Mirror pressedKeys into a ref so the unmount cleanup can read the latest
  // value without capturing a stale closure.
  const pressedKeysRef = useRef<Set<number>>(new Set());
  useEffect(() => { pressedKeysRef.current = pressedKeys; }, [pressedKeys]);

  // On unmount (e.g. Back button): release any notes that are still held down.
  // Without this a sustained note keeps playing after the component is gone.
  useEffect(() => {
    return () => {
      for (const midi of pressedKeysRef.current) {
        context.playNote({ midiNote: midi, timestamp: Date.now(), type: 'release' });
      }
    };
  // context is stable (created once in App loadPlugins), intentional empty-dep.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = useCallback(
    (note: NoteDefinition) => {
      // Audio playback via Plugin API — host routes through ToneAdapter (Salamander piano)
      context.playNote({ midiNote: note.midi, timestamp: Date.now(), type: 'attack' });
      // Note data to WASM layout pipeline
      context.emitNote({ midiNote: note.midi, timestamp: Date.now() });

      setPressedKeys(prev => {
        const next = new Set(prev);
        next.add(note.midi);
        return next;
      });

      setPlayedNotes(prev => {
        const next = [...prev, { midi: note.midi, label: note.label }];
        return next.length > MAX_DISPLAYED_NOTES ? next.slice(-MAX_DISPLAYED_NOTES) : next;
      });
    },
    [context]
  );

  const handleKeyUp = useCallback((midi: number) => {
    // Release the sustained note through the Plugin API
    context.playNote({ midiNote: midi, timestamp: Date.now(), type: 'release' });
    setPressedKeys(prev => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, [context]);

  const totalWidth = WHITE_NOTES.length * WHITE_KEY_WIDTH;

  return (
    <div className="virtual-keyboard">
      <h2 className="virtual-keyboard__title">Virtual Keyboard</h2>

      {/* Note display area — shows chips for each played note */}
      <div className="virtual-keyboard__staff-area">
        {playedNotes.length === 0 ? (
          <span className="virtual-keyboard__note-display--empty">
            Play a key to see notes here
          </span>
        ) : (
          <div className="virtual-keyboard__note-display">
            {playedNotes.map((n, i) => (
              <span key={i} className="virtual-keyboard__note-chip">
                {n.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard (scrollable on narrow screens) */}
      <div className="virtual-keyboard__scroll">
        <div className="keyboard" style={{ width: `${totalWidth}px` }}>
          {/* White keys first (z-index 1) */}
          {WHITE_NOTES.map(note => (
            <div
              key={note.midi}
              className={`key key--white${pressedKeys.has(note.midi) ? ' key--pressed' : ''}`}
              data-midi={note.midi}
              onMouseDown={() => handleKeyDown(note)}
              onMouseUp={() => handleKeyUp(note.midi)}
              onMouseLeave={() => handleKeyUp(note.midi)}
              onTouchStart={e => { e.preventDefault(); handleKeyDown(note); }}
              onTouchEnd={() => handleKeyUp(note.midi)}
              role="button"
              aria-label={note.label}
            >
              {note.label.startsWith('C') ? note.label : ''}
            </div>
          ))}

          {/* Black keys last (z-index 2, absolutely positioned) */}
          {BLACK_NOTES.map(note => (
            <div
              key={note.midi}
              className={`key key--black${pressedKeys.has(note.midi) ? ' key--pressed' : ''}`}
              data-midi={note.midi}
              style={{ left: `${blackKeyLeft(note)}px` }}
              onMouseDown={() => handleKeyDown(note)}
              onMouseUp={() => handleKeyUp(note.midi)}
              onMouseLeave={() => handleKeyUp(note.midi)}
              onTouchStart={e => { e.preventDefault(); handleKeyDown(note); }}
              onTouchEnd={() => handleKeyUp(note.midi)}
              role="button"
              aria-label={note.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
