import { useState, useEffect } from 'react'
import { ScoreViewer } from './components/ScoreViewer'
import { RendererDemo } from './pages/RendererDemo'
import { OfflineBanner } from './components/OfflineBanner'
import { IOSInstallModal } from './components/IOSInstallModal'
import { FileStateProvider } from './services/state/FileStateContext'
import { TempoStateProvider } from './services/state/TempoStateContext'
import { initWasm } from './services/wasm/loader'
import packageJson from '../package.json'
import './App.css'

/**
 * Musicore - Music Score Editor
 * 
 * Main application component that renders the score viewer.
 * Connects to backend API at http://localhost:8080
 * 
 * Feature 008: Added TempoStateProvider for tempo change support
 * Feature 011: Added WASM music engine initialization
 * Feature 013: Added onboarding with demo music on first run
 * Feature 017: Added RendererDemo route (access with ?demo=true)
 */
function App() {
  const [wasmLoading, setWasmLoading] = useState(true)
  const [wasmError, setWasmError] = useState<string | null>(null)
  
  // Feature 017: Check URL for demo mode (?demo=true)
  const [showDemo, setShowDemo] = useState(false)
  
  // Mobile debug console (eruda) - enable with ?debug=true
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      import('eruda').then(eruda => {
        eruda.default.init();
        console.log('[App] Eruda mobile debug console initialized');
        console.log('[App] Access console by tapping the floating button');
      });
    }
    
    // Feature 017: Check for demo mode
    if (urlParams.get('demo') === 'true') {
      console.log('[App] Demo mode enabled - showing RendererDemo');
      setShowDemo(true);
    }
  }, []);
  
  useEffect(() => {
    // Initialize WASM module on app startup
    initWasm()
      .then(() => {
        console.log('[App] WASM engine ready')
        setWasmLoading(false)
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('[App] WASM initialization failed:', errorMessage)
        setWasmError(errorMessage)
        setWasmLoading(false)
      })
  }, [])

  // Show loading state while WASM initializes
  if (wasmLoading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>
            🎵 Musicore{' '}
            <a 
              href="https://github.com/aylabs/musicore" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: '0.5em', 
                color: '#999', 
                fontWeight: 'normal',
                textDecoration: 'none'
              }}
            >
              v{packageJson.version}
            </a>
          </h1>
        </header>
        <main style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ fontSize: '2rem' }}>🎼</div>
          <p>Loading music engine...</p>
        </main>
      </div>
    )
  }

  // Show error state if WASM fails to initialize
  if (wasmError) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>
            🎵 Musicore{' '}
            <a 
              href="https://github.com/aylabs/musicore" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: '0.5em', 
                color: '#999', 
                fontWeight: 'normal',
                textDecoration: 'none'
              }}
            >
              v{packageJson.version}
            </a>
          </h1>
        </header>
        <main style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          flexDirection: 'column',
          gap: '1rem',
          padding: '2rem'
        }}>
          <div style={{ fontSize: '2rem', color: '#f44336' }}>⚠️</div>
          <h2 style={{ color: '#333' }}>Failed to Initialize Music Engine</h2>
          <p style={{ maxWidth: '600px', textAlign: 'center', color: '#333' }}>
            {wasmError?.includes('fetch') ? (
              <>
                <strong>Offline First Launch Detected</strong>
                <br /><br />
                This app requires <strong>one online visit</strong> to download the music engine before offline mode works.
                <br /><br />
                Please connect to the internet and reload the page.
              </>
            ) : (
              <>
                Your browser may not support WebAssembly, or there was an error loading the music engine.
              </>
            )}
          </p>
          <details style={{ maxWidth: '600px', marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#333' }}>Error Details</summary>
            <pre style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.875rem',
              textAlign: 'left',
              color: '#333'
            }}>
              {wasmError}
            </pre>
          </details>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
            {wasmError?.includes('fetch') 
              ? 'After one online visit, all features work offline.' 
              : 'Try using a modern browser like Chrome, Firefox, Safari, or Edge.'
            }
          </p>
        </main>
      </div>
    )
  }

  // Normal app render once WASM is ready
  
  // Feature 017: Show RendererDemo if ?demo=true parameter is present
  if (showDemo) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>
            🎵 Musicore - Layout Renderer Demo{' '}
            <a 
              href="/"
              style={{ 
                fontSize: '0.5em', 
                color: '#999', 
                fontWeight: 'normal',
                textDecoration: 'none',
                marginLeft: '1rem'
              }}
            >
              ← Back to App
            </a>
          </h1>
        </header>
        <main>
          <RendererDemo />
        </main>
      </div>
    )
  }
  
  return (
    <TempoStateProvider>
      <FileStateProvider>
        <div className="app">
          <OfflineBanner />
          <header className="app-header">
            <h1>
              🎵 Musicore{' '}
              <a 
                href="https://github.com/aylabs/musicore" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  fontSize: '0.5em', 
                  color: '#999', 
                  fontWeight: 'normal',
                  textDecoration: 'none'
                }}
              >
                v{packageJson.version}
              </a>
            </h1>
          </header>
          <main>
            <ScoreViewer />
          </main>
          <IOSInstallModal />
        </div>
      </FileStateProvider>
    </TempoStateProvider>
  )
}

export default App

