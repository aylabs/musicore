import { useEffect, useRef, useState } from 'react';
import { LoadScoreButton } from './load-score/LoadScoreButton';
import { SMUFL_CODEPOINTS } from '../types/notation/config';
import './LandingScreen.css';

// ---------------------------------------------------------------------------
// Constants (Feature 001-landing-redesign)
// ---------------------------------------------------------------------------

/** Five standard duration note glyphs from the Bravura font (SMuFL spec) */
const NOTE_GLYPHS = [
  SMUFL_CODEPOINTS.WHOLE_NOTE,        // ○  \uE0A2
  SMUFL_CODEPOINTS.HALF_NOTE_UP,      // 𝅗𝅥  \uE1D3
  SMUFL_CODEPOINTS.QUARTER_NOTE_UP,   // ♩  \uE1D5
  SMUFL_CODEPOINTS.EIGHTH_NOTE_UP,    // ♪  \uE1D7
  SMUFL_CODEPOINTS.SIXTEENTH_NOTE_UP, // 𝅘𝅥𝅯  \uE1D9
  SMUFL_CODEPOINTS.TREBLE_CLEF,       // 𝄞  \uE050
  SMUFL_CODEPOINTS.BASS_CLEF,         // 𝄢  \uE062
  SMUFL_CODEPOINTS.ALTO_CLEF,         // 𝄡  \uE05C
] as const;

/**
 * Three colors from the play-view palette (LayoutRenderer.css).
 * - Slate:  #3D4B5C — softened dark, easier on the eye than pure black
 * - Amber:  #F5A340 — warm softened orange (highlighted notehead, T030/FR-012)
 * - Sage:   #5AC481 — soft jade green (pinned-position notehead, Feature 027)
 */
const NOTE_COLORS = ['#3D4B5C', '#F5A340', '#5AC481'] as const;

/** Full loop duration in seconds (Lissajous period) — 20s for a leisurely pace */
const LOOP_DURATION = 20;

/**
 * Lissajous path parameters.
 * x(t) = X_CENTER + X_AMP × sin(2πt)         → range [12%, 88%]
 * y(t) = Y_CENTER + Y_AMP × sin(4πt + Y_PHASE) → range [2%, 78%]
 *
 * Y_PHASE is computed so that y(0) ≈ 5%, placing the initial note
 * behind the app-header banner (~60px = ~8% on a 768px tablet).
 */
const X_CENTER = 50;
const X_AMP = 38;
const Y_CENTER = 40;
const Y_AMP = 38;
/** Phase offset so y(t=0) = 5% (behind the app-header) */
const Y_PHASE = Math.asin((5 - Y_CENTER) / Y_AMP); // ≈ -1.173 rad

/** Pick a random index from [0, poolSize) that is not `exclude` */
function pickRandom(poolSize: number, exclude: number): number {
  let idx = Math.floor(Math.random() * (poolSize - 1));
  if (idx >= exclude) idx += 1;
  return idx;
}

/** Evaluate the Lissajous path at normalised time t ∈ [0, 1) */
function evalPath(t: number): { x: number; y: number } {
  const angle = t * 2 * Math.PI;
  return {
    x: X_CENTER + X_AMP * Math.sin(angle),
    y: Y_CENTER + Y_AMP * Math.sin(2 * angle + Y_PHASE),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface LandingScreenProps {
  /** Called when the user activates the Load Score action */
  onLoadScore: () => void;
}

/**
 * LandingScreen — full-viewport (100vw × 100vh) hero shown when no score is loaded.
 *
 * Features (001-landing-redesign):
 * - Covers the entire viewport behind the .app-header banner
 * - Single Bravura note glyph follows a fixed Lissajous looping path
 * - Glyph and color change simultaneously every second (no immediate repeats)
 * - Click resets the animation to its initial position (t = 0)
 * - Pauses when the browser tab is hidden (Page Visibility API)
 * - Respects prefers-reduced-motion: position frozen, glyph/color still cycle
 */
export function LandingScreen({ onLoadScore }: LandingScreenProps) {
  // Read reduced-motion preference once at mount
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Position of the animated note (% of container)
  const initialPos = evalPath(0);
  const [position, setPosition] = useState(initialPos);

  // Glyph and color indices — initialised to random values
  const [glyphIdx, setGlyphIdx] = useState(() =>
    Math.floor(Math.random() * NOTE_GLYPHS.length)
  );
  const [colorIdx, setColorIdx] = useState(() =>
    Math.floor(Math.random() * NOTE_COLORS.length)
  );

  // Refs for rAF loop state (not reactive — avoid re-renders)
  const rafRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);    // total seconds of animation elapsed
  const prevTimeRef = useRef<number | null>(null); // last rAF timestamp (ms)
  const prevSecondRef = useRef<number>(-1); // last whole-second boundary ticked
  // Keep current indices accessible inside rAF callbacks without stale closures
  const glyphIdxRef = useRef(glyphIdx);
  const colorIdxRef = useRef(colorIdx);

  // Keep refs in sync with state
  useEffect(() => { glyphIdxRef.current = glyphIdx; }, [glyphIdx]);
  useEffect(() => { colorIdxRef.current = colorIdx; }, [colorIdx]);

  // --------------------------------------------------------------------------
  // Main rAF animation loop
  // --------------------------------------------------------------------------
  useEffect(() => {
    function tick(now: number) {
      // Pause when tab is hidden — drain stale timestamp but don't advance elapsed
      if (document.hidden) {
        prevTimeRef.current = null;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Accumulate elapsed seconds
      if (prevTimeRef.current !== null) {
        elapsedRef.current += (now - prevTimeRef.current) / 1000;
      }
      prevTimeRef.current = now;

      // ------------------------------------------------------------------
      // 1-second tick: change glyph + color simultaneously (no repeats)
      // ------------------------------------------------------------------
      const currentSecond = Math.floor(elapsedRef.current);
      if (currentSecond !== prevSecondRef.current) {
        prevSecondRef.current = currentSecond;
        const nextGlyph = pickRandom(NOTE_GLYPHS.length, glyphIdxRef.current);
        const nextColor = pickRandom(NOTE_COLORS.length, colorIdxRef.current);
        setGlyphIdx(nextGlyph);
        setColorIdx(nextColor);
      }

      // ------------------------------------------------------------------
      // Position update along the Lissajous path
      // ------------------------------------------------------------------
      if (!reducedMotion) {
        const t = (elapsedRef.current % LOOP_DURATION) / LOOP_DURATION;
        setPosition(evalPath(t));
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --------------------------------------------------------------------------
  // Tab visibility: cancel rAF when hidden, restart when visible
  // --------------------------------------------------------------------------
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
        prevTimeRef.current = null; // prevent large time-jump on resume
      } else {
        rafRef.current = requestAnimationFrame(function tick(now: number) {
          if (document.hidden) {
            prevTimeRef.current = null;
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          if (prevTimeRef.current !== null) {
            elapsedRef.current += (now - prevTimeRef.current) / 1000;
          }
          prevTimeRef.current = now;

          const currentSecond = Math.floor(elapsedRef.current);
          if (currentSecond !== prevSecondRef.current) {
            prevSecondRef.current = currentSecond;
            const nextGlyph = pickRandom(NOTE_GLYPHS.length, glyphIdxRef.current);
            const nextColor = pickRandom(NOTE_COLORS.length, colorIdxRef.current);
            setGlyphIdx(nextGlyph);
            setColorIdx(nextColor);
          }

          if (!reducedMotion) {
            const t = (elapsedRef.current % LOOP_DURATION) / LOOP_DURATION;
            setPosition(evalPath(t));
          }

          rafRef.current = requestAnimationFrame(tick);
        });
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --------------------------------------------------------------------------
  // Click-to-reset: snap back to t=0 and restart the path
  // --------------------------------------------------------------------------
  function handleNoteClick() {
    elapsedRef.current = 0;
    prevTimeRef.current = null;
    prevSecondRef.current = -1;
    setPosition(evalPath(0));
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div
      className="landing-screen"
      data-testid="landing-screen"
      role="region"
      aria-label="Landing screen"
    >
      {/* Animated Bravura note glyph */}
      <span
        className="landing-note music-glyph"
        data-testid="landing-note"
        aria-hidden="true"
        onClick={handleNoteClick}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          color: NOTE_COLORS[colorIdx],
        }}
      >
        {NOTE_GLYPHS[glyphIdx]}
      </span>

      {/* Load score action — positioned above the animated layer */}
      <div className="landing-actions">
        <LoadScoreButton onClick={onLoadScore} />
      </div>
    </div>
  );
}
