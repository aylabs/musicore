# Quickstart: Piano Practice Exercise

**Feature**: 001-piano-practice  
**Date**: 2026-02-22  
**Branch**: `001-piano-practice`

Everything runs in the existing Vite + Vitest + React setup. No new tools or dependencies are required.

---

## Prerequisites

- Node.js 22+, npm 10+
- Existing project already cloned and `npm ci` run in `frontend/`
- WASM built: `cd backend && wasm-pack build --target web --out-dir pkg --release`

---

## Run the dev server

```bash
cd frontend
npm run dev
```

Open `https://localhost:5173/?debug=true` (HTTPS for mic access on LAN).

The **Practice** button appears in the score viewer toolbar when `?debug=true` is in the URL.

---

## Run the tests

```bash
cd frontend
npm test -- --run
```

New test files added by this feature:

```
src/services/practice/exerciseGenerator.test.ts
src/services/practice/exerciseScorer.test.ts
src/services/practice/usePracticeRecorder.test.ts
src/components/practice/PracticeView.test.tsx
```

---

## Key source locations

| File | Purpose |
|------|---------|
| `src/types/practice.ts` | All domain types (Exercise, ResponseNote, NoteComparison, …) |
| `src/services/practice/exerciseGenerator.ts` | Random exercise generation |
| `src/services/practice/exerciseScorer.ts` | Beat-slot alignment + scoring algorithm |
| `src/services/practice/usePracticeRecorder.ts` | Mic hook (starts on mount, captures during playback) |
| `src/components/practice/PracticeView.tsx` | Main view component |
| `src/components/practice/PracticeView.css` | Styles |
| `src/components/practice/ExerciseResultsView.tsx` | Results report component |
| `src/App.tsx` | `showPractice` routing flag (same pattern as `showRecording`) |
| `src/components/ScoreViewer.tsx` | "Practice" debug button |

---

## Try the feature manually

1. Open `https://localhost:5173/?debug=true`
2. Grant microphone permission when the browser prompts
3. Click **Practice** in the toolbar
4. The practice view opens with an 8-note exercise staff (C3–C4)
5. Click **▶ Play** — notes highlight in sequence with audio tones
6. Play along on your piano; notes appear on the response staff
7. When playback finishes (or you press **■ Stop**), the results report appears
8. Review per-note feedback and your score (0–100)
9. Press **Try Again** to retry the same exercise or **New Exercise** for a new one
