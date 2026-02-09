#!/bin/sh
# custom-entrypoint.sh - Ensure WASM files and fonts are accessible before nginx starts

set -e

# Fix Docker overlay filesystem issue:
# Touch WASM files and fonts to ensure they're visible in all nginx worker processes
if [ -d "/usr/share/nginx/html/wasm" ]; then
    echo "[custom-entrypoint] Ensuring WASM files are accessible..."
    find /usr/share/nginx/html/wasm -type f -exec touch {} \;
    echo "[custom-entrypoint] WASM files:"
    ls -lah /usr/share/nginx/html/wasm/
fi

if [ -d "/usr/share/nginx/html/fonts" ]; then
    echo "[custom-entrypoint] Ensuring font files are accessible..."
    find /usr/share/nginx/html/fonts -type f -exec touch {} \;
    echo "[custom-entrypoint] Font files:"
    ls -lah /usr/share/nginx/html/fonts/
fi

echo "[custom-entrypoint] Starting nginx..."

# Call the original nginx entrypoint script
exec /docker-entrypoint.sh "$@"
