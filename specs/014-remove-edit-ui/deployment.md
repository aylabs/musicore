# Deployment Instructions - Feature 014

**Branch**: `014-remove-edit-ui`  
**Target**: GitHub Pages (https://USERNAME.github.io/musicore)  
**Date**: 2026-02-10

---

## Prerequisites

**Node.js Version**: 20.19+ or 22.12+ (required by Vite 7.3.1)

Check your Node.js version:
```bash
node --version
```

If you're running Node.js 20.10.0 or earlier, upgrade via:
- **nvm**: `nvm install 20.19 && nvm use 20.19`
- **Official installer**: Download from https://nodejs.org

---

## Build Production Bundle

```bash
cd frontend
npm run build
```

**Expected Output**:
```
✓ 3 modules transformed.
dist/index.html                   X.XX kB
dist/assets/index-XXXXXX.js       XXX kB
dist/assets/index-XXXXXX.css      XX kB
✓ built in XXXms
```

The `dist/` directory contains the optimized production build.

---

## Deploy to GitHub Pages

### Option 1: Manual Deployment (gh-pages branch)

```bash
# From frontend/ directory
npm run build

# Navigate to dist/ directory
cd dist

# Initialize git (if not already a repo)
git init
git checkout -b gh-pages

# Add all files
git add -A
git commit -m "Deploy Feature 014 - Remove Editing Interface"

# Push to gh-pages branch (replace USERNAME/REPO with yours)
git remote add origin https://github.com/USERNAME/musiccore.git
git push -f origin gh-pages
```

### Option 2: Using gh-pages package (Automated)

```bash
cd frontend

# Install gh-pages if not already installed
npm install --save-dev gh-pages

# Add deploy script to package.json
# "scripts": {
#   "deploy": "vite build && gh-pages -d dist"
# }

# Deploy
npm run deploy
```

### Option 3: GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.19'
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Build
        run: |
          cd frontend
          npm run build
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/dist
```

---

## Verify Deployment

### 1. Check GitHub Pages Settings

- Go to repository **Settings** > **Pages**
- Verify **Source** is set to `gh-pages` branch
- Note the published URL (e.g., `https://USERNAME.github.io/musicore`)

### 2. Test on Desktop Browser

Open the deployed URL and verify:
- [ ] Landing page loads without errors
- [ ] Demo button works
- [ ] Import button works
- [ ] No editing UI appears (Save, New, Add Note/Voice/Staff buttons)

### 3. Test on Tablet Device

**Target Devices**: iPad, Surface, Android tablet

- [ ] Open deployed URL on tablet
- [ ] Verify responsive layout
- [ ] Test touch interactions (tap buttons, scroll score)
- [ ] Verify PWA installability (Add to Home Screen)
- [ ] Test offline mode (turn off WiFi, app should still work with cached data)
- [ ] Verify playback works with audio output
- [ ] Test demo onboarding flow on first visit

**PWA Features to Verify**:
- [ ] Service worker registers (check DevTools > Application > Service Workers)
- [ ] Assets cached for offline use
- [ ] Manifest file loads correctly (icons, name, theme color)

---

## Post-Deployment Checklist

### Tablet Testing Results

**Device**: ___________________  
**OS Version**: ___________________  
**Browser**: ___________________  

**Tests**:
- [ ] Landscape orientation: Layout correct
- [ ] Portrait orientation: Layout correct
- [ ] Touch targets: Buttons are large enough for finger taps
- [ ] Text legibility: Font size readable without zooming
- [ ] PWA install prompt appears on first visit
- [ ] Installed PWA launches in standalone mode (no browser chrome)
- [ ] Demo auto-plays correctly
- [ ] Import MusicXML from tablet storage works
- [ ] Playback works with tablet audio
- [ ] Tempo control responsive to touch
- [ ] View mode toggle works smoothly

### Issues Found

- [ ] Issue 1: _______________________________________________
- [ ] Issue 2: _______________________________________________
- [ ] Issue 3: _______________________________________________

---

## Rollback Instructions

If deployment causes issues:

```bash
# Revert to previous commit
git checkout HEAD~1

# Rebuild and redeploy
cd frontend
npm run build
# ... deploy dist/ to gh-pages again
```

Alternatively, find the last working commit hash and deploy that:
```bash
git checkout <COMMIT_HASH>
cd frontend
npm run build && npm run deploy
```

---

## Monitoring

After deployment, monitor:
- **GitHub Pages build status**: Repository Settings > Pages
- **Browser console errors**: Check DevTools on deployed site
- **Service worker updates**: Ensure new version caches correctly
- **Analytics** (if configured): Track user engagement with read-only features

---

## Next Steps

After successful deployment:
1. ✅ Mark T020 complete in tasks.md
2. ✅ Merge feature branch to main
3. ✅ Create release tag: `v1.X.X-remove-edit-ui`
4. ✅ Update README.md with new feature status
5. ✅ Close related GitHub issues

---

## Troubleshooting

### Build fails with "crypto.hash is not a function"
**Cause**: Node.js version too old for Vite 7.3.1  
**Fix**: Upgrade to Node.js 20.19+ or 22.12+

### GitHub Pages shows 404
**Cause**: gh-pages branch not published  
**Fix**: Check repository Settings > Pages > ensure gh-pages branch is selected

### PWA doesn't update after deployment
**Cause**: Service worker caching old version  
**Fix**: Hard refresh (Ctrl+Shift+R), or update service worker in DevTools

### Tablet performance slow
**Cause**: Unoptimized bundle size  
**Fix**: Run build with `--mode production` flag, check bundle size with `vite-bundle-visualizer`
