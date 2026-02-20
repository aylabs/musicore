import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreloadedScoreList } from './PreloadedScoreList';
import { PRELOADED_SCORES } from '../../data/preloadedScores';

describe('PreloadedScoreList', () => {
  it('renders all preloaded scores', () => {
    render(
      <PreloadedScoreList
        scores={PRELOADED_SCORES}
        onSelect={vi.fn()}
      />,
    );

    for (const score of PRELOADED_SCORES) {
      expect(screen.getByText(score.displayName)).toBeInTheDocument();
    }
  });

  it('calls onSelect with the correct score when an item is clicked', () => {
    const onSelect = vi.fn();
    render(
      <PreloadedScoreList
        scores={PRELOADED_SCORES}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('Bach — Invention No. 1'));
    expect(onSelect).toHaveBeenCalledWith(PRELOADED_SCORES[0]);
  });

  it('highlights the selected score', () => {
    render(
      <PreloadedScoreList
        scores={PRELOADED_SCORES}
        selectedId="bach-invention-1"
        onSelect={vi.fn()}
      />,
    );

    const item = screen.getByText('Bach — Invention No. 1').closest('[data-selected]');
    expect(item).toHaveAttribute('data-selected', 'true');
  });

  it('disables all items when disabled=true', () => {
    render(
      <PreloadedScoreList
        scores={PRELOADED_SCORES}
        onSelect={vi.fn()}
        disabled
      />,
    );

    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });
});
