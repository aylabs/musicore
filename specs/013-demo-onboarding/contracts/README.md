# Contracts: Demo Music Onboarding

**Feature**: 013-demo-onboarding  
**Purpose**: TypeScript interface contracts for first-run detection, view mode preferences, and demo music loading  
**Related Docs**: [Data Model](../data-model.md) | [Plan](../plan.md) | [Research](../research.md)

## Overview

This directory contains TypeScript interface contracts that define the boundaries between application layers following Hexagonal Architecture principles. These contracts serve as the "ports" through which the application core communicates with infrastructure adapters (Local Storage, fetch API, WASM engine).

## Files

### [types.ts](./types.ts)
Core type definitions and data structures:
- `FirstRunState`: First-run tracking state
- `ViewModePreference`: View mode persistence model
- `DemoScoreMetadata`: Demo score identification
- `OnboardingConfig`: Static onboarding configuration
- `OnboardingHookResult`: React hook return type
- `DemoLoadingError`: Typed error handling

### [storage.ts](./storage.ts)
Storage port interfaces (adapters implement these):
- `IFirstRunStorage`: First-run flag persistence (Local Storage adapter)
- `IViewModePreferenceStorage`: View mode preference persistence (Local Storage adapter)
- Includes pseudo-code example implementations
- Documents error handling and browser compatibility

### [services.ts](./services.ts)
Service port interfaces (application services):
- `IDemoLoaderService`: Demo music loading and querying
- `IOnboardingService`: Onboarding orchestration (coordinates first-run flow)
- Includes pseudo-code example implementations
- Documents integration with existing Feature 011 services

## Architecture Notes

### Hexagonal Architecture Compliance

**Ports (Defined Here)**:
- Storage ports: `IFirstRunStorage`, `IViewModePreferenceStorage`
- Service ports: `IDemoLoaderService`, `IOnboardingService`

**Adapters (Implemented in Frontend)**:
- Local Storage adapters: `frontend/src/services/storage/preferences.ts`
- Demo loader adapter: `frontend/src/services/onboarding/demoLoader.ts`
- Onboarding orchestrator: `frontend/src/services/onboarding/OnboardingService.ts`

**Core Domain Dependencies**:
- ✅ Contracts do NOT depend on React, Vite, or browser APIs
- ✅ Adapters implement contracts, inject browser dependencies
- ✅ Domain logic isolated from infrastructure concerns

### Relationship to Existing Features

**Feature 011 (WASM Music Engine)**:
- Reuses: `parseMusicXML()` for demo score parsing
- Reuses: Score storage service for IndexedDB persistence
- Extends: Score metadata with `isDemoScore`, `sourceType` fields

**Feature 010 (Stacked Staves View)**:
- Reuses: `ViewModeSelector` component for mode switching
- Extends: View mode state initialization from persisted preference
- No changes to stacked view rendering logic

**Feature 012 (PWA Distribution)**:
- Reuses: Service worker caching for demo asset offline availability
- Reuses: Local Storage (PWA validated iOS Safari compatibility)
- Enhances: First-run user experience for installed PWA

## Usage Pattern

### Implementation Flow

1. **Define Adapters** (Implement contracts):
```typescript
// frontend/src/services/storage/preferences.ts
import { IFirstRunStorage, IViewModePreferenceStorage } from '@/contracts/storage';

class LocalStorageAdapter implements IFirstRunStorage, IViewModePreferenceStorage {
  // Implementation follows pseudo-code in storage.ts
}
```

2. **Inject Adapters into Services**:
```typescript
// frontend/src/services/onboarding/OnboardingService.ts
import { IOnboardingService } from '@/contracts/services';

class OnboardingService implements IOnboardingService {
  constructor(
    private firstRunStorage: IFirstRunStorage,
    private viewModeStorage: IViewModePreferenceStorage,
    private demoLoader: IDemoLoaderService
  ) {}
  // Implementation follows pseudo-code in services.ts
}
```

3. **Use in React Hook**:
```typescript
// frontend/src/hooks/useOnboarding.ts
import { OnboardingHookResult } from '@/contracts/types';

export function useOnboarding(): OnboardingHookResult {
  // Initialize services with adapters
  // Call onboardingService.initialize() on mount
  // Return view mode state and control functions
}
```

## Testing Strategy

### Contract Tests
- ✅ Verify adapters implement all port methods
- ✅ Validate type safety (TypeScript compilation)
- ✅ Test error handling contracts (throw correct error types)

### Adapter Tests (Unit)
- Mock `localStorage` for deterministic testing
- Test error scenarios (disabled localStorage, quota exceeded, corrupted JSON)
- Verify fallback behavior (defaults, graceful degradation)

### Service Tests (Integration)
- Mock ports (stub IFirstRunStorage, IDemoLoaderService)
- Test orchestration flow (initialize → loadDemo → setViewMode → markComplete)
- Test error propagation (demo load fails → app continues)

### Hook Tests (React Testing Library)
- Render component using `useOnboarding`
- Verify state initialization, view mode persistence
- Test user interactions (mode switching, demo loading states)

## Acceptance Criteria Mapping

| Spec Requirement | Contract | Test Location |
|------------------|----------|---------------|
| FR-001: Detect first run | `IFirstRunStorage.isFirstRun()` | `firstRunDetection.test.ts` |
| FR-002: Auto-load Canon D | `IDemoLoaderService.loadBundledDemo()` | `demoLoader.test.ts` |
| FR-003: Default to stacked | `OnboardingConfig.defaultViewMode` | `onboarding-flow.test.tsx` |
| FR-004: Persist view mode | `IViewModePreferenceStorage.setViewMode()` | `preferences.test.ts` |
| FR-005: Restore view mode | `IViewModePreferenceStorage.getViewMode()` | `preferences.test.ts` |
| FR-010: Maintain demo in library | `IDemoLoaderService.isDemoLoaded()` | `integration/onboarding-flow.test.tsx` |

## Migration Notes

**Initial Implementation** (v1.0):
- All contracts defined in this Phase 1 specification
- No prior onboarding system exists (greenfield implementation)

**Future Extensions** (if needed):
- Additional preference fields: Add to `ViewModePreference` interface
- New demo scores: Extend `DemoScoreMetadata` with `demoType` field
- Version migrations: Add `preferenceVersion` field for schema evolution

## Contract Versioning

**Current Version**: 1.0.0 (initial specification)  
**Versioning Policy**: 
- PATCH: Documentation/comment updates (no code changes)
- MINOR: Backward-compatible additions (new optional fields, new methods with defaults)
- MAJOR: Breaking changes (rename interfaces, change method signatures, remove fields)

---

**Contracts Complete**: All ports and types defined. Ready for implementation in Phase 2.
