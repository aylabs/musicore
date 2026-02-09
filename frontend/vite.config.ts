import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
    // Note: WASM files are copied manually in Dockerfile for Docker builds
    // For local development, run `npm run build:wasm` first
  ],
  // Enable top-level await for WASM initialization
  build: {
    target: 'esnext'
  }
})
