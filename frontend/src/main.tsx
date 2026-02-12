import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './sw-registration'
import { initLayoutEngine } from './wasm/layout'

// Initialize WASM layout engine (T061)
initLayoutEngine().then(() => {
  console.log('Layout engine WASM module initialized');
}).catch((error) => {
  console.error('Failed to initialize layout engine:', error);
});

// Register service worker (T020-T021)
registerServiceWorker({
  onUpdate: (registration) => {
    console.log('Update available, show prompt');
    // Trigger UpdatePrompt component via custom event
    window.dispatchEvent(new CustomEvent('sw-update', { detail: registration }));
  },
  onSuccess: (registration) => {
    console.log('Service worker registered successfully');
    
    // Check for updates periodically (every 30 minutes) - T021
    setInterval(() => {
      registration.update();
    }, 30 * 60 * 1000);
  },
  onError: (error) => {
    console.error('Service worker registration failed:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
