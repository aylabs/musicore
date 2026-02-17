# Quickstart: Offline Mode Implementation

**Feature**: 025-offline-mode
**Purpose**: Step-by-step implementation guide for offline parity
**Estimated Time**: 2-3 hours (with tests)

## Overview

This guide walks through implementing offline mode in the exact order shown. Each step includes:
- File location
- Specific changes needed
- Validation command
- Expected result

**Prerequisites**:
- Branch `025-offline-mode` checked out
- Backend WASM built (`cd backend && ./scripts/build-wasm.sh`)
- Frontend dependencies installed (`cd frontend && npm install`)

---

## Phase 1: Verify Precache Configuration (5 minutes)

### Step 1.1: Verify Vite PWA Config

**File**: `frontend/vite.config.ts`

**Check**: Search for `globPatterns` in the `VitePWA` plugin configuration.

**Expected**:
```typescript
VitePWA({
  workbox: {
    globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico,musicxml}'],
    // ↑ Should already include 'musicxml'
  }
})
```

**If missing**: Add `musicxml` to the extensions list.

**Validation**:
```bash
cd frontend
grep -A 5 "globPatterns" vite.config.ts
```

**Result**: `musicxml` should be in the list. If not, add it.

---

### Step 1.2: Verify Demo File Location

**File**: `frontend/public/music/CanonD.musicxml`

**Check**: Ensure the demo file exists in the public directory.

**Validation**:
```bash
ls -lh frontend/public/music/CanonD.musicxml
```

**Expected output**: File exists, ~40-50KB size.

**If missing**: Copy demo file to `frontend/public/music/CanonD.musicxml` from previous feature specs or test fixtures.

---

### Step 1.3: Build and Verify Precache Manifest

**Action**: Build the frontend to generate the service worker.

```bash
cd frontend
npm run build
```

**Validation**: Check that the demo file is in the precache manifest.

```bash
grep -A 200 "precache" dist/sw.js | grep "CanonD.musicxml"
```

**Expected output**: Line containing `"url": "/music/CanonD.musicxml"` or similar.

**If missing**: 
1. Verify Step 1.1 (globPatterns includes `musicxml`)
2. Verify Step 1.2 (file exists in `public/music/`)
3. Re-run `npm run build`

---

## Phase 2: Remove REST API Fallbacks (30 minutes)

### Step 2.1: Refactor ScoreViewer.loadScore()

**File**: `frontend/src/components/ScoreViewer.tsx`

**Current code** (~line 150-170):
```typescript
const loadScore = async (id: string) => {
  setLoading(true);
  setError(null);
  
  try {
    // Try IndexedDB first
    const localScore = await loadScoreFromIndexedDB(id);
    if (localScore) {
      setScore(localScore);
      setScoreId(id);
      setIsFileSourced(false);
      return;
    }
    
    // Fall back to REST API ← REMOVE THIS
    const remoteScore = await apiClient.getScore(id);
    setScore(remoteScore);
    setScoreId(id);
  } catch (err) {
    setError('Failed to load score');
  } finally {
    setLoading(false);
  }
};
```

**Refactored code**:
```typescript
const loadScore = async (id: string) => {
  setLoading(true);
  setError(null);
  
  try {
    const localScore = await loadScoreFromIndexedDB(id);
    if (localScore) {
      setScore(localScore);
      setScoreId(id);
      setIsFileSourced(false);
      setLoading(false);
      return;
    }
    
    // No score found — this is expected if user deleted it or navigated to wrong ID
    setError(
      'Score not found in local storage. Import a MusicXML file or load the demo.'
    );
  } catch (err) {
    setError('Failed to load score from local storage');
    console.error('[ScoreViewer] Load error:', err);
  } finally {
    setLoading(false);
  }
};
```

**Changes**:
1. Remove `apiClient.getScore(id)` fallback
2. Set clear error message if IndexedDB lookup fails
3. Add console.error for debugging

**Validation**:
```bash
cd frontend
grep -A 15 "const loadScore" src/components/ScoreViewer.tsx
```

**Expected**: No `apiClient.getScore` call. Error message for not found.

---

### Step 2.2: Delete syncLocalScoreToBackend()

**File**: `frontend/src/components/ScoreViewer.tsx`

**Current code** (~line 250-300):
```typescript
const syncLocalScoreToBackend = async (score: Score) => {
  try {
    // 1. Create score on backend
    const createdScore = await apiClient.createScore(score);
    
    // 2. Sync instruments
    for (const instrument of score.instruments) {
      await apiClient.createInstrument(createdScore.id, instrument);
      // ... more sync logic
    }
    
    // ... more sync logic
  } catch (err) {
    console.error('Sync failed:', err);
  }
};
```

**Action**: Delete the entire `syncLocalScoreToBackend` function.

**Validation**:
```bash
cd frontend
grep -n "syncLocalScoreToBackend" src/components/ScoreViewer.tsx
```

**Expected output**: No matches (grep returns no results).

---

### Step 2.3: Remove syncLocalScoreToBackend() Calls

**File**: `frontend/src/components/ScoreViewer.tsx`

**Current calls** (~line 200, in `handleMusicXMLImport`):
```typescript
const handleMusicXMLImport = async (result: ImportResult) => {
  try {
    // Save to IndexedDB
    await saveScoreToIndexedDB(result.score);
    
    // Sync to backend ← REMOVE THIS CALL
    await syncLocalScoreToBackend(result.score);
    
    setScore(result.score);
    setScoreId(result.score.id);
  } catch (err) {
    setError('Failed to import score');
  }
};
```

**Refactored code**:
```typescript
const handleMusicXMLImport = async (result: ImportResult) => {
  try {
    // Save to IndexedDB (this is the single source of truth)
    await saveScoreToIndexedDB(result.score);
    
    // Set state
    setScore(result.score);
    setScoreId(result.score.id);
    setIsFileSourced(true);
    
    // Show success message
    setSuccessMessage('Score imported successfully');
  } catch (err) {
    setError('Failed to save imported score');
    console.error('[ScoreViewer] Import error:', err);
  }
};
```

**Validation**:
```bash
cd frontend
grep -n "syncLocalScoreToBackend" src/components/ScoreViewer.tsx
```

**Expected output**: No matches.

---

### Step 2.4: Refactor createNewScore() to Use WASM

**File**: `frontend/src/components/ScoreViewer.tsx`

**Current code** (~line 350):
```typescript
const createNewScore = async () => {
  try {
    // Create via REST API ← REMOVE THIS
    const newScore = await apiClient.createScore({
      title: 'New Score',
      // ... other fields
    });
    
    setScore(newScore);
    setScoreId(newScore.id);
  } catch (err) {
    setError('Failed to create score');
  }
};
```

**Refactored code**:
```typescript
const createNewScore = async () => {
  try {
    // Use WASM to create empty score
    const wasmResult = await musicCoreAPI.createScore({
      title: 'New Score',
      composer: '',
      arranger: '',
    });
    
    if (!wasmResult.success || !wasmResult.score) {
      throw new Error(wasmResult.error || 'Failed to create score');
    }
    
    const newScore = wasmResult.score;
    
    // Save to IndexedDB
    await saveScoreToIndexedDB(newScore);
    
    // Set state
    setScore(newScore);
    setScoreId(newScore.id);
    setIsFileSourced(false);
    
    setSuccessMessage('New score created');
  } catch (err) {
    setError('Failed to create new score');
    console.error('[ScoreViewer] Create score error:', err);
  }
};
```

**Note**: Verify that `musicCoreAPI.createScore()` exists. If not, this may be a lower-priority path (most users import files, not create blank scores).

**Validation**:
```bash
cd frontend
grep -n "apiClient.createScore" src/components/ScoreViewer.tsx
```

**Expected output**: No matches.

---

### Step 2.5: Verify No Remaining apiClient Calls

**File**: `frontend/src/components/ScoreViewer.tsx`

**Validation**:
```bash
cd frontend
grep -n "apiClient" src/components/ScoreViewer.tsx
```

**Expected output**: 
- Import statement at top (OK to keep the class definition)
- No usage in component body

**If matches found**: Review each call and remove or replace with WASM/IndexedDB equivalent.

---

## Phase 3: Refactor demoLoader (20 minutes)

### Step 3.1: Add IndexedDB Fast Path

**File**: `frontend/src/services/onboarding/demoLoader.ts`

**Add helper method** (before `loadBundledDemo`):
```typescript
/**
 * Check if the demo is already in IndexedDB.
 * If found, returns it directly (avoids fetch and parse).
 */
private async getExistingDemo(): Promise<DemoScoreMetadata | null> {
  try {
    const allScores = await getAllScoresFromIndexedDB();
    const demo = allScores.find((s) => s.isDemoScore === true);
    return demo ? (demo as DemoScoreMetadata) : null;
  } catch (err) {
    console.error('[DemoLoader] Failed to check IndexedDB:', err);
    return null;
  }
}
```

**Validation**: Method compiles without errors.

---

### Step 3.2: Update loadBundledDemo() Logic

**File**: `frontend/src/services/onboarding/demoLoader.ts`

**Current code** (~line 75):
```typescript
async loadBundledDemo(): Promise<DemoScoreMetadata> {
  const response = await fetch(this.demoBundlePath);
  if (!response.ok) throw new Error('Failed to fetch demo');
  
  const musicXML = await response.text();
  const wasmResult = await parseMusicXML(musicXML);
  
  const score = { ...wasmResult.score, isDemoScore: true };
  await saveScoreToIndexedDB(score);
  
  return score as DemoScoreMetadata;
}
```

**Refactored code**:
```typescript
async loadBundledDemo(): Promise<DemoScoreMetadata> {
  // Fast path: Check if demo is already in IndexedDB
  const existingDemo = await this.getExistingDemo();
  if (existingDemo) {
    console.log('[DemoLoader] Demo already in IndexedDB');
    return existingDemo;
  }
  
  console.log('[DemoLoader] Demo not in IndexedDB, loading from cache');
  
  // Slow path: Load from service worker cache (precached file)
  // Note: fetch() here hits the service worker, which returns the precached file
  const response = await fetch(this.demoBundlePath);
  if (!response.ok) {
    throw new Error(
      'Demo file not available. Visit the app online first to enable offline demo.'
    );
  }
  
  const musicXML = await response.text();
  
  // Parse via WASM
  const wasmResult = await this.musicCoreAPI.parseMusicXML(musicXML);
  if (!wasmResult.success || !wasmResult.score) {
    throw new Error(wasmResult.error || 'Failed to parse demo MusicXML');
  }
  
  // Save to IndexedDB for future fast path
  const score = { ...wasmResult.score, isDemoScore: true };
  await saveScoreToIndexedDB(score);
  
  console.log('[DemoLoader] Demo parsed and saved to IndexedDB');
  return score as DemoScoreMetadata;
}
```

**Changes**:
1. Call `getExistingDemo()` first
2. Return cached demo if found (fast path)
3. Add logging for debugging
4. Improve error message for offline-first-visit case
5. Add WASM result validation

**Validation**:
```bash
cd frontend
grep -A 30 "async loadBundledDemo" src/services/onboarding/demoLoader.ts
```

**Expected**: Method includes `getExistingDemo()` call and improved error message.

---

## Phase 4: Update OfflineBanner (5 minutes)

### Step 4.1: Update Banner Message

**File**: `frontend/src/components/OfflineBanner.tsx`

**Current code** (~line 56):
```typescript
<div className="offline-banner">
  <InfoIcon />
  <span>You're offline. Changes will be saved locally.</span>
</div>
```

**Refactored code**:
```typescript
<div className="offline-banner">
  <InfoIcon />
  <span>You're offline — all features work normally</span>
</div>
```

**Validation**:
```bash
cd frontend
grep "You're offline" src/components/OfflineBanner.tsx
```

**Expected output**: Updated message.

---

## Phase 5: Write Tests (60 minutes)

### Step 5.1: Create Offline Mode Unit Test

**File**: `frontend/tests/offline-mode.test.ts` (new file)

**Content**:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOfflineDetection } from '../src/hooks/useOfflineDetection';

describe('Offline Mode Detection', () => {
  let onlineGetter: jest.SpyInstance;
  
  beforeEach(() => {
    // Mock navigator.onLine
    onlineGetter = vi.spyOn(navigator, 'onLine', 'get');
  });
  
  afterEach(() => {
    onlineGetter.mockRestore();
  });
  
  it('should detect online state initially', () => {
    onlineGetter.mockReturnValue(true);
    
    const { result } = renderHook(() => useOfflineDetection());
    
    expect(result.current).toBe(true);
  });
  
  it('should detect offline state initially', () => {
    onlineGetter.mockReturnValue(false);
    
    const { result } = renderHook(() => useOfflineDetection());
    
    expect(result.current).toBe(false);
  });
  
  it('should update state when going offline', async () => {
    onlineGetter.mockReturnValue(true);
    
    const { result } = renderHook(() => useOfflineDetection());
    expect(result.current).toBe(true);
    
    // Simulate going offline
    onlineGetter.mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
    
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
  
  it('should update state when going online', async () => {
    onlineGetter.mockReturnValue(false);
    
    const { result } = renderHook(() => useOfflineDetection());
    expect(result.current).toBe(false);
    
    // Simulate going online
    onlineGetter.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});

describe('OfflineBanner Component', () => {
  it('should display correct message when offline', () => {
    // Test implementation
    // (full test requires React testing setup)
  });
});

describe('DemoLoader Offline Behavior', () => {
  it('should return existing demo from IndexedDB', async () => {
    // Test implementation
    // Mock getAllScoresFromIndexedDB to return a demo
    // Verify no fetch() call made
  });
  
  it('should load from cache if not in IndexedDB', async () => {
    // Test implementation
    // Mock getAllScoresFromIndexedDB to return empty array
    // Mock fetch() to return cached MusicXML
    // Verify parseMusicXML called
    // Verify saveScoreToIndexedDB called
  });
  
  it('should throw clear error if cache not available', async () => {
    // Test implementation
    // Mock getAllScoresFromIndexedDB to return empty array
    // Mock fetch() to return 404
    // Verify error message mentions "visit online first"
  });
});

describe('ScoreViewer Offline Behavior', () => {
  it('should load score from IndexedDB only', async () => {
    // Test implementation
    // Mock loadScoreFromIndexedDB
    // Verify no network calls made
  });
  
  it('should show clear error if score not found', async () => {
    // Test implementation
    // Mock loadScoreFromIndexedDB to return null
    // Verify error message mentions "import from file"
  });
  
  it('should save imported score to IndexedDB without sync', async () => {
    // Test implementation
    // Simulate MusicXML import
    // Verify saveScoreToIndexedDB called
    // Verify NO apiClient calls made
  });
});
```

**Validation**:
```bash
cd frontend
npm run test -- offline-mode.test.ts
```

**Expected output**: All tests pass.

---

### Step 5.2: Create Regression Test

**File**: `frontend/tests/offline-regression.test.ts` (new file)

**Content**:
```typescript
import { describe, it, expect } from 'vitest';

/**
 * Regression tests for Feature 025: Offline Mode Parity
 * 
 * These tests ensure that removing REST API fallbacks did not break
 * existing functionality that should continue to work.
 */
describe('Feature 025: Offline Regression Tests', () => {
  it('should not have REST API calls in ScoreViewer', async () => {
    // Read ScoreViewer.tsx source
    const fs = await import('fs/promises');
    const path = await import('path');
    const scoreViewerPath = path.join(__dirname, '../src/components/ScoreViewer.tsx');
    const content = await fs.readFile(scoreViewerPath, 'utf-8');
    
    // Verify no apiClient method calls (except import)
    const apiCalls = content.match(/apiClient\.(get|create|update|delete)/g);
    expect(apiCalls).toBeNull(); // No REST calls
  });
  
  it('should not have syncLocalScoreToBackend function', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const scoreViewerPath = path.join(__dirname, '../src/components/ScoreViewer.tsx');
    const content = await fs.readFile(scoreViewerPath, 'utf-8');
    
    expect(content).not.toContain('syncLocalScoreToBackend');
  });
  
  it('should have musicxml in Vite PWA globPatterns', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const viteConfigPath = path.join(__dirname, '../vite.config.ts');
    const content = await fs.readFile(viteConfigPath, 'utf-8');
    
    expect(content).toContain('musicxml');
  });
  
  it('should have demo file in public directory', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const demoPath = path.join(__dirname, '../public/music/CanonD.musicxml');
    
    const exists = await fs.stat(demoPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
  
  it('should have updated offline banner message', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const bannerPath = path.join(__dirname, '../src/components/OfflineBanner.tsx');
    const content = await fs.readFile(bannerPath, 'utf-8');
    
    expect(content).toContain('all features work normally');
  });
});
```

**Validation**:
```bash
cd frontend
npm run test -- offline-regression.test.ts
```

**Expected output**: All tests pass.

---

## Phase 6: Manual Validation (30 minutes)

### Step 6.1: Build and Serve Production

```bash
cd frontend
npm run build
npm run preview
```

**Expected**: Server starts at `http://localhost:4173` (or similar).

---

### Step 6.2: Visit Online (Service Worker Install)

1. Open Chrome/Edge with DevTools
2. Navigate to `http://localhost:4173`
3. Open DevTools → Application → Service Workers
4. Verify service worker is "activated and running"

**Expected**: Service worker status shows "activated".

---

### Step 6.3: Verify Precache Manifest

1. DevTools → Application → Cache Storage
2. Find cache named `workbox-precache-v2-...` (or similar)
3. Verify entries include:
   - `/music/CanonD.musicxml`
   - `/wasm/musicore_backend_bg.wasm`
   - `/index.html`
   - JS/CSS bundles

**Expected**: Demo MusicXML file is in the precache.

---

### Step 6.4: Enable Offline Mode

1. DevTools → Network tab
2. Check "Offline" checkbox (throttling dropdown)
3. Reload the page

**Expected**: Page loads successfully from cache.

---

### Step 6.5: Test Demo Load (Offline)

1. Stay in offline mode
2. Tap "Demo" button
3. Observe DevTools Console for logs

**Expected**:
- Console shows `[DemoLoader] Demo not in IndexedDB, loading from cache` (first load)
- Demo score displays
- No network errors in Console or Network tab

**Second Demo Load**:
1. Close and reopen the score
2. Tap "Demo" again

**Expected**:
- Console shows `[DemoLoader] Demo already in IndexedDB` (fast path)
- Demo loads instantly (no fetch)

---

### Step 6.6: Test Banner Message

1. Stay in offline mode
2. Observe OfflineBanner at top of screen

**Expected**: Banner shows "You're offline — all features work normally"

---

### Step 6.7: Test MusicXML Import (Offline)

1. Stay in offline mode
2. Tap "Import" button
3. Select a MusicXML file from test fixtures
4. Observe score loads

**Expected**:
- Score displays
- No network errors
- Console shows `[ScoreViewer] Import successful` or similar

---

### Step 6.8: Test Score Load (Offline)

1. Note the score ID from Step 6.7 (visible in URL)
2. Refresh the page (or navigate away and back)
3. Verify score loads from IndexedDB

**Expected**:
- Score loads
- No network errors
- Console shows `[ScoreViewer] Score loaded from IndexedDB`

---

### Step 6.9: Test Score Not Found (Offline)

1. Navigate to a non-existent score ID: `http://localhost:4173/score/fake-id`
2. Observe error message

**Expected**:
- Error displays: "Score not found in local storage. Import a MusicXML file or load the demo."
- No network errors (no REST API fallback attempted)

---

### Step 6.10: Return Online and Verify

1. Uncheck "Offline" in DevTools Network tab
2. Reload page
3. Verify all features still work (no regressions)

**Expected**: No errors, all features functional.

---

## Phase 7: Commit and Push (5 minutes)

### Step 7.1: Review Changes

```bash
git status
git diff
```

**Expected files changed**:
- `frontend/src/components/ScoreViewer.tsx`
- `frontend/src/services/onboarding/demoLoader.ts`
- `frontend/src/components/OfflineBanner.tsx`
- `frontend/tests/offline-mode.test.ts` (new)
- `frontend/tests/offline-regression.test.ts` (new)
- Possibly `frontend/vite.config.ts` (if musicxml was missing)

---

### Step 7.2: Commit

```bash
git add -A
git commit -m "feat(offline): Remove REST fallbacks, add demo precache

- Refactor ScoreViewer to use IndexedDB only (no REST API fallbacks)
- Delete syncLocalScoreToBackend (no backend sync needed)
- Update demoLoader with IndexedDB fast path
- Verify demo MusicXML precached via Workbox
- Update OfflineBanner message to 'all features work normally'
- Add offline unit tests and regression tests

Addresses Feature 025: Offline Mode Parity
All core features now work identically online and offline."
```

---

### Step 7.3: Push

```bash
git push origin 025-offline-mode
```

---

## Validation Checklist

Before marking feature complete, verify:

- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes all tests (including new offline tests)
- [ ] `npm run lint` passes without errors
- [ ] Demo loads offline on first visit after online install
- [ ] Demo loads instantly on second offline visit (IndexedDB fast path)
- [ ] MusicXML import works offline
- [ ] Score load works offline (IndexedDB only, no REST fallback)
- [ ] Score "not found" shows clear error (no REST API attempts)
- [ ] OfflineBanner shows updated message
- [ ] DevTools Network tab shows zero requests when offline (after service worker install)
- [ ] No `apiClient` method calls in ScoreViewer.tsx
- [ ] No `syncLocalScoreToBackend` function exists
- [ ] `*.musicxml` in Vite PWA globPatterns
- [ ] `/music/CanonD.musicxml` in precache manifest (Chrome DevTools → Application → Cache Storage)

---

## Troubleshooting

### Problem: Demo fails to load offline

**Symptoms**: Network error when tapping "Demo" in offline mode.

**Diagnosis**:
1. Check DevTools → Application → Cache Storage
2. Verify `workbox-precache-v2-...` cache exists
3. Verify `/music/CanonD.musicxml` is in the cache

**Solutions**:
- If cache missing: User needs to visit online first (service worker not installed yet)
- If demo file not in cache: Verify `vite.config.ts` includes `musicxml` in globPatterns, rebuild
- If file not in `public/music/`: Copy demo file, rebuild

---

### Problem: Tests fail with "navigator.onLine is not defined"

**Symptoms**: Vitest crashes when running offline tests.

**Solution**: Add to `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
});
```

Create `tests/setup.ts`:
```typescript
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});
```

---

### Problem: Service worker not updating after changes

**Symptoms**: Old code runs even after build.

**Solution**:
1. DevTools → Application → Service Workers
2. Click "Unregister" next to the service worker
3. Close all tabs for the site
4. Reopen and verify new service worker installs

---

### Problem: IndexedDB fast path not working

**Symptoms**: Demo always fetches from cache, even on second load.

**Diagnosis**: Check `getExistingDemo()` logic — verify `isDemoScore: true` is set when saving.

**Solution**: In `demoLoader.ts`, ensure:
```typescript
const score = { ...wasmResult.score, isDemoScore: true };
await saveScoreToIndexedDB(score);
```

---

## Success Criteria

Feature 025 is complete when:

1. **FR-1**: Demo loads offline after one prior online visit ✅
2. **FR-2**: MusicXML import works offline ✅
3. **FR-3**: Playback works offline ✅ (no changes needed, already worked)
4. **FR-4**: No network requests for core features offline ✅
5. **FR-5**: Clear error if demo not cached ✅
6. **FR-6**: Banner shows "all features work normally" ✅
7. All tests pass (unit + regression) ✅
8. Manual validation checklist complete ✅

---

## Estimated Time Breakdown

- Phase 1: Verify precache config — 5 minutes
- Phase 2: Remove REST fallbacks — 30 minutes
- Phase 3: Refactor demoLoader — 20 minutes
- Phase 4: Update OfflineBanner — 5 minutes
- Phase 5: Write tests — 60 minutes
- Phase 6: Manual validation — 30 minutes
- Phase 7: Commit and push — 5 minutes

**Total**: ~2.5 hours (with tests and validation)

**Without tests** (P2 priority): ~1 hour
