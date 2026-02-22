/**
 * ExerciseResultsView.tsx — Per-note results report for the Piano Practice feature.
 *
 * Feature: 001-piano-practice (T015)
 * FR-007: Per-note comparison table + final score
 * FR-008: Status icons for Correct / Wrong pitch / Wrong timing / Missed
 * FR-009: Extraneous notes listed separately
 * US2 acceptance scenarios: per-note status, 0–100 score, perfect=100, empty=0
 */

import type { ExerciseResult, Exercise, NoteComparisonStatus } from '../../types/practice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_ICON: Record<NoteComparisonStatus, string> = {
  correct:       '✅',
  'wrong-pitch': '⚠️',
  'wrong-timing': '⏱️',
  missed:        '❌',
  extraneous:    '➕',
};

const STATUS_LABEL: Record<NoteComparisonStatus, string> = {
  correct:        'Correct',
  'wrong-pitch':  'Wrong pitch',
  'wrong-timing': 'Wrong timing',
  missed:         'Missed',
  extraneous:     'Extraneous',
};

const MIDI_NOTE_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToName(midi: number): string {
  const name = MIDI_NOTE_NAME[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

function scoreColor(score: number): string {
  if (score >= 90) return '#2e7d32';  // green
  if (score >= 60) return '#f57f17';  // amber
  return '#c62828';                    // red
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExerciseResultsViewProps {
  result: ExerciseResult;
  exercise: Exercise;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExerciseResultsView({ result, exercise }: ExerciseResultsViewProps) {
  const { score, comparisons, extraneousNotes } = result;

  return (
    <div className="practice-results" data-testid="exercise-results-view">
      {/* ── Score headline ───────────────────────────────────────────── */}
      <div
        className="practice-results__score"
        data-testid="results-score"
        style={{ color: scoreColor(score) }}
        aria-label={`Score: ${score} out of 100`}
      >
        {score}
        <span className="practice-results__score-max">/100</span>
      </div>

      {/* ── Per-note table ───────────────────────────────────────────── */}
      <div className="practice-results__table-wrapper">
        <table
          className="practice-results__table"
          aria-label="Per-note comparison"
          data-testid="comparison-table"
        >
          <thead>
            <tr>
              <th>#</th>
              <th>Target</th>
              <th>Detected</th>
              <th>Status</th>
              <th>Pitch Δ (¢)</th>
              <th>Timing Δ (ms)</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((c, i) => (
              <tr
                key={i}
                className={`practice-results__row practice-results__row--${c.status}`}
                data-testid={`comparison-row-${i}`}
              >
                <td>{i + 1}</td>
                <td>{midiToName(exercise.notes[i].midiPitch)}</td>
                <td>
                  {c.response
                    ? `${midiToName(Math.round(c.response.midiCents / 100))} (${c.response.hz.toFixed(1)} Hz)`
                    : '—'}
                </td>
                <td aria-label={STATUS_LABEL[c.status]}>
                  <span className="practice-results__status-icon">
                    {STATUS_ICON[c.status]}
                  </span>{' '}
                  {STATUS_LABEL[c.status]}
                </td>
                <td>
                  {c.pitchDeviationCents !== null
                    ? Math.round(c.pitchDeviationCents)
                    : '—'}
                </td>
                <td>
                  {c.timingDeviationMs !== null
                    ? Math.round(c.timingDeviationMs)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Extraneous notes ─────────────────────────────────────────── */}
      {extraneousNotes.length > 0 && (
        <div
          className="practice-results__extraneous"
          data-testid="extraneous-notes"
          role="note"
        >
          <strong>Extraneous notes:</strong>{' '}
          {extraneousNotes.length} extra note{extraneousNotes.length !== 1 ? 's' : ''} played
          outside the beat windows — these reduced your score.
        </div>
      )}
    </div>
  );
}
