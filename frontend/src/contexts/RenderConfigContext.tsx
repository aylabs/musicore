import { createContext, useContext } from 'react';
import type { RenderConfig } from '../types/RenderConfig';

/**
 * Provides the active theme-derived RenderConfig to score rendering components.
 * App.tsx computes this from the active landing theme and provides it here.
 * LayoutView (→ pages/ScoreViewer → LayoutRenderer) consumes it.
 */
export const RenderConfigContext = createContext<RenderConfig | undefined>(undefined);

export function useRenderConfig(): RenderConfig | undefined {
  return useContext(RenderConfigContext);
}
