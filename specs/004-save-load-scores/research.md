# Research: Score File Persistence

**Date**: 2026-02-07  
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Phase**: Phase 0 - Research & Technology Selection

## Research Summary

This feature has **no unresolved clarifications** from the specification phase. All technical decisions were made during spec creation based on existing project context. This document consolidates those decisions with rationale.

---

## Decision 1: JSON Format Structure

**Question**: What JSON structure should we use for score files?

**Decision**: Use the existing Score API response format from `GET /api/v1/scores/:id`

**Rationale**:
- **Consistency**: Frontend already consumes this format from the backend API
- **Simplicity**: No additional serialization/deserialization logic needed
- **Human-readable**: Format includes clear field names (instruments, global_structural_events, etc.)
- **Complete**: Format already includes all score data (tested in existing API)
- **Type-safe**: TypeScript types already defined for this structure

**Alternatives Considered**:
1. **Custom simplified format** - Rejected because:
   - Requires mapping between two formats
   - Introduces maintenance burden
   - Loses existing type definitions
2. **MusicXML** - Rejected because:
   - Out of scope for simplest JSON format requirement
   - Much larger file sizes
   - Requires XML parser
3. **Compressed JSON** - Rejected because:
   - Violates human-readable requirement (FR-009)
   - Premature optimization (SC-004 shows files <1MB acceptable)

**References**: 
- Spec FR-009: "JSON format MUST be human-readable"
- Spec Assumption: "using the existing API response format (as returned by GET /api/v1/scores/:id)"

---

## Decision 2: File Operations Implementation

**Question**: How should we implement save and load operations in the browser?

**Decision**: Use browser File API with download for save, file input for load

**Technical Approach**:

### Save Operation
```typescript
// Create JSON blob and trigger browser download
const json = JSON.stringify(scoreData, null, 2); // Pretty-print for readability
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const anchor = document.createElement('a');
anchor.href = url;
anchor.download = `${scoreName || 'score'}.musicore.json`;
anchor.click();
URL.revokeObjectURL(url);
```

### Load Operation
```typescript
// Use file input element with FileReader API
<input type="file" accept=".json,.musicore.json" onChange={handleFileSelect} />

const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const json = e.target?.result as string;
    const scoreData = JSON.parse(json);
    // Validate and load...
  };
  reader.readAsText(file);
};
```

**Rationale**:
- **Browser-native**: No external dependencies required
- **Cross-browser**: Supported in all modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **User-friendly**: Familiar download/upload UX pattern
- **No server required**: Client-side only, no backend storage needed

**Alternatives Considered**:
1. **File System Access API** - Deferred because:
   - Limited browser support (Chrome/Edge only as of 2026)
   - More complex permission model
   - Overkill for initial MVP (can add later for "Save" vs "Save As")
2. **IndexedDB** - Rejected because:
   - Spec explicitly requests file-based persistence
   - Users expect portable files they can backup/share
   - Browser storage not transparent to users
3. **Server-side storage** - Rejected because:
   - Spec assumption: "browser APIs (File API, download links) for the frontend, not server-side storage"
   - Out of scope (SC-008: "Cloud storage or synchronization")

**References**:
- Spec Assumption: "File operations will be performed via browser APIs"
- Spec Out of Scope: "Cloud storage or synchronization"

---

## Decision 3: Validation Strategy

**Question**: How should we validate loaded JSON files?

**Decision**: Multi-layer validation approach

**Validation Layers**:

1. **Syntax Validation** (JSON.parse)
   - Catches malformed JSON
   - Error: "Invalid JSON file format"

2. **Structure Validation** (Type checking)
   - Verify required fields exist: `id`, `instruments`, `global_structural_events`
   - Check field types (arrays, objects, strings, numbers)
   - Error: "Missing required field: [field name]"

3. **Domain Validation** (Business rules)
   - MIDI pitch range: 21-108 (A0 to C8)
   - Tick values: non-negative integers
   - Duration values: positive integers
   - BPM values: 20-300 range (reasonable tempo limits)
   - Error: "Invalid [field]: [specific issue]"

**Rationale**:
- **User-friendly errors**: FR-005 requires "clear error messages for invalid files"
- **Progressive validation**: Fail fast at syntax level, provide specific guidance at domain level
- **Reuse existing domain logic**: Backend already validates these constraints
- **Security**: Prevents injection of invalid data into application state

**Implementation Pattern**:
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateScoreFile(json: string): ValidationResult {
  // Layer 1: Syntax
  let data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    return { valid: false, errors: ['Invalid JSON file format'] };
  }
  
  // Layer 2: Structure
  const structureErrors = validateStructure(data);
  if (structureErrors.length > 0) {
    return { valid: false, errors: structureErrors };
  }
  
  // Layer 3: Domain
  const domainErrors = validateDomain(data);
  return { 
    valid: domainErrors.length === 0, 
    errors: domainErrors 
  };
}
```

**References**:
- Spec FR-005: "System MUST validate JSON structure during load and provide clear error messages"
- Spec SC-007: "System detects and reports invalid JSON files with helpful error messages"

---

## Decision 4: File State Management

**Question**: How should we track file path and unsaved changes?

**Decision**: React Context with FileState interface

**State Structure**:
```typescript
interface FileState {
  currentFilePath: string | null;  // null = unsaved new score
  isModified: boolean;              // true = has unsaved changes
  lastSavedTimestamp: number | null; // Unix timestamp of last save
}
```

**State Management Pattern**:
```typescript
// React Context for global file state
const FileStateContext = React.createContext<FileState | null>(null);

// Actions: setFilePath, setModified, resetFileState
function FileStateProvider({ children }) {
  const [fileState, setFileState] = useState<FileState>({
    currentFilePath: null,
    isModified: false,
    lastSavedTimestamp: null,
  });
  // ... context provider logic
}
```

**Change Tracking**:
- Set `isModified = true` on any score edit (note added, tempo changed, etc.)
- Set `isModified = false` after successful save
- Show warning dialog when `isModified = true` and user attempts:
  - Load different file
  - Create new score
  - Close/navigate away from page

**Rationale**:
- **React Context**: Appropriate for cross-component state (ScoreViewer, buttons, dialogs)
- **Simple state shape**: Only 3 fields needed for MVP
- **Easy to extend**: Can add `lastSavedTimestamp` for conflict detection later
- **Standard pattern**: Similar to file editors (VS Code, Google Docs)

**Alternatives Considered**:
1. **Redux/Zustand** - Rejected because:
   - Overkill for 3-field state
   - Additional dependency
   - Adds complexity without benefit for this feature
2. **localStorage persistence** - Deferred because:
   - Not in scope for MVP
   - Conflicts with explicit file-based UX
   - Can add later as auto-save feature

**References**:
- Spec FR-006: "System MUST track the current file path after save/load operations"
- Spec FR-007: "System MUST warn users about unsaved changes"

---

## Decision 5: Test Strategy

**Question**: What testing approach ensures correctness and maintainability?

**Decision**: Test pyramid with unit, integration, and manual tests

**Test Breakdown**:

### Unit Tests (Vitest)
- **FileService.test.ts**:
  - `saveScore()` creates correct JSON structure
  - `loadScore()` parses valid JSON
  - `loadScore()` rejects invalid JSON with clear errors
  - `validateScore()` catches all validation cases
- **validation.test.ts**:
  - Structure validation (missing fields, wrong types)
  - Domain validation (invalid MIDI, negative ticks, etc.)
- **FileStateContext.test.ts**:
  - State updates correctly on save/load/edit
  - Modified flag tracks changes accurately

### Integration Tests (Vitest + React Testing Library)
- **file-persistence.test.tsx**:
  - Full save/load cycle preserves all data (SC-001: 100% fidelity)
  - Unsaved changes warning appears when expected
  - New score creation clears state correctly
  - Error messages shown for invalid files

### Manual Tests (Quickstart guide)
- Browser file download works (different browsers)
- File upload works with .json files
- Large scores (100 measures, 10 instruments) meet performance targets
- Error messages user-friendly and actionable

**Mocking Strategy**:
- Mock `URL.createObjectURL`, `Blob`, `FileReader` in unit tests
- Use jsdom for browser API simulation
- No mocking in integration tests (test full component tree)

**Rationale**:
- **TDD Compliance**: Constitution Principle V (Test-First Development)
- **Fast feedback**: Unit tests run in <1s, catch bugs early
- **Confidence**: Integration tests verify end-to-end flow
- **Real-world validation**: Manual tests catch UX issues

**References**:
- Constitution Principle V: "No Code Without Tests"
- Spec SC-001: "100% data fidelity (all notes, instruments, tempos, time signatures, clefs preserved exactly)"

---

## Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| JSON Serialization | Native `JSON.stringify/parse` | Built-in, fast, no dependencies |
| File Save | Blob + createObjectURL + anchor download | Browser-native, cross-browser compatible |
| File Load | FileReader API | Browser-native, async file reading |
| File Type | `.json` extension | Standard, text-based, human-readable |
| Validation | TypeScript + custom validators | Type safety + domain rules |
| State Management | React Context | Lightweight, appropriate for scope |
| Testing | Vitest + RTL + jsdom | Existing project setup, fast |
| Browser Support | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ | Modern browsers with File API support |

---

## Open Questions / Future Work

**None for MVP** - All decisions finalized for initial implementation.

**Future Enhancements** (captured in spec "Out of Scope" section):
- File System Access API for "Save" vs "Save As" (better UX, Chrome/Edge only)
- Auto-save to localStorage (backup against browser crashes)
- Recent files list (localStorage or IndexedDB)
- Export to other formats (MusicXML, MIDI, PDF)

---

## Research Completion Checklist

- [x] All NEEDS CLARIFICATION markers resolved (none existed)
- [x] Technology choices documented with rationale
- [x] Alternative approaches considered and rejected
- [x] Testing strategy defined
- [x] Dependencies identified (zero new dependencies required)
- [x] Browser compatibility specified
- [x] Performance approach validated (native APIs meet SC-002/SC-003)

**Status**: ✅ Research complete. Ready for Phase 1 (Design).
