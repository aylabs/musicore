/**
 * Preloaded Scores Manifest — Feature 028
 *
 * Static compile-time configuration. Not fetched from a server.
 * Lives at: frontend/src/data/preloadedScores.ts
 *
 * Files must be present at frontend/public/scores/ (symlink or copy of /scores/).
 * Service worker precaches all .mxl files via the Workbox globPattern extended in vite.config.ts.
 */

/** A bundled score available for immediate selection in the Load Score dialog. */
export interface PreloadedScore {
  /** Stable, unique kebab-case identifier. */
  id: string;
  /** Human-readable display name shown in the dialog list. */
  displayName: string;
  /** Absolute URL path served at runtime. Must start with /scores/ and end with .mxl */
  path: string;
}

export const PRELOADED_SCORES: ReadonlyArray<PreloadedScore> = [
  {
    id: 'bach-invention-1',
    displayName: 'Bach — Invention No. 1',
    path: '/scores/Bach_InventionNo1.mxl',
  },
  {
    id: 'beethoven-fur-elise',
    displayName: 'Beethoven — Für Elise',
    path: '/scores/Beethoven_FurElise.mxl',
  },
  {
    id: 'burgmuller-arabesque',
    displayName: 'Burgmüller — Arabesque',
    path: '/scores/Burgmuller_Arabesque.mxl',
  },
  {
    id: 'burgmuller-la-candeur',
    displayName: 'Burgmüller — La Candeur',
    path: '/scores/Burgmuller_LaCandeur.mxl',
  },
  {
    id: 'chopin-nocturne-op9-2',
    displayName: 'Chopin — Nocturne Op. 9 No. 2',
    path: '/scores/Chopin_NocturneOp9No2.mxl',
  },
  {
    id: 'pachelbel-canon-d',
    displayName: 'Pachelbel — Canon in D',
    path: '/scores/Pachelbel_CanonD.mxl',
  },
] as const;

// ─── Component prop contracts ───────────────────────────────────────────────

import type { ImportResult } from '../../../frontend/src/services/import/MusicXMLImportService';

/** Props for the top-level button that opens the dialog. */
export interface LoadScoreButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/** Props for the modal dialog. Parent controls open/close state. */
export interface LoadScoreDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called by both the preloaded flow and the file-picker flow on success. */
  onImportComplete: (result: ImportResult) => void;
}

/** Props for the preloaded score list panel. */
export interface PreloadedScoreListProps {
  scores: ReadonlyArray<PreloadedScore>;
  /** id of the score currently being fetched, or null. */
  loadingId: string | null;
  onSelect: (score: PreloadedScore) => void;
  /** True while any load operation is in progress — disables all items. */
  disabled: boolean;
}

/** Props for the Load New Score button (wraps file picker + useImportMusicXML). */
export interface LoadNewScoreButtonProps {
  onImportComplete: (result: ImportResult) => void;
  disabled?: boolean;
}
