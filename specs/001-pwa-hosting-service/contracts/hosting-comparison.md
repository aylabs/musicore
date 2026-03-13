# Contract: Hosting Platform Comparison

**Feature**: 001-pwa-hosting-service  
**Date**: 2026-03-12  
**Purpose**: Decision record for hosting platform selection (FR-001, FR-002, FR-002b, SC-001)

---

## Evaluation Criteria

The chosen platform MUST satisfy all hard requirements (H) and SHOULD satisfy soft requirements (S):

| ID | Requirement | Priority |
|----|-------------|----------|
| H1 | Custom HTTP response headers: COEP, COOP, Cache-Control | Hard |
| H2 | HTTPS with custom domain (CNAME) on free tier | Hard |
| H3 | Automated deployment on `git push` to `main` | Hard |
| H4 | GDPR-compliant data handling | Hard |
| S1 | Free-tier bandwidth ≥ 100 GB/month (or unlimited) | Soft |
| S2 | Brotli compression at CDN edge | Soft |
| S3 | ≥ 300 free builds/month | Soft |
| S4 | Serving WASM with correct `Content-Type: application/wasm` | Soft |

---

## Platform Assessment

### GitHub Pages — REJECTED

| Criterion | Assessment |
|-----------|-----------|
| H1 Custom headers | ❌ **FAIL** — no mechanism to set custom response headers |
| H2 Custom domain | ✅ Pass — CNAME supported free |
| H3 Auto deploy | ✅ Pass — native GitHub Actions |
| H4 GDPR | ✅ Pass — static files only, no user data collected |
| S1 Bandwidth | ✅ Pass — unlimited (fair use) |
| S2 Brotli | ❌ Fail — gzip only |
| S3 Build frequency | ✅ Pass — unlimited |

**Decision**: RULED OUT. Fails H1 (custom headers). Cannot set `Cross-Origin-Embedder-Policy` or `Cross-Origin-Opener-Policy`. This blocks future WASM threading and violates FR-003.

---

### Cloudflare Pages — **SELECTED** ✅

| Criterion | Assessment |
|-----------|-----------|
| H1 Custom headers | ✅ **Pass** — `public/_headers` file; supports COEP, COOP, Cache-Control, per-path rules |
| H2 Custom domain | ✅ Pass — 100 custom domains per project, free |
| H3 Auto deploy | ✅ Pass — direct Git integration (push to `main` triggers deploy) |
| H4 GDPR | ✅ Pass — EU data residency options available; analytics not collected by platform |
| S1 Bandwidth | ✅ Pass — **unlimited** on free tier |
| S2 Brotli | ✅ Pass — automatic at CDN edge for all asset types including WASM |
| S3 Build frequency | ✅ Pass — 500 builds/month free |
| S4 WASM MIME type | ✅ Pass — correct `Content-Type: application/wasm` served automatically |

**Decision**: SELECTED. Only platform that satisfies all hard requirements. Unlimited bandwidth eliminates future risk. Brotli auto-compression resolves WASM transfer size issue at zero implementation cost.

---

### Netlify — NOT SELECTED

| Criterion | Assessment |
|-----------|-----------|
| H1 Custom headers | ✅ Pass — `_headers` file or `netlify.toml` |
| H2 Custom domain | ✅ Pass |
| H3 Auto deploy | ✅ Pass |
| H4 GDPR | ✅ Pass |
| S1 Bandwidth | ⚠️ Partial — 100 GB/month (equivalent via credits); risk at scale |
| S2 Brotli | ✅ Pass |
| S3 Build frequency | ✅ Pass — 300/month |

**Decision**: Not selected. Satisfies all hard requirements but 100 GB/month bandwidth cap introduces risk as user base grows. Cloudflare Pages is strictly better.

---

### Vercel — NOT SELECTED

| Criterion | Assessment |
|-----------|-----------|
| H1 Custom headers | ✅ Pass — `vercel.json` |
| H2 Custom domain | ✅ Pass |
| H3 Auto deploy | ✅ Pass |
| H4 GDPR | ✅ Pass |
| S1 Bandwidth | ⚠️ Partial — 100 GB/month |
| S2 Brotli | ✅ Pass |
| S3 Build frequency | ✅ Pass |

**Decision**: Not selected. Hobby (free) tier Terms of Service prohibit commercial use — Graditone may be considered commercial. Also 100 GB bandwidth cap. Cloudflare Pages preferred.

---

## Selected Platform Configuration

### `frontend/public/_headers`

```
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/wasm/*
  Cache-Control: public, max-age=31536000, immutable
  Cross-Origin-Resource-Policy: cross-origin

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/
  Cache-Control: public, max-age=3600

/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Cache-Control: public, max-age=3600
```

### GitHub Actions Changes

The existing `deploy-pwa.yml` `Stage 3: Deploy to GitHub Pages` block is replaced with Cloudflare Pages deployment:

```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    projectName: graditone
    directory: frontend/dist
    gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

Two repository secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

### Migration Checklist

**Decision date**: 2026-03-12  
**Migration date**: pending (external account setup required — T001, T003)

- [ ] Create Cloudflare Pages project, link to GitHub repo  ← T001 (manual)
- [ ] Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to GitHub repo secrets  ← T003 (manual)
- [x] Update `deploy-pwa.yml` to use `cloudflare/pages-action`  ← T008
- [x] Remove GitHub Pages-specific steps (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`)  ← T009
- [x] Create `frontend/public/_headers` file  ← T007
- [ ] Transfer CNAME (`graditone.com`) from GitHub Pages to Cloudflare Pages custom domain  ← T012 (post-deploy)
- [ ] Verify COEP and COOP headers live on production URL  ← T013 (post-deploy)
- [ ] Verify service worker updates correctly on installed PWAs after migration  ← T014 (manual)
