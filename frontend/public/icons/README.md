# PWA Icon Assets - Required

## Feature 012: PWA Distribution (T011-T014)

This directory must contain the following icon assets for PWA installability:

### Required Icons

1. **icon-192x192.png** (192×192 pixels)
   - Purpose: Android home screen icon
   - Format: PNG
   - Properties: `any maskable` purpose
   - Used by: Android devices for app launcher

2. **icon-512x512.png** (512×512 pixels)
   - Purpose: Android splash screen
   - Format: PNG
   - Properties: `any maskable` purpose
   - Used by: Android splash screen when launching PWA

3. **apple-touch-icon.png** (180×180 pixels)
   - Purpose: iOS home screen icon
   - Format: PNG
   - Used by: iOS/iPadOS devices for home screen icon
   - Referenced in index.html: `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`

4. **favicon-32x32.png** (32×32 pixels)
   - Purpose: Browser favicon (standard size)
   - Format: PNG
   - Referenced in index.html: `<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">`

5. **favicon-16x16.png** (16×16 pixels)
   - Purpose: Browser favicon (small size)
   - Format: PNG
   - Referenced in index.html: `<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">`

---

## Design Guidelines

### Brand Identity
- **App Name**: Musicore - Intelligent Music Stand
- **Theme Color**: #6366f1 (indigo-500)
- **Background**: #1a1a1a (dark)
- **Categories**: music, education, productivity

### Icon Design Recommendations

1. **Use music-related symbolism**: musical notes (🎵), sheet music (🎼), treble clef, or a stylized music stand
2. **Maintain brand color scheme**: Use the indigo (#6366f1) theme color as primary
3. **Ensure legibility at small sizes**: Simple, clear design that works at 16×16 pixels
4. **Consider maskable icons**: For Android adaptive icons, ensure important content is within the safe zone (80% circle)
5. **High contrast**: Ensure icons are visible on both light and dark backgrounds

### Design Tools

**Online Icon Generators** (Quick):
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) - Upload one image, generate all sizes
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Generate complete favicon set
- [Favicon.io](https://favicon.io/favicon-converter/) - Convert PNG/SVG to all sizes

**Manual Design** (Professional):
- Figma: Create 512×512 artboard, export at all required sizes
- Adobe Illustrator: Design as vector, export as PNG at multiple sizes
- Inkscape (free): Vector design tool for creating scalable icons

---

## Quick Generation Steps

### Option 1: Use PWA Asset Generator (Recommended)
1. Visit https://www.pwabuilder.com/imageGenerator
2. Upload a 512×512 PNG or high-res logo
3. Download generated icon pack
4. Extract to this directory

### Option 2: Use Favicon.io (Fastest)
1. Visit https://favicon.io/favicon-converter/
2. Upload a square image (at least 512×512)
3. Download generated favicon package
4. Rename files to match requirements above
5. Copy to this directory

### Option 3: Manual Export from Design Tool
1. Design at 512×512 pixels (highest resolution needed)
2. Export PNG files at these sizes:
   - icon-512x512.png (512×512)
   - icon-192x192.png (192×192)
   - apple-touch-icon.png (180×180)
   - favicon-32x32.png (32×32)
   - favicon-16x16.png (16×16)
3. Optimize with TinyPNG or ImageOptim
4. Copy to this directory

---

## Verification

After adding icons, verify setup:

```bash
# Build the app
cd frontend
npm run build

# Check dist/manifest.webmanifest contains:
# - icons array with /icons/icon-192x192.png
# - icons array with /icons/icon-512x512.png

# Check dist/index.html contains:
# - <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
# - <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
# - <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
```

---

## Current Status

✅ **Placeholder icons created** (T011-T014 complete)

**Generated**: 10 February 2026
- icon-512x512.png (7.4KB) - Indigo background (#6366f1) with white "M"
- icon-192x192.png (2.3KB) - Indigo background (#6366f1) with white "M"
- apple-touch-icon.png (2.1KB) - Indigo background (#6366f1) with white "M"
- favicon-32x32.png (382 bytes) - Indigo background (#6366f1) with white "M"
- favicon-16x16.png (228 bytes) - Indigo background (#6366f1) with white "M"

These are **temporary placeholder icons** for testing and development. Replace with proper Musicore branding before production deployment.

**Verified**:
- ✅ All 5 PNG files present in public/icons/
- ✅ Icons included in dist/ after build (20 precached entries)
- ✅ manifest.webmanifest references correct icon paths
- ✅ index.html references correct favicon/apple-touch-icon paths

**Next Steps**:
1. **[READY]** PWA is ready for testing - placeholders are functional
2. **[OPTIONAL]** Design custom Musicore branded icons with music symbolism (treble clef, musical notes, etc.)  
3. **[OPTIONAL]** Replace placeholder PNGs before production deployment
4. Deploy to staging and test PWA installation on physical tablets
5. Run Lighthouse PWA audit to verify score ≥90

**Placeholder icons are sufficient for**:
- ✅ Local development and testing
- ✅ PWA installation testing on devices  
- ✅ Lighthouse PWA audit
- ✅ Staging deployments
- ⚠️ Production (should upgrade to branded icons eventually)

---

## Design Custom Icons (Optional)

For testing purposes, you can temporarily use the Vite logo:

```bash
# Copy Vite SVG as placeholder (for testing only)
cp ../vite.svg icon-placeholder.svg

# Convert to PNG using ImageMagick (if installed)
convert -background none -resize 512x512 icon-placeholder.svg icon-512x512.png
convert -background none -resize 192x192 icon-placeholder.svg icon-192x192.png
convert -background none -resize 180x180 icon-placeholder.svg apple-touch-icon.png
convert -background none -resize 32x32 icon-placeholder.svg favicon-32x32.png
convert -background none -resize 16x16 icon-placeholder.svg favicon-16x16.png
```

**Note**: Replace placeholders with proper Musicore branding before production deployment.

---

## Next Steps

1. **Design icon**: Create 512×512 base icon with music theme
2. **Generate sizes**: Use PWA Asset Generator or manual export
3. **Add to repository**: Place all 5 PNG files in this directory
4. **Test build**: Run `npm run build` and verify manifest.webmanifest
5. **Deploy**: Push to staging and test on physical devices
6. **Lighthouse**: Run PWA audit and verify icon requirements pass

**Related Tasks**: T011, T012, T013, T014 (Phase 3: User Story 1)
