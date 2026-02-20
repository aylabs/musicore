/**
 * Manifest of preloaded scores bundled with the app.
 * Files are served from /scores/ (symlinked from frontend/public/scores/ → ../../scores).
 *
 * Feature 028: Load Score Dialog
 */
export interface PreloadedScore {
  id: string;
  displayName: string;
  /** Absolute path served by Vite / Nginx (e.g. "/scores/Bach_InventionNo1.mxl") */
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
