/**
 * Feature 027: Demo Flow UX
 * LayoutView component tests
 *
 * T018: LayoutView must NOT render the blue info bar ("Play View: All instruments")
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// T018 [US3]: LayoutView must not render the blue info bar
//
// Root cause: LayoutView.tsx renders a `styles.info` div with
// backgroundColor: '#e3f2fd' and text "Play View: All instruments (N)".
// This blue bar wastes vertical space on tablets (FR-008, SC-003).
//
// Strategy: static source analysis - check tsx source does not contain the strings.
// This test FAILS before T022 (source still has info div).
// This test PASSES after T022 (info div removed from source).
// ============================================================================

describe('[T018] BUG: LayoutView must not render the blue info bar', () => {
  it('LayoutView.tsx source code does not contain "Play View:" text', () => {
    const layoutViewPath = path.resolve(__dirname, 'LayoutView.tsx');
    const source = fs.readFileSync(layoutViewPath, 'utf-8');
    // Before T022: 'Play View:' string is in JSX template
    // After T022: removed entirely
    expect(source.includes('Play View:')).toBe(false);
  });

  it('LayoutView.tsx source code does not contain e3f2fd blue background', () => {
    const layoutViewPath = path.resolve(__dirname, 'LayoutView.tsx');
    const source = fs.readFileSync(layoutViewPath, 'utf-8');
    // Before T022: backgroundColor: '#e3f2fd' in styles.info
    // After T022: styles.info and its background removed
    expect(source.includes('e3f2fd')).toBe(false);
  });
});
