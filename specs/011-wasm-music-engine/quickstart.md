# Quickstart Guide: WASM Music Engine Integration

**Feature**: 011-wasm-music-engine  
**Date**: 2026-02-09  
**Purpose**: Step-by-step implementation guide for compiling Rust music engine to WASM

## Prerequisites

Before starting, ensure you have:

- ✅ Rust toolchain (rustc 1.75+)
- ✅ wasm-pack installed: `cargo install wasm-pack`
- ✅ Node.js 18+ (for frontend build)
- ✅ Understanding of [research.md](research.md) decisions
- ✅ Understanding of [data-model.md](data-model.md) interface design

---

## Implementation Phases

| Phase | Description | Duration | Deliverable |
|-------|-------------|----------|-------------|
| **1. Backend Setup** | Configure Rust for WASM compilation | 30 min | WASM build pipeline |
| **2. WASM Adapter** | Create wasm-bindgen exports | 2 hours | Rust → JS interface |
| **3. Frontend Loader** | WASM initialization and wrapper | 1 hour | TypeScript wrapper |
| **4. API Migration** | Replace REST calls with WASM | 3 hours | Updated components |
| **5. Testing** | Validate functional parity | 2 hours | Passing test suite |
| **6. Optimization** | Bundle size and performance | 1 hour | Production-ready build |

**Total Estimated Time**: 9-10 hours

---

## Phase 1: Backend Setup (30 minutes)

### 1.1 Install wasm-pack

```bash
cargo install wasm-pack
```

**Verify Installation**:
```bash
wasm-pack --version
# Expected: wasm-pack 0.12.1
```

### 1.2 Add WASM Target

```bash
rustup target add wasm32-unknown-unknown
```

### 1.3 Update Cargo.toml (Backend)

Add wasm-bindgen dependencies and configure release profile:

```toml
# backend/Cargo.toml

[package]
name = "musicore-backend"
version = "0.1.0"
edition = "2024"

[lib]
# Enable library compilation (in addition to binary)
crate-type = ["cdylib", "rlib"]

[dependencies]
# Existing dependencies
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "1.0"
uuid = { version = "1.0", features = ["v4", "serde"] }
quick-xml = "0.31"

# NEW: WASM dependencies
wasm-bindgen = "0.2"
serde-wasm-bindgen = "0.6"

# NEW: Conditional dependencies (only for WASM target)
[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen = "0.2"
serde-wasm-bindgen = "0.6"

# Exclude WASM-incompatible dependencies for WASM target
[target.'cfg(not(target_arch = "wasm32"))'.dependencies]
axum = { version = "0.7", features = ["multipart"] }
tokio = { version = "1", features = ["full"] }
tower = "0.5"
tower-http = { version = "0.6", features = ["trace", "cors"] }
zip = "0.6"  # WASM-incompatible - only for native builds

[dev-dependencies]
http-body-util = "0.1"
tempfile = "3.8"

# NEW: Release profile optimized for WASM size
[profile.release]
opt-level = "z"       # Optimize for size, not speed
lto = true            # Link-time optimization
codegen-units = 1     # Better optimization (slower compile, smaller binary)
strip = true          # Remove debug symbols
panic = "abort"       # Skip unwind logic (saves ~10KB)

[[bin]]
name = "musicore-import"
path = "src/bin/musicore-import.rs"
```

### 1.4 Verify Build Configuration

Test that WASM target compiles:

```bash
cd backend
cargo check --target wasm32-unknown-unknown --lib
```

**Expected Output**: No errors (warns about unused dependencies are OK)

---

## Phase 2: WASM Adapter (2 hours)

### 2.1 Create WASM Adapter Module

```bash
cd backend/src/adapters
mkdir wasm
touch wasm/mod.rs wasm/bindings.rs wasm/error_handling.rs
```

### 2.2 Implement Error Handling

Create `backend/src/adapters/wasm/error_handling.rs`:

```rust
use serde::Serialize;
use wasm_bindgen::JsValue;
use crate::domain::errors::DomainError;

#[derive(Serialize)]
pub struct WasmError {
    pub error: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl From<DomainError> for WasmError {
    fn from(e: DomainError) -> Self {
        match e {
            DomainError::NoteOverlap { voice_id, tick } => WasmError {
                error: "NoteOverlapError".to_string(),
                message: format!("Note overlaps at tick {}", tick),
                details: Some(serde_json::json!({
                    "voice_id": voice_id.to_string(),
                    "tick": tick,
                })),
            },
            DomainError::InvalidPitch { value } => WasmError {
                error: "InvalidPitchError".to_string(),
                message: format!("Pitch {} is outside valid range (0-127)", value),
                details: Some(serde_json::json!({ "pitch": value })),
            },
            DomainError::ParseError { message } => WasmError {
                error: "ParseError".to_string(),
                message,
                details: None,
            },
            // TODO: Add remaining error variants
            _ => WasmError {
                error: "InternalError".to_string(),
                message: e.to_string(),
                details: None,
            },
        }
    }
}

pub fn to_js_error(e: DomainError) -> JsValue {
    let wasm_error: WasmError = e.into();
    serde_wasm_bindgen::to_value(&wasm_error)
        .unwrap_or_else(|_| JsValue::from_str("Serialization error"))
}
```

### 2.3 Implement Core WASM Bindings

Create `backend/src/adapters/wasm/bindings.rs`:

```rust
use wasm_bindgen::prelude::*;
use crate::domain::{Score, Note};
use crate::domain::importers::musicxml;
use super::error_handling::to_js_error;

#[wasm_bindgen]
pub fn create_score(title: Option<String>) -> Result<JsValue, JsValue> {
    let score = Score::new(title.unwrap_or_else(|| "Untitled".to_string()));
    serde_wasm_bindgen::to_value(&score)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[wasm_bindgen]
pub fn parse_musicxml(xml_bytes: &[u8]) -> Result<JsValue, JsValue> {
    let score = musicxml::parse(xml_bytes)
        .map_err(to_js_error)?;
    
    serde_wasm_bindgen::to_value(&score)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[wasm_bindgen]
pub fn add_instrument(score: JsValue, name: String) -> Result<JsValue, JsValue> {
    let mut score: Score = serde_wasm_bindgen::from_value(score)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;
    
    score.add_instrument(name)
        .map_err(to_js_error)?;
    
    serde_wasm_bindgen::to_value(&score)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[wasm_bindgen]
pub fn add_note(
    score: JsValue,
    voice_id: String,
    note: JsValue
) -> Result<JsValue, JsValue> {
    let mut score: Score = serde_wasm_bindgen::from_value(score)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;
    
    let note: Note = serde_wasm_bindgen::from_value(note)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;
    
    let voice_id = uuid::Uuid::parse_str(&voice_id)
        .map_err(|_| JsValue::from_str("Invalid UUID format"))?;
    
    score.add_note_to_voice(voice_id, note)
        .map_err(to_js_error)?;
    
    serde_wasm_bindgen::to_value(&score)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

// TODO: Implement remaining functions:
// - add_staff
// - add_voice
// - add_tempo_event
// - add_time_signature_event
// - add_clef_event
// - add_key_signature_event
```

### 2.4 Wire Up Adapter Module

Edit `backend/src/adapters/wasm/mod.rs`:

```rust
mod bindings;
mod error_handling;

pub use bindings::*;
```

Edit `backend/src/adapters/mod.rs`:

```rust
pub mod api;
pub mod persistence;

// Only compile WASM adapter for wasm32 target
#[cfg(target_arch = "wasm32")]
pub mod wasm;
```

### 2.5 Expose Library Interface

Edit `backend/src/lib.rs`:

```rust
pub mod domain;
pub mod ports;
pub mod adapters;

// Re-export WASM functions at crate root for wasm-bindgen
#[cfg(target_arch = "wasm32")]
pub use adapters::wasm::*;
```

### 2.6 Test WASM Build

```bash
cd backend
wasm-pack build --target web --out-dir pkg
```

**Expected Output**:
```
[INFO]: 🎯  Checking for the Wasm target...
[INFO]: 🌀  Compiling to Wasm...
[INFO]: ⬇️  Installing wasm-bindgen...
[INFO]: Optimizing wasm binaries with `wasm-opt`...
[INFO]: ✨   Done in 45s
[INFO]: 📦   Your wasm pkg is ready to publish at ./pkg
```

**Verify Output Files**:
```bash
ls pkg/
# Expected:
# musicore_backend.d.ts
# musicore_backend.js
# musiccore_backend_bg.wasm
# musiccore_backend_bg.wasm.d.ts
# package.json
```

**Check Bundle Size**:
```bash
ls -lh pkg/musiccore_backend_bg.wasm
# Expected: ~200-400KB uncompressed
gzip -c pkg/musiccore_backend_bg.wasm | wc -c
# Expected: ~80-150KB gzipped (should be < 500KB target)
```

---

## Phase 3: Frontend Loader (1 hour)

### 3.1 Install Frontend Dependencies

```bash
cd frontend
npm install vite-plugin-static-copy --save-dev
```

### 3.2 Configure Vite

Edit `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    
    // Copy WASM artifacts to public/wasm/
    viteStaticCopy({
      targets: [
        {
          src: '../backend/pkg/musiccore_backend_bg.wasm',
          dest: 'wasm',
          rename: 'musiccore.wasm'
        },
        {
          src: '../backend/pkg/musiccore_backend.js',
          dest: 'wasm',
          rename: 'musiccore.js'
        }
      ]
    })
  ],
  
  // Enable top-level await for WASM initialization
  build: {
    target: 'esnext'
  },
  
  // Ensure WASM MIME type is correct
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
});
```

### 3.3 Create WASM Loader

Create `frontend/src/services/wasm/loader.ts`:

```typescript
import init from '/wasm/musiccore.js';

let wasmInitialized = false;
let wasmModule: any = null;

export async function initWasm(): Promise<void> {
  if (wasmInitialized) return;
  
  try {
    wasmModule = await init('/wasm/musiccore.wasm');
    wasmInitialized = true;
    console.log('[WASM] Music engine loaded successfully');
  } catch (error) {
    console.error('[WASM] Failed to load music engine:', error);
    throw new Error('WASM initialization failed. Browser may not support WebAssembly.');
  }
}

export function getWasmModule(): any {
  if (!wasmInitialized || !wasmModule) {
    throw new Error('WASM module not initialized. Call initWasm() first.');
  }
  return wasmModule;
}

export function isWasmReady(): boolean {
  return wasmInitialized;
}
```

### 3.4 Create Typed Wrapper

Create `frontend/src/services/wasm/music-engine.ts`:

```typescript
import { getWasmModule } from './loader';
import type { Score, Note } from '@/types/score';

export async function createScore(title?: string): Promise<Score> {
  const wasm = getWasmModule();
  return await wasm.create_score(title);
}

export async function parseMusicXML(xmlBytes: Uint8Array): Promise<Score> {
  const wasm = getWasmModule();
  return await wasm.parse_musicxml(xmlBytes);
}

export async function addInstrument(score: Score, name: string): Promise<Score> {
  const wasm = getWasmModule();
  return await wasm.add_instrument(score, name);
}

export async function addNote(score: Score, voiceId: string, note: Note): Promise<Score> {
  const wasm = getWasmModule();
  return await wasm.add_note(score, voiceId, note);
}

// TODO: Add remaining functions
```

### 3.5 Initialize WASM in App

Edit `frontend/src/App.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { initWasm } from './services/wasm/loader';

function App() {
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);
  
  useEffect(() => {
    initWasm()
      .then(() => setWasmReady(true))
      .catch((err) => setWasmError(err.message));
  }, []);
  
  if (wasmError) {
    return (
      <div className="error-container">
        <h2>Music Engine  Failed to Load</h2>
        <p>{wasmError}</p>
        <p>Please use a modern browser (Chrome, Firefox, Safari, Edge)</p>
      </div>
    );
  }
  
  if (!wasmReady) {
    return (
      <div className="loading-container">
        <p>Loading music engine...</p>
      </div>
    );
  }
  
  return <MainContent />;
}

export default App;
```

---

## Phase 4: API Migration (3 hours)

### 4.1 Update MusicXML Import Service

Edit `frontend/src/services/import/MusicXMLImportService.ts`:

**Before (REST API)**:
```typescript
async uploadFile(file: File): Promise<Score> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${this.baseUrl}/api/v1/import/musicxml`, {
    method: 'POST',
    body: formData,
  });
  
  return await response.json();
}
```

**After (WASM)**:
```typescript
import { parseMusicXML } from '../wasm/music-engine';

async uploadFile(file: File): Promise<Score> {
  // Handle .mxl (compressed) files
  if (file.name.endsWith('.mxl')) {
    // Use browser's native ZIP support
    const JSZip = await import('jszip');
    const zip = await JSZip.loadAsync(file);
    
    // Extract the main MusicXML file
    const xmlFile = Object.keys(zip.files).find(f => f.endsWith('.xml'));
    if (!xmlFile) {
      throw new Error('No .xml file found in .mxl archive');
    }
    
    const xmlBytes = await zip.files[xmlFile].async('uint8array');
    return await parseMusicXML(xmlBytes);
  }
  
  // Handle .xml files directly
  const xmlBytes = new Uint8Array(await file.arrayBuffer());
  return await parseMusicXML(xmlBytes);
}
```

### 4.2 Replace API Client Usage in Components

Find all usages of `ScoreApiClient`:

```bash
cd frontend
grep -r "ScoreApiClient" src/
```

For each component using the API client:

**Before**:
```typescript
import { ScoreApiClient } from '@/services/score-api';

const apiClient = new ScoreApiClient();
const score = await apiClient.createScore({ title: "My Score" });
```

**After**:
```typescript
import { createScore } from '@/services/wasm/music-engine';

const score = await createScore("My Score");
```

### 4.3 Update State Management

If using global state (e.g., Zustand, Redux), update score update logic to use WASM:

```typescript
// Before (mutating API)
await apiClient.addInstrument(scoreId, { name: "Piano" });
const updatedScore = await apiClient.getScore(scoreId);

// After (functional - returns new score)
const updatedScore = await addInstrument(currentScore, "Piano");
setScore(updatedScore);
```

**Key Difference**: WASM functions are **stateless** and return new Score objects. Components must replace the old score with the returned score.

---

## Phase 5: Testing (2 hours)

### 5.1 Run Rust Unit Tests

```bash
cd backend
cargo test --lib
```

**Expected**: All existing domain tests pass (no changes to domain logic)

### 5.2 Run WASM Browser Tests

```bash
cd backend
wasm-pack test --headless --firefox
```

**Expected**: WASM-specific tests pass (serialization, browser environment)

### 5.3 Run Frontend Integration Tests

```bash
cd frontend
npm run test
```

**Expected**: All tests pass with WASM backend

### 5.4 Manual Testing Checklist

- [ ] Upload .xml MusicXML file → Score renders correctly
- [ ] Upload .mxl compressed file → Score renders correctly
- [ ] Create new score → Default tempo and time signature appear
- [ ] Add instrument → Instrument appears in score
- [ ] Add note → Note appears in staff
- [ ] Note overlap validation → Error message shown
- [ ] Invalid pitch → Error message shown
- [ ] Offline mode → Application works without backend
- [ ] Refresh page → WASM reloads successfully

---

## Phase 6: Optimization (1 hour)

### 6.1 Verify Bundle Size

```bash
cd backend
wasm-pack build --target web --release
ls -lh pkg/musiccore_backend_bg.wasm
gzip -c pkg/musiccore_backend_bg.wasm | wc -c
```

**Target**: <150KB gzipped (budget is 500KB, aim for margin)

**If Too Large**:
1. Check for unused dependencies: `cargo tree --target wasm32-unknown-unknown`
2. Enable more aggressive optimization:
   ```toml
   [profile.release]
   opt-level = "z"
   lto = "fat"        # More aggressive LTO
   codegen-units = 1
   ```
3. Run wasm-opt manually:
   ```bash
   wasm-opt -Oz pkg/musiccore_backend_bg.wasm -o pkg/musiccore_backend_bg.wasm
   ```

### 6.2 Benchmark Performance

Create `backend/benches/wasm_perf.rs`:

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use musiccore_backend::parse_musicxml;

fn bench_parse_small_score(c: &mut Criterion) {
    let xml = include_bytes!("../tests/fixtures/small_score.xml");
    
    c.bench_function("parse small score (50 measures)", |b| {
        b.iter(|| {
            parse_musicxml(black_box(xml))
        });
    });
}

criterion_group!(benches, bench_parse_small_score);
criterion_main!(benches);
```

Run benchmark:
```bash
cargo bench --target wasm32-unknown-unknown
```

**Target**: <100ms for typical scores (50-200 measures)

### 6.3 CI Integration

Create `.github/workflows/wasm-build.yml`:

```yaml
name: WASM Build

on: [push, pull_request]

jobs:
  build-wasm:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown
      
      - name: Install wasm-pack
        run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
      
      - name: Build WASM
        run: |
          cd backend
          wasm-pack build --target web --release
      
      - name: Check bundle size
        run: |
          SIZE=$(gzip -c backend/pkg/musiccore_backend_bg.wasm | wc -c)
          echo "Gzipped size: $SIZE bytes"
          if [ $SIZE -gt 512000 ]; then
            echo "Error: WASM bundle too large (>500KB gzipped)"
            exit 1
          fi
      
      - name: Test WASM
        run: |
          cd backend
          wasm-pack test --headless --firefox
```

---

## Troubleshooting

### Issue: "Cannot find module '/wasm/musiccore.js'"

**Cause**: Vite static copy plugin didn't run or WASM files not in public/  
**Fix**:
```bash
cd frontend
npm run build  # Rebuild to trigger copy
ls -la public/wasm/  # Verify files exist
```

### Issue: "WASM binary import requires 'application/wasm' MIME type"

**Cause**: Server not serving .wasm files with correct MIME type  
**Fix**: Add Vite server headers (see Phase 3.2)

### Issue: "ReferenceError: TextDecoder is not defined"

**Cause**: Older browser without TextDecoder API  
**Fix**: Add polyfill:
```bash
npm install text-encoding
```

### Issue: Parsing large scores takes >100ms

**Cause**: Debug build or unoptimized WASM  
**Fix**:
```bash
wasm-pack build --release  # Ensure --release flag
```

### Issue: Memory leak after many operations

**Cause**: WASM objects not being garbage collected  
**Fix**: Ensure components don't hold references to old Score objects

---

## Success Checklist

- [ ] wasm-pack builds with no errors
- [ ] WASM bundle size <150KB gzipped
- [ ] Parse time <100ms for typical scores
- [ ] All backend unit tests pass
- [ ] All WASM browser tests pass
- [ ] All frontend integration tests pass
- [ ] Manual testing checklist complete
- [ ] CI pipeline passes
- [ ] No console errors in production build
- [ ] Application works offline

---

## Next Steps

After completing this quickstart:

1. **Create tasks.md**: Run `/speckit.tasks` to break down implementation into atomic tasks
2. **Begin Implementation**: Start with Phase 1 (Backend Setup)
3. **Iterate**: Implement one WASM export at a time, testing after each
4. **Document**: Update README.md with WASM build instructions

**Estimated total implementation time**: 9-10 hours for MVP, 15-20 hours for complete feature parity.
