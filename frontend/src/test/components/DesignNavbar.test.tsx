import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DesignNavbar } from '../../components/DesignNavbar';
import type { LandingTheme } from '../../themes/landing-themes';

// ---------------------------------------------------------------------------
// Minimal theme fixtures
// ---------------------------------------------------------------------------

function makeTheme(id: string, name: string): LandingTheme {
  return {
    id,
    name,
    cssClass: `theme-${id}`,
    palette: {
      bg: '#fff',
      heading: '#000',
      body: '#000',
      ctaBg: '#000',
      ctaText: '#fff',
      accent: '#000',
      navbarBg: '#eee',
      navbarActive: '#000',
      noteColor1: '#000',
      noteColor2: '#111',
      noteColor3: '#222',
    },
    typography: {
      fontHeading: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif",
      headingWeight: 700,
      bodyWeight: 400,
    },
  };
}

const THEMES: readonly LandingTheme[] = [
  makeTheme('ember', 'Ember'),
  makeTheme('saffron', 'Saffron'),
  makeTheme('sienna', 'Sienna'),
  makeTheme('terracotta', 'Terracotta'),
  makeTheme('paprika', 'Paprika'),
  makeTheme('honey', 'Honey'),
  makeTheme('coral', 'Coral'),
  makeTheme('marigold', 'Marigold'),
  makeTheme('blush', 'Blush'),
  makeTheme('rust', 'Rust'),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DesignNavbar', () => {
  /**
   * (a) renders exactly 10 tab buttons
   */
  it('renders exactly themes.length tab buttons', () => {
    render(
      <DesignNavbar
        themes={THEMES}
        activeThemeId="ember"
        onThemeChange={vi.fn()}
      />
    );
    const buttons = screen.getAllByRole('tab');
    expect(buttons).toHaveLength(10);
  });

  /**
   * (b) button matching activeThemeId has aria-selected="true"
   */
  it('marks the active theme button with aria-selected="true"', () => {
    render(
      <DesignNavbar
        themes={THEMES}
        activeThemeId="saffron"
        onThemeChange={vi.fn()}
      />
    );
    const activeBtn = screen.getByRole('tab', { name: 'Saffron' });
    expect(activeBtn).toHaveAttribute('aria-selected', 'true');

    // All other tabs must have aria-selected="false"
    const otherBtns = screen.getAllByRole('tab').filter(b => b !== activeBtn);
    otherBtns.forEach(btn => {
      expect(btn).toHaveAttribute('aria-selected', 'false');
    });
  });

  /**
   * (c) clicking a non-active tab calls onThemeChange with correct themeId
   */
  it('calls onThemeChange with the clicked theme id', async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();

    render(
      <DesignNavbar
        themes={THEMES}
        activeThemeId="ember"
        onThemeChange={onThemeChange}
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Honey' }));
    expect(onThemeChange).toHaveBeenCalledWith('honey');
    expect(onThemeChange).toHaveBeenCalledTimes(1);
  });

  /**
   * (d) pressing Enter on a focused tab calls onThemeChange
   */
  it('calls onThemeChange when Enter is pressed on a tab', async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();

    render(
      <DesignNavbar
        themes={THEMES}
        activeThemeId="ember"
        onThemeChange={onThemeChange}
      />
    );

    const coralBtn = screen.getByRole('tab', { name: 'Coral' });
    coralBtn.focus();
    await user.keyboard('{Enter}');
    expect(onThemeChange).toHaveBeenCalledWith('coral');
  });

  /**
   * (d-space) pressing Space on a focused tab calls onThemeChange
   */
  it('calls onThemeChange when Space is pressed on a tab', async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();

    render(
      <DesignNavbar
        themes={THEMES}
        activeThemeId="ember"
        onThemeChange={onThemeChange}
      />
    );

    const blushBtn = screen.getByRole('tab', { name: 'Blush' });
    blushBtn.focus();
    await user.keyboard(' ');
    expect(onThemeChange).toHaveBeenCalledWith('blush');
  });

  /**
   * (e) accessible structure — role="tablist" wrapper, role="tab" buttons
   */
  it('renders a nav with role="tablist" containing tab buttons', () => {
    render(
      <DesignNavbar
        themes={THEMES}
        activeThemeId="ember"
        onThemeChange={vi.fn()}
      />
    );
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
  });

  /**
   * (e2) nav element has an aria-label for screen readers
   */
  it('nav has aria-label="Design variants"', () => {
    render(
      <DesignNavbar
        themes={THEMES}
        activeThemeId="ember"
        onThemeChange={vi.fn()}
      />
    );
    const nav = screen.getByRole('tablist');
    expect(nav).toHaveAttribute('aria-label', 'Design variants');
  });

  /**
   * controlled component — does not manage its own active state
   */
  it('is a controlled component — does not update its own active state on click', () => {
    const onThemeChange = vi.fn();
    const { rerender } = render(
      <DesignNavbar
        themes={THEMES}
        activeThemeId="ember"
        onThemeChange={onThemeChange}
      />
    );

    // After rerender with different activeThemeId, the new tab should be selected
    rerender(
      <DesignNavbar
        themes={THEMES}
        activeThemeId="rust"
        onThemeChange={onThemeChange}
      />
    );

    const rustBtn = screen.getByRole('tab', { name: 'Rust' });
    expect(rustBtn).toHaveAttribute('aria-selected', 'true');

    const emberBtn = screen.getByRole('tab', { name: 'Ember' });
    expect(emberBtn).toHaveAttribute('aria-selected', 'false');
  });
});
