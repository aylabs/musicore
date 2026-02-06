# Musicore Backend Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build
FROM rust:1.93 AS builder

WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src
COPY tests ./tests

# Build release binary
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

# Install OpenSSL (required for some Rust crates)
RUN apt-get update && \
    apt-get install -y ca-certificates libssl3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/musicore-backend /app/musicore-backend

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/scores || exit 1

# Run the binary
CMD ["/app/musicore-backend"]
