import type { ButtonHTMLAttributes } from 'react';
import './LoadScoreButton.css';

interface LoadScoreButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void;
}

/**
 * Primary CTA button for the Load Score feature (Feature 028).
 * Replaces the old "Import Score" and "Demo" buttons on the landing screen.
 */
export function LoadScoreButton({
  onClick,
  disabled = false,
  'aria-label': ariaLabel,
  ...rest
}: LoadScoreButtonProps) {
  return (
    <button
      className="load-score-button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? 'Load Score'}
      {...rest}
    >
      🎵 Load Score
    </button>
  );
}
