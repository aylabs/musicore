# Local Development Validation

This document explains how to catch build errors locally **before** they reach the CI/CD pipeline.

## Automated Git Hooks

Git hooks are configured to run automatically on commit and push:

### Pre-Commit Hook
- **When:** Every `git commit`
- **What:** Type-checks changed TypeScript files
- **Speed:** Fast (~5-10 seconds)
- **Bypass:** `git commit --no-verify` (not recommended)

### Pre-Push Hook
- **When:** Every `git push` to `main` or feature branches (e.g., `018-rust-layout-engraving`)
- **What:** Full build + test suite
- **Speed:** ~1-2 minutes
- **Bypass:** `git push --no-verify` (use only for WIP branches)

**Note:** Hooks are located in `.git/hooks/` and are already executable.

## Manual Validation Commands

Run these before committing to catch errors early:

### Quick Type Check (5-10 seconds)
```bash
cd frontend
npm run typecheck
```

Runs TypeScript compiler without building. Shows type errors immediately.

### Full Validation (30-60 seconds)
```bash
cd frontend
npm run validate
```

Runs: type check + linter + tests. Comprehensive check without building.

### CI Simulation (1-2 minutes)
```bash
cd frontend
npm run ci-check
```

Runs: full build + all tests. **Exactly what GitHub Actions runs.**

## Common Errors & Solutions

### 1. Missing Module Errors
```
error TS2307: Cannot find module '../wasm/layout'
```

**Cause:** File exists locally but not tracked in git (blocked by `.gitignore`)

**Solution:**
```bash
# Check if file is tracked
git ls-files frontend/src/wasm/

# If empty, review .gitignore
cat frontend/src/wasm/.gitignore

# Track the file
git add frontend/src/wasm/layout.ts
```

**Prevention:** Run `git status` before committing to verify all new files are staged.

### 2. Type Errors
```
error TS2322: Type 'string' is not assignable to type 'OverflowX'
```

**Cause:** TypeScript strict mode requires const assertions for CSS literals

**Solution:**
```typescript
// ❌ Wrong
overflowX: 'auto'

// ✅ Correct
overflowX: 'auto' as const
```

**Prevention:** Run `npm run typecheck` frequently during development.

### 3. Dependency Version Conflicts
```
error TS2769: No overload matches this call
```

**Cause:** Package version incompatible with other dependencies (e.g., vite-plugin-pwa with Vite 7)

**Solution:**
```bash
cd frontend
npm install <package>@latest
npm run build  # Verify fix
```

**Prevention:** Check `npm outdated` regularly and update major deps carefully.

## Editor Integration

### VS Code (Recommended)
TypeScript errors show in **real-time** in the editor:

1. **Install Extensions:**
   - ESLint (`dbaeumer.vscode-eslint`)
   - TypeScript (built-in)

2. **Verify Settings:**
   - `"typescript.tsdk"` should point to workspace TypeScript
   - `"typescript.validate.enable": true`

3. **Check Problems Panel:**
   - View → Problems (⇧⌘M)
   - Shows all TypeScript/ESLint errors

### Visual Indicators
- Red squiggles: Type errors
- Yellow squiggles: Warnings
- Blue squiggles: Suggestions

**Best Practice:** Fix all red squiggles before committing.

## CI/CD Pipeline Enhancement

### Current Setup
- **Deploys on:** Push to `main`
- **Checks:** Build + tests on deployment

### Recommended: PR Checks (Optional)
To catch errors before merging to main, enable PR checks:

1. Create `.github/workflows/pr-check.yml`:
```yaml
name: PR Checks

on:
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci
      
      - name: Run validation
        working-directory: frontend
        run: npm run ci-check
```

2. Enable branch protection on GitHub:
   - Settings → Branches → Add rule for `main`
   - Require "PR Checks" to pass before merging

## Workflow Best Practices

### Daily Development
```bash
# 1. Start work
git checkout -b 019-new-feature

# 2. Make changes
# ... edit files ...

# 3. Quick check (optional but recommended)
cd frontend && npm run typecheck

# 4. Commit (pre-commit hook runs automatically)
git add .
git commit -m "feat: implement X"

# 5. Push (pre-push hook runs automatically)
git push origin 019-new-feature
```

### Before Merging to Main
```bash
# Run full CI simulation
cd frontend
npm run ci-check

# If passing, merge
git checkout main
git merge 019-new-feature --no-ff
git push origin main  # Triggers deployment
```

### Emergency Fix (Skip Hooks)
Use **only** when absolutely necessary:

```bash
# Skip pre-commit
git commit --no-verify

# Skip pre-push
git push --no-verify
```

**Warning:** Pipeline will still catch errors. Only use for WIP commits.

## Troubleshooting

### Hooks Not Running
```bash
# Check if hooks are executable
ls -l .git/hooks/pre-commit .git/hooks/pre-push

# Should show: -rwxr-xr-x

# If not, make executable
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

### Hooks Running on Wrong Branch
Edit `.git/hooks/pre-push` and adjust branch detection:
```sh
if [ "$current_branch" = "main" ] || echo "$current_branch" | grep -qE '^[0-9]+-'; then
```

### Build Works Locally But Fails in CI
1. **Check Node version:** CI uses Node 22 (see `.nvmrc`)
   ```bash
   nvm use 22
   ```

2. **Clean install:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

3. **Check git-tracked files:**
   ```bash
   git ls-files frontend/src/ | grep -E '\.(ts|tsx)$'
   ```

## Summary

**Prevention Layers:**
1. ✅ Editor shows errors in real-time
2. ✅ Pre-commit hook catches type errors quickly
3. ✅ Pre-push hook runs full build before pushing
4. ✅ Manual `npm run validate` for comprehensive check
5. ✅ CI/CD pipeline as final safety net

**Key Commands:**
- `npm run typecheck` - Fast type check
- `npm run validate` - Everything except build
- `npm run ci-check` - Full CI simulation
- `git commit --no-verify` - Skip hooks (emergency only)

**Golden Rule:** If `npm run ci-check` passes locally, CI/CD will pass too.
