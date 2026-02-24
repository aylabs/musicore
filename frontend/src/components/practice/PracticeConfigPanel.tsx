/**
 * PracticeConfigPanel.tsx — Vertical sidebar for configuring the practice exercise.
 *
 * Feature: 001-piano-practice
 * Controls: preset, note count, clef, octave range, tempo.
 * All controls are disabled while an exercise is in progress.
 */

import type { ExerciseConfig } from '../../services/practice/exerciseGenerator';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PracticeConfigPanelProps {
  config: ExerciseConfig;
  bpm: number;
  /** Disable all controls (during countdown / playing) */
  disabled: boolean;
  /** Whether the sidebar is collapsed to an icon strip */
  collapsed: boolean;
  onToggle: () => void;
  onConfigChange: (next: ExerciseConfig) => void;
  onBpmChange: (bpm: number) => void;
}

// ─── Small section wrapper ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="practice-config__section">
      <h3 className="practice-config__section-title">{title}</h3>
      {children}
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PracticeConfigPanel({
  config,
  bpm,
  disabled,
  collapsed,
  onToggle,
  onConfigChange,
  onBpmChange,
}: PracticeConfigPanelProps) {
  const isC4Scale = config.preset === 'c4scale';
  // Note count + octave range are fixed for c4scale; clef remains free
  const noteOctaveDisabled = disabled || isC4Scale;

  function set<K extends keyof ExerciseConfig>(key: K, value: ExerciseConfig[K]) {
    onConfigChange({ ...config, [key]: value });
  }

  return (
    <aside
      className={`practice-config${collapsed ? ' practice-config--collapsed' : ''}`}
      aria-label="Exercise configuration"
      data-testid="practice-config-panel"
    >
      {/* ── Toggle button ───────────────────────────────────────── */}
      <button
        className="practice-config__toggle"
        onClick={onToggle}
        aria-label={collapsed ? 'Open settings' : 'Close settings'}
        title={collapsed ? 'Open settings' : 'Close settings'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* ── Content (hidden when collapsed) ─────────────────────── */}
      {!collapsed && (
      <>

      {/* ── Mode ────────────────────────────────────────────────── */}
      <Section title="Mode">
        <label className="practice-config__radio-label">
          <input
            type="radio"
            name="practice-mode"
            value="flow"
            checked={config.mode === 'flow'}
            disabled={disabled}
            onChange={() => set('mode', 'flow')}
          />
          Flow
        </label>
        <label className="practice-config__radio-label">
          <input
            type="radio"
            name="practice-mode"
            value="step"
            checked={config.mode === 'step'}
            disabled={disabled}
            onChange={() => set('mode', 'step')}
          />
          Step
        </label>
      </Section>

      {/* ── Preset ──────────────────────────────────────────────── */}
      <Section title="Score">
        <label className="practice-config__radio-label">
          <input
            type="radio"
            name="practice-preset"
            value="random"
            checked={config.preset === 'random'}
            disabled={disabled}
            onChange={() => set('preset', 'random')}
          />
          Random
        </label>
        <label className="practice-config__radio-label">
          <input
            type="radio"
            name="practice-preset"
            value="c4scale"
            checked={config.preset === 'c4scale'}
            disabled={disabled}
            onChange={() => set('preset', 'c4scale')}
          />
          C4 Scale (debug)
        </label>
      </Section>

      {/* ── Note count ──────────────────────────────────────────── */}
      <Section title="Notes">
        <div className="practice-config__row">
          <input
            id="note-count-slider"
            type="range"
            className="practice-config__slider"
            min={1}
            max={20}
            step={1}
            value={config.noteCount}
            disabled={disabled || isC4Scale}
            onChange={(e) => set('noteCount', Number(e.target.value))}
            aria-label="Number of notes"
            data-testid="note-count-slider"
          />
          <span className="practice-config__value">{isC4Scale ? 8 : config.noteCount}</span>
        </div>
      </Section>

      {/* ── Clef ────────────────────────────────────────────────── */}
      <Section title="Clef">
        <label className={`practice-config__radio-label${disabled ? ' practice-config__radio-label--disabled' : ''}`}>
          <input
            type="radio"
            name="practice-clef"
            value="Treble"
            checked={config.clef === 'Treble'}
            disabled={disabled}
            onChange={() => set('clef', 'Treble')}
          />
          Treble
        </label>
        <label className={`practice-config__radio-label${disabled ? ' practice-config__radio-label--disabled' : ''}`}>
          <input
            type="radio"
            name="practice-clef"
            value="Bass"
            checked={config.clef === 'Bass'}
            disabled={disabled}
            onChange={() => set('clef', 'Bass')}
          />
          Bass
        </label>
      </Section>

      {/* ── Octave range ─────────────────────────────────────────── */}
      <Section title="Octaves">
        <div className="practice-config__inline-radios">
          <label className={`practice-config__radio-label${noteOctaveDisabled ? ' practice-config__radio-label--disabled' : ''}`}>
            <input
              type="radio"
              name="practice-octaves"
              value={1}
              checked={config.octaveRange === 1}
              disabled={noteOctaveDisabled}
              onChange={() => set('octaveRange', 1)}
            />
            1
          </label>
          <label className={`practice-config__radio-label${noteOctaveDisabled ? ' practice-config__radio-label--disabled' : ''}`}>
            <input
              type="radio"
              name="practice-octaves"
              value={2}
              checked={config.octaveRange === 2}
              disabled={noteOctaveDisabled}
              onChange={() => set('octaveRange', 2)}
            />
            2
          </label>
        </div>
      </Section>

      {/* ── Tempo ────────────────────────────────────────────────── */}
      <Section title="Tempo">
        <div className="practice-config__row">
          <input
            id="tempo-slider"
            type="range"
            className="practice-config__slider"
            min={40}
            max={120}
            step={5}
            value={bpm}
            disabled={disabled}
            onChange={(e) => onBpmChange(Number(e.target.value))}
            aria-label="Tempo in BPM"
            data-testid="tempo-slider"
          />
          <span className="practice-config__value">{bpm}</span>
        </div>
        <span className="practice-config__unit">BPM</span>
      </Section>

      {/* ── Step timeout multiplier (step mode only) ─────────────── */}
      {config.mode === 'step' && (
        <Section title="Timeout">
          <div className="practice-config__row">
            <input
              type="range"
              className="practice-config__slider"
              min={1}
              max={10}
              step={1}
              value={config.stepTimeoutMultiplier}
              disabled={disabled}
              onChange={(e) => set('stepTimeoutMultiplier', Number(e.target.value))}
              aria-label="Step timeout multiplier"
              data-testid="timeout-multiplier-slider"
            />
            <span className="practice-config__value">×{config.stepTimeoutMultiplier}</span>
          </div>
          <span className="practice-config__unit">× note duration</span>
        </Section>
      )}
      </>
      )}
    </aside>
  );
}
