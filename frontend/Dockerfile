# Musicore Frontend Dockerfile
# Multi-stage build for optimized production image with WASM support
# Build context must be repository root (not frontend/)

# Stage 1: Build WASM module
FROM rust:1.93 AS wasm-builder

# Install wasm-pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /backend

# Copy backend source
COPY backend/Cargo.toml backend/Cargo.lock ./
COPY backend/src ./src
COPY backend/tests ./tests

# Build WASM module
RUN wasm-pack build --target web --out-dir pkg --release

# Stage 2: Build frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Copy WASM artifacts AFTER frontend source (so they don't get overwritten)
RUN mkdir -p public/wasm
COPY --from=wasm-builder /backend/pkg/musicore_backend_bg.wasm public/wasm/
COPY --from=wasm-builder /backend/pkg/musicore_backend.js public/wasm/

# Build for production
RUN npm run build

# Stage 3: Runtime with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy custom entrypoint to fix Docker overlay filesystem issue
COPY frontend/docker-entrypoint.sh /custom-entrypoint.sh
RUN chmod +x /custom-entrypoint.sh

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Use custom entrypoint that touches WASM files before starting nginx
ENTRYPOINT ["/custom-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
