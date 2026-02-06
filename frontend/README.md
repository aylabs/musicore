# Musicore Frontend

React + TypeScript frontend for the Musicore music score editor, built with Vite.

## Overview

The frontend provides a complete UI for:
- Creating and viewing musical scores
- Adding instruments, staves, and voices
- Managing notes with MIDI pitch values
- Displaying score hierarchies with proper formatting
- Real-time interaction with the backend REST API

## Tech Stack

- **React 18** - UI library with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Fetch API** - REST API communication

## Prerequisites

- Node.js 18+ (with npm)
- Backend API running on http://localhost:8080

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5173

### 3. Start the Backend API

**Important**: The frontend requires the backend API to be running.

```bash
# In the backend directory
cd ../backend
cargo run
```

Backend will start at http://localhost:8080

## Project Structure

```
frontend/
├── src/
│   ├── components/         # React components
│   │   ├── ScoreViewer.tsx     # Main score display
│   │   ├── InstrumentList.tsx  # Instrument management
│   │   ├── NoteDisplay.tsx     # Note display and editing
│   │   └── *.css               # Component styles
│   ├── services/           # API client
│   │   └── score-api.ts        # ScoreApiClient class
│   ├── types/              # TypeScript types
│   │   └── score.ts            # Domain entity types
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── package.json
├── tsconfig.json           # TypeScript config
└── vite.config.ts         # Vite config
```

## Features

### Score Management
- Create new scores with default settings (120 BPM, 4/4 time)
- View full score hierarchy
- Display tempo and time signature

### Instrument Management
- Add instruments with custom names (e.g., "Piano", "Violin")
- View instrument details
- Expand/collapse instrument sections

### Staff & Voice Management
- Add multiple staves to instruments (multi-staff support)
- Add multiple voices to staves (polyphonic support)
- Display clef and key signature for each staff

### Note Management
- Add notes with:
  - **Tick** - Time position at 960 PPQ
  - **Duration** - Note length in ticks (960 = quarter note)
  - **Pitch** - MIDI pitch (0-127)
- Display notes with:
  - Note name (e.g., "C4", "F#5")
  - MIDI number
  - Measure:Beat:Tick format
- Validation:
  - Pitch range (0-127)
  - Duration > 0
  - Overlap detection (same pitch in voice)

## API Integration

The frontend connects to the backend API using the `ScoreApiClient` class:

```typescript
import { apiClient } from './services/score-api';

// Create a score
const score = await apiClient.createScore({ title: "My Score" });

// Add an instrument
const piano = await apiClient.addInstrument(score.id, { name: "Piano" });

// Add a note
const note = await apiClient.addNote(
  score.id, 
  piano.id, 
  piano.staves[0].id, 
  piano.staves[0].voices[0].id,
  { tick: 0, duration_ticks: 960, pitch: 60 }
);
```

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Type check
npm run tsc
```

## Type Safety

All types mirror the backend domain model:

- `Score` - Aggregate root with instruments and events
- `Instrument` - Contains staves
- `Staff` - Contains voices and staff events
- `Voice` - Contains notes
- `Note` - Interval event with tick, duration, pitch
- `TempoEvent`, `TimeSignatureEvent` - Global events
- `ClefEvent`, `KeySignatureEvent` - Staff-scoped events

See [`src/types/score.ts`](src/types/score.ts) for full type definitions.

## Configuration

### Backend API URL

Default: `http://localhost:8080`

To change, update the `ScoreApiClient` instantiation in `src/services/score-api.ts`:

```typescript
export const apiClient = new ScoreApiClient("http://your-backend-url");
```

### Vite Configuration

See [`vite.config.ts`](vite.config.ts) for build and dev server settings.

## Troubleshooting

### "Failed to fetch" errors

- Ensure backend is running: `cd ../backend && cargo run`
- Check backend is on port 8080
- Verify CORS is enabled in backend (it is by default)

### TypeScript errors

```bash
# Re-install dependencies
npm ci

# Type check
npm run tsc
```

### Vite not starting

```bash
# Clear cache
rm -rf node_modules
npm install
```

## Building for Production

```bash
# Build optimized bundle
npm run build

# Output is in dist/
ls -la dist/

# Test production build locally
npm run preview
```

## Contributing

- Follow TypeScript strict mode
- Add JSDoc comments to public functions
- Use React hooks for state management
- Handle loading and error states
- Validate user input

## Architecture

### Component Hierarchy

```
App
└── ScoreViewer
    └── InstrumentList
        └── NoteDisplay
```

### State Management

- **Local state** with useState for component-level data
- **API calls** trigger re-fetches to sync with backend
- **Error handling** at component level with user-friendly messages

### Styling

- CSS modules per component
- Consistent color scheme (green for primary actions)
- Responsive grid layouts for notes
- Hover effects and transitions

---

**Version**: 0.1.0  
**Last Updated**: 2026-02-06  
**Status**: ✅ Phase 9 Complete - Full frontend integration with backend API
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
