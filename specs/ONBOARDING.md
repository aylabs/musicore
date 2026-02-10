# SpecKit Onboarding - Quick Start Guide

**Purpose**: Help new developers and AI assistants quickly understand the SpecKit methodology and navigate active feature implementations.

---

## SpecKit Methodology in 60 Seconds

SpecKit is specification-driven development. **Specs before code, always.**

### Core Principle
> "If it's not in the spec, it doesn't exist. If it's in the spec, it must be implemented exactly as written."

### The Workflow

```
1. Prerequisites Check
   ↓
2. Read Specifications (spec → plan → contracts → tasks)
   ↓
3. Check Checklists (all must pass)
   ↓
4. Implement Tasks (in order, mark [X] when complete)
   ↓
5. Validate (tests + manual validation)
   ↓
6. Update Documentation
```

---

## Essential Commands

### Before Starting ANY Work
```bash
# Verify prerequisites
bash .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

**Output**: `FEATURE_DIR` path and `AVAILABLE_DOCS` list.  
**Must succeed** before proceeding.

### Check Checklists
```bash
# Navigate to feature directory
cd $FEATURE_DIR/checklists/

# Count incomplete items in all checklists
grep -r "^- \[ \]" . | wc -l
```

**Gate Rule**: Must be `0` (all items checked) before implementation.

---

## Document Reading Order

Read specifications in this order:

1. **spec.md** - What are we building and why?
   - User stories (prioritized)
   - Success criteria (measurable)
   - Constraints and assumptions

2. **plan.md** - How will we build it?
   - Architecture decisions
   - Technology choices
   - File structure

3. **data-model.md** - What are the contracts?
   - Type definitions
   - Interface boundaries
   - Error handling

4. **contracts/** (if exists) - Detailed contracts
   - Individual contract files
   - API specifications

5. **tasks.md** - What's the step-by-step plan?
   - Task breakdown with IDs (T001, T002, etc.)
   - `[P]` = Can run in parallel
   - `[US1]` = Belongs to User Story 1
   - Grouped by phase/user story

6. **ONBOARDING.md** (if exists) - Feature-specific context
   - Current status
   - Key files
   - Troubleshooting

7. **research.md**, **quickstart.md**, **validation-test.md** (if exist)

---

## Active Features

### Feature 011: WASM Music Engine
- **Branch**: `011-wasm-music-engine`
- **Status**: Phase 4 Complete (User Story 2)
- **Onboarding**: [specs/011-wasm-music-engine/ONBOARDING.md](011-wasm-music-engine/ONBOARDING.md)
- **Next Steps**: Phase 5 (Server Load Reduction) OR Manual Validation

---

## Task Management

### Task Format
```markdown
- [ ] T001 [P] [US1] Description of task in path/to/file.ext
```

- `[ ]` = Incomplete
- `[X]` = Complete
- `T001` = Sequential task ID
- `[P]` = Can run in parallel (no dependencies)
- `[US1]` = Belongs to User Story 1

### Marking Tasks Complete
After completing a task, update tasks.md:
```bash
# Find the task
grep "T042" specs/FEATURE/tasks.md

# Edit tasks.md and change [ ] to [X]
- [X] T042 [US1] Completed task description
```

### Viewing Progress
```bash
cd specs/FEATURE

# Count completed tasks
grep -c "^\- \[X\]" tasks.md

# Count total tasks
grep -c "^\- \[" tasks.md

# Show incomplete tasks
grep "^\- \[ \]" tasks.md
```

---

## Testing Strategy

### Run Tests Before AND After Implementation
```bash
# Frontend tests
cd frontend
npm test -- --run

# Backend tests
cd backend
cargo test
```

**Baseline**: Record passing count before starting. Compare after changes.

### Validate
- Automated tests must pass
- Manual validation (if validation-test.md exists)
- No new failures introduced

---

## Git Workflow

### Branch Naming
```
[FEATURE_ID]-[feature-name-kebab-case]

Example: 011-wasm-music-engine
```

### Commit Messages
```
feat: [Feature ID] Brief description

Detailed explanation of what changed and why.

Tasks completed: T001, T002, T003
```

### Push Regularly
```bash
git push origin [branch-name]
```

---

## Constitution Compliance

Musicore follows architectural principles defined in `.specify/constitution/`. Key rules:

1. **Domain-Driven Design**: Domain logic is pure, no infrastructure dependencies
2. **Hexagonal Architecture**: Domain → Ports (interfaces) → Adapters (implementations)
3. **API-First**: Backend exposes APIs, frontend consumes them
4. **Precision & Fidelity**: 960 PPQ integer timing, no floating-point drift
5. **Test-First**: Tests before implementation (when possible)

**Check**: plan.md includes "Constitution Check" section validating compliance.

---

## Directory Structure Overview

```
musicore/
├── .specify/                  # SpecKit tooling
│   ├── scripts/               # Validation scripts
│   ├── templates/             # Document templates
│   └── constitution/          # Architecture principles
│
├── specs/                     # Feature specifications
│   ├── ONBOARDING.md          # This file
│   └── [FEATURE_ID]-[name]/   # Per-feature directory
│       ├── spec.md            # Requirements
│       ├── plan.md            # Technical plan
│       ├── tasks.md           # Implementation tasks
│       ├── data-model.md      # Contracts
│       ├── ONBOARDING.md      # Feature-specific guide
│       ├── checklists/        # Quality gates
│       └── contracts/         # Detailed contracts
│
├── backend/                   # Rust server
│   ├── src/
│   │   ├── domain/            # Pure domain logic
│   │   ├── ports/             # Interfaces
│   │   └── adapters/          # Implementations
│   └── tests/                 # Integration tests
│
└── frontend/                  # React app
    ├── src/
    │   ├── components/        # UI components
    │   ├── services/          # Business logic
    │   ├── hooks/             # React hooks
    │   └── types/             # TypeScript types
    └── tests/                 # Component tests
```

---

## Common Pitfalls

### ❌ Don't Do This
1. **Skip prerequisite check** - Always run it first
2. **Implement without reading specs** - Specs define requirements
3. **Start with incomplete checklists** - All must pass first
4. **Skip task order** - Dependencies exist, follow sequence
5. **Forget to mark tasks complete** - Update tasks.md as you go
6. **Commit without tests** - Tests must pass before commit
7. **Ignore constitution checks** - Architecture rules are mandatory

### ✅ Do This Instead
1. **Run prerequisites check**
2. **Read all specs in order**
3. **Verify checklists pass**
4. **Implement tasks sequentially** (or parallel if marked `[P]`)
5. **Mark tasks complete** in tasks.md
6. **Run tests** before and after changes
7. **Validate constitution compliance** in plan.md

---

## When You Get Stuck

### Problem: Don't know what to do next
**Solution**: Read tasks.md, find first `[ ]` unchecked task.

### Problem: Don't understand the requirements
**Solution**: Re-read spec.md, check user stories and acceptance criteria.

### Problem: Don't understand the technical approach
**Solution**: Read plan.md "Technical Context" and "Project Structure" sections.

### Problem: Don't know what type/interface to use
**Solution**: Check data-model.md and contracts/ directory.

### Problem: Checklists have incomplete items
**Solution**: Complete the checklist items before proceeding with implementation. If blocked, document why in the checklist.

### Problem: Tests are failing
**Solution**: 
1. Check if failures are pre-existing (compare with baseline)
2. Read test error messages carefully
3. Run single test: `npm test -- path/to/test.ts --run`
4. Check if test fixtures need updating

### Problem: Prerequisite check fails
**Solution**: Missing required documents. Check which documents are missing from the error message, then create them following templates in `.specify/templates/`.

---

## AI Assistant Best Practices

### Context Loading
1. **Always start** with prerequisites check
2. **Read specifications** in order (spec → plan → tasks)
3. **Load recent context** from git log and ONBOARDING.md
4. **Check current state** in tasks.md (what's done vs pending)

### Implementation Strategy
1. **One task at a time** - Don't jump ahead
2. **Mark completed tasks** - Update tasks.md immediately
3. **Test frequently** - Run tests after each task
4. **Commit regularly** - Don't accumulate too many changes
5. **Update documentation** - Keep ONBOARDING.md current

### Communication
1. **Be specific** - Reference task IDs (T001) and file paths
2. **Show progress** - Report completed tasks
3. **Ask when blocked** - Don't guess at requirements
4. **Validate assumptions** - Confirm interpretation of specs

### Handoff to Next Assistant
1. **Update ONBOARDING.md** with current status
2. **Commit all changes** - Don't leave dirty state
3. **Push to remote** - Ensure work is saved
4. **Document blockers** - Note any issues or questions
5. **Mark last update time** - Include timestamp in ONBOARDING.md

---

## Quick Links

- **Feature 011 Onboarding**: [011-wasm-music-engine/ONBOARDING.md](011-wasm-music-engine/ONBOARDING.md)
- **Project README**: `../README.md`
- **Backend README**: `../backend/README.md`
- **Frontend README**: `../frontend/README.md`

---

## Feedback & Improvements

This onboarding guide is a living document. If you encounter:
- Missing information
- Unclear instructions
- Outdated content

Please update this file and commit the improvements.

---

**Last Updated**: 2026-02-10  
**Active Features**: 1 (Feature 011)  
**Methodology Version**: SpecKit 1.0
