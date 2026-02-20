import type { PreloadedScore } from '../../data/preloadedScores';

interface PreloadedScoreListProps {
  scores: ReadonlyArray<PreloadedScore>;
  selectedId?: string;
  disabled?: boolean;
  onSelect: (score: PreloadedScore) => void;
}

/**
 * Renders the left-panel list of bundled scores inside LoadScoreDialog.
 * Feature 028: Load Score Dialog — User Story 2.
 */
export function PreloadedScoreList({
  scores,
  selectedId,
  disabled = false,
  onSelect,
}: PreloadedScoreListProps) {
  return (
    <ul className="preloaded-score-list" role="list">
      {scores.map((score) => {
        const isSelected = score.id === selectedId;
        return (
          <li key={score.id}>
            <button
              className={`preloaded-score-item${isSelected ? ' preloaded-score-item--selected' : ''}`}
              data-selected={isSelected ? 'true' : 'false'}
              disabled={disabled}
              onClick={() => onSelect(score)}
            >
              {score.displayName}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
