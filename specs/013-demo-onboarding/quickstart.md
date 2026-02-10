# Developer Quickstart: Demo Music Onboarding

**Feature**: 013-demo-onboarding  
**Branch**: `013-demo-onboarding`  
**Related Docs**: [Spec](spec.md) | [Plan](plan.md) | [Research](research.md) | [Data Model](data-model.md) | [Contracts](contracts/)

## Overview

This guide helps developers implement first-run onboarding with pre-loaded Canon D demo and default stacked view mode. It covers setup, implementation patterns, testing, and acceptance criteria validation.

---

## Prerequisites

### Required Knowledge
- TypeScript / React (existing codebase familiarity)
- Local Storage API (browser native)
- React Hooks (`useState`, `useEffect`)
- Existing features:
  - Feature 010: Stacked Staves View (view mode switching UI)
  - Feature 011: WASM Music Engine (MusicXML parsing, score storage)
  - Feature 012: PWA Distribution (service worker, offline capability)

### Environment Setup
```bash
# Ensure you're on the feature branch
git checkout 013-demo-onboarding

# Install dependencies (if not already)
cd frontend
npm install

# Build WASM module (Feature 011 dependency)
npm run build:wasm

# Start development server
npm run dev
```

---

## Implementation Roadmap

### Phase 1: Bundle Demo Asset (20 min)
1. Copy `tests/fixtures/musicxml/CanonD.musicxml` to `frontend/public/demo/CanonD.musicxml`
2. Verify file size (~200KB)
3. Test asset accessibility: `http://localhost:5173/demo/CanonD.musicxml`
4. Confirm service worker caching (check Network tab: cached after first load)

### Phase 2: Implement Storage Adapters (1-2 hours)
1. Create `frontend/src/services/storage/preferences.ts`
2. Implement `LocalStorageFirstRunAdapter` (see [contracts/storage.ts](contracts/storage.ts))
3. Implement `LocalStorageViewModeAdapter`
4. Write unit tests: `frontend/tests/unit/preferences.test.ts`
   - Test first-run detection
   - Test view mode persistence
   - Test error handling (localStorage disabled, quota exceeded, corrupted JSON)

### Phase 3: Implement Demo Loader (1-2 hours)
1. Create `frontend/src/services/onboarding/demoLoader.ts`
2. Implement `DemoLoaderService` (see [contracts/services.ts](contracts/services.ts))
3. Integrate with existing WASM music engine (Feature 011)
4. Add demo metadata to score storage
5. Write unit tests: `frontend/tests/unit/demoLoader.test.ts`
   - Mock fetch API
   - Test parsing success/failure
   - Test storage integration

### Phase 4: Implement Onboarding Service (1-2 hours)
1. Create `frontend/src/services/onboarding/OnboardingService.ts`
2. Implement orchestration logic (initialize → loadDemo → setViewMode → markComplete)
3. Add timeout handling (5-second max for demo load)
4. Write unit tests: `frontend/tests/unit/OnboardingService.test.ts`
   - Mock storage and loader services
   - Test first-run vs returning user flows
   - Test error scenarios (demo load fails → app continues)

### Phase 5: Create React Hook (1 hour)
1. Create `frontend/src/hooks/useOnboarding.ts`
2. Implement `useOnboarding` hook (see [contracts/types.ts](contracts/types.ts))
3. Initialize services, manage state, expose view mode controls
4. Write hook tests: `frontend/tests/unit/useOnboarding.test.ts`
   - Use React Testing Library `renderHook`
   - Test state initialization
   - Test view mode switching

### Phase 6: Integrate with App (1 hour)
1. Modify `frontend/src/App.tsx`
2. Add `useOnboarding` hook call
3. Pass `viewMode` state to existing stacked view components
4. Handle loading/error states (optional UI)
5. Manual testing: Clear localStorage, reload app → Canon D loads in stacked view

### Phase 7: Integration Testing (1-2 hours)
1. Create `frontend/tests/integration/onboarding-flow.test.tsx`
2. Test end-to-end first-run flow:
   - Clear storage → launch app → verify demo loaded → verify stacked view
3. Test returning user flow:
   - Set preference → reload app → verify preference restored
4. Test view mode switching persistence
5. Test demo deletion and reload (P3 feature, if implementing)

### Phase 8: Manual QA (1 hour)
1. Test on fresh browser profile (clear all data)
2. Test in private/incognito mode
3. Test on physical devices (iPad, Android tablet)
4. Test offline mode (disconnect network after initial load)
5. Test localStorage disabled scenario
6. Verify performance metrics (see Success Criteria)

---

## Implementation Patterns

### Pattern 1: First-Run Detection

```typescript
// frontend/src/services/storage/preferences.ts
import { IFirstRunStorage, FirstRunState } from '@/specs/013-demo-onboarding/contracts/storage';

export class LocalStorageFirstRunAdapter implements IFirstRunStorage {
  private readonly KEY = 'musicore_firstRun';
  
  isFirstRun(): boolean {
    try {
      const stored = localStorage.getItem(this.KEY);
      if (stored === null) return true; // Never set = first run
      
      const state: FirstRunState = JSON.parse(stored);
      return state.isFirstRun;
    } catch (error) {
      console.warn('First-run check failed, assuming first run:', error);
      return true; // Fail-safe: treat unclear state as first run
    }
  }
  
  markFirstRunComplete(version?: string): void {
    try {
      const state: FirstRunState = {
        isFirstRun: false,
        firstRunDate: new Date().toISOString(),
        firstRunVersion: version
      };
      localStorage.setItem(this.KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to mark first-run complete:', error);
      // Non-blocking: app continues even if persistence fails
    }
  }
  
  // ... other methods from IFirstRunStorage
}
```

### Pattern 2: Demo Loading with Timeout

```typescript
// frontend/src/services/onboarding/demoLoader.ts
import { IDemoLoaderService, DemoLoadingError } from '@/specs/013-demo-onboarding/contracts/services';
import { DemoScoreMetadata } from '@/specs/013-demo-onboarding/contracts/types';
import { musicEngine } from '@/services/wasm/music-engine'; // Feature 011
import { scoreStorage } from '@/services/storage/score-storage'; // Feature 011

export class DemoLoaderService implements IDemoLoaderService {
  private readonly DEMO_PATH = '/demo/CanonD.musicxml';
  
  async loadBundledDemo(): Promise<DemoScoreMetadata> {
    try {
      // 1. Fetch bundled MusicXML
      const response = await fetch(this.DEMO_PATH);
      if (!response.ok) {
        throw this.createError('fetch_failed', `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const musicXML = await response.text();
      
      // 2. Parse via WASM engine (Feature 011)
      const parsedScore = await musicEngine.parseMusicXML(musicXML);
      
      // 3. Validate score structure
      if (parsedScore.instruments.length < 4) {
        throw this.createError('parse_failed', 'Demo must have ≥4 instruments');
      }
      
      // 4. Add demo metadata
      const demoScore: DemoScoreMetadata = {
        ...parsedScore,
        isDemoScore: true,
        sourceType: 'bundled',
        bundledPath: this.DEMO_PATH,
        loadedDate: new Date().toISOString()
      };
      
      // 5. Store in IndexedDB (Feature 011)
      await scoreStorage.save(demoScore);
      
      return demoScore;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }
  
  private createError(type: string, message: string): DemoLoadingError {
    return { type: type as any, message };
  }
  
  private normalizeError(error: any): DemoLoadingError {
    if (error.type) return error;
    return {
      type: 'parse_failed',
      message: error.message || 'Unknown demo loading error',
      originalError: error
    };
  }
  
  // ... other methods from IDemoLoaderService
}
```

### Pattern 3: Onboarding Orchestration

```typescript
// frontend/src/services/onboarding/OnboardingService.ts
import { IOnboardingService } from '@/specs/013-demo-onboarding/contracts/services';
import { OnboardingConfig } from '@/specs/013-demo-onboarding/contracts/types';

const config: OnboardingConfig = {
  defaultViewMode: 'stacked',
  demoBundlePath: '/demo/CanonD.musicxml',
  enableDemoReload: false, // MVP/P1: no demo reload UI
  firstRunTimeoutMs: 5000
};

export class OnboardingService implements IOnboardingService {
  constructor(
    private firstRunStorage: IFirstRunStorage,
    private viewModeStorage: IViewModePreferenceStorage,
    private demoLoader: IDemoLoaderService
  ) {}
  
  async initialize(): Promise<void> {
    try {
      if (this.firstRunStorage.isFirstRun()) {
        console.log('[Onboarding] First run detected');
        
        // Load demo with timeout
        await this.loadDemoWithTimeout();
        
        // Set default view mode
        this.viewModeStorage.setViewMode('stacked', 'onboarding');
        
        // Mark first run complete
        this.firstRunStorage.markFirstRunComplete('1.0.0'); // Get from package.json
        
        console.log('[Onboarding] First run complete');
      } else {
        console.log('[Onboarding] Returning user, skipping initialization');
      }
    } catch (error) {
      console.error('[Onboarding] Initialization failed (non-blocking):', error);
      // App continues - user can import music manually
    }
  }
  
  private async loadDemoWithTimeout(): Promise<void> {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => {
        reject({
          type: 'timeout',
          message: `Demo loading exceeded ${config.firstRunTimeoutMs}ms`
        });
      }, config.firstRunTimeoutMs);
    });
    
    await Promise.race([
      this.demoLoader.loadBundledDemo(),
      timeout
    ]);
  }
  
  getConfig(): OnboardingConfig {
    return config;
  }
}
```

### Pattern 4: React Hook Integration

```typescript
// frontend/src/hooks/useOnboarding.ts
import { useState, useEffect } from 'react';
import { ViewMode, OnboardingHookResult } from '@/specs/013-demo-onboarding/contracts/types';
import { onboardingService } from '@/services/onboarding/OnboardingService';
import { viewModeStorage } from '@/services/storage/preferences';

export function useOnboarding(): OnboardingHookResult {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Lazy initializer: read preference from LocalStorage on mount
    return viewModeStorage.getViewMode(); // Defaults to "stacked"
  });
  
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  
  // Initialize onboarding on mount
  useEffect(() => {
    async function init() {
      try {
        setIsDemoLoading(true);
        await onboardingService.initialize();
      } catch (error: any) {
        setDemoError(error.message || 'Demo loading failed');
      } finally {
        setIsDemoLoading(false);
      }
    }
    
    init();
  }, []);
  
  // Persist view mode changes
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    viewModeStorage.setViewMode(mode, 'user');
  };
  
  return {
    viewMode,
    setViewMode,
    isFirstRun,
    isDemoLoading,
    demoError
  };
}
```

### Pattern 5: App Integration

```typescript
// frontend/src/App.tsx
import { useOnboarding } from '@/hooks/useOnboarding';
import { StackedStaffView } from '@/components/stacked/StackedStaffView'; // Feature 010
import { ViewModeSelector } from '@/components/stacked/ViewModeSelector'; // Feature 010

export function App() {
  const { viewMode, setViewMode, isDemoLoading, demoError } = useOnboarding();
  
  return (
    <div className="app">
      <header>
        <ViewModeSelector 
          currentMode={viewMode} 
          onModeChange={setViewMode} 
        />
      </header>
      
      {isDemoLoading && <div>Loading demo music...</div>}
      {demoError && <div className="error">Demo unavailable: {demoError}</div>}
      
      <main>
        {viewMode === 'stacked' ? (
          <StackedStaffView />
        ) : (
          <SingleInstrumentView />
        )}
      </main>
    </div>
  );
}
```

---

## Testing Guidelines

### Unit Test Example: First-Run Detection

```typescript
// frontend/tests/unit/preferences.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageFirstRunAdapter } from '@/services/storage/preferences';

describe('LocalStorageFirstRunAdapter', () => {
  let adapter: LocalStorageFirstRunAdapter;
  
  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageFirstRunAdapter();
  });
  
  it('should return true for first run when no state exists', () => {
    expect(adapter.isFirstRun()).toBe(true);
  });
  
  it('should return false after marking first run complete', () => {
    adapter.markFirstRunComplete('1.0.0');
    expect(adapter.isFirstRun()).toBe(false);
  });
  
  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('musicore_firstRun', 'invalid JSON{');
    expect(adapter.isFirstRun()).toBe(true); // Fail-safe: treat as first run
  });
  
  it('should store first-run date when marking complete', () => {
    adapter.markFirstRunComplete('1.0.0');
    const state = adapter.getFirstRunState();
    expect(state).toMatchObject({
      isFirstRun: false,
      firstRunVersion: '1.0.0'
    });
    expect(state?.firstRunDate).toBeTruthy();
  });
});
```

### Integration Test Example: Onboarding Flow

```typescript
// frontend/tests/integration/onboarding-flow.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '@/App';
import { scoreStorage } from '@/services/storage/score-storage';

describe('Onboarding Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    // Clear IndexedDB scores
  });
  
  it('should load Canon D on first run', async () => {
    render(<App />);
    
    // Wait for demo loading
    await waitFor(() => {
      expect(screen.queryByText(/loading demo/i)).not.toBeInTheDocument();
    }, { timeout: 6000 });
    
    // Verify demo score in library
    const scores = await scoreStorage.getAll();
    const demoScore = scores.find(s => s.isDemoScore);
    expect(demoScore).toBeTruthy();
    expect(demoScore?.title).toContain('Canon');
  });
  
  it('should default to stacked view on first run', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveAttribute('data-view-mode', 'stacked');
    });
  });
  
  it('should restore view mode preference on subsequent launches', async () => {
    // Simulate returning user
    localStorage.setItem('musicore_firstRun', JSON.stringify({ isFirstRun: false, firstRunDate: new Date().toISOString() }));
    localStorage.setItem('musicore_viewMode', JSON.stringify({ mode: 'single', lastUpdated: new Date().toISOString(), source: 'user' }));
    
    render(<App />);
    
    expect(screen.getByRole('main')).toHaveAttribute('data-view-mode', 'single');
  });
});
```

---

## Success Criteria Validation

| Criteria | Target | Validation Method |
|----------|--------|-------------------|
| SC-001: First-run to playable | <5 seconds | Performance.now() measurement in integration test |
| SC-002: User engagement | 80% interact with playback | Analytics tracking (optional for MVP) |
| SC-003: Preference persistence | 100% of restarts | Automated integration test (view mode restore) |
| SC-004: Demo load success | 99% of initializations | Error rate monitoring + integration test |
| SC-005: Preference remembered | 100% of sessions | Automated test (set → reload → verify) |
| SC-006: Bundle size impact | <500KB | Check `frontend/public/demo/CanonD.musicxml` file size |
| SC-007: Render time (3G) | <3 seconds | Lighthouse throttling + performance measurement |

### Performance Validation Script

```typescript
// Run in browser console after clearing storage
performance.mark('onboarding-start');
// ** Reload page **
// ... onboarding completes ...
performance.mark('onboarding-complete');
performance.measure('onboarding-duration', 'onboarding-start', 'onboarding-complete');
console.log(performance.getEntriesByName('onboarding-duration')[0].duration);
// Target: <5000ms
```

---

## Troubleshooting

### Issue: Demo not loading on first run
**Symptoms**: App launches but no Canon D in library  
**Debugging**:
1. Check browser console for errors
2. Verify `/demo/CanonD.musicxml` is accessible (Network tab)
3. Check IndexedDB (Application tab → IndexedDB → musicore → scores)
4. Review localStorage keys (`musicore_firstRun`, `musicore_viewMode`)

**Common Causes**:
- Service worker not caching demo asset (check Feature 012 implementation)
- WASM parser error (invalid MusicXML)
- localStorage disabled (private mode)

### Issue: View mode not persisting
**Symptoms**: Always defaults to stacked view on reload  
**Debugging**:
1. Check localStorage value: `localStorage.getItem('musicore_viewMode')`
2. Verify `setViewMode` calls in useEffect dependency array
3. Check for localStorage quota exceeded errors

### Issue: First-run triggers every session
**Symptoms**: Demo loads on every app launch  
**Debugging**:
1. Check if localStorage is disabled (private browsing mode)
2. Verify `markFirstRunComplete()` is called after demo load
3. Check localStorage value: `localStorage.getItem('musicore_firstRun')`

---

## Acceptance Criteria Checklist

**Feature Spec Requirements**:
- [ ] FR-001: Detect first-run status (no localStorage = first run)
- [ ] FR-002: Auto-load Canon D on first run from `/demo/CanonD.musicxml`
- [ ] FR-003: Set default view mode to stacked on first run
- [ ] FR-004: Persist view mode preference in localStorage
- [ ] FR-005: Restore view mode preference on app launch
- [ ] FR-006: Canon D includes full playback data (notes, timing, tempo, instruments)
- [ ] FR-007: Optional "Reload Demo" feature (P3 - may defer to future)
- [ ] FR-008: Graceful error handling if demo fails (non-blocking)
- [ ] FR-009: View mode applies globally to all scores
- [ ] FR-010: Demo maintained in library after first run

**User Stories**:
- [ ] P1: User can play Canon D within 5 seconds of first launch
- [ ] P1: Playback, tempo, and scroll all work with demo
- [ ] P1: All 4 instruments visible in stacked view
- [ ] P2: View mode persists across sessions
- [ ] P2: New imports open in last-used view mode
- [ ] P3: "Load Demo" button reloads Canon D (if implementing P3)

**Constitution Compliance**:
- [ ] DDD: Domain entities unchanged (Score, Instrument, etc.)
- [ ] Hexagonal: Ports/adapters correctly separated
- [ ] PWA: Offline-capable, enhances PWA UX
- [ ] Precision: No impact on 960 PPQ or music timing
- [ ] Tests: Unit + integration tests written first (TDD)

---

## Next Steps After Implementation

1. **Run Full Test Suite**:
```bash
npm run test                  # Unit + integration tests
npm run test:coverage         # Verify >80% coverage for new code
```

2. **Manual QA on Devices**:
   - iPad (Safari standalone PWA)
   - Android tablet (Chrome)
   - Desktop browser (Edge, Chrome)

3. **Performance Validation**:
   - Lighthouse PWA audit (should maintain ≥90 score)
   - Network throttling test (3G): verify <3s render time
   - Bundle size check: `ls -lh frontend/public/demo/CanonD.musicxml`

4. **Create PR**:
   - Link to spec: `specs/013-demo-onboarding/spec.md`
   - Include test coverage report
   - Add screenshots/video of first-run UX
   - Document any deferred P3 features (demo reload)

5. **Deploy and Monitor**:
   - Merge to main → auto-deploy via Feature 012 workflow
   - Monitor error rates (demo loading failures)
   - Collect analytics on first-run completion rate (if tracking implemented)

---

**Quickstart Complete**: Follow this guide for systematic implementation. Refer to contracts for detailed interfaces and data-model.md for entity specifications.
