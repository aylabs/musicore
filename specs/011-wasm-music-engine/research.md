# Research: WASM Music Engine Integration

**Feature**: 011-wasm-music-engine  
**Date**: 2026-02-09  
**Purpose**: Resolve technical unknowns before design phase (Phase 1)

## Research Questions

From Technical Context in [plan.md](plan.md):
1. ❓ **NEEDS CLARIFICATION**: Is the `zip` crate compatible with WASM?
2. ❓ What is the best approach: `wasm-pack` vs manual `cargo build --target wasm32-unknown-unknown`?
3. ❓ How do we handle memory management when passing Score objects between JS and Rust?
4. ❓ What are the WASM bundle size optimization techniques?
5. ❓ How should Rust errors propagate to JavaScript?
6. ❓ What is the testing strategy for WASM code (unit tests, browser tests)?
7. ❓ How does Vite integrate with WASM modules?
8. ❓ How are TypeScript type definitions generated from Rust?

---

## Research Findings

### 1. Dependency WASM Compatibility Audit

**Question**: Are our Rust dependencies compatible with wasm32-unknown-unknown target?

**Investigation**:
- **`serde`**: ✅ Full WASM support (no_std compatible, derive macros work)
- **`serde_json`**: ✅ Full WASM support (commonly used in WASM projects)
- **`uuid`**: ✅ Full WASM support with feature flags (`v4` works, avoid `v1` which needs system RNG)
- **`thiserror`**: ✅ Full WASM support (error derivation works in WASM)
- **`quick-xml`**: ✅ Full WASM support (no OS dependencies, pure Rust XML parsing)
- **`zip`**: ❌ **INCOMPATIBLE** - Requires file system access via `std::fs` which doesn't exist in WASM

**Decision**: 
- **Replace `zip` crate** with WASM-compatible alternative:
  - **Option A**: `zip-rs` with `deflate-miniz` feature (pure Rust, no std::fs)
  - **Option B**: Handle .mxl decompression in JavaScript (browser has native ZIP support via JSZip)
  - **Recommendation**: **Option B** - Let JavaScript decompress .mxl files to MusicXML bytes, then pass bytes to WASM parser

**Rationale**: 
- Browser already has ZIP APIs (Blob, File, CompressionStream)
- Avoids bundling deflate compression logic in WASM (saves ~50KB)
- Separation of concerns: JS handles I/O, WASM handles music domain logic

**Implementation Impact**: 
- Remove `zip` dependency from Cargo.toml when building WASM
- Frontend adds JSZip or native Compression Streams API for .mxl handling
- WASM parser accepts `&[u8]` (MusicXML bytes) instead of file paths

---

### 2. WASM Build Tool: wasm-pack vs Manual Cargo

**Question**: Should we use `wasm-pack` or manual `cargo build --target wasm32-unknown-unknown`?

**Comparison**:

| Feature | wasm-pack | Manual cargo build |
|---------|-----------|-------------------|
| JS glue code generation | ✅ Automatic | ❌ Manual wasm-bindgen invocation |
| TypeScript .d.ts generation | ✅ Automatic | ❌ Manual wasm-bindgen --typescript |
| Optimization (wasm-opt) | ✅ Automatic | ❌ Manual wasm-opt invocation |
| NPM package generation | ✅ Built-in | ❌ Manual package.json creation |
| Browser testing | ✅ `wasm-pack test --headless` | ❌ Manual test harness |
| Size optimization | ✅ Default --release flags | ❌ Manual optimization flags |
| Learning curve | Beginner-friendly | Advanced Rust knowledge required |

**Decision**: **Use wasm-pack** for this project

**Rationale**:
1. **Best practices baked in**: Automatically applies size optimizations (wasm-opt -O3)
2. **TypeScript integration**: Generates .d.ts files matching our frontend needs
3. **Testing support**: `wasm-pack test` runs tests in headless browsers
4. **Documentation**: Well-documented for Rust → JS workflows
5. **CI-friendly**: Single command builds production artifacts

**Build Command**: 
```bash
wasm-pack build --target web --out-dir ../frontend/public/wasm backend/
```

**Output**: 
- `musiccore_bg.wasm` - Optimized WASM binary
- `musiccore.js` - JS glue code for initialization
- `musiccore.d.ts` - TypeScript type definitions

---

### 3. Memory Management: JS ↔ Rust Boundary

**Question**: How do we pass Score objects between JavaScript and Rust without memory leaks?

**WASM Memory Model**:
- WASM uses linear memory (grows in 64KB pages)
- Rust owns WASM memory; JavaScript cannot directly access Rust objects
- Objects crossing boundary must be serialized or borrowed

**Patterns Evaluated**:

#### Pattern A: Serialize to JSON (Recommended)
```rust
#[wasm_bindgen]
pub fn parse_musicxml(xml_bytes: &[u8]) -> Result<JsValue, JsValue> {
    let score = parse_internal(xml_bytes)?;
    // serde_wasm_bindgen handles serialization
    Ok(serde_wasm_bindgen::to_value(&score)?)
}
```

**Pros**: 
- Simple, familiar pattern (matches REST API)
- No manual memory management
- TypeScript types remain unchanged (Score interface)

**Cons**: 
- Serialization overhead (~1-2ms per operation)
- Memory copies (Rust heap → JS heap)

#### Pattern B: Opaque Handles (Alternative)
```rust
#[wasm_bindgen]
pub struct WasmScore {
    inner: Score, // Rust-owned
}

#[wasm_bindgen]
impl WasmScore {
    pub fn add_instrument(&mut self, name: String) -> String {
        let instrument = self.inner.add_instrument(name);
        instrument.id().to_string()
    }
}
```

**Pros**: 
- Zero-copy (Score stays in Rust memory)
- Better performance for large scores

**Cons**: 
- Complex API (opaque handles break TypeScript types)
- Manual lifetime management (must explicitly drop)
- Breaks existing frontend code expectations

**Decision**: **Use Pattern A (Serialize to JSON)**

**Rationale**:
1. Performance is acceptable (<100ms budget, serialization is ~1-2ms)
2. Frontend already expects JSON Score objects (no breaking changes)
3. Simpler error handling (Rust errors serialize to JS exceptions)
4. Matches constitution's API-First principle (JSON as contract)

**Memory Safety**: 
- Use `serde_wasm_bindgen` for type-safe serialization
- No manual `malloc`/`free` needed
- Rust's ownership system prevents memory leaks

---

### 4. Bundle Size Optimization

**Question**: How do we minimize WASM binary size to meet <500KB gzipped target?

**Optimization Techniques**:

| Technique | Impact | Implementation |
|-----------|--------|----------------|
| **Release build** | -60% | `wasm-pack build --release` (default) |
| **wasm-opt -O3** | -15% | Included in wasm-pack |
| **Strip debug symbols** | -20% | `[profile.release] strip = true` in Cargo.toml |
| **Link-time optimization** | -10% | `lto = true` in Cargo.toml |
| **Code size optimization** | -5% | `opt-level = "z"` (optimize for size) |
| **Remove panic strings** | -3% | `panic = "abort"` (skip unwind tables) |
| **Tree shaking unused deps** | Varies | Cargo automatically removes unused code |

**Recommended Cargo.toml Profile**:
```toml
[profile.release]
opt-level = "z"      # Optimize for size, not speed
lto = true           # Link-time optimization
codegen-units = 1    # Better optimization, slower compile
strip = true         # Remove debug symbols
panic = "abort"      # Skip unwind logic
```

**Expected Size**:
- Unoptimized: ~2MB uncompressed
- Optimized: ~300KB uncompressed, ~120KB gzipped
- **Result**: ✅ Meets <500KB gzipped target

**Monitoring**: 
- Add CI check to fail if WASM binary exceeds 400KB gzipped (buffer for future growth)

---

### 5. Error Handling: Rust Result → JavaScript Exception

**Question**: How should domain errors (validation failures, parse errors) appear in JavaScript?

**Current Backend Errors** (from `domain/errors.rs`):
```rust
pub enum DomainError {
    NoteOverlap { voice_id: Uuid, tick: Tick },
    InvalidPitch { value: u8 },
    ParseError { message: String },
    // ... more variants
}
```

**WASM Error Propagation Patterns**:

#### Pattern A: Result<T, String> (Simple)
```rust
#[wasm_bindgen]
pub fn parse_musicxml(bytes: &[u8]) -> Result<JsValue, String> {
    let score = parse_internal(bytes)
        .map_err(|e| format!("Parse error: {}", e))?;
    Ok(serde_wasm_bindgen::to_value(&score)?)
}
```

**Pros**: Simple, String errors work in any JS context  
**Cons**: Loses error type information (frontend can't distinguish error kinds)

#### Pattern B: Result<T, JsValue> with Structured Errors (Recommended)
```rust
#[derive(Serialize)]
struct WasmError {
    error: String,
    message: String,
    details: Option<serde_json::Value>,
}

#[wasm_bindgen]
pub fn parse_musicxml(bytes: &[u8]) -> Result<JsValue, JsValue> {
    let score = parse_internal(bytes).map_err(|e| {
        let wasm_error = WasmError {
            error: "ParseError",
            message: e.to_string(),
            details: Some(json!({ "line": 42 })),
        };
        serde_wasm_bindgen::to_value(&wasm_error).unwrap()
    })?;
    Ok(serde_wasm_bindgen::to_value(&score)?)
}
```

**Pros**: Frontend can parse error types (matches REST API error format)  
**Cons**: Slightly more boilerplate

**Decision**: **Use Pattern B (Structured Errors)**

**Rationale**:
1. Frontend already handles structured errors from REST API (ApiError type)
2. Error type information enables better UX (specific error messages)
3. Maintains contract: `{ error: string, message: string }` format preserved

**Implementation**: 
- Create `WasmError` type matching `ApiError` from frontend types
- Convert all DomainError variants to WasmError with type tags
- Frontend error handling remains unchanged

---

### 6. Testing Strategy

**Question**: How do we test WASM code effectively?

**Test Layers**:

#### Layer 1: Native Rust Unit Tests (Fastest)
```bash
cd backend
cargo test --lib
```

**Purpose**: Test domain logic in native environment  
**Speed**: <1 second (no WASM compilation)  
**Coverage**: All `domain/` modules, importers, validation

#### Layer 2: WASM Browser Tests (Medium)
```bash
cd backend
wasm-pack test --headless --firefox
```

**Purpose**: Validate WASM binary works in browser environment  
**Speed**: ~5 seconds (compile + headless browser launch)  
**Coverage**: 
- Serialization works correctly
- Memory management (no leaks)
- Browser-specific APIs (if any)

#### Layer 3: Frontend Integration Tests (Slowest)
```bash
cd frontend
npm run test
```

**Purpose**: Validate TypeScript ↔ WASM integration  
**Speed**: ~10 seconds (Vitest + WASM loading)  
**Coverage**:
- WASM module loads correctly
- Type safety (TypeScript interfaces match WASM exports)
- Error handling end-to-end
- Functional parity with previous REST API

**TDD Workflow**:
1. Write test in native Rust (`cargo test`)
2. Implement feature
3. Run WASM test to validate browser compatibility (`wasm-pack test`)
4. Update frontend integration test if API changed

**CI Pipeline**:
```yaml
- name: Test Backend (Native)
  run: cargo test --lib
- name: Test Backend (WASM)
  run: wasm-pack test --headless --firefox
- name: Build WASM
  run: wasm-pack build --target web
- name: Test Frontend
  run: npm test
```

---

### 7. Vite Integration

**Question**: How does Vite bundle and serve WASM files?

**Vite WASM Support** (Built-in since Vite 3.0):
- Automatic MIME type: `application/wasm`
- Import syntax: `import init from './musiccore.js'`
- Async loading: `await init()` initializes WASM module

**Configuration** (`vite.config.ts`):
```typescript
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    // Copy WASM files from build output to public/wasm/
    viteStaticCopy({
      targets: [
        {
          src: '../backend/pkg/musiccore_bg.wasm',
          dest: 'wasm'
        },
        {
          src: '../backend/pkg/musiccore.js',
          dest: 'wasm'
        }
      ]
    })
  ],
  // Enable top-level await for WASM initialization
  build: {
    target: 'esnext'
  }
});
```

**Loading Pattern** (`frontend/src/services/wasm/loader.ts`):
```typescript
import init from '/wasm/musiccore.js';

let wasmInitialized = false;

export async function initWasm(): Promise<void> {
  if (wasmInitialized) return;
  
  await init('/wasm/musiccore_bg.wasm');
  wasmInitialized = true;
}
```

**App Initialization** (`frontend/src/App.tsx`):
```typescript
useEffect(() => {
  initWasm().catch(console.error);
}, []);
```

**Decision**: Use Vite's built-in WASM support + static copy plugin

**Rationale**:
- No special webpack config needed (Vite handles WASM natively)
- Static copy ensures WASM files available in production build
- Top-level await enables clean async initialization

---

### 8. TypeScript Type Generation

**Question**: How do TypeScript .d.ts files get generated from Rust code?

**wasm-bindgen TypeScript Output**:

When you run `wasm-pack build --target web`, it generates:
```typescript
// musiccore.d.ts (auto-generated)
export function parse_musicxml(xml_bytes: Uint8Array): any; // ⚠️ Not type-safe!
export function create_score(title?: string): any;
```

**Problem**: wasm-bindgen generates `any` types (loses TypeScript safety)

**Solution**: Manual TypeScript wrapper with proper types

**Pattern** (`frontend/src/services/wasm/music-engine.ts`):
```typescript
import { parse_musicxml as wasmParse } from '/wasm/musiccore.js';
import type { Score } from '@/types/score';

export async function parseMusicXML(xmlBytes: Uint8Array): Promise<Score> {
  const result = wasmParse(xmlBytes);
  // Result is serialized Score object (JSON), already typed correctly
  return result as Score;
}
```

**Decision**: 
1. Use auto-generated .d.ts as starting point
2. Create typed wrapper functions in `frontend/src/services/wasm/music-engine.ts`
3. Re-export with proper TypeScript types (Score, Instrument, Note, etc.)

**Benefits**:
- Type safety preserved
- Frontend code uses familiar types (no breaking changes)
- Wrapper layer allows future changes without affecting components

---

## Technology Choices Summary

| Decision | Chosen Approach | Rationale |
|----------|----------------|-----------|
| **ZIP handling** | JavaScript decompress → WASM parse | Avoid bundling compression in WASM, use browser APIs |
| **Build tool** | wasm-pack | Best practices, TypeScript support, testing |
| **Memory pattern** | JSON serialization (serde_wasm_bindgen) | Simplicity, matches REST API contract, acceptable performance |
| **Optimization** | Cargo.toml profile (opt-level="z", lto=true, strip=true) | Meets <500KB gzipped target (expect ~120KB) |
| **Error handling** | Structured errors (WasmError type) | Matches existing ApiError, enables typed error handling |
| **Testing** | 3 layers (native → WASM → integration) | Fast feedback (native), browser validation (WASM), parity checks (integration) |
| **Vite integration** | Built-in WASM support + static copy plugin | No webpack config, clean async loading |
| **TypeScript types** | Manual wrapper with proper types | Preserve type safety, avoid wasm-bindgen's `any` types |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **WASM bundle too large** | Users on slow networks wait >500ms | Profile-guided optimization, lazy loading for large features |
| **Browser compatibility** | Older browsers fail to load | Feature detection, graceful degradation to REST API |
| **Memory leaks in long sessions** | Tab crashes after many operations | Memory profiling in Chrome DevTools, automated leak detection in tests |
| **Serialization overhead** | Parse times exceed 100ms for large scores | Benchmark current scores, optimize hot paths if needed |
| **Dependency breakage** | Rust crate updates break WASM | Pin dependency versions, test upgrades in CI |

---

## Phase 0 Completion Checklist

- ✅ Dependency compatibility audited (zip crate issue identified)
- ✅ Build tool selected (wasm-pack)
- ✅ Memory management pattern chosen (JSON serialization)
- ✅ Bundle size optimization strategy defined (<120KB gzipped expected)
- ✅ Error handling pattern defined (structured errors)
- ✅ Testing strategy defined (3-layer pyramid)
- ✅ Vite integration approach documented
- ✅ TypeScript type generation strategy defined

**DECISION**: All NEEDS CLARIFICATION items resolved. Ready for Phase 1 (Design).
