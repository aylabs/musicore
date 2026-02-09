#!/usr/bin/env bash
# WASM Build Script - Feature 011-wasm-music-engine
# Builds the Rust backend as WebAssembly module using wasm-pack

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$BACKEND_DIR/../frontend"
WASM_OUTPUT_DIR="$BACKEND_DIR/pkg"
WASM_DEST_DIR="$FRONTEND_DIR/public/wasm"

echo -e "${GREEN}[WASM Build] Starting build process...${NC}"

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo -e "${RED}[ERROR] wasm-pack is not installed${NC}"
    echo "Install it with: cargo install wasm-pack"
    exit 1
fi

# Navigate to backend directory
cd "$BACKEND_DIR"

# Build the WASM module
echo -e "${YELLOW}[WASM Build] Building Rust code for wasm32 target...${NC}"
wasm-pack build --target web --out-dir pkg --release

# Check if build was successful
if [ ! -f "$WASM_OUTPUT_DIR/musicore_backend_bg.wasm" ]; then
    echo -e "${RED}[ERROR] WASM build failed - musiccore_backend_bg.wasm not found${NC}"
    exit 1
fi

if [ ! -f "$WASM_OUTPUT_DIR/musicore_backend.js" ]; then
    echo -e "${RED}[ERROR] WASM build failed - musiccore_backend.js not found${NC}"
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$WASM_DEST_DIR"

# Copy WASM artifacts to frontend public directory
echo -e "${YELLOW}[WASM Build] Copying artifacts to frontend...${NC}"
cp "$WASM_OUTPUT_DIR/musicore_backend_bg.wasm" "$WASM_DEST_DIR/"
cp "$WASM_OUTPUT_DIR/musicore_backend.js" "$WASM_DEST_DIR/"

# Get file sizes
WASM_SIZE=$(du -h "$WASM_DEST_DIR/musicore_backend_bg.wasm" | cut -f1)
JS_SIZE=$(du -h "$WASM_DEST_DIR/musicore_backend.js" | cut -f1)

echo -e "${GREEN}[WASM Build] ✓ Build successful!${NC}"
echo -e "${GREEN}[WASM Build] ✓ WASM module: $WASM_SIZE${NC}"
echo -e "${GREEN}[WASM Build] ✓ JS bindings: $JS_SIZE${NC}"
echo -e "${GREEN}[WASM Build] ✓ Artifacts copied to: $WASM_DEST_DIR${NC}"
